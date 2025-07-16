import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { DatabaseConfig } from '../config/types';

export interface DatabaseConstructProps {
  config: DatabaseConfig;
  environmentName: string;
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
  enableEncryption?: boolean;
  enablePerformanceInsights?: boolean;
  enableEnhancedMonitoring?: boolean;
  enableBackups?: boolean;
  enableLogging?: boolean;
  kmsKey?: kms.Key;
}

export class DatabaseConstruct extends Construct {
  public readonly database: rds.DatabaseInstance;
  public readonly secret: secretsmanager.Secret;
  public readonly subnetGroup: rds.SubnetGroup;
  public readonly parameterGroup: rds.ParameterGroup;
  public readonly optionGroup?: rds.OptionGroup;
  public readonly logGroup?: logs.LogGroup;
  public readonly monitoringRole?: cdk.aws_iam.Role;

  constructor(scope: Construct, id: string, props: DatabaseConstructProps) {
    super(scope, id);

    // Create KMS key for encryption if not provided
    const encryptionKey = props.kmsKey || this.createKmsKey(props.environmentName);

    // Create database credentials secret
    this.secret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      secretName: `recruitment-${props.environmentName}-database-credentials`,
      description: 'Database credentials for recruitment application',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
        includeSpace: false,
        passwordLength: 32,
      },
      encryptionKey: props.enableEncryption ? encryptionKey : undefined,
    });

    // Create database subnet group
    this.subnetGroup = new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
      vpc: props.vpc,
      description: 'Subnet group for RDS database',
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      subnetGroupName: `recruitment-${props.environmentName}-db-subnet-group`,
    });

    // Create parameter group
    this.parameterGroup = new rds.ParameterGroup(this, 'DatabaseParameterGroup', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4,
      }),
      description: 'Parameter group for PostgreSQL database',
      parameters: {
        'shared_preload_libraries': 'pg_stat_statements',
        'log_statement': 'all',
        'log_min_duration_statement': '1000',
        'log_line_prefix': '%t:%r:%u@%d:[%p]:',
        'log_checkpoints': 'on',
        'log_connections': 'on',
        'log_disconnections': 'on',
        'log_lock_waits': 'on',
        'log_temp_files': '0',
        'maintenance_work_mem': '256MB',
        'effective_cache_size': '1GB',
        'work_mem': '16MB',
        'random_page_cost': '1.1',
        'effective_io_concurrency': '200',
        'max_connections': '100',
      },
    });

    // Create monitoring role for enhanced monitoring
    if (props.enableEnhancedMonitoring && props.config.monitoringInterval > 0) {
      this.monitoringRole = new cdk.aws_iam.Role(this, 'MonitoringRole', {
        assumedBy: new cdk.aws_iam.ServicePrincipal('monitoring.rds.amazonaws.com'),
        managedPolicies: [
          cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonRDSEnhancedMonitoringRole'),
        ],
      });
    }

    // Create CloudWatch log group if logging is enabled
    if (props.enableLogging) {
      this.logGroup = new logs.LogGroup(this, 'DatabaseLogGroup', {
        logGroupName: `/aws/rds/instance/recruitment-${props.environmentName}-postgres/postgresql`,
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
    }

    // Create RDS database instance
    this.database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        this.getInstanceSize(props.config.instanceClass)
      ),
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [props.securityGroup],
      subnetGroup: this.subnetGroup,
      parameterGroup: this.parameterGroup,
      
      // Database configuration
      databaseName: 'recruitment',
      credentials: rds.Credentials.fromSecret(this.secret),
      
      // Storage configuration
      allocatedStorage: props.config.allocatedStorage,
      maxAllocatedStorage: props.config.maxAllocatedStorage,
      storageType: rds.StorageType.GP2,
      storageEncrypted: props.enableEncryption,
      storageEncryptionKey: props.enableEncryption ? encryptionKey : undefined,
      
      // Backup configuration
      backupRetention: props.enableBackups ? 
        cdk.Duration.days(props.config.backupRetention) : 
        cdk.Duration.days(0),
      preferredBackupWindow: '03:00-04:00',
      preferredMaintenanceWindow: 'sun:04:00-sun:05:00',
      copyTagsToSnapshot: true,
      deleteAutomatedBackups: props.config.deleteAutomatedBackups,
      deletionProtection: props.config.deletionProtection,
      
      // Availability configuration
      multiAz: props.config.multiAz,
      availabilityZone: props.config.multiAz ? undefined : props.vpc.availabilityZones[0],
      
      // Monitoring configuration
      monitoringInterval: props.enableEnhancedMonitoring ? 
        cdk.Duration.seconds(props.config.monitoringInterval) : 
        undefined,
      monitoringRole: this.monitoringRole,
      enablePerformanceInsights: props.enablePerformanceInsights && props.config.performanceInsights,
      performanceInsightRetention: props.enablePerformanceInsights ? 
        rds.PerformanceInsightRetention.DEFAULT : 
        undefined,
      performanceInsightEncryptionKey: props.enablePerformanceInsights && props.enableEncryption ? 
        encryptionKey : 
        undefined,
      
      // Logging configuration
      cloudwatchLogsExports: props.enableLogging ? ['postgresql'] : undefined,
      
      // Security configuration
      iamAuthentication: false,
      
      // Naming
      instanceIdentifier: `recruitment-${props.environmentName}-postgres`,
      
      // Removal policy
      removalPolicy: props.environmentName === 'prod' ? 
        cdk.RemovalPolicy.SNAPSHOT : 
        cdk.RemovalPolicy.DESTROY,
    });

    // Create database alarms if monitoring is enabled
    if (props.enableEnhancedMonitoring) {
      this.createDatabaseAlarms(props.environmentName);
    }

    // Add tags
    this.addTags(props.environmentName);
  }

  private createKmsKey(environmentName: string): kms.Key {
    return new kms.Key(this, 'DatabaseEncryptionKey', {
      description: `KMS key for database encryption - ${environmentName}`,
      enableKeyRotation: true,
      alias: `recruitment-${environmentName}-database-key`,
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
            sid: 'Allow RDS Service',
            effect: cdk.aws_iam.Effect.ALLOW,
            principals: [new cdk.aws_iam.ServicePrincipal('rds.amazonaws.com')],
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

  private getInstanceSize(instanceClass: string): ec2.InstanceSize {
    const sizeMap: { [key: string]: ec2.InstanceSize } = {
      'db.t3.micro': ec2.InstanceSize.MICRO,
      'db.t3.small': ec2.InstanceSize.SMALL,
      'db.t3.medium': ec2.InstanceSize.MEDIUM,
      'db.t3.large': ec2.InstanceSize.LARGE,
      'db.r5.large': ec2.InstanceSize.LARGE,
      'db.r5.xlarge': ec2.InstanceSize.XLARGE,
      'db.r5.2xlarge': ec2.InstanceSize.XLARGE2,
    };

    return sizeMap[instanceClass] || ec2.InstanceSize.MICRO;
  }

  private createDatabaseAlarms(environmentName: string): void {
    // CPU Utilization alarm
    const cpuAlarm = new cdk.aws_cloudwatch.Alarm(this, 'DatabaseCpuAlarm', {
      alarmName: `recruitment-${environmentName}-database-cpu-utilization`,
      alarmDescription: 'Database CPU utilization is high',
      metric: this.database.metricCPUUtilization(),
      threshold: 80,
      evaluationPeriods: 2,
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Database connections alarm
    const connectionsAlarm = new cdk.aws_cloudwatch.Alarm(this, 'DatabaseConnectionsAlarm', {
      alarmName: `recruitment-${environmentName}-database-connections`,
      alarmDescription: 'Database connections are high',
      metric: this.database.metricDatabaseConnections(),
      threshold: 80,
      evaluationPeriods: 2,
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Free storage space alarm
    const storageAlarm = new cdk.aws_cloudwatch.Alarm(this, 'DatabaseStorageAlarm', {
      alarmName: `recruitment-${environmentName}-database-free-storage`,
      alarmDescription: 'Database free storage space is low',
      metric: this.database.metricFreeStorageSpace(),
      threshold: 2 * 1024 * 1024 * 1024, // 2 GB in bytes
      evaluationPeriods: 1,
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Add alarms to a list for external reference
    (this as any).alarms = [cpuAlarm, connectionsAlarm, storageAlarm];
  }

  private addTags(environmentName: string): void {
    const tags = {
      Environment: environmentName,
      Component: 'Database',
      ManagedBy: 'CDK',
      BackupRequired: 'true',
    };

    Object.entries(tags).forEach(([key, value]) => {
      cdk.Tags.of(this.database).add(key, value);
      cdk.Tags.of(this.secret).add(key, value);
      cdk.Tags.of(this.subnetGroup).add(key, value);
      cdk.Tags.of(this.parameterGroup).add(key, value);
    });
  }

  public createReadReplica(id: string, config: DatabaseConfig): rds.DatabaseInstanceReadReplica {
    return new rds.DatabaseInstanceReadReplica(this, id, {
      sourceDatabaseInstance: this.database,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        this.getInstanceSize(config.instanceClass)
      ),
      vpc: this.database.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: this.database.connections.securityGroups,
      parameterGroup: this.parameterGroup,
      enablePerformanceInsights: config.performanceInsights,
      monitoringInterval: config.monitoringInterval > 0 ? 
        cdk.Duration.seconds(config.monitoringInterval) : 
        undefined,
      monitoringRole: this.monitoringRole,
      deleteAutomatedBackups: config.deleteAutomatedBackups,
      deletionProtection: config.deletionProtection,
      instanceIdentifier: `${this.database.instanceIdentifier}-read-replica`,
    });
  }

  public addDatabaseConnectionFromSecurityGroup(securityGroup: ec2.SecurityGroup, description: string): void {
    this.database.connections.allowFrom(securityGroup, ec2.Port.tcp(5432), description);
  }
}