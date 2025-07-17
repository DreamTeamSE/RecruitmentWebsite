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
exports.RedisConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const elasticache = __importStar(require("aws-cdk-lib/aws-elasticache"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const constructs_1 = require("constructs");
class RedisConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // Create KMS key for encryption if not provided and encryption is enabled
        if (props.enableEncryption && !props.kmsKey) {
            this.encryptionKey = this.createKmsKey(props.environmentName);
        }
        else if (props.enableEncryption) {
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
                            logGroup: this.logGroup.logGroupName,
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
    createKmsKey(environmentName) {
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
    createRedisAlarms(environmentName) {
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
        this.alarms = [cpuAlarm, memoryAlarm, connectionsAlarm, evictionsAlarm];
    }
    addTags(environmentName) {
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
    getRedisEndpoint() {
        return this.redis.attrRedisEndpointAddress;
    }
    getRedisPort() {
        return this.redis.attrRedisEndpointPort;
    }
    addConnectionFromSecurityGroup(securityGroup, description) {
        // This would need to be implemented at the security group level
        // since we're using the lower-level CfnCacheCluster
        securityGroup.addEgressRule(ec2.Peer.securityGroupId(this.redis.vpcSecurityGroupIds[0]), ec2.Port.tcp(6379), description);
    }
}
exports.RedisConstruct = RedisConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkaXMtY29uc3RydWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicmVkaXMtY29uc3RydWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx5RUFBMkQ7QUFDM0QseURBQTJDO0FBQzNDLHlEQUEyQztBQUMzQywyREFBNkM7QUFDN0MsMkNBQXVDO0FBYXZDLE1BQWEsY0FBZSxTQUFRLHNCQUFTO0lBTzNDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMEI7UUFDbEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQiwwRUFBMEU7UUFDMUUsSUFBSSxLQUFLLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDNUMsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNoRSxDQUFDO2FBQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7UUFDcEMsQ0FBQztRQUVELG9EQUFvRDtRQUNwRCxJQUFJLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO2dCQUN2RCxZQUFZLEVBQUUsZ0NBQWdDLEtBQUssQ0FBQyxlQUFlLFFBQVE7Z0JBQzNFLFNBQVMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVM7Z0JBQ3ZDLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87YUFDekMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELDRCQUE0QjtRQUM1QixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUks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Q3pCLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsbUJBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDNUQsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQ2xCLFdBQVcsQ0FDWixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBelFELHdDQXlRQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGVsYXN0aWNhY2hlIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lbGFzdGljYWNoZSc7XHJcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcclxuaW1wb3J0ICogYXMga21zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1rbXMnO1xyXG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCB7IFJlZGlzQ29uZmlnIH0gZnJvbSAnLi4vY29uZmlnL3R5cGVzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVkaXNDb25zdHJ1Y3RQcm9wcyB7XHJcbiAgY29uZmlnOiBSZWRpc0NvbmZpZztcclxuICBlbnZpcm9ubWVudE5hbWU6IHN0cmluZztcclxuICB2cGM6IGVjMi5WcGM7XHJcbiAgc2VjdXJpdHlHcm91cDogZWMyLlNlY3VyaXR5R3JvdXA7XHJcbiAgZW5hYmxlRW5jcnlwdGlvbj86IGJvb2xlYW47XHJcbiAgZW5hYmxlTG9nZ2luZz86IGJvb2xlYW47XHJcbiAga21zS2V5Pzoga21zLktleTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFJlZGlzQ29uc3RydWN0IGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgcmVkaXM6IGVsYXN0aWNhY2hlLkNmbkNhY2hlQ2x1c3RlcjtcclxuICBwdWJsaWMgcmVhZG9ubHkgc3VibmV0R3JvdXA6IGVsYXN0aWNhY2hlLkNmblN1Ym5ldEdyb3VwO1xyXG4gIHB1YmxpYyByZWFkb25seSBwYXJhbWV0ZXJHcm91cDogZWxhc3RpY2FjaGUuQ2ZuUGFyYW1ldGVyR3JvdXA7XHJcbiAgcHVibGljIHJlYWRvbmx5IGxvZ0dyb3VwPzogbG9ncy5Mb2dHcm91cDtcclxuICBwdWJsaWMgcmVhZG9ubHkgZW5jcnlwdGlvbktleT86IGttcy5LZXk7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBSZWRpc0NvbnN0cnVjdFByb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBLTVMga2V5IGZvciBlbmNyeXB0aW9uIGlmIG5vdCBwcm92aWRlZCBhbmQgZW5jcnlwdGlvbiBpcyBlbmFibGVkXHJcbiAgICBpZiAocHJvcHMuZW5hYmxlRW5jcnlwdGlvbiAmJiAhcHJvcHMua21zS2V5KSB7XHJcbiAgICAgIHRoaXMuZW5jcnlwdGlvbktleSA9IHRoaXMuY3JlYXRlS21zS2V5KHByb3BzLmVudmlyb25tZW50TmFtZSk7XHJcbiAgICB9IGVsc2UgaWYgKHByb3BzLmVuYWJsZUVuY3J5cHRpb24pIHtcclxuICAgICAgdGhpcy5lbmNyeXB0aW9uS2V5ID0gcHJvcHMua21zS2V5O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBDbG91ZFdhdGNoIGxvZyBncm91cCBpZiBsb2dnaW5nIGlzIGVuYWJsZWRcclxuICAgIGlmIChwcm9wcy5lbmFibGVMb2dnaW5nKSB7XHJcbiAgICAgIHRoaXMubG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnUmVkaXNMb2dHcm91cCcsIHtcclxuICAgICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL2VsYXN0aWNhY2hlL3JlY3J1aXRtZW50LSR7cHJvcHMuZW52aXJvbm1lbnROYW1lfS1yZWRpc2AsXHJcbiAgICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX01PTlRILFxyXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBjYWNoZSBzdWJuZXQgZ3JvdXBcclxuICAgIHRoaXMuc3VibmV0R3JvdXAgPSBuZXcgZWxhc3RpY2FjaGUuQ2ZuU3VibmV0R3JvdXAodGhpcywgJ1JlZGlzU3VibmV0R3JvdXAnLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU3VibmV0IGdyb3VwIGZvciBSZWRpcyBjYWNoZScsXHJcbiAgICAgIHN1Ym5ldElkczogcHJvcHMudnBjLnByaXZhdGVTdWJuZXRzLm1hcChzdWJuZXQgPT4gc3VibmV0LnN1Ym5ldElkKSxcclxuICAgICAgY2FjaGVTdWJuZXRHcm91cE5hbWU6IGByZWNydWl0bWVudC0ke3Byb3BzLmVudmlyb25tZW50TmFtZX0tcmVkaXMtc3VibmV0LWdyb3VwYCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBwYXJhbWV0ZXIgZ3JvdXBcclxuICAgIHRoaXMucGFyYW1ldGVyR3JvdXAgPSBuZXcgZWxhc3RpY2FjaGUuQ2ZuUGFyYW1ldGVyR3JvdXAodGhpcywgJ1JlZGlzUGFyYW1ldGVyR3JvdXAnLCB7XHJcbiAgICAgIGNhY2hlUGFyYW1ldGVyR3JvdXBGYW1pbHk6ICdyZWRpczcueCcsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUGFyYW1ldGVyIGdyb3VwIGZvciBSZWRpcyBjYWNoZScsXHJcbiAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAnbWF4bWVtb3J5LXBvbGljeSc6ICdhbGxrZXlzLWxydScsXHJcbiAgICAgICAgJ3RpbWVvdXQnOiAnMzAwJyxcclxuICAgICAgICAndGNwLWtlZXBhbGl2ZSc6ICc2MCcsXHJcbiAgICAgICAgJ21heGNsaWVudHMnOiAnMTAwMCcsXHJcbiAgICAgICAgJ21heG1lbW9yeS1zYW1wbGVzJzogJzUnLFxyXG4gICAgICAgICdzYXZlJzogcHJvcHMuY29uZmlnLmVuYWJsZUJhY2t1cCA/ICc5MDAgMSAzMDAgMTAgNjAgMTAwMDAnIDogJycsXHJcbiAgICAgICAgJ2FwcGVuZG9ubHknOiAneWVzJyxcclxuICAgICAgICAnYXBwZW5kZnN5bmMnOiAnZXZlcnlzZWMnLFxyXG4gICAgICAgICdhdXRvLWFvZi1yZXdyaXRlLXBlcmNlbnRhZ2UnOiAnMTAwJyxcclxuICAgICAgICAnYXV0by1hb2YtcmV3cml0ZS1taW4tc2l6ZSc6ICc2NG1iJyxcclxuICAgICAgICAnbGF6eWZyZWUtbGF6eS1ldmljdGlvbic6ICd5ZXMnLFxyXG4gICAgICAgICdsYXp5ZnJlZS1sYXp5LWV4cGlyZSc6ICd5ZXMnLFxyXG4gICAgICAgICdsYXp5ZnJlZS1sYXp5LXNlcnZlci1kZWwnOiAneWVzJyxcclxuICAgICAgICAncmVwbGljYS1sYXp5LWZsdXNoJzogJ3llcycsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgUmVkaXMgY2FjaGUgY2x1c3RlclxyXG4gICAgdGhpcy5yZWRpcyA9IG5ldyBlbGFzdGljYWNoZS5DZm5DYWNoZUNsdXN0ZXIodGhpcywgJ1JlZGlzJywge1xyXG4gICAgICBjYWNoZU5vZGVUeXBlOiBwcm9wcy5jb25maWcubm9kZVR5cGUsXHJcbiAgICAgIGVuZ2luZTogJ3JlZGlzJyxcclxuICAgICAgZW5naW5lVmVyc2lvbjogcHJvcHMuY29uZmlnLmVuZ2luZVZlcnNpb24sXHJcbiAgICAgIG51bUNhY2hlTm9kZXM6IHByb3BzLmNvbmZpZy5udW1DYWNoZU5vZGVzLFxyXG4gICAgICBjYWNoZVBhcmFtZXRlckdyb3VwTmFtZTogdGhpcy5wYXJhbWV0ZXJHcm91cC5yZWYsXHJcbiAgICAgIGNhY2hlU3VibmV0R3JvdXBOYW1lOiB0aGlzLnN1Ym5ldEdyb3VwLnJlZixcclxuICAgICAgdnBjU2VjdXJpdHlHcm91cElkczogW3Byb3BzLnNlY3VyaXR5R3JvdXAuc2VjdXJpdHlHcm91cElkXSxcclxuICAgICAgXHJcbiAgICAgIC8vIE5hbWluZ1xyXG4gICAgICBjbHVzdGVyTmFtZTogYHJlY3J1aXRtZW50LSR7cHJvcHMuZW52aXJvbm1lbnROYW1lfS1yZWRpc2AsXHJcbiAgICAgIFxyXG4gICAgICAvLyBCYWNrdXAgY29uZmlndXJhdGlvblxyXG4gICAgICBzbmFwc2hvdFJldGVudGlvbkxpbWl0OiBwcm9wcy5jb25maWcuZW5hYmxlQmFja3VwID8gcHJvcHMuY29uZmlnLmJhY2t1cFJldGVudGlvbkxpbWl0IDogMCxcclxuICAgICAgcHJlZmVycmVkTWFpbnRlbmFuY2VXaW5kb3c6IHByb3BzLmNvbmZpZy5wcmVmZXJyZWRNYWludGVuYW5jZVdpbmRvdyxcclxuICAgICAgc25hcHNob3RXaW5kb3c6IHByb3BzLmNvbmZpZy5lbmFibGVCYWNrdXAgPyBwcm9wcy5jb25maWcucHJlZmVycmVkQmFja3VwV2luZG93IDogdW5kZWZpbmVkLFxyXG4gICAgICBcclxuICAgICAgLy8gRW5jcnlwdGlvbiBjb25maWd1cmF0aW9uXHJcbiAgICAgIHRyYW5zaXRFbmNyeXB0aW9uRW5hYmxlZDogcHJvcHMuY29uZmlnLmVuYWJsZVRyYW5zaXRFbmNyeXB0aW9uLFxyXG4gICAgICBcclxuICAgICAgLy8gTG9nZ2luZyBjb25maWd1cmF0aW9uXHJcbiAgICAgIGxvZ0RlbGl2ZXJ5Q29uZmlndXJhdGlvbnM6IHByb3BzLmVuYWJsZUxvZ2dpbmcgPyBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgZGVzdGluYXRpb25UeXBlOiAnY2xvdWR3YXRjaC1sb2dzJyxcclxuICAgICAgICAgIGRlc3RpbmF0aW9uRGV0YWlsczoge1xyXG4gICAgICAgICAgICBjbG91ZFdhdGNoTG9nc0RldGFpbHM6IHtcclxuICAgICAgICAgICAgICBsb2dHcm91cDogdGhpcy5sb2dHcm91cCEubG9nR3JvdXBOYW1lLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGxvZ0Zvcm1hdDogJ2pzb24nLFxyXG4gICAgICAgICAgbG9nVHlwZTogJ3Nsb3ctbG9nJyxcclxuICAgICAgICB9LFxyXG4gICAgICBdIDogdW5kZWZpbmVkLFxyXG4gICAgICBcclxuICAgICAgLy8gTmV0d29ya2luZ1xyXG4gICAgICBwb3J0OiA2Mzc5LFxyXG4gICAgICBcclxuICAgICAgLy8gVGFnc1xyXG4gICAgICB0YWdzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAga2V5OiAnRW52aXJvbm1lbnQnLFxyXG4gICAgICAgICAgdmFsdWU6IHByb3BzLmVudmlyb25tZW50TmFtZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGtleTogJ0NvbXBvbmVudCcsXHJcbiAgICAgICAgICB2YWx1ZTogJ0NhY2hlJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGtleTogJ01hbmFnZWRCeScsXHJcbiAgICAgICAgICB2YWx1ZTogJ0NESycsXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBkZXBlbmRlbmN5XHJcbiAgICB0aGlzLnJlZGlzLmFkZERlcGVuZGVuY3kodGhpcy5zdWJuZXRHcm91cCk7XHJcbiAgICB0aGlzLnJlZGlzLmFkZERlcGVuZGVuY3kodGhpcy5wYXJhbWV0ZXJHcm91cCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIFJlZGlzIGFsYXJtc1xyXG4gICAgdGhpcy5jcmVhdGVSZWRpc0FsYXJtcyhwcm9wcy5lbnZpcm9ubWVudE5hbWUpO1xyXG5cclxuICAgIC8vIEFkZCB0YWdzXHJcbiAgICB0aGlzLmFkZFRhZ3MocHJvcHMuZW52aXJvbm1lbnROYW1lKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlS21zS2V5KGVudmlyb25tZW50TmFtZTogc3RyaW5nKToga21zLktleSB7XHJcbiAgICByZXR1cm4gbmV3IGttcy5LZXkodGhpcywgJ1JlZGlzRW5jcnlwdGlvbktleScsIHtcclxuICAgICAgZGVzY3JpcHRpb246IGBLTVMga2V5IGZvciBSZWRpcyBlbmNyeXB0aW9uIC0gJHtlbnZpcm9ubWVudE5hbWV9YCxcclxuICAgICAgZW5hYmxlS2V5Um90YXRpb246IHRydWUsXHJcbiAgICAgIGFsaWFzOiBgcmVjcnVpdG1lbnQtJHtlbnZpcm9ubWVudE5hbWV9LXJlZGlzLWtleWAsXHJcbiAgICAgIHBvbGljeTogbmV3IGNkay5hd3NfaWFtLlBvbGljeURvY3VtZW50KHtcclxuICAgICAgICBzdGF0ZW1lbnRzOiBbXHJcbiAgICAgICAgICBuZXcgY2RrLmF3c19pYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgc2lkOiAnRW5hYmxlIElBTSBVc2VyIFBlcm1pc3Npb25zJyxcclxuICAgICAgICAgICAgZWZmZWN0OiBjZGsuYXdzX2lhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICAgIHByaW5jaXBhbHM6IFtuZXcgY2RrLmF3c19pYW0uQWNjb3VudFJvb3RQcmluY2lwYWwoKV0sXHJcbiAgICAgICAgICAgIGFjdGlvbnM6IFsna21zOionXSxcclxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgbmV3IGNkay5hd3NfaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgIHNpZDogJ0FsbG93IEVsYXN0aUNhY2hlIFNlcnZpY2UnLFxyXG4gICAgICAgICAgICBlZmZlY3Q6IGNkay5hd3NfaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgcHJpbmNpcGFsczogW25ldyBjZGsuYXdzX2lhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlbGFzdGljYWNoZS5hbWF6b25hd3MuY29tJyldLFxyXG4gICAgICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICAgJ2ttczpEZWNyeXB0JyxcclxuICAgICAgICAgICAgICAna21zOkdlbmVyYXRlRGF0YUtleScsXHJcbiAgICAgICAgICAgICAgJ2ttczpDcmVhdGVHcmFudCcsXHJcbiAgICAgICAgICAgICAgJ2ttczpEZXNjcmliZUtleScsXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIHJlc291cmNlczogWycqJ10sXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjcmVhdGVSZWRpc0FsYXJtcyhlbnZpcm9ubWVudE5hbWU6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgLy8gQ1BVIFV0aWxpemF0aW9uIGFsYXJtXHJcbiAgICBjb25zdCBjcHVBbGFybSA9IG5ldyBjZGsuYXdzX2Nsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ1JlZGlzQ3B1QWxhcm0nLCB7XHJcbiAgICAgIGFsYXJtTmFtZTogYHJlY3J1aXRtZW50LSR7ZW52aXJvbm1lbnROYW1lfS1yZWRpcy1jcHUtdXRpbGl6YXRpb25gLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnUmVkaXMgQ1BVIHV0aWxpemF0aW9uIGlzIGhpZ2gnLFxyXG4gICAgICBtZXRyaWM6IG5ldyBjZGsuYXdzX2Nsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICBuYW1lc3BhY2U6ICdBV1MvRWxhc3RpQ2FjaGUnLFxyXG4gICAgICAgIG1ldHJpY05hbWU6ICdDUFVVdGlsaXphdGlvbicsXHJcbiAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgQ2FjaGVDbHVzdGVySWQ6IHRoaXMucmVkaXMucmVmLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXHJcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgfSksXHJcbiAgICAgIHRocmVzaG9sZDogODAsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNkay5hd3NfY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2RrLmF3c19jbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE1lbW9yeSB1dGlsaXphdGlvbiBhbGFybVxyXG4gICAgY29uc3QgbWVtb3J5QWxhcm0gPSBuZXcgY2RrLmF3c19jbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdSZWRpc01lbW9yeUFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6IGByZWNydWl0bWVudC0ke2Vudmlyb25tZW50TmFtZX0tcmVkaXMtbWVtb3J5LXV0aWxpemF0aW9uYCxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ1JlZGlzIG1lbW9yeSB1dGlsaXphdGlvbiBpcyBoaWdoJyxcclxuICAgICAgbWV0cmljOiBuZXcgY2RrLmF3c19jbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0VsYXN0aUNhY2hlJyxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnRGF0YWJhc2VNZW1vcnlVc2FnZVBlcmNlbnRhZ2UnLFxyXG4gICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgIENhY2hlQ2x1c3RlcklkOiB0aGlzLnJlZGlzLnJlZixcclxuICAgICAgICB9LFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIH0pLFxyXG4gICAgICB0aHJlc2hvbGQ6IDg1LFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjZGsuYXdzX2Nsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXHJcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNkay5hd3NfY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDb25uZWN0aW9uIGNvdW50IGFsYXJtXHJcbiAgICBjb25zdCBjb25uZWN0aW9uc0FsYXJtID0gbmV3IGNkay5hd3NfY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnUmVkaXNDb25uZWN0aW9uc0FsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6IGByZWNydWl0bWVudC0ke2Vudmlyb25tZW50TmFtZX0tcmVkaXMtY29ubmVjdGlvbnNgLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnUmVkaXMgY29ubmVjdGlvbiBjb3VudCBpcyBoaWdoJyxcclxuICAgICAgbWV0cmljOiBuZXcgY2RrLmF3c19jbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0VsYXN0aUNhY2hlJyxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnQ3VyckNvbm5lY3Rpb25zJyxcclxuICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICBDYWNoZUNsdXN0ZXJJZDogdGhpcy5yZWRpcy5yZWYsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcclxuICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICB9KSxcclxuICAgICAgdGhyZXNob2xkOiA4MDAsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNkay5hd3NfY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2RrLmF3c19jbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEV2aWN0aW9ucyBhbGFybVxyXG4gICAgY29uc3QgZXZpY3Rpb25zQWxhcm0gPSBuZXcgY2RrLmF3c19jbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdSZWRpc0V2aWN0aW9uc0FsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6IGByZWNydWl0bWVudC0ke2Vudmlyb25tZW50TmFtZX0tcmVkaXMtZXZpY3Rpb25zYCxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ1JlZGlzIGV2aWN0aW9ucyBhcmUgb2NjdXJyaW5nJyxcclxuICAgICAgbWV0cmljOiBuZXcgY2RrLmF3c19jbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0VsYXN0aUNhY2hlJyxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnRXZpY3Rpb25zJyxcclxuICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICBDYWNoZUNsdXN0ZXJJZDogdGhpcy5yZWRpcy5yZWYsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIH0pLFxyXG4gICAgICB0aHJlc2hvbGQ6IDAsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAxLFxyXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNkay5hd3NfY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2RrLmF3c19jbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBhbGFybXMgdG8gYSBsaXN0IGZvciBleHRlcm5hbCByZWZlcmVuY2VcclxuICAgICh0aGlzIGFzIGFueSkuYWxhcm1zID0gW2NwdUFsYXJtLCBtZW1vcnlBbGFybSwgY29ubmVjdGlvbnNBbGFybSwgZXZpY3Rpb25zQWxhcm1dO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhZGRUYWdzKGVudmlyb25tZW50TmFtZTogc3RyaW5nKTogdm9pZCB7XHJcbiAgICBjb25zdCB0YWdzID0ge1xyXG4gICAgICBFbnZpcm9ubWVudDogZW52aXJvbm1lbnROYW1lLFxyXG4gICAgICBDb21wb25lbnQ6ICdDYWNoZScsXHJcbiAgICAgIE1hbmFnZWRCeTogJ0NESycsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIFRhZ3MgYXJlIGFkZGVkIHRocm91Z2ggdGhlIENmbkNhY2hlQ2x1c3RlciB0YWdzIHByb3BlcnR5XHJcbiAgICBPYmplY3QuZW50cmllcyh0YWdzKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcclxuICAgICAgY2RrLlRhZ3Mub2YodGhpcy5yZWRpcykuYWRkKGtleSwgdmFsdWUpO1xyXG4gICAgICBjZGsuVGFncy5vZih0aGlzLnN1Ym5ldEdyb3VwKS5hZGQoa2V5LCB2YWx1ZSk7XHJcbiAgICAgIGNkay5UYWdzLm9mKHRoaXMucGFyYW1ldGVyR3JvdXApLmFkZChrZXksIHZhbHVlKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGdldFJlZGlzRW5kcG9pbnQoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiB0aGlzLnJlZGlzLmF0dHJSZWRpc0VuZHBvaW50QWRkcmVzcztcclxuICB9XHJcblxyXG4gIHB1YmxpYyBnZXRSZWRpc1BvcnQoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiB0aGlzLnJlZGlzLmF0dHJSZWRpc0VuZHBvaW50UG9ydDtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhZGRDb25uZWN0aW9uRnJvbVNlY3VyaXR5R3JvdXAoc2VjdXJpdHlHcm91cDogZWMyLlNlY3VyaXR5R3JvdXAsIGRlc2NyaXB0aW9uOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIC8vIFRoaXMgd291bGQgbmVlZCB0byBiZSBpbXBsZW1lbnRlZCBhdCB0aGUgc2VjdXJpdHkgZ3JvdXAgbGV2ZWxcclxuICAgIC8vIHNpbmNlIHdlJ3JlIHVzaW5nIHRoZSBsb3dlci1sZXZlbCBDZm5DYWNoZUNsdXN0ZXJcclxuICAgIHNlY3VyaXR5R3JvdXAuYWRkRWdyZXNzUnVsZShcclxuICAgICAgZWMyLlBlZXIuc2VjdXJpdHlHcm91cElkKHRoaXMucmVkaXMudnBjU2VjdXJpdHlHcm91cElkcyFbMF0pLFxyXG4gICAgICBlYzIuUG9ydC50Y3AoNjM3OSksXHJcbiAgICAgIGRlc2NyaXB0aW9uXHJcbiAgICApO1xyXG4gIH1cclxufSJdfQ==