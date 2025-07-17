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
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const constructs_1 = require("constructs");
class RedisConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this.port = 6379;
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
    createCloudWatchAlarms(alertsTopic) {
        if (!alertsTopic)
            return;
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
    getConnectionString() {
        return `redis://${this.endpoint}:${this.port}`;
    }
    /**
     * Get the Redis configuration for application
     */
    getRedisConfig() {
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
exports.RedisConstruct = RedisConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmVkaXNDb25zdHJ1Y3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJSZWRpc0NvbnN0cnVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFFbkMseUVBQTJEO0FBQzNELHlEQUEyQztBQUUzQyx1RUFBeUQ7QUFFekQsMkNBQXVDO0FBWXZDLE1BQWEsY0FBZSxTQUFRLHNCQUFTO0lBTzNDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMEI7UUFDbEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUhILFNBQUksR0FBVyxJQUFJLENBQUM7UUFLbEMsZ0RBQWdEO1FBQ2hELE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLElBQUksSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDM0QsV0FBVyxFQUFFLDRCQUE0QixLQUFLLENBQUMsV0FBVyxFQUFFO1lBQzVELGlCQUFpQixFQUFFLElBQUk7WUFDdkIsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUM7UUFFSCxzQkFBc0I7UUFDdEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLFdBQVcsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUNyRSxXQUFXLEVBQUUsMEJBQTBCLEtBQUssQ0FBQyxXQUFXLEVBQUU7WUFDMUQsU0FBUyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7WUFDbEUsb0JBQW9CLEVBQUUscUJBQXFCLEtBQUssQ0FBQyxXQUFXLEVBQUU7U0FDL0QsQ0FBQyxDQUFDO1FBRUgsaURBQWlEO1FBQ2pELElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxXQUFXLENBQUMs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dXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcclxuaW1wb3J0ICogYXMgZWxhc3RpY2FjaGUgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVsYXN0aWNhY2hlJztcclxuaW1wb3J0ICogYXMga21zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1rbXMnO1xyXG5pbXBvcnQgKiBhcyBzbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucyc7XHJcbmltcG9ydCAqIGFzIGNsb3Vkd2F0Y2ggZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3Vkd2F0Y2gnO1xyXG5pbXBvcnQgKiBhcyB0YXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMtdGFyZ2V0cyc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5pbXBvcnQgeyBSZWRpc0NvbmZpZyB9IGZyb20gJy4uL2NvbmZpZy9FbnZpcm9ubWVudENvbmZpZyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJlZGlzQ29uc3RydWN0UHJvcHMge1xyXG4gIHZwYzogZWMyLlZwYztcclxuICBzZWN1cml0eUdyb3VwOiBlYzIuU2VjdXJpdHlHcm91cDtcclxuICBjb25maWc6IFJlZGlzQ29uZmlnO1xyXG4gIGVudmlyb25tZW50OiBzdHJpbmc7XHJcbiAga21zS2V5Pzoga21zLktleTtcclxuICBhbGVydHNUb3BpYz86IHNucy5Ub3BpYztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFJlZGlzQ29uc3RydWN0IGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgY2x1c3RlcjogZWxhc3RpY2FjaGUuQ2ZuUmVwbGljYXRpb25Hcm91cDtcclxuICBwdWJsaWMgcmVhZG9ubHkgc3VibmV0R3JvdXA6IGVsYXN0aWNhY2hlLkNmblN1Ym5ldEdyb3VwO1xyXG4gIHB1YmxpYyByZWFkb25seSBwYXJhbWV0ZXJHcm91cDogZWxhc3RpY2FjaGUuQ2ZuUGFyYW1ldGVyR3JvdXA7XHJcbiAgcHVibGljIHJlYWRvbmx5IGVuZHBvaW50OiBzdHJpbmc7XHJcbiAgcHVibGljIHJlYWRvbmx5IHBvcnQ6IG51bWJlciA9IDYzNzk7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBSZWRpc0NvbnN0cnVjdFByb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBLTVMga2V5IGZvciBlbmNyeXB0aW9uIGlmIG5vdCBwcm92aWRlZFxyXG4gICAgY29uc3Qga21zS2V5ID0gcHJvcHMua21zS2V5IHx8IG5ldyBrbXMuS2V5KHRoaXMsICdSZWRpc0tleScsIHtcclxuICAgICAgZGVzY3JpcHRpb246IGBSZWRpcyBlbmNyeXB0aW9uIGtleSBmb3IgJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxyXG4gICAgICBlbmFibGVLZXlSb3RhdGlvbjogdHJ1ZSxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBzdWJuZXQgZ3JvdXBcclxuICAgIHRoaXMuc3VibmV0R3JvdXAgPSBuZXcgZWxhc3RpY2FjaGUuQ2ZuU3VibmV0R3JvdXAodGhpcywgJ1N1Ym5ldEdyb3VwJywge1xyXG4gICAgICBkZXNjcmlwdGlvbjogYFJlZGlzIHN1Ym5ldCBncm91cCBmb3IgJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxyXG4gICAgICBzdWJuZXRJZHM6IHByb3BzLnZwYy5wcml2YXRlU3VibmV0cy5tYXAoc3VibmV0ID0+IHN1Ym5ldC5zdWJuZXRJZCksXHJcbiAgICAgIGNhY2hlU3VibmV0R3JvdXBOYW1lOiBgcmVjcnVpdG1lbnQtcmVkaXMtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIHBhcmFtZXRlciBncm91cCB3aXRoIG9wdGltaXplZCBzZXR0aW5nc1xyXG4gICAgdGhpcy5wYXJhbWV0ZXJHcm91cCA9IG5ldyBlbGFzdGljYWNoZS5DZm5QYXJhbWV0ZXJHcm91cCh0aGlzLCAnUGFyYW1ldGVyR3JvdXAnLCB7XHJcbiAgICAgIGNhY2hlUGFyYW1ldGVyR3JvdXBGYW1pbHk6ICdyZWRpczcueCcsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiBgUmVkaXMgcGFyYW1ldGVyIGdyb3VwIGZvciAke3Byb3BzLmVudmlyb25tZW50fWAsXHJcbiAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAvLyBNZW1vcnkgbWFuYWdlbWVudFxyXG4gICAgICAgICdtYXhtZW1vcnktcG9saWN5JzogJ2FsbGtleXMtbHJ1JyxcclxuICAgICAgICAnbWF4bWVtb3J5LXNhbXBsZXMnOiAnNScsXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gUGVyZm9ybWFuY2Ugc2V0dGluZ3NcclxuICAgICAgICAndGNwLWtlZXBhbGl2ZSc6ICczMDAnLFxyXG4gICAgICAgICd0aW1lb3V0JzogJzAnLFxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFBlcnNpc3RlbmNlIHNldHRpbmdzIChmb3Igbm9uLWNsdXN0ZXIgbW9kZSlcclxuICAgICAgICAnc2F2ZSc6IHByb3BzLmVudmlyb25tZW50ID09PSAncHJvZCcgPyAnOTAwIDEgMzAwIDEwIDYwIDEwMDAwJyA6ICcnLFxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIExvZ2dpbmdcclxuICAgICAgICAnc2xvd2xvZy1sb2ctc2xvd2VyLXRoYW4nOiAnMTAwMDAnLFxyXG4gICAgICAgICdzbG93bG9nLW1heC1sZW4nOiAnMTAwMCcsXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQ2xpZW50IHNldHRpbmdzXHJcbiAgICAgICAgJ21heGNsaWVudHMnOiAnMTAwMDAnLFxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIE5vdGlmaWNhdGlvbiBzZXR0aW5nc1xyXG4gICAgICAgICdub3RpZnkta2V5c3BhY2UtZXZlbnRzJzogJ0V4JyxcclxuICAgICAgICBcclxuICAgICAgICAvLyBTZWN1cml0eVxyXG4gICAgICAgICdwcm90ZWN0ZWQtbW9kZSc6ICdubycsIC8vIEhhbmRsZWQgYnkgVlBDIHNlY3VyaXR5IGdyb3Vwc1xyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRGV0ZXJtaW5lIHRoZSBudW1iZXIgb2Ygbm9kZSBncm91cHMgYW5kIHJlcGxpY2FzXHJcbiAgICBjb25zdCBub2RlR3JvdXBzID0gTWF0aC5jZWlsKHByb3BzLmNvbmZpZy5udW1DYWNoZU5vZGVzIC8gMik7XHJcbiAgICBjb25zdCByZXBsaWNhc1Blck5vZGVHcm91cCA9IHByb3BzLmNvbmZpZy5udW1DYWNoZU5vZGVzID4gMSA/IDEgOiAwO1xyXG5cclxuICAgIC8vIENyZWF0ZSBSZWRpcyByZXBsaWNhdGlvbiBncm91cFxyXG4gICAgdGhpcy5jbHVzdGVyID0gbmV3IGVsYXN0aWNhY2hlLkNmblJlcGxpY2F0aW9uR3JvdXAodGhpcywgJ1JlcGxpY2F0aW9uR3JvdXAnLCB7XHJcbiAgICAgIHJlcGxpY2F0aW9uR3JvdXBJZDogYHJlY3J1aXRtZW50LXJlZGlzLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcclxuICAgICAgZGVzY3JpcHRpb246IGBSZWRpcyBjbHVzdGVyIGZvciByZWNydWl0bWVudCB3ZWJzaXRlICR7cHJvcHMuZW52aXJvbm1lbnR9YCxcclxuICAgICAgXHJcbiAgICAgIC8vIE5vZGUgY29uZmlndXJhdGlvblxyXG4gICAgICBjYWNoZU5vZGVUeXBlOiBwcm9wcy5jb25maWcubm9kZVR5cGUsXHJcbiAgICAgIG51bUNhY2hlQ2x1c3RlcnM6IHByb3BzLmNvbmZpZy5hdXRvbWF0aWNGYWlsb3ZlciA/IHVuZGVmaW5lZCA6IHByb3BzLmNvbmZpZy5udW1DYWNoZU5vZGVzLFxyXG4gICAgICBudW1Ob2RlR3JvdXBzOiBwcm9wcy5jb25maWcuYXV0b21hdGljRmFpbG92ZXIgPyBub2RlR3JvdXBzIDogdW5kZWZpbmVkLFxyXG4gICAgICByZXBsaWNhc1Blck5vZGVHcm91cDogcHJvcHMuY29uZmlnLmF1dG9tYXRpY0ZhaWxvdmVyID8gcmVwbGljYXNQZXJOb2RlR3JvdXAgOiB1bmRlZmluZWQsXHJcbiAgICAgIFxyXG4gICAgICAvLyBFbmdpbmUgc2V0dGluZ3NcclxuICAgICAgZW5naW5lOiAncmVkaXMnLFxyXG4gICAgICBlbmdpbmVWZXJzaW9uOiAnNy4wJyxcclxuICAgICAgY2FjaGVQYXJhbWV0ZXJHcm91cE5hbWU6IHRoaXMucGFyYW1ldGVyR3JvdXAucmVmLFxyXG4gICAgICBcclxuICAgICAgLy8gTmV0d29yayBzZXR0aW5nc1xyXG4gICAgICBjYWNoZVN1Ym5ldEdyb3VwTmFtZTogdGhpcy5zdWJuZXRHcm91cC5yZWYsXHJcbiAgICAgIHNlY3VyaXR5R3JvdXBJZHM6IFtwcm9wcy5zZWN1cml0eUdyb3VwLnNlY3VyaXR5R3JvdXBJZF0sXHJcbiAgICAgIHBvcnQ6IHRoaXMucG9ydCxcclxuICAgICAgXHJcbiAgICAgIC8vIEhpZ2ggYXZhaWxhYmlsaXR5XHJcbiAgICAgIGF1dG9tYXRpY0ZhaWxvdmVyRW5hYmxlZDogcHJvcHMuY29uZmlnLmF1dG9tYXRpY0ZhaWxvdmVyLFxyXG4gICAgICBtdWx0aUF6RW5hYmxlZDogcHJvcHMuY29uZmlnLm11bHRpQXpFbmFibGVkLFxyXG4gICAgICBcclxuICAgICAgLy8gU2VjdXJpdHkgYW5kIGVuY3J5cHRpb25cclxuICAgICAgYXRSZXN0RW5jcnlwdGlvbkVuYWJsZWQ6IHByb3BzLmNvbmZpZy5hdFJlc3RFbmNyeXB0aW9uRW5hYmxlZCxcclxuICAgICAgdHJhbnNpdEVuY3J5cHRpb25FbmFibGVkOiBwcm9wcy5jb25maWcudHJhbnNpdEVuY3J5cHRpb25FbmFibGVkLFxyXG4gICAgICBrbXNLZXlJZDogcHJvcHMuY29uZmlnLmF0UmVzdEVuY3J5cHRpb25FbmFibGVkID8ga21zS2V5LmtleUFybiA6IHVuZGVmaW5lZCxcclxuICAgICAgYXV0aFRva2VuOiBwcm9wcy5jb25maWcudHJhbnNpdEVuY3J5cHRpb25FbmFibGVkID8gJ3BsYWNlaG9sZGVyLXRva2VuJyA6IHVuZGVmaW5lZCxcclxuICAgICAgXHJcbiAgICAgIC8vIEJhY2t1cCBzZXR0aW5nc1xyXG4gICAgICBzbmFwc2hvdFJldGVudGlvbkxpbWl0OiBwcm9wcy5lbnZpcm9ubWVudCA9PT0gJ3Byb2QnID8gNyA6IDEsXHJcbiAgICAgIHNuYXBzaG90V2luZG93OiAnMDM6MDAtMDU6MDAnLFxyXG4gICAgICBwcmVmZXJyZWRNYWludGVuYW5jZVdpbmRvdzogJ3N1bjowNTowMC1zdW46MDY6MDAnLFxyXG4gICAgICBcclxuICAgICAgLy8gTG9nZ2luZ1xyXG4gICAgICBsb2dEZWxpdmVyeUNvbmZpZ3VyYXRpb25zOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgZGVzdGluYXRpb25UeXBlOiAnY2xvdWR3YXRjaC1sb2dzJyxcclxuICAgICAgICAgIGRlc3RpbmF0aW9uRGV0YWlsczoge1xyXG4gICAgICAgICAgICBsb2dHcm91cDogYC9hd3MvZWxhc3RpY2FjaGUvcmVkaXMvJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGxvZ0Zvcm1hdDogJ2pzb24nLFxyXG4gICAgICAgICAgbG9nVHlwZTogJ3Nsb3ctbG9nJyxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgICBcclxuICAgICAgLy8gTm90aWZpY2F0aW9uIHNldHRpbmdzXHJcbiAgICAgIG5vdGlmaWNhdGlvblRvcGljQXJuOiBwcm9wcy5hbGVydHNUb3BpYz8udG9waWNBcm4sXHJcbiAgICAgIFxyXG4gICAgICAvLyBBdXRvIHVwZ3JhZGVcclxuICAgICAgYXV0b01pbm9yVmVyc2lvblVwZ3JhZGU6IHRydWUsXHJcbiAgICAgIFxyXG4gICAgICAvLyBUYWdzXHJcbiAgICAgIHRhZ3M6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBrZXk6ICdOYW1lJyxcclxuICAgICAgICAgIHZhbHVlOiBgcmVjcnVpdG1lbnQtcmVkaXMtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAga2V5OiAnRW52aXJvbm1lbnQnLFxyXG4gICAgICAgICAgdmFsdWU6IHByb3BzLmVudmlyb25tZW50LFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAga2V5OiAnQ29tcG9uZW50JyxcclxuICAgICAgICAgIHZhbHVlOiAnQ2FjaGUnLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIF0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTZXQgdGhlIGVuZHBvaW50XHJcbiAgICB0aGlzLmVuZHBvaW50ID0gcHJvcHMuY29uZmlnLmF1dG9tYXRpY0ZhaWxvdmVyIFxyXG4gICAgICA/IHRoaXMuY2x1c3Rlci5hdHRyQ29uZmlndXJhdGlvbkVuZFBvaW50QWRkcmVzcyBcclxuICAgICAgOiB0aGlzLmNsdXN0ZXIuYXR0clJlZGlzRW5kUG9pbnRBZGRyZXNzO1xyXG5cclxuICAgIC8vIENyZWF0ZSBDbG91ZFdhdGNoIGFsYXJtc1xyXG4gICAgdGhpcy5jcmVhdGVDbG91ZFdhdGNoQWxhcm1zKHByb3BzLmFsZXJ0c1RvcGljKTtcclxuXHJcbiAgICAvLyBHcmFudCBLTVMgcGVybWlzc2lvbnNcclxuICAgIGlmIChwcm9wcy5jb25maWcuYXRSZXN0RW5jcnlwdGlvbkVuYWJsZWQpIHtcclxuICAgICAga21zS2V5LmdyYW50RW5jcnlwdERlY3J5cHQobmV3IGNkay5hd3NfaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2VsYXN0aWNhY2hlLmFtYXpvbmF3cy5jb20nKSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNyZWF0ZUNsb3VkV2F0Y2hBbGFybXMoYWxlcnRzVG9waWM/OiBzbnMuVG9waWMpOiB2b2lkIHtcclxuICAgIGlmICghYWxlcnRzVG9waWMpIHJldHVybjtcclxuXHJcbiAgICAvLyBDUFUgdXRpbGl6YXRpb24gYWxhcm1cclxuICAgIGNvbnN0IGNwdUFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0NQVUFsYXJtJywge1xyXG4gICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0VsYXN0aUNhY2hlJyxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnQ1BVVXRpbGl6YXRpb24nLFxyXG4gICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgIENhY2hlQ2x1c3RlcklkOiB0aGlzLmNsdXN0ZXIucmVmLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXHJcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgfSksXHJcbiAgICAgIHRocmVzaG9sZDogODAsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnUmVkaXMgQ1BVIHV0aWxpemF0aW9uIGlzIHRvbyBoaWdoJyxcclxuICAgIH0pO1xyXG4gICAgY3B1QWxhcm0uYWRkQWxhcm1BY3Rpb24obmV3IGNsb3Vkd2F0Y2guU25zQWN0aW9uKGFsZXJ0c1RvcGljKSk7XHJcblxyXG4gICAgLy8gTWVtb3J5IHV0aWxpemF0aW9uIGFsYXJtXHJcbiAgICBjb25zdCBtZW1vcnlBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdNZW1vcnlBbGFybScsIHtcclxuICAgICAgbWV0cmljOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgIG5hbWVzcGFjZTogJ0FXUy9FbGFzdGlDYWNoZScsXHJcbiAgICAgICAgbWV0cmljTmFtZTogJ0RhdGFiYXNlTWVtb3J5VXNhZ2VQZXJjZW50YWdlJyxcclxuICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICBDYWNoZUNsdXN0ZXJJZDogdGhpcy5jbHVzdGVyLnJlZixcclxuICAgICAgICB9LFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIH0pLFxyXG4gICAgICB0aHJlc2hvbGQ6IDg1LFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ1JlZGlzIG1lbW9yeSB1dGlsaXphdGlvbiBpcyB0b28gaGlnaCcsXHJcbiAgICB9KTtcclxuICAgIG1lbW9yeUFsYXJtLmFkZEFsYXJtQWN0aW9uKG5ldyBjbG91ZHdhdGNoLlNuc0FjdGlvbihhbGVydHNUb3BpYykpO1xyXG5cclxuICAgIC8vIEV2aWN0aW9ucyBhbGFybVxyXG4gICAgY29uc3QgZXZpY3Rpb25zQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnRXZpY3Rpb25zQWxhcm0nLCB7XHJcbiAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICBuYW1lc3BhY2U6ICdBV1MvRWxhc3RpQ2FjaGUnLFxyXG4gICAgICAgIG1ldHJpY05hbWU6ICdFdmljdGlvbnMnLFxyXG4gICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgIENhY2hlQ2x1c3RlcklkOiB0aGlzLmNsdXN0ZXIucmVmLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICB9KSxcclxuICAgICAgdGhyZXNob2xkOiAxMDAsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnUmVkaXMgZXZpY3Rpb25zIGFyZSB0b28gaGlnaCcsXHJcbiAgICB9KTtcclxuICAgIGV2aWN0aW9uc0FsYXJtLmFkZEFsYXJtQWN0aW9uKG5ldyBjbG91ZHdhdGNoLlNuc0FjdGlvbihhbGVydHNUb3BpYykpO1xyXG5cclxuICAgIC8vIENhY2hlIGhpdCByYXRpbyBhbGFybVxyXG4gICAgY29uc3QgaGl0UmF0aW9BbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdIaXRSYXRpb0FsYXJtJywge1xyXG4gICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0VsYXN0aUNhY2hlJyxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnQ2FjaGVIaXRSYXRlJyxcclxuICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICBDYWNoZUNsdXN0ZXJJZDogdGhpcy5jbHVzdGVyLnJlZixcclxuICAgICAgICB9LFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIH0pLFxyXG4gICAgICB0aHJlc2hvbGQ6IDgwLFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMyxcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5MRVNTX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnUmVkaXMgY2FjaGUgaGl0IHJhdGlvIGlzIHRvbyBsb3cnLFxyXG4gICAgfSk7XHJcbiAgICBoaXRSYXRpb0FsYXJtLmFkZEFsYXJtQWN0aW9uKG5ldyBjbG91ZHdhdGNoLlNuc0FjdGlvbihhbGVydHNUb3BpYykpO1xyXG5cclxuICAgIC8vIENvbm5lY3Rpb24gY291bnQgYWxhcm1cclxuICAgIGNvbnN0IGNvbm5lY3Rpb25zQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnQ29ubmVjdGlvbnNBbGFybScsIHtcclxuICAgICAgbWV0cmljOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgIG5hbWVzcGFjZTogJ0FXUy9FbGFzdGlDYWNoZScsXHJcbiAgICAgICAgbWV0cmljTmFtZTogJ0N1cnJDb25uZWN0aW9ucycsXHJcbiAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgQ2FjaGVDbHVzdGVySWQ6IHRoaXMuY2x1c3Rlci5yZWYsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcclxuICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICB9KSxcclxuICAgICAgdGhyZXNob2xkOiAxMDAsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnUmVkaXMgY29ubmVjdGlvbiBjb3VudCBpcyB0b28gaGlnaCcsXHJcbiAgICB9KTtcclxuICAgIGNvbm5lY3Rpb25zQWxhcm0uYWRkQWxhcm1BY3Rpb24obmV3IGNsb3Vkd2F0Y2guU25zQWN0aW9uKGFsZXJ0c1RvcGljKSk7XHJcblxyXG4gICAgLy8gRW5naW5lIENQVSB1dGlsaXphdGlvbiBhbGFybSAoZm9yIFJlZGlzIDcueClcclxuICAgIGNvbnN0IGVuZ2luZUNwdUFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0VuZ2luZUNQVUFsYXJtJywge1xyXG4gICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0VsYXN0aUNhY2hlJyxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnRW5naW5lQ1BVVXRpbGl6YXRpb24nLFxyXG4gICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgIENhY2hlQ2x1c3RlcklkOiB0aGlzLmNsdXN0ZXIucmVmLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXHJcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgfSksXHJcbiAgICAgIHRocmVzaG9sZDogODAsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnUmVkaXMgZW5naW5lIENQVSB1dGlsaXphdGlvbiBpcyB0b28gaGlnaCcsXHJcbiAgICB9KTtcclxuICAgIGVuZ2luZUNwdUFsYXJtLmFkZEFsYXJtQWN0aW9uKG5ldyBjbG91ZHdhdGNoLlNuc0FjdGlvbihhbGVydHNUb3BpYykpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IHRoZSBSZWRpcyBjb25uZWN0aW9uIHN0cmluZ1xyXG4gICAqL1xyXG4gIHB1YmxpYyBnZXRDb25uZWN0aW9uU3RyaW5nKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gYHJlZGlzOi8vJHt0aGlzLmVuZHBvaW50fToke3RoaXMucG9ydH1gO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IHRoZSBSZWRpcyBjb25maWd1cmF0aW9uIGZvciBhcHBsaWNhdGlvblxyXG4gICAqL1xyXG4gIHB1YmxpYyBnZXRSZWRpc0NvbmZpZygpOiB7IFtrZXk6IHN0cmluZ106IGFueSB9IHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGhvc3Q6IHRoaXMuZW5kcG9pbnQsXHJcbiAgICAgIHBvcnQ6IHRoaXMucG9ydCxcclxuICAgICAgZmFtaWx5OiA0LFxyXG4gICAgICBrZWVwQWxpdmU6IHRydWUsXHJcbiAgICAgIGxhenlDb25uZWN0OiB0cnVlLFxyXG4gICAgICByZXRyeURlbGF5T25GYWlsb3ZlcjogMTAwLFxyXG4gICAgICBlbmFibGVPZmZsaW5lUXVldWU6IGZhbHNlLFxyXG4gICAgICBtYXhSZXRyaWVzUGVyUmVxdWVzdDogMyxcclxuICAgICAgcmV0cnlEZWxheU9uQ2x1c3RlckRvd246IDMwMCxcclxuICAgICAgZW5hYmxlUmVhZHlDaGVjazogdHJ1ZSxcclxuICAgICAgbWF4UmV0cmllc1BlclJlcXVlc3Q6IDMsXHJcbiAgICB9O1xyXG4gIH1cclxufSJdfQ==