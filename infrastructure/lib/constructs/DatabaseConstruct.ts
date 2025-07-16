import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { DatabaseConfig } from '../config/EnvironmentConfig';

export interface DatabaseConstructProps {
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
  config: DatabaseConfig;
  environment: string;
  kmsKey?: kms.Key;
  alertsTopic?: sns.Topic;
}

export class DatabaseConstruct extends Construct {
  public readonly instance: rds.DatabaseInstance;
  public readonly secret: secretsmanager.Secret;
  public readonly subnetGroup: rds.SubnetGroup;
  public readonly parameterGroup: rds.ParameterGroup;
  public readonly optionGroup: rds.OptionGroup;
  public readonly readReplicas: rds.DatabaseInstance[] = [];

  constructor(scope: Construct, id: string, props: DatabaseConstructProps) {
    super(scope, id);

    // Create KMS key for encryption if not provided
    const kmsKey = props.kmsKey || new kms.Key(this, 'DatabaseKey', {
      description: `Database encryption key for ${props.environment}`,
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create database secret
    this.secret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      secretName: `recruitment-website-db-${props.environment}`,
      description: `Database credentials for ${props.environment}`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'postgres',
          engine: 'postgres',
          host: '',
          port: 5432,
          dbname: 'recruitment_db',
          dbInstanceIdentifier: `recruitment-website-${props.environment}`,
        }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\\'',
        passwordLength: 32,
      },
      encryptionKey: kmsKey,
    });

    // Create subnet group
    this.subnetGroup = new rds.SubnetGroup(this, 'SubnetGroup', {
      description: `Database subnet group for ${props.environment}`,
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
    });

    // Create parameter group with optimized settings
    this.parameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4,
      }),
      description: `PostgreSQL parameter group for ${props.environment}`,
      parameters: {
        // Connection settings
        'max_connections': '200',
        'shared_preload_libraries': 'pg_stat_statements',
        
        // Memory settings
        'shared_buffers': '{DBInstanceClassMemory/4}',
        'effective_cache_size': '{DBInstanceClassMemory*3/4}',
        'work_mem': '4MB',
        'maintenance_work_mem': '64MB',
        
        // Checkpoint settings
        'checkpoint_completion_target': '0.9',
        'wal_buffers': '16MB',
        'default_statistics_target': '100',
        
        // Logging settings
        'log_statement': 'all',
        'log_min_duration_statement': '1000',
        'log_checkpoints': '1',
        'log_connections': '1',
        'log_disconnections': '1',
        'log_lock_waits': '1',
        'log_temp_files': '0',
        
        // Performance settings
        'random_page_cost': '1.1',
        'seq_page_cost': '1.0',
        'cpu_tuple_cost': '0.01',
        'cpu_index_tuple_cost': '0.005',
        'cpu_operator_cost': '0.0025',
        
        // Auto vacuum settings
        'autovacuum': '1',
        'autovacuum_max_workers': '3',
        'autovacuum_naptime': '1min',
        'autovacuum_vacuum_threshold': '50',
        'autovacuum_analyze_threshold': '50',
        'autovacuum_vacuum_scale_factor': '0.2',
        'autovacuum_analyze_scale_factor': '0.1',
      },
    });

    // Create option group
    this.optionGroup = new rds.OptionGroup(this, 'OptionGroup', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4,
      }),
      configurations: [],
    });

    // Create log groups for database logs
    const logGroups = props.config.enableCloudwatchLogsExports.map(logType => 
      new logs.LogGroup(this, `${logType}LogGroup`, {
        logGroupName: `/aws/rds/instance/recruitment-website-${props.environment}/${logType}`,
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      })
    );

    // Create the main database instance
    this.instance = new rds.DatabaseInstance(this, 'Database', {
      instanceIdentifier: `recruitment-website-${props.environment}`,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.fromString(props.config.instanceClass.split('.')[1]),
        ec2.InstanceSize.fromString(props.config.instanceClass.split('.')[2])
      ),
      credentials: rds.Credentials.fromSecret(this.secret),
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [props.securityGroup],
      subnetGroup: this.subnetGroup,
      parameterGroup: this.parameterGroup,
      optionGroup: this.optionGroup,
      
      // Storage configuration
      allocatedStorage: props.config.allocatedStorage,
      maxAllocatedStorage: props.config.maxAllocatedStorage,
      storageType: rds.StorageType.GP3,
      storageEncrypted: true,
      storageEncryptionKey: kmsKey,
      
      // High availability and backup
      multiAz: props.config.multiAz,
      backupRetention: cdk.Duration.days(props.config.backupRetentionDays),
      preferredBackupWindow: '03:00-04:00',
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
      copyTagsToSnapshot: true,
      deletionProtection: props.config.deletionProtection,
      
      // Monitoring and performance
      monitoringInterval: cdk.Duration.seconds(60),
      enablePerformanceInsights: props.config.performanceInsights,
      performanceInsightRetention: props.config.performanceInsights 
        ? rds.PerformanceInsightRetention.DEFAULT 
        : undefined,
      performanceInsightEncryptionKey: props.config.performanceInsights ? kmsKey : undefined,
      
      // Logging
      cloudwatchLogsExports: props.config.enableCloudwatchLogsExports,
      cloudwatchLogsRetention: logs.RetentionDays.ONE_MONTH,
      
      // Auto minor version upgrade
      autoMinorVersionUpgrade: true,
      
      // Database name
      databaseName: 'recruitment_db',
      
      // Port
      port: 5432,
      
      // Network
      allowMajorVersionUpgrade: false,
      
      // Removal policy
      removalPolicy: props.config.deletionProtection 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Create read replicas for production
    if (props.environment === 'prod') {
      this.createReadReplicas(props, kmsKey);
    }

    // Update the secret with the actual database endpoint
    new secretsmanager.SecretTargetAttachment(this, 'SecretAttachment', {
      secret: this.secret,
      target: this.instance,
    });

    // Create CloudWatch alarms
    this.createCloudWatchAlarms(props.alertsTopic);

    // Create automated backup monitoring
    this.createBackupMonitoring(props.alertsTopic);

    // Add tags
    cdk.Tags.of(this.instance).add('Component', 'Database');
    cdk.Tags.of(this.instance).add('Engine', 'PostgreSQL');
    cdk.Tags.of(this.instance).add('Environment', props.environment);
  }

  private createReadReplicas(props: DatabaseConstructProps, kmsKey: kms.Key): void {
    // Create read replica in different AZ
    const readReplica = new rds.DatabaseInstance(this, 'ReadReplica', {
      instanceIdentifier: `recruitment-website-${props.environment}-read`,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.fromString(props.config.instanceClass.split('.')[1]),
        ec2.InstanceSize.fromString(props.config.instanceClass.split('.')[2])
      ),
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [props.securityGroup],
      
      // Read replica configuration
      sourceDatabaseInstance: this.instance,
      
      // Storage
      storageEncrypted: true,
      storageEncryptionKey: kmsKey,
      
      // Monitoring
      monitoringInterval: cdk.Duration.seconds(60),
      enablePerformanceInsights: props.config.performanceInsights,
      performanceInsightRetention: props.config.performanceInsights 
        ? rds.PerformanceInsightRetention.DEFAULT 
        : undefined,
      performanceInsightEncryptionKey: props.config.performanceInsights ? kmsKey : undefined,
      
      // Auto minor version upgrade
      autoMinorVersionUpgrade: true,
      
      // Removal policy
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.readReplicas.push(readReplica);
  }

  private createCloudWatchAlarms(alertsTopic?: sns.Topic): void {
    if (!alertsTopic) return;

    // CPU utilization alarm
    const cpuAlarm = this.instance.metricCPUUtilization().createAlarm(this, 'CPUAlarm', {
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'Database CPU utilization is too high',
    });
    cpuAlarm.addAlarmAction(new targets.SnsAction(alertsTopic));

    // Database connections alarm
    const connectionsAlarm = this.instance.metricDatabaseConnections().createAlarm(this, 'ConnectionsAlarm', {
      threshold: 160, // 80% of max_connections (200)
      evaluationPeriods: 2,
      alarmDescription: 'Database connections are too high',
    });
    connectionsAlarm.addAlarmAction(new targets.SnsAction(alertsTopic));

    // Free storage space alarm
    const freeStorageAlarm = this.instance.metricFreeStorageSpace().createAlarm(this, 'FreeStorageAlarm', {
      threshold: 10 * 1024 * 1024 * 1024, // 10 GB in bytes
      evaluationPeriods: 1,
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      alarmDescription: 'Database free storage is too low',
    });
    freeStorageAlarm.addAlarmAction(new targets.SnsAction(alertsTopic));

    // Read latency alarm
    const readLatencyAlarm = this.instance.metricReadLatency().createAlarm(this, 'ReadLatencyAlarm', {
      threshold: 0.2, // 200ms
      evaluationPeriods: 2,
      alarmDescription: 'Database read latency is too high',
    });
    readLatencyAlarm.addAlarmAction(new targets.SnsAction(alertsTopic));

    // Write latency alarm
    const writeLatencyAlarm = this.instance.metricWriteLatency().createAlarm(this, 'WriteLatencyAlarm', {
      threshold: 0.2, // 200ms
      evaluationPeriods: 2,
      alarmDescription: 'Database write latency is too high',
    });
    writeLatencyAlarm.addAlarmAction(new targets.SnsAction(alertsTopic));
  }

  private createBackupMonitoring(alertsTopic?: sns.Topic): void {
    if (!alertsTopic) return;

    // Create EventBridge rule for backup failures
    const backupFailureRule = new events.Rule(this, 'BackupFailureRule', {
      eventPattern: {
        source: ['aws.rds'],
        detailType: ['RDS DB Instance Event'],
        detail: {
          EventCategories: ['backup'],
          Message: [{ prefix: 'Backup failed' }],
        },
      },
    });

    backupFailureRule.addTarget(new targets.SnsTopic(alertsTopic, {
      message: events.RuleTargetInput.fromText(
        'Database backup failed for instance: ' + this.instance.instanceIdentifier
      ),
    }));
  }

  /**
   * Create a database migration Lambda function
   */
  public createMigrationFunction(): void {
    // This would typically be implemented with a Lambda function
    // that runs database migrations during deployment
    // For now, we'll use ECS task for migrations (implemented in EcsConstruct)
  }
}