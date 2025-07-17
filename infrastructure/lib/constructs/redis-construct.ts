import * as cdk from 'aws-cdk-lib';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { RedisConfig } from '../config/types';

export interface RedisConstructProps {
  config: RedisConfig;
  environmentName: string;
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
  enableEncryption?: boolean;
  enableLogging?: boolean;
  kmsKey?: kms.Key;
}

export class RedisConstruct extends Construct {
  public readonly redis: elasticache.CfnCacheCluster;
  public readonly subnetGroup: elasticache.CfnSubnetGroup;
  public readonly parameterGroup: elasticache.CfnParameterGroup;
  public readonly logGroup?: logs.LogGroup;
  public readonly encryptionKey?: kms.Key;

  constructor(scope: Construct, id: string, props: RedisConstructProps) {
    super(scope, id);

    // Create KMS key for encryption if not provided and encryption is enabled
    if (props.enableEncryption && !props.kmsKey) {
      this.encryptionKey = this.createKmsKey(props.environmentName);
    } else if (props.enableEncryption) {
      this.encryptionKey = props.kmsKey;
    }

    // Create CloudWatch log group if logging is enabled
    if (props.enableLogging) {
      this.logGroup = new logs.LogGroup(this, 'RedisLogGroup', {
        logGroupName: `/aws/elasticache/recruitment-${props.environmentName}-redis`,
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
    }

    // Create cache subnet group
    this.subnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for Redis cache',
      subnetIds: props.vpc.privateSubnets.map(subnet => subnet.subnetId),
      cacheSubnetGroupName: `recruitment-${props.environmentName}-redis-subnet-group`,
    });

    // Create parameter group
    this.parameterGroup = new elasticache.CfnParameterGroup(this, 'RedisParameterGroup', {
      cacheParameterGroupFamily: 'redis7.x',
      description: 'Parameter group for Redis cache',
      properties: {
        'maxmemory-policy': 'allkeys-lru',
        'timeout': '300',
        'tcp-keepalive': '60',
        'maxclients': '1000',
        'maxmemory-samples': '5',
        'save': props.config.enableBackup ? '900 1 300 10 60 10000' : '',
        'appendonly': 'yes',
        'appendfsync': 'everysec',
        'auto-aof-rewrite-percentage': '100',
        'auto-aof-rewrite-min-size': '64mb',
        'lazyfree-lazy-eviction': 'yes',
        'lazyfree-lazy-expire': 'yes',
        'lazyfree-lazy-server-del': 'yes',
        'replica-lazy-flush': 'yes',
      },
    });

    // Create Redis cache cluster
    this.redis = new elasticache.CfnCacheCluster(this, 'Redis', {
      cacheNodeType: props.config.nodeType,
      engine: 'redis',
      engineVersion: props.config.engineVersion,
      numCacheNodes: props.config.numCacheNodes,
      cacheParameterGroupName: this.parameterGroup.ref,
      cacheSubnetGroupName: this.subnetGroup.ref,
      vpcSecurityGroupIds: [props.securityGroup.securityGroupId],
      
      // Naming
      clusterName: `recruitment-${props.environmentName}-redis`,
      
      // Backup configuration
      snapshotRetentionLimit: props.config.enableBackup ? props.config.backupRetentionLimit : 0,
      preferredMaintenanceWindow: props.config.preferredMaintenanceWindow,
      snapshotWindow: props.config.enableBackup ? props.config.preferredBackupWindow : undefined,
      
      // Encryption configuration
      transitEncryptionEnabled: props.config.enableTransitEncryption,
      
      // Logging configuration
      logDeliveryConfigurations: props.enableLogging ? [
        {
          destinationType: 'cloudwatch-logs',
          destinationDetails: {
            cloudWatchLogsDetails: {
              logGroup: this.logGroup!.logGroupName,
            },
          },
          logFormat: 'json',
          logType: 'slow-log',
        },
      ] : undefined,
      
      // Networking
      port: 6379,
      
      // Tags
      tags: [
        {
          key: 'Environment',
          value: props.environmentName,
        },
        {
          key: 'Component',
          value: 'Cache',
        },
        {
          key: 'ManagedBy',
          value: 'CDK',
        },
      ],
    });

    // Add dependency
    this.redis.addDependency(this.subnetGroup);
    this.redis.addDependency(this.parameterGroup);

    // Create Redis alarms
    this.createRedisAlarms(props.environmentName);

    // Add tags
    this.addTags(props.environmentName);
  }

