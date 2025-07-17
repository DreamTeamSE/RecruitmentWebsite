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
exports.RdsConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const rds = __importStar(require("aws-cdk-lib/aws-rds"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const constructs_1 = require("constructs");
class RdsConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { vpc, securityGroup, rdsConfig, environment } = props;
        // Create database credentials secret
        this.databaseCredentials = this.createDatabaseCredentials(environment);
        // Create subnet group for RDS
        const subnetGroup = this.createSubnetGroup(vpc, environment);
        // Create parameter group for PostgreSQL optimization
        const parameterGroup = this.createParameterGroup(environment);
        // Create the RDS instance
        this.database = this.createDatabase(vpc, securityGroup, subnetGroup, parameterGroup, rdsConfig, environment);
        this.databaseEndpoint = this.database.instanceEndpoint.hostname;
        this.databasePort = this.database.instanceEndpoint.port;
        // Create CloudWatch alarms for monitoring
        this.createCloudWatchAlarms(environment);
        // Output important information
        this.createOutputs();
    }
    createDatabaseCredentials(environment) {
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
    createSubnetGroup(vpc, environment) {
        return new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
            vpc,
            description: 'Subnet group for RDS database',
            subnetGroupName: `recruitment-db-subnet-group-${environment}`,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            },
        });
    }
    createParameterGroup(environment) {
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
    createDatabase(vpc, securityGroup, subnetGroup, parameterGroup, rdsConfig, environment) {
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
                        cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonRDSEnhancedMonitoringRole'),
                    ],
                }),
            }),
        });
    }
    createCloudWatchAlarms(environment) {
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
    createOutputs() {
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
    getDatabaseUrl() {
        return `postgresql://\${username}:\${password}@${this.databaseEndpoint}:${this.databasePort}/recruitment`;
    }
    /**
     * Create a read replica for scaling (production use)
     */
    createReadReplica(environment) {
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
exports.RdsConstruct = RdsConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmRzLWNvbnN0cnVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJkcy1jb25zdHJ1Y3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHlEQUEyQztBQUMzQyx5REFBMkM7QUFDM0MsK0VBQWlFO0FBQ2pFLDJDQUF1QztBQVV2QyxNQUFhLFlBQWEsU0FBUSxzQkFBUztJQU16QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXdCO1FBQ2hFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUU3RCxxQ0FBcUM7UUFDckMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUV2RSw4QkFBOEI7UUFDOUIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUU3RCxxREFBcUQ7UUFDckQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRTlELDBCQUEwQjtRQUMxQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQ2pDLEdBQUcsRUFDSCxhQUFhLEVBQ2IsV0FBVyxFQUNYLGNBQWMsRUFDZCxTQUFTLEVBQ1QsV0FBVyxDQUNaLENBQUM7UUFFRixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUM7UUFDaEUsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQztRQUV4RCwwQ0FBMEM7UUFDMUMsSUFB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LElBQUksQ0FBQyxRQUFRO1lBQ3JDLFlBQVksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVk7WUFDeEMsa0JBQWtCLEVBQUUsMEJBQTBCLFdBQVcsRUFBRTtZQUMzRCxrQkFBa0IsRUFBRSxXQUFXLEtBQUssTUFBTTtZQUMxQyx1QkFBdUIsRUFBRSxXQUFXLEtBQUssTUFBTTtZQUMvQyxhQUFhLEVBQUUsV0FBVyxLQUFLLE1BQU07Z0JBQ25DLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU07Z0JBQzFCLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87U0FDOUIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBM1FELG9DQTJRQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIHJkcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtcmRzJztcclxuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xyXG5pbXBvcnQgKiBhcyBzZWNyZXRzbWFuYWdlciBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc2VjcmV0c21hbmFnZXInO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuaW1wb3J0IHsgUmRzQ29uZmlnIH0gZnJvbSAnLi4vY29uZmlnL2Vudmlyb25tZW50LWNvbmZpZyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJkc0NvbnN0cnVjdFByb3BzIHtcclxuICB2cGM6IGVjMi5JVnBjO1xyXG4gIHNlY3VyaXR5R3JvdXA6IGVjMi5JU2VjdXJpdHlHcm91cDtcclxuICByZHNDb25maWc6IFJkc0NvbmZpZztcclxuICBlbnZpcm9ubWVudDogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUmRzQ29uc3RydWN0IGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgZGF0YWJhc2U6IHJkcy5EYXRhYmFzZUluc3RhbmNlO1xyXG4gIHB1YmxpYyByZWFkb25seSBkYXRhYmFzZUNyZWRlbnRpYWxzOiBzZWNyZXRzbWFuYWdlci5JU2VjcmV0O1xyXG4gIHB1YmxpYyByZWFkb25seSBkYXRhYmFzZUVuZHBvaW50OiBzdHJpbmc7XHJcbiAgcHVibGljIHJlYWRvbmx5IGRhdGFiYXNlUG9ydDogbnVtYmVyO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogUmRzQ29uc3RydWN0UHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgY29uc3QgeyB2cGMsIHNlY3VyaXR5R3JvdXAsIHJkc0NvbmZpZywgZW52aXJvbm1lbnQgfSA9IHByb3BzO1xyXG5cclxuICAgIC8vIENyZWF0ZSBkYXRhYmFzZSBjcmVkZW50aWFscyBzZWNyZXRcclxuICAgIHRoaXMuZGF0YWJhc2VDcmVkZW50aWFscyA9IHRoaXMuY3JlYXRlRGF0YWJhc2VDcmVkZW50aWFscyhlbnZpcm9ubWVudCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIHN1Ym5ldCBncm91cCBmb3IgUkRTXHJcbiAgICBjb25zdCBzdWJuZXRHcm91cCA9IHRoaXMuY3JlYXRlU3VibmV0R3JvdXAodnBjLCBlbnZpcm9ubWVudCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIHBhcmFtZXRlciBncm91cCBmb3IgUG9zdGdyZVNRTCBvcHRpbWl6YXRpb25cclxuICAgIGNvbnN0IHBhcmFtZXRlckdyb3VwID0gdGhpcy5jcmVhdGVQYXJhbWV0ZXJHcm91cChlbnZpcm9ubWVudCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIHRoZSBSRFMgaW5zdGFuY2VcclxuICAgIHRoaXMuZGF0YWJhc2UgPSB0aGlzLmNyZWF0ZURhdGFiYXNlKFxyXG4gICAgICB2cGMsXHJcbiAgICAgIHNlY3VyaXR5R3JvdXAsXHJcbiAgICAgIHN1Ym5ldEdyb3VwLFxyXG4gICAgICBwYXJhbWV0ZXJHcm91cCxcclxuICAgICAgcmRzQ29uZmlnLFxyXG4gICAgICBlbnZpcm9ubWVudFxyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLmRhdGFiYXNlRW5kcG9pbnQgPSB0aGlzLmRhdGFiYXNlLmluc3RhbmNlRW5kcG9pbnQuaG9zdG5hbWU7XHJcbiAgICB0aGlzLmRhdGFiYXNlUG9ydCA9IHRoaXMuZGF0YWJhc2UuaW5zdGFuY2VFbmRwb2ludC5wb3J0O1xyXG5cclxuICAgIC8vIENyZWF0ZSBDbG91ZFdhdGNoIGFsYXJtcyBmb3IgbW9uaXRvcmluZ1xyXG4gICAgdGhpcy5jcmVhdGVDbG91ZFdhdGNoQWxhcm1zKGVudmlyb25tZW50KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgaW1wb3J0YW50IGluZm9ybWF0aW9uXHJcbiAgICB0aGlzLmNyZWF0ZU91dHB1dHMoKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlRGF0YWJhc2VDcmVkZW50aWFscyhlbnZpcm9ubWVudDogc3RyaW5nKTogc2VjcmV0c21hbmFnZXIuU2VjcmV0IHtcclxuICAgIHJldHVybiBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsICdEYXRhYmFzZUNyZWRlbnRpYWxzJywge1xyXG4gICAgICBzZWNyZXROYW1lOiBgcmVjcnVpdG1lbnQtZGItY3JlZGVudGlhbHMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0RhdGFiYXNlIGNyZWRlbnRpYWxzIGZvciByZWNydWl0bWVudCB3ZWJzaXRlJyxcclxuICAgICAgZ2VuZXJhdGVTZWNyZXRTdHJpbmc6IHtcclxuICAgICAgICBzZWNyZXRTdHJpbmdUZW1wbGF0ZTogSlNPTi5zdHJpbmdpZnkoeyB1c2VybmFtZTogJ3Bvc3RncmVzJyB9KSxcclxuICAgICAgICBnZW5lcmF0ZVN0cmluZ0tleTogJ3Bhc3N3b3JkJyxcclxuICAgICAgICBleGNsdWRlQ2hhcmFjdGVyczogJ1wiQC9cXFxcJyxcclxuICAgICAgICBwYXNzd29yZExlbmd0aDogMzIsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlU3VibmV0R3JvdXAodnBjOiBlYzIuSVZwYywgZW52aXJvbm1lbnQ6IHN0cmluZyk6IHJkcy5TdWJuZXRHcm91cCB7XHJcbiAgICByZXR1cm4gbmV3IHJkcy5TdWJuZXRHcm91cCh0aGlzLCAnRGF0YWJhc2VTdWJuZXRHcm91cCcsIHtcclxuICAgICAgdnBjLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1N1Ym5ldCBncm91cCBmb3IgUkRTIGRhdGFiYXNlJyxcclxuICAgICAgc3VibmV0R3JvdXBOYW1lOiBgcmVjcnVpdG1lbnQtZGItc3VibmV0LWdyb3VwLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgdnBjU3VibmV0czoge1xyXG4gICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfSVNPTEFURUQsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlUGFyYW1ldGVyR3JvdXAoZW52aXJvbm1lbnQ6IHN0cmluZyk6IHJkcy5QYXJhbWV0ZXJHcm91cCB7XHJcbiAgICByZXR1cm4gbmV3IHJkcy5QYXJhbWV0ZXJHcm91cCh0aGlzLCAnRGF0YWJhc2VQYXJhbWV0ZXJHcm91cCcsIHtcclxuICAgICAgZW5naW5lOiByZHMuRGF0YWJhc2VJbnN0YW5jZUVuZ2luZS5wb3N0Z3Jlcyh7XHJcbiAgICAgICAgdmVyc2lvbjogcmRzLlBvc3RncmVzRW5naW5lVmVyc2lvbi5WRVJfMTVfNCxcclxuICAgICAgfSksXHJcbiAgICAgIG5hbWU6IGByZWNydWl0bWVudC1kYi1wYXJhbXMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1BhcmFtZXRlciBncm91cCBmb3IgcmVjcnVpdG1lbnQgd2Vic2l0ZSBkYXRhYmFzZScsXHJcbiAgICAgIHBhcmFtZXRlcnM6IHtcclxuICAgICAgICAvLyBPcHRpbWl6ZSBmb3IgdGhlIGFwcGxpY2F0aW9uIHdvcmtsb2FkXHJcbiAgICAgICAgc2hhcmVkX3ByZWxvYWRfbGlicmFyaWVzOiAncGdfc3RhdF9zdGF0ZW1lbnRzJyxcclxuICAgICAgICBsb2dfc3RhdGVtZW50OiAnYWxsJyxcclxuICAgICAgICBsb2dfbWluX2R1cmF0aW9uX3N0YXRlbWVudDogJzEwMDAnLCAvLyBMb2cgcXVlcmllcyB0YWtpbmcgbG9uZ2VyIHRoYW4gMSBzZWNvbmRcclxuICAgICAgICBsb2dfbGluZV9wcmVmaXg6ICcldCBbJXBdOiBbJWwtMV0gdXNlcj0ldSxkYj0lZCAnLFxyXG4gICAgICAgIGxvZ19jb25uZWN0aW9uczogJ29uJyxcclxuICAgICAgICBsb2dfZGlzY29ubmVjdGlvbnM6ICdvbicsXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gUGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9ucyBiYXNlZCBvbiBpbnN0YW5jZSBzaXplXHJcbiAgICAgICAgLi4uKGVudmlyb25tZW50ID09PSAnZGV2JyA/IHtcclxuICAgICAgICAgIC8vIERldmVsb3BtZW50LXNwZWNpZmljIHNldHRpbmdzXHJcbiAgICAgICAgICBtYXhfY29ubmVjdGlvbnM6ICcyMCcsXHJcbiAgICAgICAgICBzaGFyZWRfYnVmZmVyczogJzMyTUInLFxyXG4gICAgICAgICAgZWZmZWN0aXZlX2NhY2hlX3NpemU6ICcxMjhNQicsXHJcbiAgICAgICAgICBtYWludGVuYW5jZV93b3JrX21lbTogJzE2TUInLFxyXG4gICAgICAgICAgY2hlY2twb2ludF9jb21wbGV0aW9uX3RhcmdldDogJzAuOScsXHJcbiAgICAgICAgICB3YWxfYnVmZmVyczogJzFNQicsXHJcbiAgICAgICAgICBkZWZhdWx0X3N0YXRpc3RpY3NfdGFyZ2V0OiAnMTAwJyxcclxuICAgICAgICB9IDoge1xyXG4gICAgICAgICAgLy8gUHJvZHVjdGlvbiBzZXR0aW5nc1xyXG4gICAgICAgICAgbWF4X2Nvbm5lY3Rpb25zOiAnMTAwJyxcclxuICAgICAgICAgIHNoYXJlZF9idWZmZXJzOiAnMjU2TUInLFxyXG4gICAgICAgICAgZWZmZWN0aXZlX2NhY2hlX3NpemU6ICcxR0InLFxyXG4gICAgICAgICAgbWFpbnRlbmFuY2Vfd29ya19tZW06ICc2NE1CJyxcclxuICAgICAgICAgIGNoZWNrcG9pbnRfY29tcGxldGlvbl90YXJnZXQ6ICcwLjknLFxyXG4gICAgICAgICAgd2FsX2J1ZmZlcnM6ICcxNk1CJyxcclxuICAgICAgICAgIGRlZmF1bHRfc3RhdGlzdGljc190YXJnZXQ6ICcxMDAnLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNyZWF0ZURhdGFiYXNlKFxyXG4gICAgdnBjOiBlYzIuSVZwYyxcclxuICAgIHNlY3VyaXR5R3JvdXA6IGVjMi5JU2VjdXJpdHlHcm91cCxcclxuICAgIHN1Ym5ldEdyb3VwOiByZHMuU3VibmV0R3JvdXAsXHJcbiAgICBwYXJhbWV0ZXJHcm91cDogcmRzLlBhcmFtZXRlckdyb3VwLFxyXG4gICAgcmRzQ29uZmlnOiBSZHNDb25maWcsXHJcbiAgICBlbnZpcm9ubWVudDogc3RyaW5nXHJcbiAgKTogcmRzLkRhdGFiYXNlSW5zdGFuY2Uge1xyXG4gICAgcmV0dXJuIG5ldyByZHMuRGF0YWJhc2VJbnN0YW5jZSh0aGlzLCAnRGF0YWJhc2UnLCB7XHJcbiAgICAgIGVuZ2luZTogcmRzQ29uZmlnLmVuZ2luZSxcclxuICAgICAgaW5zdGFuY2VUeXBlOiByZHNDb25maWcuaW5zdGFuY2VUeXBlLFxyXG4gICAgICBpbnN0YW5jZUlkZW50aWZpZXI6IGByZWNydWl0bWVudC1kYi0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIFxyXG4gICAgICAvLyBOZXR3b3JrIGNvbmZpZ3VyYXRpb25cclxuICAgICAgdnBjLFxyXG4gICAgICBzZWN1cml0eUdyb3VwczogW3NlY3VyaXR5R3JvdXBdLFxyXG4gICAgICBzdWJuZXRHcm91cCxcclxuICAgICAgcG9ydDogNTQzMixcclxuICAgICAgXHJcbiAgICAgIC8vIERhdGFiYXNlIGNvbmZpZ3VyYXRpb25cclxuICAgICAgZGF0YWJhc2VOYW1lOiAncmVjcnVpdG1lbnQnLFxyXG4gICAgICBjcmVkZW50aWFsczogcmRzLkNyZWRlbnRpYWxzLmZyb21TZWNyZXQodGhpcy5kYXRhYmFzZUNyZWRlbnRpYWxzKSxcclxuICAgICAgcGFyYW1ldGVyR3JvdXAsXHJcbiAgICAgIFxyXG4gICAgICAvLyBTdG9yYWdlIGNvbmZpZ3VyYXRpb25cclxuICAgICAgYWxsb2NhdGVkU3RvcmFnZTogcmRzQ29uZmlnLmFsbG9jYXRlZFN0b3JhZ2UsXHJcbiAgICAgIG1heEFsbG9jYXRlZFN0b3JhZ2U6IHJkc0NvbmZpZy5tYXhBbGxvY2F0ZWRTdG9yYWdlLFxyXG4gICAgICBzdG9yYWdlVHlwZTogcmRzLlN0b3JhZ2VUeXBlLkdQMixcclxuICAgICAgc3RvcmFnZUVuY3J5cHRlZDogdHJ1ZSxcclxuICAgICAgXHJcbiAgICAgIC8vIEF2YWlsYWJpbGl0eSBhbmQgYmFja3VwIGNvbmZpZ3VyYXRpb25cclxuICAgICAgbXVsdGlBejogcmRzQ29uZmlnLm11bHRpQXosXHJcbiAgICAgIGRlbGV0aW9uUHJvdGVjdGlvbjogcmRzQ29uZmlnLmRlbGV0aW9uUHJvdGVjdGlvbixcclxuICAgICAgYmFja3VwUmV0ZW50aW9uOiBjZGsuRHVyYXRpb24uZGF5cyhyZHNDb25maWcuYmFja3VwUmV0ZW50aW9uKSxcclxuICAgICAgcHJlZmVycmVkQmFja3VwV2luZG93OiByZHNDb25maWcucHJlZmVycmVkQmFja3VwV2luZG93LFxyXG4gICAgICBwcmVmZXJyZWRNYWludGVuYW5jZVdpbmRvdzogcmRzQ29uZmlnLnByZWZlcnJlZE1haW50ZW5hbmNlV2luZG93LFxyXG4gICAgICBcclxuICAgICAgLy8gTW9uaXRvcmluZyBjb25maWd1cmF0aW9uXHJcbiAgICAgIGVuYWJsZVBlcmZvcm1hbmNlSW5zaWdodHM6IHJkc0NvbmZpZy5lbmFibGVQZXJmb3JtYW5jZUluc2lnaHRzLFxyXG4gICAgICBwZXJmb3JtYW5jZUluc2lnaHRSZXRlbnRpb246IHJkc0NvbmZpZy5lbmFibGVQZXJmb3JtYW5jZUluc2lnaHRzIFxyXG4gICAgICAgID8gcmRzLlBlcmZvcm1hbmNlSW5zaWdodFJldGVudGlvbi5ERUZBVUxUIFxyXG4gICAgICAgIDogdW5kZWZpbmVkLFxyXG4gICAgICBtb25pdG9yaW5nSW50ZXJ2YWw6IHJkc0NvbmZpZy5tb25pdG9yaW5nSW50ZXJ2YWwgPiAwIFxyXG4gICAgICAgID8gY2RrLkR1cmF0aW9uLnNlY29uZHMocmRzQ29uZmlnLm1vbml0b3JpbmdJbnRlcnZhbCkgXHJcbiAgICAgICAgOiB1bmRlZmluZWQsXHJcbiAgICAgIFxyXG4gICAgICAvLyBBdXRvIG1pbm9yIHZlcnNpb24gdXBncmFkZVxyXG4gICAgICBhdXRvTWlub3JWZXJzaW9uVXBncmFkZTogZW52aXJvbm1lbnQgIT09ICdwcm9kJyxcclxuICAgICAgXHJcbiAgICAgIC8vIFJlbW92YWwgcG9saWN5XHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGVudmlyb25tZW50ID09PSAncHJvZCcgXHJcbiAgICAgICAgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gXHJcbiAgICAgICAgOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICBcclxuICAgICAgLy8gRW5oYW5jZWQgbW9uaXRvcmluZyByb2xlIChpZiBtb25pdG9yaW5nIGlzIGVuYWJsZWQpXHJcbiAgICAgIC4uLihyZHNDb25maWcubW9uaXRvcmluZ0ludGVydmFsID4gMCAmJiB7XHJcbiAgICAgICAgbW9uaXRvcmluZ1JvbGU6IG5ldyBjZGsuYXdzX2lhbS5Sb2xlKHRoaXMsICdNb25pdG9yaW5nUm9sZScsIHtcclxuICAgICAgICAgIGFzc3VtZWRCeTogbmV3IGNkay5hd3NfaWFtLlNlcnZpY2VQcmluY2lwYWwoJ21vbml0b3JpbmcucmRzLmFtYXpvbmF3cy5jb20nKSxcclxuICAgICAgICAgIG1hbmFnZWRQb2xpY2llczogW1xyXG4gICAgICAgICAgICBjZGsuYXdzX2lhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZShcclxuICAgICAgICAgICAgICAnc2VydmljZS1yb2xlL0FtYXpvblJEU0VuaGFuY2VkTW9uaXRvcmluZ1JvbGUnXHJcbiAgICAgICAgICAgICksXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjcmVhdGVDbG91ZFdhdGNoQWxhcm1zKGVudmlyb25tZW50OiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIC8vIENyZWF0ZSBDbG91ZFdhdGNoIGFsYXJtcyBmb3IgZGF0YWJhc2UgbW9uaXRvcmluZ1xyXG4gICAgXHJcbiAgICAvLyBDUFUgdXRpbGl6YXRpb24gYWxhcm1cclxuICAgIG5ldyBjZGsuYXdzX2Nsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0RhdGFiYXNlQ1BVQWxhcm0nLCB7XHJcbiAgICAgIG1ldHJpYzogdGhpcy5kYXRhYmFzZS5tZXRyaWNDUFVVdGlsaXphdGlvbigpLFxyXG4gICAgICB0aHJlc2hvbGQ6IGVudmlyb25tZW50ID09PSAnZGV2JyA/IDgwIDogNzAsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBhbGFybU5hbWU6IGByZWNydWl0bWVudC1kYi1jcHUtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnRGF0YWJhc2UgQ1BVIHV0aWxpemF0aW9uIGlzIGhpZ2gnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRGF0YWJhc2UgY29ubmVjdGlvbnMgYWxhcm1cclxuICAgIG5ldyBjZGsuYXdzX2Nsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0RhdGFiYXNlQ29ubmVjdGlvbnNBbGFybScsIHtcclxuICAgICAgbWV0cmljOiB0aGlzLmRhdGFiYXNlLm1ldHJpY0RhdGFiYXNlQ29ubmVjdGlvbnMoKSxcclxuICAgICAgdGhyZXNob2xkOiBlbnZpcm9ubWVudCA9PT0gJ2RldicgPyAxNSA6IDgwLFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcclxuICAgICAgYWxhcm1OYW1lOiBgcmVjcnVpdG1lbnQtZGItY29ubmVjdGlvbnMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnRGF0YWJhc2UgY29ubmVjdGlvbiBjb3VudCBpcyBoaWdoJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEZyZWUgc3RvcmFnZSBzcGFjZSBhbGFybVxyXG4gICAgbmV3IGNkay5hd3NfY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnRGF0YWJhc2VGcmVlU3RvcmFnZUFsYXJtJywge1xyXG4gICAgICBtZXRyaWM6IHRoaXMuZGF0YWJhc2UubWV0cmljRnJlZVN0b3JhZ2VTcGFjZSgpLFxyXG4gICAgICB0aHJlc2hvbGQ6IDIwMDAwMDAwMDAsIC8vIDJHQiBpbiBieXRlc1xyXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNkay5hd3NfY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuTEVTU19USEFOX1RIUkVTSE9MRCxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXHJcbiAgICAgIGFsYXJtTmFtZTogYHJlY3J1aXRtZW50LWRiLXN0b3JhZ2UtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnRGF0YWJhc2UgZnJlZSBzdG9yYWdlIHNwYWNlIGlzIGxvdycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBSZWFkIGxhdGVuY3kgYWxhcm1cclxuICAgIG5ldyBjZGsuYXdzX2Nsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0RhdGFiYXNlUmVhZExhdGVuY3lBbGFybScsIHtcclxuICAgICAgbWV0cmljOiB0aGlzLmRhdGFiYXNlLm1ldHJpY1JlYWRMYXRlbmN5KCksXHJcbiAgICAgIHRocmVzaG9sZDogMC4yLCAvLyAyMDBtc1xyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcclxuICAgICAgYWxhcm1OYW1lOiBgcmVjcnVpdG1lbnQtZGItcmVhZC1sYXRlbmN5LSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0RhdGFiYXNlIHJlYWQgbGF0ZW5jeSBpcyBoaWdoJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFdyaXRlIGxhdGVuY3kgYWxhcm1cclxuICAgIG5ldyBjZGsuYXdzX2Nsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0RhdGFiYXNlV3JpdGVMYXRlbmN5QWxhcm0nLCB7XHJcbiAgICAgIG1ldHJpYzogdGhpcy5kYXRhYmFzZS5tZXRyaWNXcml0ZUxhdGVuY3koKSxcclxuICAgICAgdGhyZXNob2xkOiAwLjIsIC8vIDIwMG1zXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBhbGFybU5hbWU6IGByZWNydWl0bWVudC1kYi13cml0ZS1sYXRlbmN5LSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0RhdGFiYXNlIHdyaXRlIGxhdGVuY3kgaXMgaGlnaCcsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlT3V0cHV0cygpOiB2b2lkIHtcclxuICAgIC8vIE91dHB1dCBkYXRhYmFzZSBlbmRwb2ludFxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0RhdGFiYXNlRW5kcG9pbnQnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmRhdGFiYXNlRW5kcG9pbnQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUkRTIGRhdGFiYXNlIGVuZHBvaW50JyxcclxuICAgICAgZXhwb3J0TmFtZTogYHJlY3J1aXRtZW50LWRiLWVuZHBvaW50LSR7dGhpcy5ub2RlLnNjb3BlfWAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgZGF0YWJhc2UgcG9ydFxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0RhdGFiYXNlUG9ydCcsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuZGF0YWJhc2VQb3J0LnRvU3RyaW5nKCksXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUkRTIGRhdGFiYXNlIHBvcnQnLFxyXG4gICAgICBleHBvcnROYW1lOiBgcmVjcnVpdG1lbnQtZGItcG9ydC0ke3RoaXMubm9kZS5zY29wZX1gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IGRhdGFiYXNlIGNyZWRlbnRpYWxzIHNlY3JldCBBUk5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEYXRhYmFzZUNyZWRlbnRpYWxzU2VjcmV0QXJuJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5kYXRhYmFzZUNyZWRlbnRpYWxzLnNlY3JldEFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdBUk4gb2YgdGhlIGRhdGFiYXNlIGNyZWRlbnRpYWxzIHNlY3JldCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGByZWNydWl0bWVudC1kYi1jcmVkZW50aWFscy0ke3RoaXMubm9kZS5zY29wZX1gLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgdGhlIGRhdGFiYXNlIGNvbm5lY3Rpb24gc3RyaW5nIGZvciB0aGUgYXBwbGljYXRpb25cclxuICAgKi9cclxuICBwdWJsaWMgZ2V0RGF0YWJhc2VVcmwoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBgcG9zdGdyZXNxbDovL1xcJHt1c2VybmFtZX06XFwke3Bhc3N3b3JkfUAke3RoaXMuZGF0YWJhc2VFbmRwb2ludH06JHt0aGlzLmRhdGFiYXNlUG9ydH0vcmVjcnVpdG1lbnRgO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIGEgcmVhZCByZXBsaWNhIGZvciBzY2FsaW5nIChwcm9kdWN0aW9uIHVzZSlcclxuICAgKi9cclxuICBwdWJsaWMgY3JlYXRlUmVhZFJlcGxpY2EoZW52aXJvbm1lbnQ6IHN0cmluZyk6IHJkcy5EYXRhYmFzZUluc3RhbmNlUmVhZFJlcGxpY2Ege1xyXG4gICAgcmV0dXJuIG5ldyByZHMuRGF0YWJhc2VJbnN0YW5jZVJlYWRSZXBsaWNhKHRoaXMsICdEYXRhYmFzZVJlYWRSZXBsaWNhJywge1xyXG4gICAgICBzb3VyY2VEYXRhYmFzZUluc3RhbmNlOiB0aGlzLmRhdGFiYXNlLFxyXG4gICAgICBpbnN0YW5jZVR5cGU6IHRoaXMuZGF0YWJhc2UuaW5zdGFuY2VUeXBlLFxyXG4gICAgICBpbnN0YW5jZUlkZW50aWZpZXI6IGByZWNydWl0bWVudC1kYi1yZXBsaWNhLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgZGVsZXRpb25Qcm90ZWN0aW9uOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnLFxyXG4gICAgICBhdXRvTWlub3JWZXJzaW9uVXBncmFkZTogZW52aXJvbm1lbnQgIT09ICdwcm9kJyxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogZW52aXJvbm1lbnQgPT09ICdwcm9kJyBcclxuICAgICAgICA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiBcclxuICAgICAgICA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuICB9XHJcbn0iXX0=