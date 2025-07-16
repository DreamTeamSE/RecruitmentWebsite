import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { RdsConfig } from '../config/environment-config';

export interface RdsConstructProps {
  vpc: ec2.IVpc;
  securityGroup: ec2.ISecurityGroup;
  rdsConfig: RdsConfig;
  environment: string;
}

export class RdsConstruct extends Construct {
  public readonly database: rds.DatabaseInstance;
  public readonly databaseCredentials: secretsmanager.ISecret;
  public readonly databaseEndpoint: string;
  public readonly databasePort: number;

  constructor(scope: Construct, id: string, props: RdsConstructProps) {
    super(scope, id);

    const { vpc, securityGroup, rdsConfig, environment } = props;

    // Create database credentials secret
    this.databaseCredentials = this.createDatabaseCredentials(environment);

    // Create subnet group for RDS
    const subnetGroup = this.createSubnetGroup(vpc, environment);

    // Create parameter group for PostgreSQL optimization
    const parameterGroup = this.createParameterGroup(environment);

    // Create the RDS instance
    this.database = this.createDatabase(
      vpc,
      securityGroup,
      subnetGroup,
      parameterGroup,
      rdsConfig,
      environment
    );

    this.databaseEndpoint = this.database.instanceEndpoint.hostname;
    this.databasePort = this.database.instanceEndpoint.port;

    // Create CloudWatch alarms for monitoring
    this.createCloudWatchAlarms(environment);

    // Output important information
    this.createOutputs();
  }