  private createKmsKey(environmentName: string): kms.Key {
    return new kms.Key(this, 'RedisEncryptionKey', {
      description: `KMS key for Redis encryption - ${environmentName}`,
      enableKeyRotation: true,
      alias: `recruitment-${environmentName}-redis-key`,
      policy: new cdk.aws_iam.PolicyDocument({
        statements: [
          new cdk.aws_iam.PolicyStatement({
            sid: 'Enable IAM User Permissions',
            effect: cdk.aws_iam.Effect.ALLOW,
            principals: [new cdk.aws_iam.AccountRootPrincipal()],
            actions: ['kms:*'],
            resources: ['*'],
          }),
          new cdk.aws_iam.PolicyStatement({
            sid: 'Allow ElastiCache Service',
            effect: cdk.aws_iam.Effect.ALLOW,
            principals: [new cdk.aws_iam.ServicePrincipal('elasticache.amazonaws.com')],
            actions: [
              'kms:Decrypt',
              'kms:GenerateDataKey',
              'kms:CreateGrant',
              'kms:DescribeKey',
            ],
            resources: ['*'],
          }),
        ],
      }),
    });
  }

  private createRedisAlarms(environmentName: string): void {
    // CPU Utilization alarm
    const cpuAlarm = new cdk.aws_cloudwatch.Alarm(this, 'RedisCpuAlarm', {
      alarmName: `recruitment-${environmentName}-redis-cpu-utilization`,
      alarmDescription: 'Redis CPU utilization is high',
      metric: new cdk.aws_cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          CacheClusterId: this.redis.ref,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 80,
      evaluationPeriods: 2,
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Memory utilization alarm
    const memoryAlarm = new cdk.aws_cloudwatch.Alarm(this, 'RedisMemoryAlarm', {
      alarmName: `recruitment-${environmentName}-redis-memory-utilization`,
      alarmDescription: 'Redis memory utilization is high',
      metric: new cdk.aws_cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'DatabaseMemoryUsagePercentage',
        dimensionsMap: {
          CacheClusterId: this.redis.ref,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 85,
      evaluationPeriods: 2,
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Connection count alarm
    const connectionsAlarm = new cdk.aws_cloudwatch.Alarm(this, 'RedisConnectionsAlarm', {
      alarmName: `recruitment-${environmentName}-redis-connections`,
      alarmDescription: 'Redis connection count is high',
      metric: new cdk.aws_cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'CurrConnections',
        dimensionsMap: {
          CacheClusterId: this.redis.ref,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 800,
      evaluationPeriods: 2,
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Evictions alarm
    const evictionsAlarm = new cdk.aws_cloudwatch.Alarm(this, 'RedisEvictionsAlarm', {
      alarmName: `recruitment-${environmentName}-redis-evictions`,
      alarmDescription: 'Redis evictions are occurring',
      metric: new cdk.aws_cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'Evictions',
        dimensionsMap: {
          CacheClusterId: this.redis.ref,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 0,
      evaluationPeriods: 1,
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Add alarms to a list for external reference
    (this as any).alarms = [cpuAlarm, memoryAlarm, connectionsAlarm, evictionsAlarm];
  }

  private addTags(environmentName: string): void {
    const tags = {
      Environment: environmentName,
      Component: 'Cache',
      ManagedBy: 'CDK',
    };

    // Tags are added through the CfnCacheCluster tags property
    Object.entries(tags).forEach(([key, value]) => {
      cdk.Tags.of(this.redis).add(key, value);
      cdk.Tags.of(this.subnetGroup).add(key, value);
      cdk.Tags.of(this.parameterGroup).add(key, value);
    });
  }

  public getRedisEndpoint(): string {
    return this.redis.attrRedisEndpointAddress;
  }

  public getRedisPort(): string {
    return this.redis.attrRedisEndpointPort;
  }

  public addConnectionFromSecurityGroup(securityGroup: ec2.SecurityGroup, description: string): void {
    // This would need to be implemented at the security group level
    // since we're using the lower-level CfnCacheCluster
    securityGroup.addEgressRule(
      ec2.Peer.securityGroupId(this.redis.vpcSecurityGroupIds![0]),
      ec2.Port.tcp(6379),
      description
    );
  }
}