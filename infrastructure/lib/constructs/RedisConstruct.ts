import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';
import { RedisConfig } from '../config/EnvironmentConfig';

export interface RedisConstructProps {
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
  config: RedisConfig;
  environment: string;
  kmsKey?: kms.Key;
  alertsTopic?: sns.Topic;
}

export class RedisConstruct extends Construct {
  public readonly cluster: elasticache.CfnReplicationGroup;
  public readonly subnetGroup: elasticache.CfnSubnetGroup;
  public readonly parameterGroup: elasticache.CfnParameterGroup;
  public readonly endpoint: string;
  public readonly port: number = 6379;

  constructor(scope: Construct, id: string, props: RedisConstructProps) {
    super(scope, id);

    // Create KMS key for encryption if not provided
    const kmsKey = props.kmsKey || new kms.Key(this, 'RedisKey', {
      description: `Redis encryption key for ${props.environment}`,
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create subnet group
    this.subnetGroup = new elasticache.CfnSubnetGroup(this, 'SubnetGroup', {
      description: `Redis subnet group for ${props.environment}`,
      subnetIds: props.vpc.privateSubnets.map(subnet => subnet.subnetId),
      cacheSubnetGroupName: `recruitment-redis-${props.environment}`,
    });

    // Create parameter group with optimized settings
    this.parameterGroup = new elasticache.CfnParameterGroup(this, 'ParameterGroup', {
      cacheParameterGroupFamily: 'redis7.x',
      description: `Redis parameter group for ${props.environment}`,
      properties: {
        // Memory management
        'maxmemory-policy': 'allkeys-lru',
        'maxmemory-samples': '5',
        
        // Performance settings
        'tcp-keepalive': '300',
        'timeout': '0',
        
        // Persistence settings (for non-cluster mode)
        'save': props.environment === 'prod' ? '900 1 300 10 60 10000' : '',
        
        // Logging
        'slowlog-log-slower-than': '10000',
        'slowlog-max-len': '1000',
        
        // Client settings
        'maxclients': '10000',
        
        // Notification settings
        'notify-keyspace-events': 'Ex',
        
        // Security
        'protected-mode': 'no', // Handled by VPC security groups
      },
    });

    // Determine the number of node groups and replicas
    const nodeGroups = Math.ceil(props.config.numCacheNodes / 2);
    const replicasPerNodeGroup = props.config.numCacheNodes > 1 ? 1 : 0;

    // Create Redis replication group
    this.cluster = new elasticache.CfnReplicationGroup(this, 'ReplicationGroup', {
      replicationGroupId: `recruitment-redis-${props.environment}`,
      description: `Redis cluster for recruitment website ${props.environment}`,
      
      // Node configuration
      cacheNodeType: props.config.nodeType,
      numCacheClusters: props.config.automaticFailover ? undefined : props.config.numCacheNodes,
      numNodeGroups: props.config.automaticFailover ? nodeGroups : undefined,
      replicasPerNodeGroup: props.config.automaticFailover ? replicasPerNodeGroup : undefined,
      
      // Engine settings
      engine: 'redis',
      engineVersion: '7.0',
      cacheParameterGroupName: this.parameterGroup.ref,
      
      // Network settings
      cacheSubnetGroupName: this.subnetGroup.ref,
      securityGroupIds: [props.securityGroup.securityGroupId],
      port: this.port,
      
      // High availability
      automaticFailoverEnabled: props.config.automaticFailover,
      multiAzEnabled: props.config.multiAzEnabled,
      
      // Security and encryption
      atRestEncryptionEnabled: props.config.atRestEncryptionEnabled,
      transitEncryptionEnabled: props.config.transitEncryptionEnabled,
      kmsKeyId: props.config.atRestEncryptionEnabled ? kmsKey.keyArn : undefined,
      authToken: props.config.transitEncryptionEnabled ? 'placeholder-token' : undefined,
      
      // Backup settings
      snapshotRetentionLimit: props.environment === 'prod' ? 7 : 1,
      snapshotWindow: '03:00-05:00',
      preferredMaintenanceWindow: 'sun:05:00-sun:06:00',
      
      // Logging
      logDeliveryConfigurations: [
        {
          destinationType: 'cloudwatch-logs',
          destinationDetails: {
            logGroup: `/aws/elasticache/redis/${props.environment}`,
          },
          logFormat: 'json',
          logType: 'slow-log',
        },
      ],
      
      // Notification settings
      notificationTopicArn: props.alertsTopic?.topicArn,
      
      // Auto upgrade
      autoMinorVersionUpgrade: true,
      
      // Tags
      tags: [
        {
          key: 'Name',
          value: `recruitment-redis-${props.environment}`,
        },
        {
          key: 'Environment',
          value: props.environment,
        },
        {
          key: 'Component',
          value: 'Cache',
        },
      ],
    });

    // Set the endpoint
    this.endpoint = props.config.automaticFailover 
      ? this.cluster.attrConfigurationEndPointAddress 
      : this.cluster.attrRedisEndPointAddress;

    // Create CloudWatch alarms
    this.createCloudWatchAlarms(props.alertsTopic);

    // Grant KMS permissions
    if (props.config.atRestEncryptionEnabled) {
      kmsKey.grantEncryptDecrypt(new cdk.aws_iam.ServicePrincipal('elasticache.amazonaws.com'));
    }
  }

  private createCloudWatchAlarms(alertsTopic?: sns.Topic): void {
    if (!alertsTopic) return;

    // CPU utilization alarm
    const cpuAlarm = new cloudwatch.Alarm(this, 'CPUAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          CacheClusterId: this.cluster.ref,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'Redis CPU utilization is too high',
    });
    cpuAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));

