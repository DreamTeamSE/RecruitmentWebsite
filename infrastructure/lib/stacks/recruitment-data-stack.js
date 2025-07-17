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
exports.RecruitmentDataStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const database_construct_1 = require("../constructs/database-construct");
const redis_construct_1 = require("../constructs/redis-construct");
class RecruitmentDataStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Create S3 bucket for assets
        this.assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
            bucketName: `recruitment-${props.config.environmentName}-assets-${cdk.Aws.ACCOUNT_ID}`,
            removalPolicy: props.config.environmentName === 'prod' ?
                cdk.RemovalPolicy.RETAIN :
                cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: props.config.environmentName !== 'prod',
            versioned: props.config.environmentName === 'prod',
            encryption: props.config.compliance.enableEncryption ?
                s3.BucketEncryption.S3_MANAGED :
                s3.BucketEncryption.UNENCRYPTED,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            cors: [
                {
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
                    allowedOrigins: ['*'], // Should be restricted to your domain in production
                    allowedHeaders: ['*'],
                    maxAge: 3000,
                },
            ],
            lifecycleRules: [
                {
                    id: 'DeleteIncompleteMultipartUploads',
                    abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
                },
                {
                    id: 'TransitionToIA',
                    transitions: [
                        {
                            storageClass: s3.StorageClass.INFREQUENT_ACCESS,
                            transitionAfter: cdk.Duration.days(30),
                        },
                    ],
                },
            ],
        });
        // Create S3 bucket for backups if enabled
        if (props.config.security.enableBackupVault) {
            this.backupBucket = new s3.Bucket(this, 'BackupBucket', {
                bucketName: `recruitment-${props.config.environmentName}-backups-${cdk.Aws.ACCOUNT_ID}`,
                removalPolicy: cdk.RemovalPolicy.RETAIN,
                versioned: true,
                encryption: s3.BucketEncryption.KMS_MANAGED,
                publicReadAccess: false,
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                lifecycleRules: [
                    {
                        id: 'DeleteOldBackups',
                        expiration: cdk.Duration.days(props.config.security.backupRetentionDays),
                    },
                    {
                        id: 'TransitionToGlacier',
                        transitions: [
                            {
                                storageClass: s3.StorageClass.GLACIER,
                                transitionAfter: cdk.Duration.days(90),
                            },
                        ],
                    },
                ],
            });
        }
        // Create database construct
        this.databaseConstruct = new database_construct_1.DatabaseConstruct(this, 'Database', {
            config: props.config.database,
            environmentName: props.config.environmentName,
            vpc: props.vpc,
            securityGroup: props.databaseSecurityGroup,
            enableEncryption: props.config.compliance.enableEncryption,
            enablePerformanceInsights: props.config.monitoring.enablePerformanceInsights,
            enableEnhancedMonitoring: props.config.monitoring.enableEnhancedMonitoring,
            enableBackups: props.config.security.enableBackupVault,
            enableLogging: props.config.monitoring.enableEnhancedMonitoring,
        });
        this.database = this.databaseConstruct.database;
        // Create Redis construct
        this.redisConstruct = new redis_construct_1.RedisConstruct(this, 'Redis', {
            config: props.config.redis,
            environmentName: props.config.environmentName,
            vpc: props.vpc,
            securityGroup: props.redisSecurityGroup,
            enableEncryption: props.config.compliance.enableEncryption,
            enableLogging: props.config.monitoring.enableEnhancedMonitoring,
        });
        this.redis = this.redisConstruct.redis;
        // Create CloudFormation outputs
        new cdk.CfnOutput(this, 'DatabaseEndpoint', {
            value: this.database.instanceEndpoint.hostname,
            description: 'Database endpoint',
            exportName: `${props.config.environmentName}-database-endpoint`,
        });
        new cdk.CfnOutput(this, 'DatabasePort', {
            value: this.database.instanceEndpoint.port.toString(),
            description: 'Database port',
            exportName: `${props.config.environmentName}-database-port`,
        });
        new cdk.CfnOutput(this, 'DatabaseSecretArn', {
            value: this.databaseConstruct.secret.secretArn,
            description: 'Database secret ARN',
            exportName: `${props.config.environmentName}-database-secret-arn`,
        });
        new cdk.CfnOutput(this, 'RedisEndpoint', {
            value: this.redisConstruct.getRedisEndpoint(),
            description: 'Redis endpoint',
            exportName: `${props.config.environmentName}-redis-endpoint`,
        });
        new cdk.CfnOutput(this, 'RedisPort', {
            value: this.redisConstruct.getRedisPort(),
            description: 'Redis port',
            exportName: `${props.config.environmentName}-redis-port`,
        });
        new cdk.CfnOutput(this, 'AssetsBucketName', {
            value: this.assetsBucket.bucketName,
            description: 'Assets bucket name',
            exportName: `${props.config.environmentName}-assets-bucket-name`,
        });
        new cdk.CfnOutput(this, 'AssetsBucketArn', {
            value: this.assetsBucket.bucketArn,
            description: 'Assets bucket ARN',
            exportName: `${props.config.environmentName}-assets-bucket-arn`,
        });
        if (this.backupBucket) {
            new cdk.CfnOutput(this, 'BackupBucketName', {
                value: this.backupBucket.bucketName,
                description: 'Backup bucket name',
                exportName: `${props.config.environmentName}-backup-bucket-name`,
            });
            new cdk.CfnOutput(this, 'BackupBucketArn', {
                value: this.backupBucket.bucketArn,
                description: 'Backup bucket ARN',
                exportName: `${props.config.environmentName}-backup-bucket-arn`,
            });
        }
        // Add tags
        this.addTags(props.config.environmentName);
    }
    addTags(environmentName) {
        const tags = {
            Environment: environmentName,
            Component: 'Data',
            ManagedBy: 'CDK',
        };
        Object.entries(tags).forEach(([key, value]) => {
            cdk.Tags.of(this.assetsBucket).add(key, value);
            if (this.backupBucket) {
                cdk.Tags.of(this.backupBucket).add(key, value);
            }
        });
    }
}
exports.RecruitmentDataStack = RecruitmentDataStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjcnVpdG1lbnQtZGF0YS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJlY3J1aXRtZW50LWRhdGEtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHVEQUF5QztBQUV6Qyx5RUFBcUU7QUFDckUsbUVBQStEO0FBRy9ELE1BQWEsb0JBQXFCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFRakQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF5QjtRQUNqRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qiw4QkFBOEI7UUFDOUIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUN0RCxVQUFVLEVBQUUsZUFBZSxLQUFLLENBQUMsTUFBTSxDQUFDLGVBQWUsV0FBVyxHQUFHLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRTtZQUN0RixhQUFhLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEtBQUssTUFBTSxDQUFDLENBQUM7Z0JBQ3RELEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzFCLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUMzQixpQkFBaUIsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLGVBQWUsS0FBSyxNQUFNO1lBQzFELFNBQVMsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLGVBQWUsS0FBSyxNQUFNO1lBQ2xELFVBQVUsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUNwRCxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ2hDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXO1lBQ2pDLGdCQUFnQixF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QUFDO2dCQUN0QixHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNqRCxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFsTEQsb0RBa0xDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCB7IERhdGFiYXNlQ29uc3RydWN0IH0gZnJvbSAnLi4vY29uc3RydWN0cy9kYXRhYmFzZS1jb25zdHJ1Y3QnO1xyXG5pbXBvcnQgeyBSZWRpc0NvbnN0cnVjdCB9IGZyb20gJy4uL2NvbnN0cnVjdHMvcmVkaXMtY29uc3RydWN0JztcclxuaW1wb3J0IHsgRGF0YWJhc2VTdGFja1Byb3BzIH0gZnJvbSAnLi4vY29uZmlnL3R5cGVzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBSZWNydWl0bWVudERhdGFTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgcHVibGljIHJlYWRvbmx5IGRhdGFiYXNlOiBjZGsuYXdzX3Jkcy5EYXRhYmFzZUluc3RhbmNlO1xyXG4gIHB1YmxpYyByZWFkb25seSByZWRpczogY2RrLmF3c19lbGFzdGljYWNoZS5DZm5DYWNoZUNsdXN0ZXI7XHJcbiAgcHVibGljIHJlYWRvbmx5IGFzc2V0c0J1Y2tldDogczMuQnVja2V0O1xyXG4gIHB1YmxpYyByZWFkb25seSBiYWNrdXBCdWNrZXQ6IHMzLkJ1Y2tldDtcclxuICBwdWJsaWMgcmVhZG9ubHkgZGF0YWJhc2VDb25zdHJ1Y3Q6IERhdGFiYXNlQ29uc3RydWN0O1xyXG4gIHB1YmxpYyByZWFkb25seSByZWRpc0NvbnN0cnVjdDogUmVkaXNDb25zdHJ1Y3Q7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBEYXRhYmFzZVN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBTMyBidWNrZXQgZm9yIGFzc2V0c1xyXG4gICAgdGhpcy5hc3NldHNCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdBc3NldHNCdWNrZXQnLCB7XHJcbiAgICAgIGJ1Y2tldE5hbWU6IGByZWNydWl0bWVudC0ke3Byb3BzLmNvbmZpZy5lbnZpcm9ubWVudE5hbWV9LWFzc2V0cy0ke2Nkay5Bd3MuQUNDT1VOVF9JRH1gLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lID09PSAncHJvZCcgPyBcclxuICAgICAgICBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBcclxuICAgICAgICBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogcHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZSAhPT0gJ3Byb2QnLFxyXG4gICAgICB2ZXJzaW9uZWQ6IHByb3BzLmNvbmZpZy5lbnZpcm9ubWVudE5hbWUgPT09ICdwcm9kJyxcclxuICAgICAgZW5jcnlwdGlvbjogcHJvcHMuY29uZmlnLmNvbXBsaWFuY2UuZW5hYmxlRW5jcnlwdGlvbiA/IFxyXG4gICAgICAgIHMzLkJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCA6IFxyXG4gICAgICAgIHMzLkJ1Y2tldEVuY3J5cHRpb24uVU5FTkNSWVBURUQsXHJcbiAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IGZhbHNlLFxyXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxyXG4gICAgICBjb3JzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtzMy5IdHRwTWV0aG9kcy5HRVQsIHMzLkh0dHBNZXRob2RzLlBPU1QsIHMzLkh0dHBNZXRob2RzLlBVVF0sXHJcbiAgICAgICAgICBhbGxvd2VkT3JpZ2luczogWycqJ10sIC8vIFNob3VsZCBiZSByZXN0cmljdGVkIHRvIHlvdXIgZG9tYWluIGluIHByb2R1Y3Rpb25cclxuICAgICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbJyonXSxcclxuICAgICAgICAgIG1heEFnZTogMzAwMCxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgICBsaWZlY3ljbGVSdWxlczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiAnRGVsZXRlSW5jb21wbGV0ZU11bHRpcGFydFVwbG9hZHMnLFxyXG4gICAgICAgICAgYWJvcnRJbmNvbXBsZXRlTXVsdGlwYXJ0VXBsb2FkQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDcpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWQ6ICdUcmFuc2l0aW9uVG9JQScsXHJcbiAgICAgICAgICB0cmFuc2l0aW9uczogW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgc3RvcmFnZUNsYXNzOiBzMy5TdG9yYWdlQ2xhc3MuSU5GUkVRVUVOVF9BQ0NFU1MsXHJcbiAgICAgICAgICAgICAgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cygzMCksXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIF0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgUzMgYnVja2V0IGZvciBiYWNrdXBzIGlmIGVuYWJsZWRcclxuICAgIGlmIChwcm9wcy5jb25maWcuc2VjdXJpdHkuZW5hYmxlQmFja3VwVmF1bHQpIHtcclxuICAgICAgdGhpcy5iYWNrdXBCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdCYWNrdXBCdWNrZXQnLCB7XHJcbiAgICAgICAgYnVja2V0TmFtZTogYHJlY3J1aXRtZW50LSR7cHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZX0tYmFja3Vwcy0ke2Nkay5Bd3MuQUNDT1VOVF9JRH1gLFxyXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcclxuICAgICAgICB2ZXJzaW9uZWQ6IHRydWUsXHJcbiAgICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5LTVNfTUFOQUdFRCxcclxuICAgICAgICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSxcclxuICAgICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxyXG4gICAgICAgIGxpZmVjeWNsZVJ1bGVzOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIGlkOiAnRGVsZXRlT2xkQmFja3VwcycsXHJcbiAgICAgICAgICAgIGV4cGlyYXRpb246IGNkay5EdXJhdGlvbi5kYXlzKHByb3BzLmNvbmZpZy5zZWN1cml0eS5iYWNrdXBSZXRlbnRpb25EYXlzKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIGlkOiAnVHJhbnNpdGlvblRvR2xhY2llcicsXHJcbiAgICAgICAgICAgIHRyYW5zaXRpb25zOiBbXHJcbiAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgc3RvcmFnZUNsYXNzOiBzMy5TdG9yYWdlQ2xhc3MuR0xBQ0lFUixcclxuICAgICAgICAgICAgICAgIHRyYW5zaXRpb25BZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoOTApLFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBkYXRhYmFzZSBjb25zdHJ1Y3RcclxuICAgIHRoaXMuZGF0YWJhc2VDb25zdHJ1Y3QgPSBuZXcgRGF0YWJhc2VDb25zdHJ1Y3QodGhpcywgJ0RhdGFiYXNlJywge1xyXG4gICAgICBjb25maWc6IHByb3BzLmNvbmZpZy5kYXRhYmFzZSxcclxuICAgICAgZW52aXJvbm1lbnROYW1lOiBwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lLFxyXG4gICAgICB2cGM6IHByb3BzLnZwYyxcclxuICAgICAgc2VjdXJpdHlHcm91cDogcHJvcHMuZGF0YWJhc2VTZWN1cml0eUdyb3VwLFxyXG4gICAgICBlbmFibGVFbmNyeXB0aW9uOiBwcm9wcy5jb25maWcuY29tcGxpYW5jZS5lbmFibGVFbmNyeXB0aW9uLFxyXG4gICAgICBlbmFibGVQZXJmb3JtYW5jZUluc2lnaHRzOiBwcm9wcy5jb25maWcubW9uaXRvcmluZy5lbmFibGVQZXJmb3JtYW5jZUluc2lnaHRzLFxyXG4gICAgICBlbmFibGVFbmhhbmNlZE1vbml0b3Jpbmc6IHByb3BzLmNvbmZpZy5tb25pdG9yaW5nLmVuYWJsZUVuaGFuY2VkTW9uaXRvcmluZyxcclxuICAgICAgZW5hYmxlQmFja3VwczogcHJvcHMuY29uZmlnLnNlY3VyaXR5LmVuYWJsZUJhY2t1cFZhdWx0LFxyXG4gICAgICBlbmFibGVMb2dnaW5nOiBwcm9wcy5jb25maWcubW9uaXRvcmluZy5lbmFibGVFbmhhbmNlZE1vbml0b3JpbmcsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmRhdGFiYXNlID0gdGhpcy5kYXRhYmFzZUNvbnN0cnVjdC5kYXRhYmFzZTtcclxuXHJcbiAgICAvLyBDcmVhdGUgUmVkaXMgY29uc3RydWN0XHJcbiAgICB0aGlzLnJlZGlzQ29uc3RydWN0ID0gbmV3IFJlZGlzQ29uc3RydWN0KHRoaXMsICdSZWRpcycsIHtcclxuICAgICAgY29uZmlnOiBwcm9wcy5jb25maWcucmVkaXMsXHJcbiAgICAgIGVudmlyb25tZW50TmFtZTogcHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZSxcclxuICAgICAgdnBjOiBwcm9wcy52cGMsXHJcbiAgICAgIHNlY3VyaXR5R3JvdXA6IHByb3BzLnJlZGlzU2VjdXJpdHlHcm91cCxcclxuICAgICAgZW5hYmxlRW5jcnlwdGlvbjogcHJvcHMuY29uZmlnLmNvbXBsaWFuY2UuZW5hYmxlRW5jcnlwdGlvbixcclxuICAgICAgZW5hYmxlTG9nZ2luZzogcHJvcHMuY29uZmlnLm1vbml0b3JpbmcuZW5hYmxlRW5oYW5jZWRNb25pdG9yaW5nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5yZWRpcyA9IHRoaXMucmVkaXNDb25zdHJ1Y3QucmVkaXM7XHJcblxyXG4gICAgLy8gQ3JlYXRlIENsb3VkRm9ybWF0aW9uIG91dHB1dHNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEYXRhYmFzZUVuZHBvaW50Jywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5kYXRhYmFzZS5pbnN0YW5jZUVuZHBvaW50Lmhvc3RuYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0RhdGFiYXNlIGVuZHBvaW50JyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZX0tZGF0YWJhc2UtZW5kcG9pbnRgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0RhdGFiYXNlUG9ydCcsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuZGF0YWJhc2UuaW5zdGFuY2VFbmRwb2ludC5wb3J0LnRvU3RyaW5nKCksXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnRGF0YWJhc2UgcG9ydCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmNvbmZpZy5lbnZpcm9ubWVudE5hbWV9LWRhdGFiYXNlLXBvcnRgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0RhdGFiYXNlU2VjcmV0QXJuJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5kYXRhYmFzZUNvbnN0cnVjdC5zZWNyZXQuc2VjcmV0QXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0RhdGFiYXNlIHNlY3JldCBBUk4nLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lfS1kYXRhYmFzZS1zZWNyZXQtYXJuYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdSZWRpc0VuZHBvaW50Jywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5yZWRpc0NvbnN0cnVjdC5nZXRSZWRpc0VuZHBvaW50KCksXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUmVkaXMgZW5kcG9pbnQnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lfS1yZWRpcy1lbmRwb2ludGAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUmVkaXNQb3J0Jywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5yZWRpc0NvbnN0cnVjdC5nZXRSZWRpc1BvcnQoKSxcclxuICAgICAgZGVzY3JpcHRpb246ICdSZWRpcyBwb3J0JyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZX0tcmVkaXMtcG9ydGAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXNzZXRzQnVja2V0TmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuYXNzZXRzQnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQXNzZXRzIGJ1Y2tldCBuYW1lJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZX0tYXNzZXRzLWJ1Y2tldC1uYW1lYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBc3NldHNCdWNrZXRBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmFzc2V0c0J1Y2tldC5idWNrZXRBcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQXNzZXRzIGJ1Y2tldCBBUk4nLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lfS1hc3NldHMtYnVja2V0LWFybmAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBpZiAodGhpcy5iYWNrdXBCdWNrZXQpIHtcclxuICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0JhY2t1cEJ1Y2tldE5hbWUnLCB7XHJcbiAgICAgICAgdmFsdWU6IHRoaXMuYmFja3VwQnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdCYWNrdXAgYnVja2V0IG5hbWUnLFxyXG4gICAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmNvbmZpZy5lbnZpcm9ubWVudE5hbWV9LWJhY2t1cC1idWNrZXQtbmFtZWAsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0JhY2t1cEJ1Y2tldEFybicsIHtcclxuICAgICAgICB2YWx1ZTogdGhpcy5iYWNrdXBCdWNrZXQuYnVja2V0QXJuLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnQmFja3VwIGJ1Y2tldCBBUk4nLFxyXG4gICAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmNvbmZpZy5lbnZpcm9ubWVudE5hbWV9LWJhY2t1cC1idWNrZXQtYXJuYCxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQWRkIHRhZ3NcclxuICAgIHRoaXMuYWRkVGFncyhwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYWRkVGFncyhlbnZpcm9ubWVudE5hbWU6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgY29uc3QgdGFncyA9IHtcclxuICAgICAgRW52aXJvbm1lbnQ6IGVudmlyb25tZW50TmFtZSxcclxuICAgICAgQ29tcG9uZW50OiAnRGF0YScsXHJcbiAgICAgIE1hbmFnZWRCeTogJ0NESycsXHJcbiAgICB9O1xyXG5cclxuICAgIE9iamVjdC5lbnRyaWVzKHRhZ3MpLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xyXG4gICAgICBjZGsuVGFncy5vZih0aGlzLmFzc2V0c0J1Y2tldCkuYWRkKGtleSwgdmFsdWUpO1xyXG4gICAgICBpZiAodGhpcy5iYWNrdXBCdWNrZXQpIHtcclxuICAgICAgICBjZGsuVGFncy5vZih0aGlzLmJhY2t1cEJ1Y2tldCkuYWRkKGtleSwgdmFsdWUpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcbn0iXX0=