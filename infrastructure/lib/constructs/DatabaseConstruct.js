"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const rds = __importStar(require("aws-cdk-lib/aws-rds"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const events = __importStar(require("aws-cdk-lib/aws-events"));
const targets = __importStar(require("aws-cdk-lib/aws-events-targets"));
const constructs_1 = require("constructs");
class DatabaseConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this.readReplicas = [];
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
        const logGroups = props.config.enableCloudwatchLogsExports.map(logType => new logs.LogGroup(this, `${logType}LogGroup`, {
            logGroupName: `/aws/rds/instance/recruitment-website-${props.environment}/${logType}`,
            retention: logs.RetentionDays.ONE_MONTH,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        }));
        // Create the main database instance
        this.instance = new rds.DatabaseInstance(this, 'Database', {
            instanceIdentifier: `recruitment-website-${props.environment}`,
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_15_4,
            }),
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.fromString(props.config.instanceClass.split('.')[1]), ec2.InstanceSize.fromString(props.config.instanceClass.split('.')[2])),
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
    createReadReplicas(props, kmsKey) {
        // Create read replica in different AZ
        const readReplica = new rds.DatabaseInstance(this, 'ReadReplica', {
            instanceIdentifier: `recruitment-website-${props.environment}-read`,
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_15_4,
            }),
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.fromString(props.config.instanceClass.split('.')[1]), ec2.InstanceSize.fromString(props.config.instanceClass.split('.')[2])),
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
    createCloudWatchAlarms(alertsTopic) {
        if (!alertsTopic)
            return;
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
    createBackupMonitoring(alertsTopic) {
        if (!alertsTopic)
            return;
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
            message: events.RuleTargetInput.fromText('Database backup failed for instance: ' + this.instance.instanceIdentifier),
        }));
    }
    /**
     * Create a database migration Lambda function
     */
    createMigrationFunction() {
        // This would typically be implemented with a Lambda function
        // that runs database migrations during deployment
        // For now, we'll use ECS task for migrations (implemented in EcsConstruct)
    }
}
exports.DatabaseConstruct = DatabaseConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGF0YWJhc2VDb25zdHJ1Y3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJEYXRhYmFzZUNvbnN0cnVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMseURBQTJDO0FBQzNDLHlEQUEyQztBQUMzQywrRUFBaUU7QUFDakUseURBQTJDO0FBQzNDLDJEQUE2QztBQUM3QywrREFBaUQ7QUFDakQsd0VBQTBEO0FBRTFELDJDQUF1QztBQVl2QyxNQUFhLGlCQUFrQixTQUFRLHNCQUFTO0lBUTlDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBNkI7UUFDckUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUhILGlCQUFZLEdBQTJCLEVBQUUsQ0FBQztRQUt4RCxnREFBZ0Q7UUFDaEQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sSUFBSSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUM5RCxXQUFXLEVBQUUsK0JBQStCLEtBQUssQ0FBQyxXQUFXLEVBQUU7WUFDL0QsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1NBQ3pDLENBQUMsQ0FBQztRQUVILHlCQUF5QjtRQUN6QixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDOUQsVUFBVSxFQUFFLDBCQUEwQixLQUFLLENBQUMsV0FBVyxFQUFFO1lBQ3pELFdBQVcsRUFBRSw0QkFBNEIsS0FBSyxDQUFDLFdBQVcsRUFBRTtZQUM1RCxvQkFBb0IsRUFBRTtnQkFDcEIsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkMsUUFBUSxFQUFFLFVBQVU7b0JBQ3BCLE1BQU0sRUFBRSxVQUFVO29C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QixFQUFFO1lBQ2xHLFNBQVMsRUFBRSxHQUFHLEVBQUUsUUFBUTtZQUN4QixpQkFBaUIsRUFBRSxDQUFDO1lBQ3BCLGdCQUFnQixFQUFFLG9DQUFvQztTQUN2RCxDQUFDLENBQUM7UUFDSCxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDdkUsQ0FBQztJQUVPLHNCQUFzQixDQUFDLFdBQXVCO1FBQ3BELElBQUksQ0FBQyxXQUFXO1lBQUUsT0FBTztRQUV6Qiw4Q0FBOEM7UUFDOUMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQ25FLFlBQVksRUFBRTtnQkFDWixNQUFNLEVBQUUsQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLFVBQVUsRUFBRSxDQUFDLHVCQUF1QixDQUFDO2dCQUNyQyxNQUFNLEVBQUU7b0JBQ04sZUFBZSxFQUFFLENBQUMsUUFBUSxDQUFDO29CQUMzQixPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxlQUFlLEVBQUUsQ0FBQztpQkFDdkM7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFO1lBQzVELE9BQU8sRUFBRSxNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FDdEMsdUNBQXVDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FDM0U7U0FDRixDQUFDLENBQUMsQ0FBQztJQUNOLENBQUM7SUFFRDs7T0FFRztJQUNJLHVCQUF1QjtRQUM1Qiw2REFBNkQ7UUFDN0Qsa0RBQWtEO1FBQ2xELDJFQUEyRTtJQUM3RSxDQUFDO0NBQ0Y7QUE5VEQsOENBOFRDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xyXG5pbXBvcnQgKiBhcyByZHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJkcyc7XHJcbmltcG9ydCAqIGFzIHNlY3JldHNtYW5hZ2VyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zZWNyZXRzbWFuYWdlcic7XHJcbmltcG9ydCAqIGFzIGttcyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mta21zJztcclxuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XHJcbmltcG9ydCAqIGFzIGV2ZW50cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzJztcclxuaW1wb3J0ICogYXMgdGFyZ2V0cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzLXRhcmdldHMnO1xyXG5pbXBvcnQgKiBhcyBzbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucyc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5pbXBvcnQgeyBEYXRhYmFzZUNvbmZpZyB9IGZyb20gJy4uL2NvbmZpZy9FbnZpcm9ubWVudENvbmZpZyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIERhdGFiYXNlQ29uc3RydWN0UHJvcHMge1xyXG4gIHZwYzogZWMyLlZwYztcclxuICBzZWN1cml0eUdyb3VwOiBlYzIuU2VjdXJpdHlHcm91cDtcclxuICBjb25maWc6IERhdGFiYXNlQ29uZmlnO1xyXG4gIGVudmlyb25tZW50OiBzdHJpbmc7XHJcbiAga21zS2V5Pzoga21zLktleTtcclxuICBhbGVydHNUb3BpYz86IHNucy5Ub3BpYztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIERhdGFiYXNlQ29uc3RydWN0IGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgaW5zdGFuY2U6IHJkcy5EYXRhYmFzZUluc3RhbmNlO1xyXG4gIHB1YmxpYyByZWFkb25seSBzZWNyZXQ6IHNlY3JldHNtYW5hZ2VyLlNlY3JldDtcclxuICBwdWJsaWMgcmVhZG9ubHkgc3VibmV0R3JvdXA6IHJkcy5TdWJuZXRHcm91cDtcclxuICBwdWJsaWMgcmVhZG9ubHkgcGFyYW1ldGVyR3JvdXA6IHJkcy5QYXJhbWV0ZXJHcm91cDtcclxuICBwdWJsaWMgcmVhZG9ubHkgb3B0aW9uR3JvdXA6IHJkcy5PcHRpb25Hcm91cDtcclxuICBwdWJsaWMgcmVhZG9ubHkgcmVhZFJlcGxpY2FzOiByZHMuRGF0YWJhc2VJbnN0YW5jZVtdID0gW107XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBEYXRhYmFzZUNvbnN0cnVjdFByb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBLTVMga2V5IGZvciBlbmNyeXB0aW9uIGlmIG5vdCBwcm92aWRlZFxyXG4gICAgY29uc3Qga21zS2V5ID0gcHJvcHMua21zS2V5IHx8IG5ldyBrbXMuS2V5KHRoaXMsICdEYXRhYmFzZUtleScsIHtcclxuICAgICAgZGVzY3JpcHRpb246IGBEYXRhYmFzZSBlbmNyeXB0aW9uIGtleSBmb3IgJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxyXG4gICAgICBlbmFibGVLZXlSb3RhdGlvbjogdHJ1ZSxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBkYXRhYmFzZSBzZWNyZXRcclxuICAgIHRoaXMuc2VjcmV0ID0gbmV3IHNlY3JldHNtYW5hZ2VyLlNlY3JldCh0aGlzLCAnRGF0YWJhc2VTZWNyZXQnLCB7XHJcbiAgICAgIHNlY3JldE5hbWU6IGByZWNydWl0bWVudC13ZWJzaXRlLWRiLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcclxuICAgICAgZGVzY3JpcHRpb246IGBEYXRhYmFzZSBjcmVkZW50aWFscyBmb3IgJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxyXG4gICAgICBnZW5lcmF0ZVNlY3JldFN0cmluZzoge1xyXG4gICAgICAgIHNlY3JldFN0cmluZ1RlbXBsYXRlOiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICB1c2VybmFtZTogJ3Bvc3RncmVzJyxcclxuICAgICAgICAgIGVuZ2luZTogJ3Bvc3RncmVzJyxcclxuICAgICAgICAgIGhvc3Q6ICcnLFxyXG4gICAgICAgICAgcG9ydDogNTQzMixcclxuICAgICAgICAgIGRibmFtZTogJ3JlY3J1aXRtZW50X2RiJyxcclxuICAgICAgICAgIGRiSW5zdGFuY2VJZGVudGlmaWVyOiBgcmVjcnVpdG1lbnQtd2Vic2l0ZS0ke3Byb3BzLmVudmlyb25tZW50fWAsXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgZ2VuZXJhdGVTdHJpbmdLZXk6ICdwYXNzd29yZCcsXHJcbiAgICAgICAgZXhjbHVkZUNoYXJhY3RlcnM6ICdcIkAvXFxcXFxcJycsXHJcbiAgICAgICAgcGFzc3dvcmRMZW5ndGg6IDMyLFxyXG4gICAgICB9LFxyXG4gICAgICBlbmNyeXB0aW9uS2V5OiBrbXNLZXksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgc3VibmV0IGdyb3VwXHJcbiAgICB0aGlzLnN1Ym5ldEdyb3VwID0gbmV3IHJkcy5TdWJuZXRHcm91cCh0aGlzLCAnU3VibmV0R3JvdXAnLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiBgRGF0YWJhc2Ugc3VibmV0IGdyb3VwIGZvciAke3Byb3BzLmVudmlyb25tZW50fWAsXHJcbiAgICAgIHZwYzogcHJvcHMudnBjLFxyXG4gICAgICB2cGNTdWJuZXRzOiB7XHJcbiAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9JU09MQVRFRCxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBwYXJhbWV0ZXIgZ3JvdXAgd2l0aCBvcHRpbWl6ZWQgc2V0dGluZ3NcclxuICAgIHRoaXMucGFyYW1ldGVyR3JvdXAgPSBuZXcgcmRzLlBhcmFtZXRlckdyb3VwKHRoaXMsICdQYXJhbWV0ZXJHcm91cCcsIHtcclxuICAgICAgZW5naW5lOiByZHMuRGF0YWJhc2VJbnN0YW5jZUVuZ2luZS5wb3N0Z3Jlcyh7XHJcbiAgICAgICAgdmVyc2lvbjogcmRzLlBvc3RncmVzRW5naW5lVmVyc2lvbi5WRVJfMTVfNCxcclxuICAgICAgfSksXHJcbiAgICAgIGRlc2NyaXB0aW9uOiBgUG9zdGdyZVNRTCBwYXJhbWV0ZXIgZ3JvdXAgZm9yICR7cHJvcHMuZW52aXJvbm1lbnR9YCxcclxuICAgICAgcGFyYW1ldGVyczoge1xyXG4gICAgICAgIC8vIENvbm5lY3Rpb24gc2V0dGluZ3NcclxuICAgICAgICAnbWF4X2Nvbm5lY3Rpb25zJzogJzIwMCcsXHJcbiAgICAgICAgJ3NoYXJlZF9wcmVsb2FkX2xpYnJhcmllcyc6ICdwZ19zdGF0X3N0YXRlbWVudHMnLFxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIE1lbW9yeSBzZXR0aW5nc1xyXG4gICAgICAgICdzaGFyZWRfYnVmZmVycyc6ICd7REJJbnN0YW5jZUNsYXNzTWVtb3J5LzR9JyxcclxuICAgICAgICAnZWZmZWN0aXZlX2NhY2hlX3NpemUnOiAne0RCSW5zdGFuY2VDbGFzc01lbW9yeSozLzR9JyxcclxuICAgICAgICAnd29ya19tZW0nOiAnNE1CJyxcclxuICAgICAgICAnbWFpbnRlbmFuY2Vfd29ya19tZW0nOiAnNjRNQicsXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQ2hlY2twb2ludCBzZXR0aW5nc1xyXG4gICAgICAgICdjaGVja3BvaW50X2NvbXBsZXRpb25fdGFyZ2V0JzogJzAuOScsXHJcbiAgICAgICAgJ3dhbF9idWZmZXJzJzogJzE2TUInLFxyXG4gICAgICAgICdkZWZhdWx0X3N0YXRpc3RpY3NfdGFyZ2V0JzogJzEwMCcsXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gTG9nZ2luZyBzZXR0aW5nc1xyXG4gICAgICAgICdsb2dfc3RhdGVtZW50JzogJ2FsbCcsXHJcbiAgICAgICAgJ2xvZ19taW5fZHVyYXRpb25fc3RhdGVtZW50JzogJzEwMDAnLFxyXG4gICAgICAgICdsb2dfY2hlY2twb2ludHMnOiAnMScsXHJcbiAgICAgICAgJ2xvZ19jb25uZWN0aW9ucyc6ICcxJyxcclxuICAgICAgICAnbG9nX2Rpc2Nvbm5lY3Rpb25zJzogJzEnLFxyXG4gICAgICAgICdsb2dfbG9ja193YWl0cyc6ICcxJyxcclxuICAgICAgICAnbG9nX3RlbXBfZmlsZXMnOiAnMCcsXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gUGVyZm9ybWFuY2Ugc2V0dGluZ3NcclxuICAgICAgICAncmFuZG9tX3BhZ2VfY29zdCc6ICcxLjEnLFxyXG4gICAgICAgICdzZXFfcGFnZV9jb3N0JzogJzEuMCcsXHJcbiAgICAgICAgJ2NwdV90dXBsZV9jb3N0JzogJzAuMDEnLFxyXG4gICAgICAgICdjcHVfaW5kZXhfdHVwbGVfY29zdCc6ICcwLjAwNScsXHJcbiAgICAgICAgJ2NwdV9vcGVyYXRvcl9jb3N0JzogJzAuMDAyNScsXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQXV0byB2YWN1dW0gc2V0dGluZ3NcclxuICAgICAgICAnYXV0b3ZhY3V1bSc6ICcxJyxcclxuICAgICAgICAnYXV0b3ZhY3V1bV9tYXhfd29ya2Vycyc6ICczJyxcclxuICAgICAgICAnYXV0b3ZhY3V1bV9uYXB0aW1lJzogJzFtaW4nLFxyXG4gICAgICAgICdhdXRvdmFjdXVtX3ZhY3V1bV90aHJlc2hvbGQnOiAnNTAnLFxyXG4gICAgICAgICdhdXRvdmFjdXVtX2FuYWx5emVfdGhyZXNob2xkJzogJzUwJyxcclxuICAgICAgICAnYXV0b3ZhY3V1bV92YWN1dW1fc2NhbGVfZmFjdG9yJzogJzAuMicsXHJcbiAgICAgICAgJ2F1dG92YWN1dW1fYW5hbHl6ZV9zY2FsZV9mYWN0b3InOiAnMC4xJyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBvcHRpb24gZ3JvdXBcclxuICAgIHRoaXMub3B0aW9uR3JvdXAgPSBuZXcgcmRzLk9wdGlvbkdyb3VwKHRoaXMsICdPcHRpb25Hcm91cCcsIHtcclxuICAgICAgZW5naW5lOiByZHMuRGF0YWJhc2VJbnN0YW5jZUVuZ2luZS5wb3N0Z3Jlcyh7XHJcbiAgICAgICAgdmVyc2lvbjogcmRzLlBvc3RncmVzRW5naW5lVmVyc2lvbi5WRVJfMTVfNCxcclxuICAgICAgfSksXHJcbiAgICAgIGNvbmZpZ3VyYXRpb25zOiBbXSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBsb2cgZ3JvdXBzIGZvciBkYXRhYmFzZSBsb2dzXHJcbiAgICBjb25zdCBsb2dHcm91cHMgPSBwcm9wcy5jb25maWcuZW5hYmxlQ2xvdWR3YXRjaExvZ3NFeHBvcnRzLm1hcChsb2dUeXBlID0+IFxyXG4gICAgICBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCBgJHtsb2dUeXBlfUxvZ0dyb3VwYCwge1xyXG4gICAgICAgIGxvZ0dyb3VwTmFtZTogYC9hd3MvcmRzL2luc3RhbmNlL3JlY3J1aXRtZW50LXdlYnNpdGUtJHtwcm9wcy5lbnZpcm9ubWVudH0vJHtsb2dUeXBlfWAsXHJcbiAgICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX01PTlRILFxyXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIC8vIENyZWF0ZSB0aGUgbWFpbiBkYXRhYmFzZSBpbnN0YW5jZVxyXG4gICAgdGhpcy5pbnN0YW5jZSA9IG5ldyByZHMuRGF0YWJhc2VJbnN0YW5jZSh0aGlzLCAnRGF0YWJhc2UnLCB7XHJcbiAgICAgIGluc3RhbmNlSWRlbnRpZmllcjogYHJlY3J1aXRtZW50LXdlYnNpdGUtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxyXG4gICAgICBlbmdpbmU6IHJkcy5EYXRhYmFzZUluc3RhbmNlRW5naW5lLnBvc3RncmVzKHtcclxuICAgICAgICB2ZXJzaW9uOiByZHMuUG9zdGdyZXNFbmdpbmVWZXJzaW9uLlZFUl8xNV80LFxyXG4gICAgICB9KSxcclxuICAgICAgaW5zdGFuY2VUeXBlOiBlYzIuSW5zdGFuY2VUeXBlLm9mKFxyXG4gICAgICAgIGVjMi5JbnN0YW5jZUNsYXNzLmZyb21TdHJpbmcocHJvcHMuY29uZmlnLmluc3RhbmNlQ2xhc3Muc3BsaXQoJy4nKVsxXSksXHJcbiAgICAgICAgZWMyLkluc3RhbmNlU2l6ZS5mcm9tU3RyaW5nKHByb3BzLmNvbmZpZy5pbnN0YW5jZUNsYXNzLnNwbGl0KCcuJylbMl0pXHJcbiAgICAgICksXHJcbiAgICAgIGNyZWRlbnRpYWxzOiByZHMuQ3JlZGVudGlhbHMuZnJvbVNlY3JldCh0aGlzLnNlY3JldCksXHJcbiAgICAgIHZwYzogcHJvcHMudnBjLFxyXG4gICAgICB2cGNTdWJuZXRzOiB7XHJcbiAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9JU09MQVRFRCxcclxuICAgICAgfSxcclxuICAgICAgc2VjdXJpdHlHcm91cHM6IFtwcm9wcy5zZWN1cml0eUdyb3VwXSxcclxuICAgICAgc3VibmV0R3JvdXA6IHRoaXMuc3VibmV0R3JvdXAsXHJcbiAgICAgIHBhcmFtZXRlckdyb3VwOiB0aGlzLnBhcmFtZXRlckdyb3VwLFxyXG4gICAgICBvcHRpb25Hcm91cDogdGhpcy5vcHRpb25Hcm91cCxcclxuICAgICAgXHJcbiAgICAgIC8vIFN0b3JhZ2UgY29uZmlndXJhdGlvblxyXG4gICAgICBhbGxvY2F0ZWRTdG9yYWdlOiBwcm9wcy5jb25maWcuYWxsb2NhdGVkU3RvcmFnZSxcclxuICAgICAgbWF4QWxsb2NhdGVkU3RvcmFnZTogcHJvcHMuY29uZmlnLm1heEFsbG9jYXRlZFN0b3JhZ2UsXHJcbiAgICAgIHN0b3JhZ2VUeXBlOiByZHMuU3RvcmFnZVR5cGUuR1AzLFxyXG4gICAgICBzdG9yYWdlRW5jcnlwdGVkOiB0cnVlLFxyXG4gICAgICBzdG9yYWdlRW5jcnlwdGlvbktleToga21zS2V5LFxyXG4gICAgICBcclxuICAgICAgLy8gSGlnaCBhdmFpbGFiaWxpdHkgYW5kIGJhY2t1cFxyXG4gICAgICBtdWx0aUF6OiBwcm9wcy5jb25maWcubXVsdGlBeixcclxuICAgICAgYmFja3VwUmV0ZW50aW9uOiBjZGsuRHVyYXRpb24uZGF5cyhwcm9wcy5jb25maWcuYmFja3VwUmV0ZW50aW9uRGF5cyksXHJcbiAgICAgIHByZWZlcnJlZEJhY2t1cFdpbmRvdzogJzAzOjAwLTA0OjAwJyxcclxuICAgICAgcHJlZmVycmVkTWFpbnRlbmFuY2VXaW5kb3c6ICdzdW46MDQ6MDAtc3VuOjA1OjAwJyxcclxuICAgICAgY29weVRhZ3NUb1NuYXBzaG90OiB0cnVlLFxyXG4gICAgICBkZWxldGlvblByb3RlY3Rpb246IHByb3BzLmNvbmZpZy5kZWxldGlvblByb3RlY3Rpb24sXHJcbiAgICAgIFxyXG4gICAgICAvLyBNb25pdG9yaW5nIGFuZCBwZXJmb3JtYW5jZVxyXG4gICAgICBtb25pdG9yaW5nSW50ZXJ2YWw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDYwKSxcclxuICAgICAgZW5hYmxlUGVyZm9ybWFuY2VJbnNpZ2h0czogcHJvcHMuY29uZmlnLnBlcmZvcm1hbmNlSW5zaWdodHMsXHJcbiAgICAgIHBlcmZvcm1hbmNlSW5zaWdodFJldGVudGlvbjogcHJvcHMuY29uZmlnLnBlcmZvcm1hbmNlSW5zaWdodHMgXHJcbiAgICAgICAgPyByZHMuUGVyZm9ybWFuY2VJbnNpZ2h0UmV0ZW50aW9uLkRFRkFVTFQgXHJcbiAgICAgICAgOiB1bmRlZmluZWQsXHJcbiAgICAgIHBlcmZvcm1hbmNlSW5zaWdodEVuY3J5cHRpb25LZXk6IHByb3BzLmNvbmZpZy5wZXJmb3JtYW5jZUluc2lnaHRzID8ga21zS2V5IDogdW5kZWZpbmVkLFxyXG4gICAgICBcclxuICAgICAgLy8gTG9nZ2luZ1xyXG4gICAgICBjbG91ZHdhdGNoTG9nc0V4cG9ydHM6IHByb3BzLmNvbmZpZy5lbmFibGVDbG91ZHdhdGNoTG9nc0V4cG9ydHMsXHJcbiAgICAgIGNsb3Vkd2F0Y2hMb2dzUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX01PTlRILFxyXG4gICAgICBcclxuICAgICAgLy8gQXV0byBtaW5vciB2ZXJzaW9uIHVwZ3JhZGVcclxuICAgICAgYXV0b01pbm9yVmVyc2lvblVwZ3JhZGU6IHRydWUsXHJcbiAgICAgIFxyXG4gICAgICAvLyBEYXRhYmFzZSBuYW1lXHJcbiAgICAgIGRhdGFiYXNlTmFtZTogJ3JlY3J1aXRtZW50X2RiJyxcclxuICAgICAgXHJcbiAgICAgIC8vIFBvcnRcclxuICAgICAgcG9ydDogNTQzMixcclxuICAgICAgXHJcbiAgICAgIC8vIE5ldHdvcmtcclxuICAgICAgYWxsb3dNYWpvclZlcnNpb25VcGdyYWRlOiBmYWxzZSxcclxuICAgICAgXHJcbiAgICAgIC8vIFJlbW92YWwgcG9saWN5XHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IHByb3BzLmNvbmZpZy5kZWxldGlvblByb3RlY3Rpb24gXHJcbiAgICAgICAgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gXHJcbiAgICAgICAgOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIHJlYWQgcmVwbGljYXMgZm9yIHByb2R1Y3Rpb25cclxuICAgIGlmIChwcm9wcy5lbnZpcm9ubWVudCA9PT0gJ3Byb2QnKSB7XHJcbiAgICAgIHRoaXMuY3JlYXRlUmVhZFJlcGxpY2FzKHByb3BzLCBrbXNLZXkpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFVwZGF0ZSB0aGUgc2VjcmV0IHdpdGggdGhlIGFjdHVhbCBkYXRhYmFzZSBlbmRwb2ludFxyXG4gICAgbmV3IHNlY3JldHNtYW5hZ2VyLlNlY3JldFRhcmdldEF0dGFjaG1lbnQodGhpcywgJ1NlY3JldEF0dGFjaG1lbnQnLCB7XHJcbiAgICAgIHNlY3JldDogdGhpcy5zZWNyZXQsXHJcbiAgICAgIHRhcmdldDogdGhpcy5pbnN0YW5jZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBDbG91ZFdhdGNoIGFsYXJtc1xyXG4gICAgdGhpcy5jcmVhdGVDbG91ZFdhdGNoQWxhcm1zKHByb3BzLmFsZXJ0c1RvcGljKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgYXV0b21hdGVkIGJhY2t1cCBtb25pdG9yaW5nXHJcbiAgICB0aGlzLmNyZWF0ZUJhY2t1cE1vbml0b3JpbmcocHJvcHMuYWxlcnRzVG9waWMpO1xyXG5cclxuICAgIC8vIEFkZCB0YWdzXHJcbiAgICBjZGsuVGFncy5vZih0aGlzLmluc3RhbmNlKS5hZGQoJ0NvbXBvbmVudCcsICdEYXRhYmFzZScpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5pbnN0YW5jZSkuYWRkKCdFbmdpbmUnLCAnUG9zdGdyZVNRTCcpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5pbnN0YW5jZSkuYWRkKCdFbnZpcm9ubWVudCcsIHByb3BzLmVudmlyb25tZW50KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlUmVhZFJlcGxpY2FzKHByb3BzOiBEYXRhYmFzZUNvbnN0cnVjdFByb3BzLCBrbXNLZXk6IGttcy5LZXkpOiB2b2lkIHtcclxuICAgIC8vIENyZWF0ZSByZWFkIHJlcGxpY2EgaW4gZGlmZmVyZW50IEFaXHJcbiAgICBjb25zdCByZWFkUmVwbGljYSA9IG5ldyByZHMuRGF0YWJhc2VJbnN0YW5jZSh0aGlzLCAnUmVhZFJlcGxpY2EnLCB7XHJcbiAgICAgIGluc3RhbmNlSWRlbnRpZmllcjogYHJlY3J1aXRtZW50LXdlYnNpdGUtJHtwcm9wcy5lbnZpcm9ubWVudH0tcmVhZGAsXHJcbiAgICAgIGVuZ2luZTogcmRzLkRhdGFiYXNlSW5zdGFuY2VFbmdpbmUucG9zdGdyZXMoe1xyXG4gICAgICAgIHZlcnNpb246IHJkcy5Qb3N0Z3Jlc0VuZ2luZVZlcnNpb24uVkVSXzE1XzQsXHJcbiAgICAgIH0pLFxyXG4gICAgICBpbnN0YW5jZVR5cGU6IGVjMi5JbnN0YW5jZVR5cGUub2YoXHJcbiAgICAgICAgZWMyLkluc3RhbmNlQ2xhc3MuZnJvbVN0cmluZyhwcm9wcy5jb25maWcuaW5zdGFuY2VDbGFzcy5zcGxpdCgnLicpWzFdKSxcclxuICAgICAgICBlYzIuSW5zdGFuY2VTaXplLmZyb21TdHJpbmcocHJvcHMuY29uZmlnLmluc3RhbmNlQ2xhc3Muc3BsaXQoJy4nKVsyXSlcclxuICAgICAgKSxcclxuICAgICAgdnBjOiBwcm9wcy52cGMsXHJcbiAgICAgIHZwY1N1Ym5ldHM6IHtcclxuICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX0lTT0xBVEVELFxyXG4gICAgICB9LFxyXG4gICAgICBzZWN1cml0eUdyb3VwczogW3Byb3BzLnNlY3VyaXR5R3JvdXBdLFxyXG4gICAgICBcclxuICAgICAgLy8gUmVhZCByZXBsaWNhIGNvbmZpZ3VyYXRpb25cclxuICAgICAgc291cmNlRGF0YWJhc2VJbnN0YW5jZTogdGhpcy5pbnN0YW5jZSxcclxuICAgICAgXHJcbiAgICAgIC8vIFN0b3JhZ2VcclxuICAgICAgc3RvcmFnZUVuY3J5cHRlZDogdHJ1ZSxcclxuICAgICAgc3RvcmFnZUVuY3J5cHRpb25LZXk6IGttc0tleSxcclxuICAgICAgXHJcbiAgICAgIC8vIE1vbml0b3JpbmdcclxuICAgICAgbW9uaXRvcmluZ0ludGVydmFsOiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksXHJcbiAgICAgIGVuYWJsZVBlcmZvcm1hbmNlSW5zaWdodHM6IHByb3BzLmNvbmZpZy5wZXJmb3JtYW5jZUluc2lnaHRzLFxyXG4gICAgICBwZXJmb3JtYW5jZUluc2lnaHRSZXRlbnRpb246IHByb3BzLmNvbmZpZy5wZXJmb3JtYW5jZUluc2lnaHRzIFxyXG4gICAgICAgID8gcmRzLlBlcmZvcm1hbmNlSW5zaWdodFJldGVudGlvbi5ERUZBVUxUIFxyXG4gICAgICAgIDogdW5kZWZpbmVkLFxyXG4gICAgICBwZXJmb3JtYW5jZUluc2lnaHRFbmNyeXB0aW9uS2V5OiBwcm9wcy5jb25maWcucGVyZm9ybWFuY2VJbnNpZ2h0cyA/IGttc0tleSA6IHVuZGVmaW5lZCxcclxuICAgICAgXHJcbiAgICAgIC8vIEF1dG8gbWlub3IgdmVyc2lvbiB1cGdyYWRlXHJcbiAgICAgIGF1dG9NaW5vclZlcnNpb25VcGdyYWRlOiB0cnVlLFxyXG4gICAgICBcclxuICAgICAgLy8gUmVtb3ZhbCBwb2xpY3lcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMucmVhZFJlcGxpY2FzLnB1c2gocmVhZFJlcGxpY2EpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjcmVhdGVDbG91ZFdhdGNoQWxhcm1zKGFsZXJ0c1RvcGljPzogc25zLlRvcGljKTogdm9pZCB7XHJcbiAgICBpZiAoIWFsZXJ0c1RvcGljKSByZXR1cm47XHJcblxyXG4gICAgLy8gQ1BVIHV0aWxpemF0aW9uIGFsYXJtXHJcbiAgICBjb25zdCBjcHVBbGFybSA9IHRoaXMuaW5zdGFuY2UubWV0cmljQ1BVVXRpbGl6YXRpb24oKS5jcmVhdGVBbGFybSh0aGlzLCAnQ1BVQWxhcm0nLCB7XHJcbiAgICAgIHRocmVzaG9sZDogODAsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnRGF0YWJhc2UgQ1BVIHV0aWxpemF0aW9uIGlzIHRvbyBoaWdoJyxcclxuICAgIH0pO1xyXG4gICAgY3B1QWxhcm0uYWRkQWxhcm1BY3Rpb24obmV3IHRhcmdldHMuU25zQWN0aW9uKGFsZXJ0c1RvcGljKSk7XHJcblxyXG4gICAgLy8gRGF0YWJhc2UgY29ubmVjdGlvbnMgYWxhcm1cclxuICAgIGNvbnN0IGNvbm5lY3Rpb25zQWxhcm0gPSB0aGlzLmluc3RhbmNlLm1ldHJpY0RhdGFiYXNlQ29ubmVjdGlvbnMoKS5jcmVhdGVBbGFybSh0aGlzLCAnQ29ubmVjdGlvbnNBbGFybScsIHtcclxuICAgICAgdGhyZXNob2xkOiAxNjAsIC8vIDgwJSBvZiBtYXhfY29ubmVjdGlvbnMgKDIwMClcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdEYXRhYmFzZSBjb25uZWN0aW9ucyBhcmUgdG9vIGhpZ2gnLFxyXG4gICAgfSk7XHJcbiAgICBjb25uZWN0aW9uc0FsYXJtLmFkZEFsYXJtQWN0aW9uKG5ldyB0YXJnZXRzLlNuc0FjdGlvbihhbGVydHNUb3BpYykpO1xyXG5cclxuICAgIC8vIEZyZWUgc3RvcmFnZSBzcGFjZSBhbGFybVxyXG4gICAgY29uc3QgZnJlZVN0b3JhZ2VBbGFybSA9IHRoaXMuaW5zdGFuY2UubWV0cmljRnJlZVN0b3JhZ2VTcGFjZSgpLmNyZWF0ZUFsYXJtKHRoaXMsICdGcmVlU3RvcmFnZUFsYXJtJywge1xyXG4gICAgICB0aHJlc2hvbGQ6IDEwICogMTAyNCAqIDEwMjQgKiAxMDI0LCAvLyAxMCBHQiBpbiBieXRlc1xyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjZGsuYXdzX2Nsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkxFU1NfVEhBTl9USFJFU0hPTEQsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdEYXRhYmFzZSBmcmVlIHN0b3JhZ2UgaXMgdG9vIGxvdycsXHJcbiAgICB9KTtcclxuICAgIGZyZWVTdG9yYWdlQWxhcm0uYWRkQWxhcm1BY3Rpb24obmV3IHRhcmdldHMuU25zQWN0aW9uKGFsZXJ0c1RvcGljKSk7XHJcblxyXG4gICAgLy8gUmVhZCBsYXRlbmN5IGFsYXJtXHJcbiAgICBjb25zdCByZWFkTGF0ZW5jeUFsYXJtID0gdGhpcy5pbnN0YW5jZS5tZXRyaWNSZWFkTGF0ZW5jeSgpLmNyZWF0ZUFsYXJtKHRoaXMsICdSZWFkTGF0ZW5jeUFsYXJtJywge1xyXG4gICAgICB0aHJlc2hvbGQ6IDAuMiwgLy8gMjAwbXNcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdEYXRhYmFzZSByZWFkIGxhdGVuY3kgaXMgdG9vIGhpZ2gnLFxyXG4gICAgfSk7XHJcbiAgICByZWFkTGF0ZW5jeUFsYXJtLmFkZEFsYXJtQWN0aW9uKG5ldyB0YXJnZXRzLlNuc0FjdGlvbihhbGVydHNUb3BpYykpO1xyXG5cclxuICAgIC8vIFdyaXRlIGxhdGVuY3kgYWxhcm1cclxuICAgIGNvbnN0IHdyaXRlTGF0ZW5jeUFsYXJtID0gdGhpcy5pbnN0YW5jZS5tZXRyaWNXcml0ZUxhdGVuY3koKS5jcmVhdGVBbGFybSh0aGlzLCAnV3JpdGVMYXRlbmN5QWxhcm0nLCB7XHJcbiAgICAgIHRocmVzaG9sZDogMC4yLCAvLyAyMDBtc1xyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0RhdGFiYXNlIHdyaXRlIGxhdGVuY3kgaXMgdG9vIGhpZ2gnLFxyXG4gICAgfSk7XHJcbiAgICB3cml0ZUxhdGVuY3lBbGFybS5hZGRBbGFybUFjdGlvbihuZXcgdGFyZ2V0cy5TbnNBY3Rpb24oYWxlcnRzVG9waWMpKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlQmFja3VwTW9uaXRvcmluZyhhbGVydHNUb3BpYz86IHNucy5Ub3BpYyk6IHZvaWQge1xyXG4gICAgaWYgKCFhbGVydHNUb3BpYykgcmV0dXJuO1xyXG5cclxuICAgIC8vIENyZWF0ZSBFdmVudEJyaWRnZSBydWxlIGZvciBiYWNrdXAgZmFpbHVyZXNcclxuICAgIGNvbnN0IGJhY2t1cEZhaWx1cmVSdWxlID0gbmV3IGV2ZW50cy5SdWxlKHRoaXMsICdCYWNrdXBGYWlsdXJlUnVsZScsIHtcclxuICAgICAgZXZlbnRQYXR0ZXJuOiB7XHJcbiAgICAgICAgc291cmNlOiBbJ2F3cy5yZHMnXSxcclxuICAgICAgICBkZXRhaWxUeXBlOiBbJ1JEUyBEQiBJbnN0YW5jZSBFdmVudCddLFxyXG4gICAgICAgIGRldGFpbDoge1xyXG4gICAgICAgICAgRXZlbnRDYXRlZ29yaWVzOiBbJ2JhY2t1cCddLFxyXG4gICAgICAgICAgTWVzc2FnZTogW3sgcHJlZml4OiAnQmFja3VwIGZhaWxlZCcgfV0sXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGJhY2t1cEZhaWx1cmVSdWxlLmFkZFRhcmdldChuZXcgdGFyZ2V0cy5TbnNUb3BpYyhhbGVydHNUb3BpYywge1xyXG4gICAgICBtZXNzYWdlOiBldmVudHMuUnVsZVRhcmdldElucHV0LmZyb21UZXh0KFxyXG4gICAgICAgICdEYXRhYmFzZSBiYWNrdXAgZmFpbGVkIGZvciBpbnN0YW5jZTogJyArIHRoaXMuaW5zdGFuY2UuaW5zdGFuY2VJZGVudGlmaWVyXHJcbiAgICAgICksXHJcbiAgICB9KSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgYSBkYXRhYmFzZSBtaWdyYXRpb24gTGFtYmRhIGZ1bmN0aW9uXHJcbiAgICovXHJcbiAgcHVibGljIGNyZWF0ZU1pZ3JhdGlvbkZ1bmN0aW9uKCk6IHZvaWQge1xyXG4gICAgLy8gVGhpcyB3b3VsZCB0eXBpY2FsbHkgYmUgaW1wbGVtZW50ZWQgd2l0aCBhIExhbWJkYSBmdW5jdGlvblxyXG4gICAgLy8gdGhhdCBydW5zIGRhdGFiYXNlIG1pZ3JhdGlvbnMgZHVyaW5nIGRlcGxveW1lbnRcclxuICAgIC8vIEZvciBub3csIHdlJ2xsIHVzZSBFQ1MgdGFzayBmb3IgbWlncmF0aW9ucyAoaW1wbGVtZW50ZWQgaW4gRWNzQ29uc3RydWN0KVxyXG4gIH1cclxufSJdfQ==