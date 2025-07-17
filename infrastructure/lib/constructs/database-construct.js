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
const rds = __importStar(require("aws-cdk-lib/aws-rds"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const constructs_1 = require("constructs");
class DatabaseConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
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
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, this.getInstanceSize(props.config.instanceClass)),
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
    createKmsKey(environmentName) {
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
    getInstanceSize(instanceClass) {
        const sizeMap = {
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
    createDatabaseAlarms(environmentName) {
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
        this.alarms = [cpuAlarm, connectionsAlarm, storageAlarm];
    }
    addTags(environmentName) {
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
    createReadReplica(id, config) {
        return new rds.DatabaseInstanceReadReplica(this, id, {
            sourceDatabaseInstance: this.database,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, this.getInstanceSize(config.instanceClass)),
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
    addDatabaseConnectionFromSecurityGroup(securityGroup, description) {
        this.database.connections.allowFrom(securityGroup, ec2.Port.tcp(5432), description);
    }
}
exports.DatabaseConstruct = DatabaseConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWJhc2UtY29uc3RydWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGF0YWJhc2UtY29uc3RydWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLCtFQUFpRTtBQUNqRSx5REFBMkM7QUFDM0MsMkRBQTZDO0FBQzdDLDJDQUF1QztBQWdCdkMsTUFBYSxpQkFBa0IsU0FBUSxzQkFBUztJQVM5QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTZCO1FBQ3JFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsZ0RBQWdEO1FBQ2hELE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7UUFFL0UscUNBQXFDO1FBQ3JDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUM5RCxVQUFVLEVBQUUsZUFBZSxLQUFLLENBQUMsZUFBZSx1QkFBdUI7WUFDdkUsV0FBVyxFQUFFLGtEQUFrRDtZQUMvRCxvQkFBb0IsRUFBRTtnQkFDcEIsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsQ0FBQztnQkFDOUQsaUJBQWlCLEVBQUUsVUFBVTtnQkFDN0IsaUJBQWlCLEVBQUUsT0FBTztnQkFDMUIsWUFBWSxFQUFFLEtBQUs7Z0JBQ25CLGNBQWMsRUFBRSxFQUFFO2FBQ25CO1lBQ0QsYUFBYSxFQUFFLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxTQUFTO1NBQ2xFLENBQUMsQ0FBQztRQUVILCtCQUErQjtRQUMvQixJQUFJ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ZUFBZSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FDM0M7WUFDRCxHQUFHLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHO1lBQ3RCLFVBQVUsRUFBRTtnQkFDVixVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0I7YUFDNUM7WUFDRCxjQUFjLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsY0FBYztZQUN4RCxjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWM7WUFDbkMseUJBQXlCLEVBQUUsTUFBTSxDQUFDLG1CQUFtQjtZQUNyRCxrQkFBa0IsRUFBRSxNQUFNLENBQUMsa0JBQWtCLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pELEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pELFNBQVM7WUFDWCxjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWM7WUFDbkMsc0JBQXNCLEVBQUUsTUFBTSxDQUFDLHNCQUFzQjtZQUNyRCxrQkFBa0IsRUFBRSxNQUFNLENBQUMsa0JBQWtCO1lBQzdDLGtCQUFrQixFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsZUFBZTtTQUN2RSxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU0sc0NBQXNDLENBQUMsYUFBZ0MsRUFBRSxXQUFtQjtRQUNqRyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBQ3RGLENBQUM7Q0FDRjtBQWhTRCw4Q0FnU0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyByZHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJkcyc7XHJcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcclxuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcclxuaW1wb3J0ICogYXMga21zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1rbXMnO1xyXG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCB7IERhdGFiYXNlQ29uZmlnIH0gZnJvbSAnLi4vY29uZmlnL3R5cGVzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRGF0YWJhc2VDb25zdHJ1Y3RQcm9wcyB7XHJcbiAgY29uZmlnOiBEYXRhYmFzZUNvbmZpZztcclxuICBlbnZpcm9ubWVudE5hbWU6IHN0cmluZztcclxuICB2cGM6IGVjMi5WcGM7XHJcbiAgc2VjdXJpdHlHcm91cDogZWMyLlNlY3VyaXR5R3JvdXA7XHJcbiAgZW5hYmxlRW5jcnlwdGlvbj86IGJvb2xlYW47XHJcbiAgZW5hYmxlUGVyZm9ybWFuY2VJbnNpZ2h0cz86IGJvb2xlYW47XHJcbiAgZW5hYmxlRW5oYW5jZWRNb25pdG9yaW5nPzogYm9vbGVhbjtcclxuICBlbmFibGVCYWNrdXBzPzogYm9vbGVhbjtcclxuICBlbmFibGVMb2dnaW5nPzogYm9vbGVhbjtcclxuICBrbXNLZXk/OiBrbXMuS2V5O1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRGF0YWJhc2VDb25zdHJ1Y3QgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHB1YmxpYyByZWFkb25seSBkYXRhYmFzZTogcmRzLkRhdGFiYXNlSW5zdGFuY2U7XHJcbiAgcHVibGljIHJlYWRvbmx5IHNlY3JldDogc2VjcmV0c21hbmFnZXIuU2VjcmV0O1xyXG4gIHB1YmxpYyByZWFkb25seSBzdWJuZXRHcm91cDogcmRzLlN1Ym5ldEdyb3VwO1xyXG4gIHB1YmxpYyByZWFkb25seSBwYXJhbWV0ZXJHcm91cDogcmRzLlBhcmFtZXRlckdyb3VwO1xyXG4gIHB1YmxpYyByZWFkb25seSBvcHRpb25Hcm91cD86IHJkcy5PcHRpb25Hcm91cDtcclxuICBwdWJsaWMgcmVhZG9ubHkgbG9nR3JvdXA/OiBsb2dzLkxvZ0dyb3VwO1xyXG4gIHB1YmxpYyByZWFkb25seSBtb25pdG9yaW5nUm9sZT86IGNkay5hd3NfaWFtLlJvbGU7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBEYXRhYmFzZUNvbnN0cnVjdFByb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBLTVMga2V5IGZvciBlbmNyeXB0aW9uIGlmIG5vdCBwcm92aWRlZFxyXG4gICAgY29uc3QgZW5jcnlwdGlvbktleSA9IHByb3BzLmttc0tleSB8fCB0aGlzLmNyZWF0ZUttc0tleShwcm9wcy5lbnZpcm9ubWVudE5hbWUpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBkYXRhYmFzZSBjcmVkZW50aWFscyBzZWNyZXRcclxuICAgIHRoaXMuc2VjcmV0ID0gbmV3IHNlY3JldHNtYW5hZ2VyLlNlY3JldCh0aGlzLCAnRGF0YWJhc2VTZWNyZXQnLCB7XHJcbiAgICAgIHNlY3JldE5hbWU6IGByZWNydWl0bWVudC0ke3Byb3BzLmVudmlyb25tZW50TmFtZX0tZGF0YWJhc2UtY3JlZGVudGlhbHNgLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0RhdGFiYXNlIGNyZWRlbnRpYWxzIGZvciByZWNydWl0bWVudCBhcHBsaWNhdGlvbicsXHJcbiAgICAgIGdlbmVyYXRlU2VjcmV0U3RyaW5nOiB7XHJcbiAgICAgICAgc2VjcmV0U3RyaW5nVGVtcGxhdGU6IEpTT04uc3RyaW5naWZ5KHsgdXNlcm5hbWU6ICdwb3N0Z3JlcycgfSksXHJcbiAgICAgICAgZ2VuZXJhdGVTdHJpbmdLZXk6ICdwYXNzd29yZCcsXHJcbiAgICAgICAgZXhjbHVkZUNoYXJhY3RlcnM6ICdcIkAvXFxcXCcsXHJcbiAgICAgICAgaW5jbHVkZVNwYWNlOiBmYWxzZSxcclxuICAgICAgICBwYXNzd29yZExlbmd0aDogMzIsXHJcbiAgICAgIH0sXHJcbiAgICAgIGVuY3J5cHRpb25LZXk6IHByb3BzLmVuYWJsZUVuY3J5cHRpb24gPyBlbmNyeXB0aW9uS2V5IDogdW5kZWZpbmVkLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGRhdGFiYXNlIHN1Ym5ldCBncm91cFxyXG4gICAgdGhpcy5zdWJuZXRHcm91cCA9IG5ldyByZHMuU3VibmV0R3JvdXAodGhpcywgJ0RhdGFiYXNlU3VibmV0R3JvdXAnLCB7XHJcbiAgICAgIHZwYzogcHJvcHMudnBjLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1N1Ym5ldCBncm91cCBmb3IgUkRTIGRhdGFiYXNlJyxcclxuICAgICAgdnBjU3VibmV0czoge1xyXG4gICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfSVNPTEFURUQsXHJcbiAgICAgIH0sXHJcbiAgICAgIHN1Ym5ldEdyb3VwTmFtZTogYHJlY3J1aXRtZW50LSR7cHJvcHMuZW52aXJvbm1lbnROYW1lfS1kYi1zdWJuZXQtZ3JvdXBgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIHBhcmFtZXRlciBncm91cFxyXG4gICAgdGhpcy5wYXJhbWV0ZXJHcm91cCA9IG5ldyByZHMuUGFyYW1ldGVyR3JvdXAodGhpcywgJ0RhdGFiYXNlUGFyYW1ldGVyR3JvdXAnLCB7XHJcbiAgICAgIGVuZ2luZTogcmRzLkRhdGFiYXNlSW5zdGFuY2VFbmdpbmUucG9zdGdyZXMoe1xyXG4gICAgICAgIHZlcnNpb246IHJkcy5Qb3N0Z3Jlc0VuZ2luZVZlcnNpb24uVkVSXzE1XzQsXHJcbiAgICAgIH0pLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1BhcmFtZXRlciBncm91cCBmb3IgUG9zdGdyZVNRTCBkYXRhYmFzZScsXHJcbiAgICAgIHBhcmFtZXRlcnM6IHtcclxuICAgICAgICAnc2hhcmVkX3ByZWxvYWRfbGlicmFyaWVzJzogJ3BnX3N0YXRfc3RhdGVtZW50cycsXHJcbiAgICAgICAgJ2xvZ19zdGF0ZW1lbnQnOiAnYWxsJyxcclxuICAgICAgICAnbG9nX21pbl9kdXJhdGlvbl9zdGF0ZW1lbnQnOiAnMTAwMCcsXHJcbiAgICAgICAgJ2xvZ19saW5lX3ByZWZpeCc6ICcldDolcjoldUAlZDpbJXBdOicsXHJcbiAgICAgICAgJ2xvZ19jaGVja3BvaW50cyc6ICdvbicsXHJcbiAgICAgICAgJ2xvZ19jb25uZWN0aW9ucyc6ICdvbicsXHJcbiAgICAgICAgJ2xvZ19kaXNjb25uZWN0aW9ucyc6ICdvbicsXHJcbiAgICAgICAgJ2xvZ19sb2NrX3dhaXRzJzogJ29uJyxcclxuICAgICAgICAnbG9nX3RlbXBfZmlsZXMnOiAnMCcsXHJcbiAgICAgICAgJ21haW50ZW5hbmNlX3dvcmtfbWVtJzogJzI1Nk1CJyxcclxuICAgICAgICAnZWZmZWN0aXZlX2NhY2hlX3NpemUnOiAnMUdCJyxcclxuICAgICAgICAnd29ya19tZW0nOiAnMTZNQicsXHJcbiAgICAgICAgJ3JhbmRvbV9wYWdlX2Nvc3QnOiAnMS4xJyxcclxuICAgICAgICAnZWZmZWN0aXZlX2lvX2NvbmN1cnJlbmN5JzogJzIwMCcsXHJcbiAgICAgICAgJ21heF9jb25uZWN0aW9ucyc6ICcxMDAnLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIG1vbml0b3Jpbmcgcm9sZSBmb3IgZW5oYW5jZWQgbW9uaXRvcmluZ1xyXG4gICAgaWYgKHByb3BzLmVuYWJsZUVuaGFuY2VkTW9uaXRvcmluZyAmJiBwcm9wcy5jb25maWcubW9uaXRvcmluZ0ludGVydmFsID4gMCkge1xyXG4gICAgICB0aGlzLm1vbml0b3JpbmdSb2xlID0gbmV3IGNkay5hd3NfaWFtLlJvbGUodGhpcywgJ01vbml0b3JpbmdSb2xlJywge1xyXG4gICAgICAgIGFzc3VtZWRCeTogbmV3IGNkay5hd3NfaWFtLlNlcnZpY2VQcmluY2lwYWwoJ21vbml0b3JpbmcucmRzLmFtYXpvbmF3cy5jb20nKSxcclxuICAgICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcclxuICAgICAgICAgIGNkay5hd3NfaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdzZXJ2aWNlLXJvbGUvQW1hem9uUkRTRW5oYW5jZWRNb25pdG9yaW5nUm9sZScpLFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBDbG91ZFdhdGNoIGxvZyBncm91cCBpZiBsb2dnaW5nIGlzIGVuYWJsZWRcclxuICAgIGlmIChwcm9wcy5lbmFibGVMb2dnaW5nKSB7XHJcbiAgICAgIHRoaXMubG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnRGF0YWJhc2VMb2dHcm91cCcsIHtcclxuICAgICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL3Jkcy9pbnN0YW5jZS9yZWNydWl0bWVudC0ke3Byb3BzLmVudmlyb25tZW50TmFtZX0tcG9zdGdyZXMvcG9zdGdyZXNxbGAsXHJcbiAgICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX01PTlRILFxyXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBSRFMgZGF0YWJhc2UgaW5zdGFuY2VcclxuICAgIHRoaXMuZGF0YWJhc2UgPSBuZXcgcmRzLkRhdGFiYXNlSW5zdGFuY2UodGhpcywgJ0RhdGFiYXNlJywge1xyXG4gICAgICBlbmdpbmU6IHJkcy5EYXRhYmFzZUluc3RhbmNlRW5naW5lLnBvc3RncmVzKHtcclxuICAgICAgICB2ZXJzaW9uOiByZHMuUG9zdGdyZXNFbmdpbmVWZXJzaW9uLlZFUl8xNV80LFxyXG4gICAgICB9KSxcclxuICAgICAgaW5zdGFuY2VUeXBlOiBlYzIuSW5zdGFuY2VUeXBlLm9mKFxyXG4gICAgICAgIGVjMi5JbnN0YW5jZUNsYXNzLlQzLFxyXG4gICAgICAgIHRoaXMuZ2V0SW5zdGFuY2VTaXplKHByb3BzLmNvbmZpZy5pbnN0YW5jZUNsYXNzKVxyXG4gICAgICApLFxyXG4gICAgICB2cGM6IHByb3BzLnZwYyxcclxuICAgICAgdnBjU3VibmV0czoge1xyXG4gICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfSVNPTEFURUQsXHJcbiAgICAgIH0sXHJcbiAgICAgIHNlY3VyaXR5R3JvdXBzOiBbcHJvcHMuc2VjdXJpdHlHcm91cF0sXHJcbiAgICAgIHN1Ym5ldEdyb3VwOiB0aGlzLnN1Ym5ldEdyb3VwLFxyXG4gICAgICBwYXJhbWV0ZXJHcm91cDogdGhpcy5wYXJhbWV0ZXJHcm91cCxcclxuICAgICAgXHJcbiAgICAgIC8vIERhdGFiYXNlIGNvbmZpZ3VyYXRpb25cclxuICAgICAgZGF0YWJhc2VOYW1lOiAncmVjcnVpdG1lbnQnLFxyXG4gICAgICBjcmVkZW50aWFsczogcmRzLkNyZWRlbnRpYWxzLmZyb21TZWNyZXQodGhpcy5zZWNyZXQpLFxyXG4gICAgICBcclxuICAgICAgLy8gU3RvcmFnZSBjb25maWd1cmF0aW9uXHJcbiAgICAgIGFsbG9jYXRlZFN0b3JhZ2U6IHByb3BzLmNvbmZpZy5hbGxvY2F0ZWRTdG9yYWdlLFxyXG4gICAgICBtYXhBbGxvY2F0ZWRTdG9yYWdlOiBwcm9wcy5jb25maWcubWF4QWxsb2NhdGVkU3RvcmFnZSxcclxuICAgICAgc3RvcmFnZVR5cGU6IHJkcy5TdG9yYWdlVHlwZS5HUDIsXHJcbiAgICAgIHN0b3JhZ2VFbmNyeXB0ZWQ6IHByb3BzLmVuYWJsZUVuY3J5cHRpb24sXHJcbiAgICAgIHN0b3JhZ2VFbmNyeXB0aW9uS2V5OiBwcm9wcy5lbmFibGVFbmNyeXB0aW9uID8gZW5jcnlwdGlvbktleSA6IHVuZGVmaW5lZCxcclxuICAgICAgXHJcbiAgICAgIC8vIEJhY2t1cCBjb25maWd1cmF0aW9uXHJcbiAgICAgIGJhY2t1cFJldGVudGlvbjogcHJvcHMuZW5hYmxlQmFja3VwcyA/IFxyXG4gICAgICAgIGNkay5EdXJhdGlvbi5kYXlzKHByb3BzLmNvbmZpZy5iYWNrdXBSZXRlbnRpb24pIDogXHJcbiAgICAgICAgY2RrLkR1cmF0aW9uLmRheXMoMCksXHJcbiAgICAgIHByZWZlcnJlZEJhY2t1cFdpbmRvdzogJzAzOjAwLTA0OjAwJyxcclxuICAgICAgcHJlZmVycmVkTWFpbnRlbmFuY2VXaW5kb3c6ICdzdW46MDQ6MDAtc3VuOjA1OjAwJyxcclxuICAgICAgY29weVRhZ3NUb1NuYXBzaG90OiB0cnVlLFxyXG4gICAgICBkZWxldGVBdXRvbWF0ZWRCYWNrdXBzOiBwcm9wcy5jb25maWcuZGVsZXRlQXV0b21hdGVkQmFja3VwcyxcclxuICAgICAgZGVsZXRpb25Qcm90ZWN0aW9uOiBwcm9wcy5jb25maWcuZGVsZXRpb25Qcm90ZWN0aW9uLFxyXG4gICAgICBcclxuICAgICAgLy8gQXZhaWxhYmlsaXR5IGNvbmZpZ3VyYXRpb25cclxuICAgICAgbXVsdGlBejogcHJvcHMuY29uZmlnLm11bHRpQXosXHJcbiAgICAgIGF2YWlsYWJpbGl0eVpvbmU6IHByb3BzLmNvbmZpZy5tdWx0aUF6ID8gdW5kZWZpbmVkIDogcHJvcHMudnBjLmF2YWlsYWJpbGl0eVpvbmVzWzBdLFxyXG4gICAgICBcclxuICAgICAgLy8gTW9uaXRvcmluZyBjb25maWd1cmF0aW9uXHJcbiAgICAgIG1vbml0b3JpbmdJbnRlcnZhbDogcHJvcHMuZW5hYmxlRW5oYW5jZWRNb25pdG9yaW5nID8gXHJcbiAgICAgICAgY2RrLkR1cmF0aW9uLnNlY29uZHMocHJvcHMuY29uZmlnLm1vbml0b3JpbmdJbnRlcnZhbCkgOiBcclxuICAgICAgICB1bmRlZmluZWQsXHJcbiAgICAgIG1vbml0b3JpbmdSb2xlOiB0aGlzLm1vbml0b3JpbmdSb2xlLFxyXG4gICAgICBlbmFibGVQZXJmb3JtYW5jZUluc2lnaHRzOiBwcm9wcy5lbmFibGVQZXJmb3JtYW5jZUluc2lnaHRzICYmIHByb3BzLmNvbmZpZy5wZXJmb3JtYW5jZUluc2lnaHRzLFxyXG4gICAgICBwZXJmb3JtYW5jZUluc2lnaHRSZXRlbnRpb246IHByb3BzLmVuYWJsZVBlcmZvcm1hbmNlSW5zaWdodHMgPyBcclxuICAgICAgICByZHMuUGVyZm9ybWFuY2VJbnNpZ2h0UmV0ZW50aW9uLkRFRkFVTFQgOiBcclxuICAgICAgICB1bmRlZmluZWQsXHJcbiAgICAgIHBlcmZvcm1hbmNlSW5zaWdodEVuY3J5cHRpb25LZXk6IHByb3BzLmVuYWJsZVBlcmZvcm1hbmNlSW5zaWdodHMgJiYgcHJvcHMuZW5hYmxlRW5jcnlwdGlvbiA/IFxyXG4gICAgICAgIGVuY3J5cHRpb25LZXkgOiBcclxuICAgICAgICB1bmRlZmluZWQsXHJcbiAgICAgIFxyXG4gICAgICAvLyBMb2dnaW5nIGNvbmZpZ3VyYXRpb25cclxuICAgICAgY2xvdWR3YXRjaExvZ3NFeHBvcnRzOiBwcm9wcy5lbmFibGVMb2dnaW5nID8gWydwb3N0Z3Jlc3FsJ10gOiB1bmRlZmluZWQsXHJcbiAgICAgIFxyXG4gICAgICAvLyBTZWN1cml0eSBjb25maWd1cmF0aW9uXHJcbiAgICAgIGlhbUF1dGhlbnRpY2F0aW9uOiBmYWxzZSxcclxuICAgICAgXHJcbiAgICAgIC8vIE5hbWluZ1xyXG4gICAgICBpbnN0YW5jZUlkZW50aWZpZXI6IGByZWNydWl0bWVudC0ke3Byb3BzLmVudmlyb25tZW50TmFtZX0tcG9zdGdyZXNgLFxyXG4gICAgICBcclxuICAgICAgLy8gUmVtb3ZhbCBwb2xpY3lcclxuICAgICAgcmVtb3ZhbFBvbGljeTogcHJvcHMuZW52aXJvbm1lbnROYW1lID09PSAncHJvZCcgPyBcclxuICAgICAgICBjZGsuUmVtb3ZhbFBvbGljeS5TTkFQU0hPVCA6IFxyXG4gICAgICAgIGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgZGF0YWJhc2UgYWxhcm1zIGlmIG1vbml0b3JpbmcgaXMgZW5hYmxlZFxyXG4gICAgaWYgKHByb3BzLmVuYWJsZUVuaGFuY2VkTW9uaXRvcmluZykge1xyXG4gICAgICB0aGlzLmNyZWF0ZURhdGFiYXNlQWxhcm1zKHByb3BzLmVudmlyb25tZW50TmFtZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQWRkIHRhZ3NcclxuICAgIHRoaXMuYWRkVGFncyhwcm9wcy5lbnZpcm9ubWVudE5hbWUpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjcmVhdGVLbXNLZXkoZW52aXJvbm1lbnROYW1lOiBzdHJpbmcpOiBrbXMuS2V5IHtcclxuICAgIHJldHVybiBuZXcga21zLktleSh0aGlzLCAnRGF0YWJhc2VFbmNyeXB0aW9uS2V5Jywge1xyXG4gICAgICBkZXNjcmlwdGlvbjogYEtNUyBrZXkgZm9yIGRhdGFiYXNlIGVuY3J5cHRpb24gLSAke2Vudmlyb25tZW50TmFtZX1gLFxyXG4gICAgICBlbmFibGVLZXlSb3RhdGlvbjogdHJ1ZSxcclxuICAgICAgYWxpYXM6IGByZWNydWl0bWVudC0ke2Vudmlyb25tZW50TmFtZX0tZGF0YWJhc2Uta2V5YCxcclxuICAgICAgcG9saWN5OiBuZXcgY2RrLmF3c19pYW0uUG9saWN5RG9jdW1lbnQoe1xyXG4gICAgICAgIHN0YXRlbWVudHM6IFtcclxuICAgICAgICAgIG5ldyBjZGsuYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICBzaWQ6ICdFbmFibGUgSUFNIFVzZXIgUGVybWlzc2lvbnMnLFxyXG4gICAgICAgICAgICBlZmZlY3Q6IGNkay5hd3NfaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgcHJpbmNpcGFsczogW25ldyBjZGsuYXdzX2lhbS5BY2NvdW50Um9vdFByaW5jaXBhbCgpXSxcclxuICAgICAgICAgICAgYWN0aW9uczogWydrbXM6KiddLFxyXG4gICAgICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBuZXcgY2RrLmF3c19pYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgc2lkOiAnQWxsb3cgUkRTIFNlcnZpY2UnLFxyXG4gICAgICAgICAgICBlZmZlY3Q6IGNkay5hd3NfaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgcHJpbmNpcGFsczogW25ldyBjZGsuYXdzX2lhbS5TZXJ2aWNlUHJpbmNpcGFsKCdyZHMuYW1hem9uYXdzLmNvbScpXSxcclxuICAgICAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgICAgICdrbXM6RGVjcnlwdCcsXHJcbiAgICAgICAgICAgICAgJ2ttczpHZW5lcmF0ZURhdGFLZXknLFxyXG4gICAgICAgICAgICAgICdrbXM6Q3JlYXRlR3JhbnQnLFxyXG4gICAgICAgICAgICAgICdrbXM6RGVzY3JpYmVLZXknLFxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgfSksXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZ2V0SW5zdGFuY2VTaXplKGluc3RhbmNlQ2xhc3M6IHN0cmluZyk6IGVjMi5JbnN0YW5jZVNpemUge1xyXG4gICAgY29uc3Qgc2l6ZU1hcDogeyBba2V5OiBzdHJpbmddOiBlYzIuSW5zdGFuY2VTaXplIH0gPSB7XHJcbiAgICAgICdkYi50My5taWNybyc6IGVjMi5JbnN0YW5jZVNpemUuTUlDUk8sXHJcbiAgICAgICdkYi50My5zbWFsbCc6IGVjMi5JbnN0YW5jZVNpemUuU01BTEwsXHJcbiAgICAgICdkYi50My5tZWRpdW0nOiBlYzIuSW5zdGFuY2VTaXplLk1FRElVTSxcclxuICAgICAgJ2RiLnQzLmxhcmdlJzogZWMyLkluc3RhbmNlU2l6ZS5MQVJHRSxcclxuICAgICAgJ2RiLnI1LmxhcmdlJzogZWMyLkluc3RhbmNlU2l6ZS5MQVJHRSxcclxuICAgICAgJ2RiLnI1LnhsYXJnZSc6IGVjMi5JbnN0YW5jZVNpemUuWExBUkdFLFxyXG4gICAgICAnZGIucjUuMnhsYXJnZSc6IGVjMi5JbnN0YW5jZVNpemUuWExBUkdFMixcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHNpemVNYXBbaW5zdGFuY2VDbGFzc10gfHwgZWMyLkluc3RhbmNlU2l6ZS5NSUNSTztcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlRGF0YWJhc2VBbGFybXMoZW52aXJvbm1lbnROYW1lOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIC8vIENQVSBVdGlsaXphdGlvbiBhbGFybVxyXG4gICAgY29uc3QgY3B1QWxhcm0gPSBuZXcgY2RrLmF3c19jbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdEYXRhYmFzZUNwdUFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6IGByZWNydWl0bWVudC0ke2Vudmlyb25tZW50TmFtZX0tZGF0YWJhc2UtY3B1LXV0aWxpemF0aW9uYCxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0RhdGFiYXNlIENQVSB1dGlsaXphdGlvbiBpcyBoaWdoJyxcclxuICAgICAgbWV0cmljOiB0aGlzLmRhdGFiYXNlLm1ldHJpY0NQVVV0aWxpemF0aW9uKCksXHJcbiAgICAgIHRocmVzaG9sZDogODAsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNkay5hd3NfY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2RrLmF3c19jbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIERhdGFiYXNlIGNvbm5lY3Rpb25zIGFsYXJtXHJcbiAgICBjb25zdCBjb25uZWN0aW9uc0FsYXJtID0gbmV3IGNkay5hd3NfY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnRGF0YWJhc2VDb25uZWN0aW9uc0FsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6IGByZWNydWl0bWVudC0ke2Vudmlyb25tZW50TmFtZX0tZGF0YWJhc2UtY29ubmVjdGlvbnNgLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnRGF0YWJhc2UgY29ubmVjdGlvbnMgYXJlIGhpZ2gnLFxyXG4gICAgICBtZXRyaWM6IHRoaXMuZGF0YWJhc2UubWV0cmljRGF0YWJhc2VDb25uZWN0aW9ucygpLFxyXG4gICAgICB0aHJlc2hvbGQ6IDgwLFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjZGsuYXdzX2Nsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXHJcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNkay5hd3NfY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBGcmVlIHN0b3JhZ2Ugc3BhY2UgYWxhcm1cclxuICAgIGNvbnN0IHN0b3JhZ2VBbGFybSA9IG5ldyBjZGsuYXdzX2Nsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0RhdGFiYXNlU3RvcmFnZUFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6IGByZWNydWl0bWVudC0ke2Vudmlyb25tZW50TmFtZX0tZGF0YWJhc2UtZnJlZS1zdG9yYWdlYCxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0RhdGFiYXNlIGZyZWUgc3RvcmFnZSBzcGFjZSBpcyBsb3cnLFxyXG4gICAgICBtZXRyaWM6IHRoaXMuZGF0YWJhc2UubWV0cmljRnJlZVN0b3JhZ2VTcGFjZSgpLFxyXG4gICAgICB0aHJlc2hvbGQ6IDIgKiAxMDI0ICogMTAyNCAqIDEwMjQsIC8vIDIgR0IgaW4gYnl0ZXNcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2RrLmF3c19jbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5MRVNTX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjZGsuYXdzX2Nsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIGFsYXJtcyB0byBhIGxpc3QgZm9yIGV4dGVybmFsIHJlZmVyZW5jZVxyXG4gICAgKHRoaXMgYXMgYW55KS5hbGFybXMgPSBbY3B1QWxhcm0sIGNvbm5lY3Rpb25zQWxhcm0sIHN0b3JhZ2VBbGFybV07XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFkZFRhZ3MoZW52aXJvbm1lbnROYW1lOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIGNvbnN0IHRhZ3MgPSB7XHJcbiAgICAgIEVudmlyb25tZW50OiBlbnZpcm9ubWVudE5hbWUsXHJcbiAgICAgIENvbXBvbmVudDogJ0RhdGFiYXNlJyxcclxuICAgICAgTWFuYWdlZEJ5OiAnQ0RLJyxcclxuICAgICAgQmFja3VwUmVxdWlyZWQ6ICd0cnVlJyxcclxuICAgIH07XHJcblxyXG4gICAgT2JqZWN0LmVudHJpZXModGFncykuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XHJcbiAgICAgIGNkay5UYWdzLm9mKHRoaXMuZGF0YWJhc2UpLmFkZChrZXksIHZhbHVlKTtcclxuICAgICAgY2RrLlRhZ3Mub2YodGhpcy5zZWNyZXQpLmFkZChrZXksIHZhbHVlKTtcclxuICAgICAgY2RrLlRhZ3Mub2YodGhpcy5zdWJuZXRHcm91cCkuYWRkKGtleSwgdmFsdWUpO1xyXG4gICAgICBjZGsuVGFncy5vZih0aGlzLnBhcmFtZXRlckdyb3VwKS5hZGQoa2V5LCB2YWx1ZSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBjcmVhdGVSZWFkUmVwbGljYShpZDogc3RyaW5nLCBjb25maWc6IERhdGFiYXNlQ29uZmlnKTogcmRzLkRhdGFiYXNlSW5zdGFuY2VSZWFkUmVwbGljYSB7XHJcbiAgICByZXR1cm4gbmV3IHJkcy5EYXRhYmFzZUluc3RhbmNlUmVhZFJlcGxpY2EodGhpcywgaWQsIHtcclxuICAgICAgc291cmNlRGF0YWJhc2VJbnN0YW5jZTogdGhpcy5kYXRhYmFzZSxcclxuICAgICAgaW5zdGFuY2VUeXBlOiBlYzIuSW5zdGFuY2VUeXBlLm9mKFxyXG4gICAgICAgIGVjMi5JbnN0YW5jZUNsYXNzLlQzLFxyXG4gICAgICAgIHRoaXMuZ2V0SW5zdGFuY2VTaXplKGNvbmZpZy5pbnN0YW5jZUNsYXNzKVxyXG4gICAgICApLFxyXG4gICAgICB2cGM6IHRoaXMuZGF0YWJhc2UudnBjLFxyXG4gICAgICB2cGNTdWJuZXRzOiB7XHJcbiAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9JU09MQVRFRCxcclxuICAgICAgfSxcclxuICAgICAgc2VjdXJpdHlHcm91cHM6IHRoaXMuZGF0YWJhc2UuY29ubmVjdGlvbnMuc2VjdXJpdHlHcm91cHMsXHJcbiAgICAgIHBhcmFtZXRlckdyb3VwOiB0aGlzLnBhcmFtZXRlckdyb3VwLFxyXG4gICAgICBlbmFibGVQZXJmb3JtYW5jZUluc2lnaHRzOiBjb25maWcucGVyZm9ybWFuY2VJbnNpZ2h0cyxcclxuICAgICAgbW9uaXRvcmluZ0ludGVydmFsOiBjb25maWcubW9uaXRvcmluZ0ludGVydmFsID4gMCA/IFxyXG4gICAgICAgIGNkay5EdXJhdGlvbi5zZWNvbmRzKGNvbmZpZy5tb25pdG9yaW5nSW50ZXJ2YWwpIDogXHJcbiAgICAgICAgdW5kZWZpbmVkLFxyXG4gICAgICBtb25pdG9yaW5nUm9sZTogdGhpcy5tb25pdG9yaW5nUm9sZSxcclxuICAgICAgZGVsZXRlQXV0b21hdGVkQmFja3VwczogY29uZmlnLmRlbGV0ZUF1dG9tYXRlZEJhY2t1cHMsXHJcbiAgICAgIGRlbGV0aW9uUHJvdGVjdGlvbjogY29uZmlnLmRlbGV0aW9uUHJvdGVjdGlvbixcclxuICAgICAgaW5zdGFuY2VJZGVudGlmaWVyOiBgJHt0aGlzLmRhdGFiYXNlLmluc3RhbmNlSWRlbnRpZmllcn0tcmVhZC1yZXBsaWNhYCxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFkZERhdGFiYXNlQ29ubmVjdGlvbkZyb21TZWN1cml0eUdyb3VwKHNlY3VyaXR5R3JvdXA6IGVjMi5TZWN1cml0eUdyb3VwLCBkZXNjcmlwdGlvbjogc3RyaW5nKTogdm9pZCB7XHJcbiAgICB0aGlzLmRhdGFiYXNlLmNvbm5lY3Rpb25zLmFsbG93RnJvbShzZWN1cml0eUdyb3VwLCBlYzIuUG9ydC50Y3AoNTQzMiksIGRlc2NyaXB0aW9uKTtcclxuICB9XHJcbn0iXX0=