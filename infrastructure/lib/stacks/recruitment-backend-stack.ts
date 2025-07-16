import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { EcsConstruct } from '../constructs/ecs-construct';
import { BackendStackProps } from '../config/types';

export class RecruitmentBackendStack extends cdk.Stack {
  public readonly backendService: cdk.aws_ecs.FargateService;
  public readonly backendUrl: string;
  public readonly ecsConstruct: EcsConstruct;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    // Create SSM parameters for configuration
    this.createSSMParameters(props);

    // Create ECS construct
    this.ecsConstruct = new EcsConstruct(this, 'Backend', {
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

  private createSSMParameters(props: BackendStackProps): void {
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
    } else if (props.config.environmentName === 'staging') {
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

  private getCorsOrigins(environmentName: string): string {
    const origins = ['http://localhost:3001', 'http://localhost:3000'];
    
    if (environmentName === 'prod') {
      origins.push('https://recruitment.example.com');
    } else if (environmentName === 'staging') {
      origins.push('https://staging.recruitment.example.com');
    }

    return origins.join(',');
  }

  private addTags(environmentName: string): void {
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