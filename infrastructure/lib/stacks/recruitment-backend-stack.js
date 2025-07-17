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
exports.RecruitmentBackendStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ssm = __importStar(require("aws-cdk-lib/aws-ssm"));
const ecs_construct_1 = require("../constructs/ecs-construct");
class RecruitmentBackendStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Create SSM parameters for configuration
        this.createSSMParameters(props);
        // Create ECS construct
        this.ecsConstruct = new ecs_construct_1.EcsConstruct(this, 'Backend', {
            config: props.config.ecs,
            environmentName: props.config.environmentName,
            vpc: props.vpc,
            cluster: props.cluster,
            loadBalancer: props.loadBalancer,
            securityGroup: props.backendSecurityGroup,
            databaseSecret: props.database.secret,
            redisEndpoint: props.redis.attrRedisEndpointAddress,
            enableXRay: props.config.monitoring.enableXRay,
            enableLogging: props.config.monitoring.enableEnhancedMonitoring,
            enableServiceDiscovery: props.config.features.enableEventBridge,
        });
        this.backendService = this.ecsConstruct.service;
        this.backendUrl = this.ecsConstruct.getServiceUrl();
        // Grant S3 permissions to the backend service
        props.assetsBucket.grantReadWrite(this.ecsConstruct.taskRole);
        // Add additional environment variables
        this.ecsConstruct.addEnvironmentVariable('S3_BUCKET_NAME', props.assetsBucket.bucketName);
        this.ecsConstruct.addEnvironmentVariable('S3_REGION', cdk.Aws.REGION);
        this.ecsConstruct.addEnvironmentVariable('ENVIRONMENT', props.config.environmentName);
        // Create CloudFormation outputs
        new cdk.CfnOutput(this, 'BackendServiceName', {
            value: this.backendService.serviceName,
            description: 'Backend service name',
            exportName: `${props.config.environmentName}-backend-service-name`,
        });
        new cdk.CfnOutput(this, 'BackendServiceArn', {
            value: this.backendService.serviceArn,
            description: 'Backend service ARN',
            exportName: `${props.config.environmentName}-backend-service-arn`,
        });
        new cdk.CfnOutput(this, 'BackendUrl', {
            value: this.backendUrl,
            description: 'Backend URL',
            exportName: `${props.config.environmentName}-backend-url`,
        });
        new cdk.CfnOutput(this, 'EcrRepositoryUri', {
            value: this.ecsConstruct.repository.repositoryUri,
            description: 'ECR repository URI',
            exportName: `${props.config.environmentName}-ecr-repository-uri`,
        });
        new cdk.CfnOutput(this, 'TaskDefinitionArn', {
            value: this.ecsConstruct.taskDefinition.taskDefinitionArn,
            description: 'Task definition ARN',
            exportName: `${props.config.environmentName}-task-definition-arn`,
        });
        new cdk.CfnOutput(this, 'TaskExecutionRoleArn', {
            value: this.ecsConstruct.executionRole.roleArn,
            description: 'Task execution role ARN',
            exportName: `${props.config.environmentName}-task-execution-role-arn`,
        });
        new cdk.CfnOutput(this, 'TaskRoleArn', {
            value: this.ecsConstruct.taskRole.roleArn,
            description: 'Task role ARN',
            exportName: `${props.config.environmentName}-task-role-arn`,
        });
        // Add tags
        this.addTags(props.config.environmentName);
    }
    createSSMParameters(props) {
        // Create SSM parameters for application configuration
        const parameterPrefix = `/recruitment/${props.config.environmentName}`;
        // Application configuration parameters
        new ssm.StringParameter(this, 'NodeEnvParameter', {
            parameterName: `${parameterPrefix}/NODE_ENV`,
            stringValue: props.config.environmentName === 'prod' ? 'production' : 'development',
            description: 'Node.js environment',
            tier: ssm.ParameterTier.STANDARD,
        });
        new ssm.StringParameter(this, 'PortParameter', {
            parameterName: `${parameterPrefix}/PORT`,
            stringValue: '3000',
            description: 'Application port',
            tier: ssm.ParameterTier.STANDARD,
        });
        new ssm.StringParameter(this, 'RedisHostParameter', {
            parameterName: `${parameterPrefix}/REDIS_HOST`,
            stringValue: props.redis.attrRedisEndpointAddress,
            description: 'Redis host endpoint',
            tier: ssm.ParameterTier.STANDARD,
        });
        new ssm.StringParameter(this, 'RedisPortParameter', {
            parameterName: `${parameterPrefix}/REDIS_PORT`,
            stringValue: props.redis.attrRedisEndpointPort,
            description: 'Redis port',
            tier: ssm.ParameterTier.STANDARD,
        });
        new ssm.StringParameter(this, 'S3BucketParameter', {
            parameterName: `${parameterPrefix}/S3_BUCKET_NAME`,
            stringValue: props.assetsBucket.bucketName,
            description: 'S3 assets bucket name',
            tier: ssm.ParameterTier.STANDARD,
        });
        new ssm.StringParameter(this, 'AwsRegionParameter', {
            parameterName: `${parameterPrefix}/AWS_REGION`,
            stringValue: cdk.Aws.REGION,
            description: 'AWS region',
            tier: ssm.ParameterTier.STANDARD,
        });
        // Frontend URL parameter
        let frontendUrl = 'http://localhost:3001';
        if (props.config.environmentName === 'prod') {
            frontendUrl = 'https://recruitment.example.com';
        }
        else if (props.config.environmentName === 'staging') {
            frontendUrl = 'https://staging.recruitment.example.com';
        }
        new ssm.StringParameter(this, 'FrontendUrlParameter', {
            parameterName: `${parameterPrefix}/FRONTEND_URL`,
            stringValue: frontendUrl,
            description: 'Frontend URL',
            tier: ssm.ParameterTier.STANDARD,
        });
        // Rate limiting parameters
        new ssm.StringParameter(this, 'RateLimitWindowParameter', {
            parameterName: `${parameterPrefix}/RATE_LIMIT_WINDOW_MS`,
            stringValue: '900000', // 15 minutes
            description: 'Rate limiting window in milliseconds',
            tier: ssm.ParameterTier.STANDARD,
        });
        new ssm.StringParameter(this, 'RateLimitMaxRequestsParameter', {
            parameterName: `${parameterPrefix}/RATE_LIMIT_MAX_REQUESTS`,
            stringValue: props.config.environmentName === 'prod' ? '100' : '1000',
            description: 'Maximum requests per window',
            tier: ssm.ParameterTier.STANDARD,
        });
        // Logging configuration
        new ssm.StringParameter(this, 'LogLevelParameter', {
            parameterName: `${parameterPrefix}/LOG_LEVEL`,
            stringValue: props.config.environmentName === 'prod' ? 'info' : 'debug',
            description: 'Application log level',
            tier: ssm.ParameterTier.STANDARD,
        });
        // CORS configuration
        new ssm.StringParameter(this, 'CorsOriginsParameter', {
            parameterName: `${parameterPrefix}/CORS_ORIGINS`,
            stringValue: this.getCorsOrigins(props.config.environmentName),
            description: 'CORS allowed origins',
            tier: ssm.ParameterTier.STANDARD,
        });
        // Session configuration
        new ssm.StringParameter(this, 'SessionMaxAgeParameter', {
            parameterName: `${parameterPrefix}/SESSION_MAX_AGE`,
            stringValue: props.config.environmentName === 'prod' ? '3600000' : '86400000', // 1 hour prod, 24 hours dev
            description: 'Session maximum age in milliseconds',
            tier: ssm.ParameterTier.STANDARD,
        });
        // Cookie configuration
        new ssm.StringParameter(this, 'CookieSecureParameter', {
            parameterName: `${parameterPrefix}/COOKIE_SECURE`,
            stringValue: props.config.environmentName === 'prod' ? 'true' : 'false',
            description: 'Cookie secure flag',
            tier: ssm.ParameterTier.STANDARD,
        });
        new ssm.StringParameter(this, 'CookieSameSiteParameter', {
            parameterName: `${parameterPrefix}/COOKIE_SAME_SITE`,
            stringValue: props.config.environmentName === 'prod' ? 'strict' : 'lax',
            description: 'Cookie SameSite policy',
            tier: ssm.ParameterTier.STANDARD,
        });
    }
    getCorsOrigins(environmentName) {
        const origins = ['http://localhost:3001', 'http://localhost:3000'];
        if (environmentName === 'prod') {
            origins.push('https://recruitment.example.com');
        }
        else if (environmentName === 'staging') {
            origins.push('https://staging.recruitment.example.com');
        }
        return origins.join(',');
    }
    addTags(environmentName) {
        const tags = {
            Environment: environmentName,
            Component: 'Backend',
            ManagedBy: 'CDK',
        };
        Object.entries(tags).forEach(([key, value]) => {
            cdk.Tags.of(this.backendService).add(key, value);
        });
    }
}
exports.RecruitmentBackendStack = RecruitmentBackendStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjcnVpdG1lbnQtYmFja2VuZC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJlY3J1aXRtZW50LWJhY2tlbmQtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHlEQUEyQztBQUUzQywrREFBMkQ7QUFHM0QsTUFBYSx1QkFBd0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUtwRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXdCO1FBQ2hFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLDBDQUEwQztRQUMxQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFaEMsdUJBQXVCO1FBQ3ZCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSw0QkFBWSxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDcEQsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRztZQUN4QixlQUFlLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxlQUFlO1lBQzdDLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRztZQUNkLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTztZQUN0QixZQUFZLEVBQUUsS0FBSyxDQUFDLFlBQVk7WUFDaEMsYUFBYSxFQUFFLEtBQUssQ0FBQyxvQkFBb0I7WUFDekMsY0FBYyxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTTtZQUNyQyxhQUFhLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyx3QkFBd0I7WUFDbkQsVUFBVSxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLFVBQVU7WUFDOUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLHdCQUF3QjtZQUMvRCxzQkFBc0IsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLFFB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LEVBQUUsd0JBQXdCO1lBQ3JDLElBQUksRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLFFBQVE7U0FDakMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGNBQWMsQ0FBQyxlQUF1QjtRQUM1QyxNQUFNLE9BQU8sR0FBRyxDQUFDLHVCQUF1QixFQUFFLHVCQUF1QixDQUFDLENBQUM7UUFFbkUsSUFBSSxlQUFlLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDL0IsT0FBTyxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ2xELENBQUM7YUFBTSxJQUFJLGVBQWUsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN6QyxPQUFPLENBQUMsSUFBSSxDQUFDLHlDQUF5QyxDQUFDLENBQUM7UUFDMUQsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBRU8sT0FBTyxDQUFDLGVBQXVCO1FBQ3JDLE1BQU0sSUFBSSxHQUFHO1lBQ1gsV0FBVyxFQUFFLGVBQWU7WUFDNUIsU0FBUyxFQUFFLFNBQVM7WUFDcEIsU0FBUyxFQUFFLEtBQUs7U0FDakIsQ0FBQztRQUVGLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRTtZQUM1QyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuRCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWhPRCwwREFnT0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBzc20gZnJvbSAnYXdzLWNkay1saWIvYXdzLXNzbSc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5pbXBvcnQgeyBFY3NDb25zdHJ1Y3QgfSBmcm9tICcuLi9jb25zdHJ1Y3RzL2Vjcy1jb25zdHJ1Y3QnO1xyXG5pbXBvcnQgeyBCYWNrZW5kU3RhY2tQcm9wcyB9IGZyb20gJy4uL2NvbmZpZy90eXBlcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgUmVjcnVpdG1lbnRCYWNrZW5kU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIHB1YmxpYyByZWFkb25seSBiYWNrZW5kU2VydmljZTogY2RrLmF3c19lY3MuRmFyZ2F0ZVNlcnZpY2U7XHJcbiAgcHVibGljIHJlYWRvbmx5IGJhY2tlbmRVcmw6IHN0cmluZztcclxuICBwdWJsaWMgcmVhZG9ubHkgZWNzQ29uc3RydWN0OiBFY3NDb25zdHJ1Y3Q7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBCYWNrZW5kU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIFNTTSBwYXJhbWV0ZXJzIGZvciBjb25maWd1cmF0aW9uXHJcbiAgICB0aGlzLmNyZWF0ZVNTTVBhcmFtZXRlcnMocHJvcHMpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBFQ1MgY29uc3RydWN0XHJcbiAgICB0aGlzLmVjc0NvbnN0cnVjdCA9IG5ldyBFY3NDb25zdHJ1Y3QodGhpcywgJ0JhY2tlbmQnLCB7XHJcbiAgICAgIGNvbmZpZzogcHJvcHMuY29uZmlnLmVjcyxcclxuICAgICAgZW52aXJvbm1lbnROYW1lOiBwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lLFxyXG4gICAgICB2cGM6IHByb3BzLnZwYyxcclxuICAgICAgY2x1c3RlcjogcHJvcHMuY2x1c3RlcixcclxuICAgICAgbG9hZEJhbGFuY2VyOiBwcm9wcy5sb2FkQmFsYW5jZXIsXHJcbiAgICAgIHNlY3VyaXR5R3JvdXA6IHByb3BzLmJhY2tlbmRTZWN1cml0eUdyb3VwLFxyXG4gICAgICBkYXRhYmFzZVNlY3JldDogcHJvcHMuZGF0YWJhc2Uuc2VjcmV0LFxyXG4gICAgICByZWRpc0VuZHBvaW50OiBwcm9wcy5yZWRpcy5hdHRyUmVkaXNFbmRwb2ludEFkZHJlc3MsXHJcbiAgICAgIGVuYWJsZVhSYXk6IHByb3BzLmNvbmZpZy5tb25pdG9yaW5nLmVuYWJsZVhSYXksXHJcbiAgICAgIGVuYWJsZUxvZ2dpbmc6IHByb3BzLmNvbmZpZy5tb25pdG9yaW5nLmVuYWJsZUVuaGFuY2VkTW9uaXRvcmluZyxcclxuICAgICAgZW5hYmxlU2VydmljZURpc2NvdmVyeTogcHJvcHMuY29uZmlnLmZlYXR1cmVzLmVuYWJsZUV2ZW50QnJpZGdlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5iYWNrZW5kU2VydmljZSA9IHRoaXMuZWNzQ29uc3RydWN0LnNlcnZpY2U7XHJcbiAgICB0aGlzLmJhY2tlbmRVcmwgPSB0aGlzLmVjc0NvbnN0cnVjdC5nZXRTZXJ2aWNlVXJsKCk7XHJcblxyXG4gICAgLy8gR3JhbnQgUzMgcGVybWlzc2lvbnMgdG8gdGhlIGJhY2tlbmQgc2VydmljZVxyXG4gICAgcHJvcHMuYXNzZXRzQnVja2V0LmdyYW50UmVhZFdyaXRlKHRoaXMuZWNzQ29uc3RydWN0LnRhc2tSb2xlKTtcclxuXHJcbiAgICAvLyBBZGQgYWRkaXRpb25hbCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcclxuICAgIHRoaXMuZWNzQ29uc3RydWN0LmFkZEVudmlyb25tZW50VmFyaWFibGUoJ1MzX0JVQ0tFVF9OQU1FJywgcHJvcHMuYXNzZXRzQnVja2V0LmJ1Y2tldE5hbWUpO1xyXG4gICAgdGhpcy5lY3NDb25zdHJ1Y3QuYWRkRW52aXJvbm1lbnRWYXJpYWJsZSgnUzNfUkVHSU9OJywgY2RrLkF3cy5SRUdJT04pO1xyXG4gICAgdGhpcy5lY3NDb25zdHJ1Y3QuYWRkRW52aXJvbm1lbnRWYXJpYWJsZSgnRU5WSVJPTk1FTlQnLCBwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgQ2xvdWRGb3JtYXRpb24gb3V0cHV0c1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0JhY2tlbmRTZXJ2aWNlTmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuYmFja2VuZFNlcnZpY2Uuc2VydmljZU5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQmFja2VuZCBzZXJ2aWNlIG5hbWUnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lfS1iYWNrZW5kLXNlcnZpY2UtbmFtZWAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQmFja2VuZFNlcnZpY2VBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmJhY2tlbmRTZXJ2aWNlLnNlcnZpY2VBcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQmFja2VuZCBzZXJ2aWNlIEFSTicsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmNvbmZpZy5lbnZpcm9ubWVudE5hbWV9LWJhY2tlbmQtc2VydmljZS1hcm5gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0JhY2tlbmRVcmwnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmJhY2tlbmRVcmwsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQmFja2VuZCBVUkwnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lfS1iYWNrZW5kLXVybGAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRWNyUmVwb3NpdG9yeVVyaScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuZWNzQ29uc3RydWN0LnJlcG9zaXRvcnkucmVwb3NpdG9yeVVyaSxcclxuICAgICAgZGVzY3JpcHRpb246ICdFQ1IgcmVwb3NpdG9yeSBVUkknLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lfS1lY3ItcmVwb3NpdG9yeS11cmlgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Rhc2tEZWZpbml0aW9uQXJuJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5lY3NDb25zdHJ1Y3QudGFza0RlZmluaXRpb24udGFza0RlZmluaXRpb25Bcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnVGFzayBkZWZpbml0aW9uIEFSTicsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmNvbmZpZy5lbnZpcm9ubWVudE5hbWV9LXRhc2stZGVmaW5pdGlvbi1hcm5gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Rhc2tFeGVjdXRpb25Sb2xlQXJuJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5lY3NDb25zdHJ1Y3QuZXhlY3V0aW9uUm9sZS5yb2xlQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1Rhc2sgZXhlY3V0aW9uIHJvbGUgQVJOJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZX0tdGFzay1leGVjdXRpb24tcm9sZS1hcm5gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Rhc2tSb2xlQXJuJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5lY3NDb25zdHJ1Y3QudGFza1JvbGUucm9sZUFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdUYXNrIHJvbGUgQVJOJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZX0tdGFzay1yb2xlLWFybmAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgdGFnc1xyXG4gICAgdGhpcy5hZGRUYWdzKHByb3BzLmNvbmZpZy5lbnZpcm9ubWVudE5hbWUpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjcmVhdGVTU01QYXJhbWV0ZXJzKHByb3BzOiBCYWNrZW5kU3RhY2tQcm9wcyk6IHZvaWQge1xyXG4gICAgLy8gQ3JlYXRlIFNTTSBwYXJhbWV0ZXJzIGZvciBhcHBsaWNhdGlvbiBjb25maWd1cmF0aW9uXHJcbiAgICBjb25zdCBwYXJhbWV0ZXJQcmVmaXggPSBgL3JlY3J1aXRtZW50LyR7cHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZX1gO1xyXG5cclxuICAgIC8vIEFwcGxpY2F0aW9uIGNvbmZpZ3VyYXRpb24gcGFyYW1ldGVyc1xyXG4gICAgbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgJ05vZGVFbnZQYXJhbWV0ZXInLCB7XHJcbiAgICAgIHBhcmFtZXRlck5hbWU6IGAke3BhcmFtZXRlclByZWZpeH0vTk9ERV9FTlZgLFxyXG4gICAgICBzdHJpbmdWYWx1ZTogcHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZSA9PT0gJ3Byb2QnID8gJ3Byb2R1Y3Rpb24nIDogJ2RldmVsb3BtZW50JyxcclxuICAgICAgZGVzY3JpcHRpb246ICdOb2RlLmpzIGVudmlyb25tZW50JyxcclxuICAgICAgdGllcjogc3NtLlBhcmFtZXRlclRpZXIuU1RBTkRBUkQsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCAnUG9ydFBhcmFtZXRlcicsIHtcclxuICAgICAgcGFyYW1ldGVyTmFtZTogYCR7cGFyYW1ldGVyUHJlZml4fS9QT1JUYCxcclxuICAgICAgc3RyaW5nVmFsdWU6ICczMDAwJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdBcHBsaWNhdGlvbiBwb3J0JyxcclxuICAgICAgdGllcjogc3NtLlBhcmFtZXRlclRpZXIuU1RBTkRBUkQsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCAnUmVkaXNIb3N0UGFyYW1ldGVyJywge1xyXG4gICAgICBwYXJhbWV0ZXJOYW1lOiBgJHtwYXJhbWV0ZXJQcmVmaXh9L1JFRElTX0hPU1RgLFxyXG4gICAgICBzdHJpbmdWYWx1ZTogcHJvcHMucmVkaXMuYXR0clJlZGlzRW5kcG9pbnRBZGRyZXNzLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1JlZGlzIGhvc3QgZW5kcG9pbnQnLFxyXG4gICAgICB0aWVyOiBzc20uUGFyYW1ldGVyVGllci5TVEFOREFSRCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsICdSZWRpc1BvcnRQYXJhbWV0ZXInLCB7XHJcbiAgICAgIHBhcmFtZXRlck5hbWU6IGAke3BhcmFtZXRlclByZWZpeH0vUkVESVNfUE9SVGAsXHJcbiAgICAgIHN0cmluZ1ZhbHVlOiBwcm9wcy5yZWRpcy5hdHRyUmVkaXNFbmRwb2ludFBvcnQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUmVkaXMgcG9ydCcsXHJcbiAgICAgIHRpZXI6IHNzbS5QYXJhbWV0ZXJUaWVyLlNUQU5EQVJELFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgJ1MzQnVja2V0UGFyYW1ldGVyJywge1xyXG4gICAgICBwYXJhbWV0ZXJOYW1lOiBgJHtwYXJhbWV0ZXJQcmVmaXh9L1MzX0JVQ0tFVF9OQU1FYCxcclxuICAgICAgc3RyaW5nVmFsdWU6IHByb3BzLmFzc2V0c0J1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIGFzc2V0cyBidWNrZXQgbmFtZScsXHJcbiAgICAgIHRpZXI6IHNzbS5QYXJhbWV0ZXJUaWVyLlNUQU5EQVJELFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgJ0F3c1JlZ2lvblBhcmFtZXRlcicsIHtcclxuICAgICAgcGFyYW1ldGVyTmFtZTogYCR7cGFyYW1ldGVyUHJlZml4fS9BV1NfUkVHSU9OYCxcclxuICAgICAgc3RyaW5nVmFsdWU6IGNkay5Bd3MuUkVHSU9OLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FXUyByZWdpb24nLFxyXG4gICAgICB0aWVyOiBzc20uUGFyYW1ldGVyVGllci5TVEFOREFSRCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEZyb250ZW5kIFVSTCBwYXJhbWV0ZXJcclxuICAgIGxldCBmcm9udGVuZFVybCA9ICdodHRwOi8vbG9jYWxob3N0OjMwMDEnO1xyXG4gICAgaWYgKHByb3BzLmNvbmZpZy5lbnZpcm9ubWVudE5hbWUgPT09ICdwcm9kJykge1xyXG4gICAgICBmcm9udGVuZFVybCA9ICdodHRwczovL3JlY3J1aXRtZW50LmV4YW1wbGUuY29tJztcclxuICAgIH0gZWxzZSBpZiAocHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZSA9PT0gJ3N0YWdpbmcnKSB7XHJcbiAgICAgIGZyb250ZW5kVXJsID0gJ2h0dHBzOi8vc3RhZ2luZy5yZWNydWl0bWVudC5leGFtcGxlLmNvbSc7XHJcbiAgICB9XHJcblxyXG4gICAgbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgJ0Zyb250ZW5kVXJsUGFyYW1ldGVyJywge1xyXG4gICAgICBwYXJhbWV0ZXJOYW1lOiBgJHtwYXJhbWV0ZXJQcmVmaXh9L0ZST05URU5EX1VSTGAsXHJcbiAgICAgIHN0cmluZ1ZhbHVlOiBmcm9udGVuZFVybCxcclxuICAgICAgZGVzY3JpcHRpb246ICdGcm9udGVuZCBVUkwnLFxyXG4gICAgICB0aWVyOiBzc20uUGFyYW1ldGVyVGllci5TVEFOREFSRCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFJhdGUgbGltaXRpbmcgcGFyYW1ldGVyc1xyXG4gICAgbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgJ1JhdGVMaW1pdFdpbmRvd1BhcmFtZXRlcicsIHtcclxuICAgICAgcGFyYW1ldGVyTmFtZTogYCR7cGFyYW1ldGVyUHJlZml4fS9SQVRFX0xJTUlUX1dJTkRPV19NU2AsXHJcbiAgICAgIHN0cmluZ1ZhbHVlOiAnOTAwMDAwJywgLy8gMTUgbWludXRlc1xyXG4gICAgICBkZXNjcmlwdGlvbjogJ1JhdGUgbGltaXRpbmcgd2luZG93IGluIG1pbGxpc2Vjb25kcycsXHJcbiAgICAgIHRpZXI6IHNzbS5QYXJhbWV0ZXJUaWVyLlNUQU5EQVJELFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgJ1JhdGVMaW1pdE1heFJlcXVlc3RzUGFyYW1ldGVyJywge1xyXG4gICAgICBwYXJhbWV0ZXJOYW1lOiBgJHtwYXJhbWV0ZXJQcmVmaXh9L1JBVEVfTElNSVRfTUFYX1JFUVVFU1RTYCxcclxuICAgICAgc3RyaW5nVmFsdWU6IHByb3BzLmNvbmZpZy5lbnZpcm9ubWVudE5hbWUgPT09ICdwcm9kJyA/ICcxMDAnIDogJzEwMDAnLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ01heGltdW0gcmVxdWVzdHMgcGVyIHdpbmRvdycsXHJcbiAgICAgIHRpZXI6IHNzbS5QYXJhbWV0ZXJUaWVyLlNUQU5EQVJELFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTG9nZ2luZyBjb25maWd1cmF0aW9uXHJcbiAgICBuZXcgc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCAnTG9nTGV2ZWxQYXJhbWV0ZXInLCB7XHJcbiAgICAgIHBhcmFtZXRlck5hbWU6IGAke3BhcmFtZXRlclByZWZpeH0vTE9HX0xFVkVMYCxcclxuICAgICAgc3RyaW5nVmFsdWU6IHByb3BzLmNvbmZpZy5lbnZpcm9ubWVudE5hbWUgPT09ICdwcm9kJyA/ICdpbmZvJyA6ICdkZWJ1ZycsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQXBwbGljYXRpb24gbG9nIGxldmVsJyxcclxuICAgICAgdGllcjogc3NtLlBhcmFtZXRlclRpZXIuU1RBTkRBUkQsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDT1JTIGNvbmZpZ3VyYXRpb25cclxuICAgIG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsICdDb3JzT3JpZ2luc1BhcmFtZXRlcicsIHtcclxuICAgICAgcGFyYW1ldGVyTmFtZTogYCR7cGFyYW1ldGVyUHJlZml4fS9DT1JTX09SSUdJTlNgLFxyXG4gICAgICBzdHJpbmdWYWx1ZTogdGhpcy5nZXRDb3JzT3JpZ2lucyhwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lKSxcclxuICAgICAgZGVzY3JpcHRpb246ICdDT1JTIGFsbG93ZWQgb3JpZ2lucycsXHJcbiAgICAgIHRpZXI6IHNzbS5QYXJhbWV0ZXJUaWVyLlNUQU5EQVJELFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU2Vzc2lvbiBjb25maWd1cmF0aW9uXHJcbiAgICBuZXcgc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCAnU2Vzc2lvbk1heEFnZVBhcmFtZXRlcicsIHtcclxuICAgICAgcGFyYW1ldGVyTmFtZTogYCR7cGFyYW1ldGVyUHJlZml4fS9TRVNTSU9OX01BWF9BR0VgLFxyXG4gICAgICBzdHJpbmdWYWx1ZTogcHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZSA9PT0gJ3Byb2QnID8gJzM2MDAwMDAnIDogJzg2NDAwMDAwJywgLy8gMSBob3VyIHByb2QsIDI0IGhvdXJzIGRldlxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1Nlc3Npb24gbWF4aW11bSBhZ2UgaW4gbWlsbGlzZWNvbmRzJyxcclxuICAgICAgdGllcjogc3NtLlBhcmFtZXRlclRpZXIuU1RBTkRBUkQsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDb29raWUgY29uZmlndXJhdGlvblxyXG4gICAgbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgJ0Nvb2tpZVNlY3VyZVBhcmFtZXRlcicsIHtcclxuICAgICAgcGFyYW1ldGVyTmFtZTogYCR7cGFyYW1ldGVyUHJlZml4fS9DT09LSUVfU0VDVVJFYCxcclxuICAgICAgc3RyaW5nVmFsdWU6IHByb3BzLmNvbmZpZy5lbnZpcm9ubWVudE5hbWUgPT09ICdwcm9kJyA/ICd0cnVlJyA6ICdmYWxzZScsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29va2llIHNlY3VyZSBmbGFnJyxcclxuICAgICAgdGllcjogc3NtLlBhcmFtZXRlclRpZXIuU1RBTkRBUkQsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCAnQ29va2llU2FtZVNpdGVQYXJhbWV0ZXInLCB7XHJcbiAgICAgIHBhcmFtZXRlck5hbWU6IGAke3BhcmFtZXRlclByZWZpeH0vQ09PS0lFX1NBTUVfU0lURWAsXHJcbiAgICAgIHN0cmluZ1ZhbHVlOiBwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lID09PSAncHJvZCcgPyAnc3RyaWN0JyA6ICdsYXgnLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nvb2tpZSBTYW1lU2l0ZSBwb2xpY3knLFxyXG4gICAgICB0aWVyOiBzc20uUGFyYW1ldGVyVGllci5TVEFOREFSRCxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBnZXRDb3JzT3JpZ2lucyhlbnZpcm9ubWVudE5hbWU6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICBjb25zdCBvcmlnaW5zID0gWydodHRwOi8vbG9jYWxob3N0OjMwMDEnLCAnaHR0cDovL2xvY2FsaG9zdDozMDAwJ107XHJcbiAgICBcclxuICAgIGlmIChlbnZpcm9ubWVudE5hbWUgPT09ICdwcm9kJykge1xyXG4gICAgICBvcmlnaW5zLnB1c2goJ2h0dHBzOi8vcmVjcnVpdG1lbnQuZXhhbXBsZS5jb20nKTtcclxuICAgIH0gZWxzZSBpZiAoZW52aXJvbm1lbnROYW1lID09PSAnc3RhZ2luZycpIHtcclxuICAgICAgb3JpZ2lucy5wdXNoKCdodHRwczovL3N0YWdpbmcucmVjcnVpdG1lbnQuZXhhbXBsZS5jb20nKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gb3JpZ2lucy5qb2luKCcsJyk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFkZFRhZ3MoZW52aXJvbm1lbnROYW1lOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIGNvbnN0IHRhZ3MgPSB7XHJcbiAgICAgIEVudmlyb25tZW50OiBlbnZpcm9ubWVudE5hbWUsXHJcbiAgICAgIENvbXBvbmVudDogJ0JhY2tlbmQnLFxyXG4gICAgICBNYW5hZ2VkQnk6ICdDREsnLFxyXG4gICAgfTtcclxuXHJcbiAgICBPYmplY3QuZW50cmllcyh0YWdzKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcclxuICAgICAgY2RrLlRhZ3Mub2YodGhpcy5iYWNrZW5kU2VydmljZSkuYWRkKGtleSwgdmFsdWUpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG59Il19