  private createDatabaseCredentials(environment: string): secretsmanager.Secret {
    return new secretsmanager.Secret(this, 'DatabaseCredentials', {
      secretName: `recruitment-db-credentials-${environment}`,
      description: 'Database credentials for recruitment website',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
        passwordLength: 32,
      },
    });
  }

  private createSubnetGroup(vpc: ec2.IVpc, environment: string): rds.SubnetGroup {
    return new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
      vpc,
      description: 'Subnet group for RDS database',
      subnetGroupName: `recruitment-db-subnet-group-${environment}`,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
    });
  }

  private createParameterGroup(environment: string): rds.ParameterGroup {
    return new rds.ParameterGroup(this, 'DatabaseParameterGroup', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4,
      }),
      name: `recruitment-db-params-${environment}`,
      description: 'Parameter group for recruitment website database',
      parameters: {
        // Optimize for the application workload
        shared_preload_libraries: 'pg_stat_statements',
        log_statement: 'all',
        log_min_duration_statement: '1000', // Log queries taking longer than 1 second
        log_line_prefix: '%t [%p]: [%l-1] user=%u,db=%d ',
        log_connections: 'on',
        log_disconnections: 'on',
        
        // Performance optimizations based on instance size
        ...(environment === 'dev' ? {
          // Development-specific settings
          max_connections: '20',
          shared_buffers: '32MB',
          effective_cache_size: '128MB',
          maintenance_work_mem: '16MB',
          checkpoint_completion_target: '0.9',
          wal_buffers: '1MB',
          default_statistics_target: '100',
        } : {
          // Production settings
          max_connections: '100',
          shared_buffers: '256MB',
          effective_cache_size: '1GB',
          maintenance_work_mem: '64MB',
          checkpoint_completion_target: '0.9',
          wal_buffers: '16MB',
          default_statistics_target: '100',
        }),
      },
    });
  }

  private createDatabase(
    vpc: ec2.IVpc,
    securityGroup: ec2.ISecurityGroup,
    subnetGroup: rds.SubnetGroup,
    parameterGroup: rds.ParameterGroup,
    rdsConfig: RdsConfig,
    environment: string
  ): rds.DatabaseInstance {
    return new rds.DatabaseInstance(this, 'Database', {
      engine: rdsConfig.engine,
      instanceType: rdsConfig.instanceType,
      instanceIdentifier: `recruitment-db-${environment}`,
      
      // Network configuration
      vpc,
      securityGroups: [securityGroup],
      subnetGroup,
      port: 5432,
      
      // Database configuration
      databaseName: 'recruitment',
      credentials: rds.Credentials.fromSecret(this.databaseCredentials),
      parameterGroup,
      
      // Storage configuration
      allocatedStorage: rdsConfig.allocatedStorage,
      maxAllocatedStorage: rdsConfig.maxAllocatedStorage,
      storageType: rds.StorageType.GP2,
      storageEncrypted: true,
      
      // Availability and backup configuration
      multiAz: rdsConfig.multiAz,
      deletionProtection: rdsConfig.deletionProtection,
      backupRetention: cdk.Duration.days(rdsConfig.backupRetention),
      preferredBackupWindow: rdsConfig.preferredBackupWindow,
      preferredMaintenanceWindow: rdsConfig.preferredMaintenanceWindow,
      
      // Monitoring configuration
      enablePerformanceInsights: rdsConfig.enablePerformanceInsights,
      performanceInsightRetention: rdsConfig.enablePerformanceInsights 
        ? rds.PerformanceInsightRetention.DEFAULT 
        : undefined,
      monitoringInterval: rdsConfig.monitoringInterval > 0 
        ? cdk.Duration.seconds(rdsConfig.monitoringInterval) 
        : undefined,
      
      // Auto minor version upgrade
      autoMinorVersionUpgrade: environment !== 'prod',
      
      // Removal policy
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      
      // Enhanced monitoring role (if monitoring is enabled)
      ...(rdsConfig.monitoringInterval > 0 && {
        monitoringRole: new cdk.aws_iam.Role(this, 'MonitoringRole', {
          assumedBy: new cdk.aws_iam.ServicePrincipal('monitoring.rds.amazonaws.com'),
          managedPolicies: [
            cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
              'service-role/AmazonRDSEnhancedMonitoringRole'
            ),
          ],
        }),
      }),
    });
  }

  private createCloudWatchAlarms(environment: string): void {
    // Create CloudWatch alarms for database monitoring
    
    // CPU utilization alarm
    new cdk.aws_cloudwatch.Alarm(this, 'DatabaseCPUAlarm', {
      metric: this.database.metricCPUUtilization(),
      threshold: environment === 'dev' ? 80 : 70,
      evaluationPeriods: 2,
      alarmName: `recruitment-db-cpu-${environment}`,
      alarmDescription: 'Database CPU utilization is high',
    });

    // Database connections alarm
    new cdk.aws_cloudwatch.Alarm(this, 'DatabaseConnectionsAlarm', {
      metric: this.database.metricDatabaseConnections(),
      threshold: environment === 'dev' ? 15 : 80,
      evaluationPeriods: 2,
      alarmName: `recruitment-db-connections-${environment}`,
      alarmDescription: 'Database connection count is high',
    });

    // Free storage space alarm
    new cdk.aws_cloudwatch.Alarm(this, 'DatabaseFreeStorageAlarm', {
      metric: this.database.metricFreeStorageSpace(),
      threshold: 2000000000, // 2GB in bytes
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      evaluationPeriods: 1,
      alarmName: `recruitment-db-storage-${environment}`,
      alarmDescription: 'Database free storage space is low',
    });

    // Read latency alarm
    new cdk.aws_cloudwatch.Alarm(this, 'DatabaseReadLatencyAlarm', {
      metric: this.database.metricReadLatency(),
      threshold: 0.2, // 200ms
      evaluationPeriods: 2,
      alarmName: `recruitment-db-read-latency-${environment}`,
      alarmDescription: 'Database read latency is high',
    });

    // Write latency alarm
    new cdk.aws_cloudwatch.Alarm(this, 'DatabaseWriteLatencyAlarm', {
      metric: this.database.metricWriteLatency(),
      threshold: 0.2, // 200ms
      evaluationPeriods: 2,
      alarmName: `recruitment-db-write-latency-${environment}`,
      alarmDescription: 'Database write latency is high',
    });
  }

  private createOutputs(): void {
    // Output database endpoint
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.databaseEndpoint,
      description: 'RDS database endpoint',
      exportName: `recruitment-db-endpoint-${this.node.scope}`,
    });

    // Output database port
    new cdk.CfnOutput(this, 'DatabasePort', {
      value: this.databasePort.toString(),
      description: 'RDS database port',
      exportName: `recruitment-db-port-${this.node.scope}`,
    });

    // Output database credentials secret ARN
    new cdk.CfnOutput(this, 'DatabaseCredentialsSecretArn', {
      value: this.databaseCredentials.secretArn,
      description: 'ARN of the database credentials secret',
      exportName: `recruitment-db-credentials-${this.node.scope}`,
    });
  }

  /**
   * Get the database connection string for the application
   */
  public getDatabaseUrl(): string {
    return `postgresql://\${username}:\${password}@${this.databaseEndpoint}:${this.databasePort}/recruitment`;
  }

  /**
   * Create a read replica for scaling (production use)
   */
  public createReadReplica(environment: string): rds.DatabaseInstanceReadReplica {
    return new rds.DatabaseInstanceReadReplica(this, 'DatabaseReadReplica', {
      sourceDatabaseInstance: this.database,
      instanceType: this.database.instanceType,
      instanceIdentifier: `recruitment-db-replica-${environment}`,
      deletionProtection: environment === 'prod',
      autoMinorVersionUpgrade: environment !== 'prod',
      removalPolicy: environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });
  }
}