    // Memory utilization alarm
    const memoryAlarm = new cloudwatch.Alarm(this, 'MemoryAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'DatabaseMemoryUsagePercentage',
        dimensionsMap: {
          CacheClusterId: this.cluster.ref,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 85,
      evaluationPeriods: 2,
      alarmDescription: 'Redis memory utilization is too high',
    });
    memoryAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));

    // Evictions alarm
    const evictionsAlarm = new cloudwatch.Alarm(this, 'EvictionsAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'Evictions',
        dimensionsMap: {
          CacheClusterId: this.cluster.ref,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 100,
      evaluationPeriods: 2,
      alarmDescription: 'Redis evictions are too high',
    });
    evictionsAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));

    // Cache hit ratio alarm
    const hitRatioAlarm = new cloudwatch.Alarm(this, 'HitRatioAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'CacheHitRate',
        dimensionsMap: {
          CacheClusterId: this.cluster.ref,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 80,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      alarmDescription: 'Redis cache hit ratio is too low',
    });
    hitRatioAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));

    // Connection count alarm
    const connectionsAlarm = new cloudwatch.Alarm(this, 'ConnectionsAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'CurrConnections',
        dimensionsMap: {
          CacheClusterId: this.cluster.ref,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 100,
      evaluationPeriods: 2,
      alarmDescription: 'Redis connection count is too high',
    });
    connectionsAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));

    // Engine CPU utilization alarm (for Redis 7.x)
    const engineCpuAlarm = new cloudwatch.Alarm(this, 'EngineCPUAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'EngineCPUUtilization',
        dimensionsMap: {
          CacheClusterId: this.cluster.ref,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'Redis engine CPU utilization is too high',
    });
    engineCpuAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));
  }

  /**
   * Get the Redis connection string
   */
  public getConnectionString(): string {
    return `redis://${this.endpoint}:${this.port}`;
  }

  /**
   * Get the Redis configuration for application
   */
  public getRedisConfig(): { [key: string]: any } {
    return {
      host: this.endpoint,
      port: this.port,
      family: 4,
      keepAlive: true,
      lazyConnect: true,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
      retryDelayOnClusterDown: 300,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    };
  }
}