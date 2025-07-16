import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { EcsConfig } from '../config/EnvironmentConfig';

export interface EcsConstructProps {
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
  albTargetGroup: elbv2.ApplicationTargetGroup;
  config: EcsConfig;
  environment: string;
  secrets: {
    databaseSecret: secretsmanager.Secret;
    jwtSecret: secretsmanager.Secret;
    smtpSecret: secretsmanager.Secret;
  };
  redisEndpoint?: string;
}

export class EcsConstruct extends Construct {
  public readonly cluster: ecs.Cluster;
  public readonly service: ecs.FargateService;
  public readonly taskDefinition: ecs.FargateTaskDefinition;
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, props: EcsConstructProps) {
    super(scope, id);

    // Create ECR repository
    this.repository = new ecr.Repository(this, 'Repository', {
      repositoryName: `recruitment-website-backend-${props.environment}`,
      imageTagMutability: ecr.TagMutability.MUTABLE,
      imageScanOnPush: true,
      lifecycleRules: [
        {
          description: 'Keep last 10 images',
          maxImageCount: 10,
        },
      ],
    });

    // Create ECS cluster
    this.cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: `recruitment-website-${props.environment}`,
      vpc: props.vpc,
      containerInsights: true,
      enableFargateCapacityProviders: true,
    });

    // Create service discovery namespace
    const namespace = new servicediscovery.PrivateDnsNamespace(this, 'ServiceDiscovery', {
      name: `recruitment-website-${props.environment}.local`,
      vpc: props.vpc,
    });

    // Create task execution role
    const taskExecutionRole = new iam.Role(this, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Grant permissions to read secrets
    props.secrets.databaseSecret.grantRead(taskExecutionRole);
    props.secrets.jwtSecret.grantRead(taskExecutionRole);
    props.secrets.smtpSecret.grantRead(taskExecutionRole);

    // Create task role
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      inlinePolicies: {
        CloudWatchPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'cloudwatch:PutMetricData',
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogStreams',
              ],
              resources: ['*'],
            }),
          ],
        }),
        XRayPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'xray:PutTraceSegments',
                'xray:PutTelemetryRecords',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // Create log group
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/ecs/recruitment-website-${props.environment}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create task definition
    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      family: `recruitment-website-${props.environment}`,
      cpu: props.config.cpu,
      memoryLimitMiB: props.config.memory,
      executionRole: taskExecutionRole,
      taskRole: taskRole,
    });

    // Create container definition
    const container = this.taskDefinition.addContainer('BackendContainer', {
      image: ecs.ContainerImage.fromEcrRepository(this.repository, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'backend',
        logGroup: logGroup,
      }),
      environment: {
        NODE_ENV: 'production',
        PORT: '3000',
        FRONTEND_URL: props.environment === 'prod' 
          ? 'https://recruitmentwebsite.com'
          : `https://${props.environment}.recruitmentwebsite.com`,
        REDIS_HOST: props.redisEndpoint || '',
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(props.secrets.databaseSecret, 'DATABASE_URL'),
        JWT_SECRET: ecs.Secret.fromSecretsManager(props.secrets.jwtSecret, 'JWT_SECRET'),
        SMTP_HOST: ecs.Secret.fromSecretsManager(props.secrets.smtpSecret, 'SMTP_HOST'),
        SMTP_USER: ecs.Secret.fromSecretsManager(props.secrets.smtpSecret, 'SMTP_USER'),
        SMTP_PASSWORD: ecs.Secret.fromSecretsManager(props.secrets.smtpSecret, 'SMTP_PASSWORD'),
      },
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    // Add X-Ray sidecar for tracing
    this.taskDefinition.addContainer('XRayDaemon', {
      image: ecs.ContainerImage.fromRegistry('public.ecr.aws/xray/aws-xray-daemon:latest'),
      cpu: 32,
      memoryLimitMiB: 256,
      essential: false,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'xray',
        logGroup: logGroup,
      }),
      portMappings: [
        {
          containerPort: 2000,
          protocol: ecs.Protocol.UDP,
        },
      ],
    });

    // Add port mapping for main container
    container.addPortMappings({
      containerPort: 3000,
      protocol: ecs.Protocol.TCP,
    });

    // Create Fargate service
    this.service = new ecs.FargateService(this, 'Service', {
      cluster: this.cluster,
      taskDefinition: this.taskDefinition,
      serviceName: `recruitment-website-${props.environment}`,
      desiredCount: props.config.desiredCount,
      minHealthyPercent: 50,
      maxHealthyPercent: 200,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [props.securityGroup],
      assignPublicIp: false,
      capacityProviderStrategies: [
        {
          capacityProvider: 'FARGATE',
          weight: 1,
          base: props.config.desiredCount,
        },
        {
          capacityProvider: 'FARGATE_SPOT',
          weight: 4,
        },
      ],
      cloudMapOptions: {
        cloudMapNamespace: namespace,
        name: 'backend',
      },
      enableExecuteCommand: true, // For debugging
    });

    // Attach to ALB target group
    this.service.attachToApplicationTargetGroup(props.albTargetGroup);

    // Configure auto-scaling
    this.setupAutoScaling(props.config);

    // Add tags
    cdk.Tags.of(this.cluster).add('Component', 'ECS');
    cdk.Tags.of(this.service).add('Component', 'BackendService');
  }

  private setupAutoScaling(config: EcsConfig): void {
    // Create scalable target
    const scalableTarget = this.service.autoScaleTaskCount({
      minCapacity: config.minCapacity,
      maxCapacity: config.maxCapacity,
    });

    // CPU-based scaling
    scalableTarget.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: config.targetCpuUtilization,
      scaleInCooldown: cdk.Duration.seconds(300),
      scaleOutCooldown: cdk.Duration.seconds(300),
    });

    // Memory-based scaling
    scalableTarget.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: config.targetMemoryUtilization,
      scaleInCooldown: cdk.Duration.seconds(300),
      scaleOutCooldown: cdk.Duration.seconds(300),
    });

    // Request-based scaling
    scalableTarget.scaleOnRequestCount('RequestScaling', {
      requestsPerTarget: 1000,
      scaleInCooldown: cdk.Duration.seconds(300),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });
  }

  /**
   * Create a scheduled task for database migrations
   */
  public createMigrationTask(): ecs.FargateTaskDefinition {
    const migrationTaskDefinition = new ecs.FargateTaskDefinition(this, 'MigrationTaskDefinition', {
      family: `recruitment-website-migration-${this.node.tryGetContext('environment')}`,
      cpu: 512,
      memoryLimitMiB: 1024,
      executionRole: this.taskDefinition.executionRole,
      taskRole: this.taskDefinition.taskRole,
    });

    migrationTaskDefinition.addContainer('MigrationContainer', {
      image: ecs.ContainerImage.fromEcrRepository(this.repository, 'latest'),
      command: ['npm', 'run', 'migrate'],
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'migration',
        logGroup: new logs.LogGroup(this, 'MigrationLogGroup', {
          logGroupName: `/ecs/recruitment-website-migration-${this.node.tryGetContext('environment')}`,
          retention: logs.RetentionDays.ONE_WEEK,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      }),
      environment: {
        NODE_ENV: 'production',
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(
          this.taskDefinition.containers[0].secrets?.DATABASE_URL?.secretsManagerSecret!,
          'DATABASE_URL'
        ),
      },
    });

    return migrationTaskDefinition;
  }
}