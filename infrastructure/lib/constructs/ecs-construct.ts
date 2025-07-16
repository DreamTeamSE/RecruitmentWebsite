import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';
import { EcsConfig } from '../config/types';

export interface EcsConstructProps {
  config: EcsConfig;
  environmentName: string;
  vpc: ec2.Vpc;
  cluster: ecs.Cluster;
  loadBalancer: elbv2.ApplicationLoadBalancer;
  securityGroup: ec2.SecurityGroup;
  databaseSecret: secretsmanager.Secret;
  redisEndpoint: string;
  enableXRay?: boolean;
  enableLogging?: boolean;
  enableServiceDiscovery?: boolean;
}

export class EcsConstruct extends Construct {
  public readonly service: ecs.FargateService;
  public readonly taskDefinition: ecs.FargateTaskDefinition;
  public readonly taskRole: iam.Role;
  public readonly executionRole: iam.Role;
  public readonly repository: ecr.Repository;
  public readonly logGroup: logs.LogGroup;
  public readonly targetGroup: elbv2.ApplicationTargetGroup;
  public readonly listener: elbv2.ApplicationListener;
  public readonly serviceDiscovery?: servicediscovery.Service;
  public readonly autoScalingTarget: ecs.ScalableTaskCount;

  constructor(scope: Construct, id: string, props: EcsConstructProps) {
    super(scope, id);

    // Create ECR repository
    this.repository = new ecr.Repository(this, 'Repository', {
      repositoryName: `recruitment-${props.environmentName}-backend`,
      imageTagMutability: ecr.TagMutability.MUTABLE,
      imageScanOnPush: true,
      lifecycleRules: [
        {
          rulePriority: 1,
          description: 'Keep last 10 images',
          selection: {
            tagStatus: ecr.TagStatus.TAGGED,
            tagPrefixList: ['v'],
            countType: ecr.CountType.IMAGE_COUNT_MORE_THAN,
            countNumber: 10,
          },
          action: ecr.LifecycleAction.EXPIRE,
        },
        {
          rulePriority: 2,
          description: 'Delete untagged images older than 1 day',
          selection: {
            tagStatus: ecr.TagStatus.UNTAGGED,
            countType: ecr.CountType.SINCE_IMAGE_PUSHED,
            countNumber: 1,
          },
          action: ecr.LifecycleAction.EXPIRE,
        },
      ],
    });

    // Create CloudWatch log group
    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/ecs/recruitment-${props.environmentName}-backend`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create task execution role
    this.executionRole = new iam.Role(this, 'ExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Add permissions for secrets and parameters
    this.executionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'secretsmanager:GetSecretValue',
          'ssm:GetParameter',
          'ssm:GetParameters',
          'ssm:GetParametersByPath',
          'kms:Decrypt',
        ],
        resources: [
          `arn:aws:secretsmanager:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:secret:recruitment-${props.environmentName}-*`,
          `arn:aws:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter/recruitment/${props.environmentName}/*`,
          `arn:aws:kms:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:key/*`,
        ],
      })
    );

    // Create task role
    this.taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Add X-Ray permissions if enabled
    if (props.enableXRay) {
      this.taskRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'xray:PutTraceSegments',
            'xray:PutTelemetryRecords',
            'xray:GetSamplingRules',
            'xray:GetSamplingTargets',
            'xray:GetSamplingStatisticSummaries',
          ],
          resources: ['*'],
        })
      );
    }

    // Add CloudWatch permissions
    this.taskRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'logs:DescribeLogStreams',
        ],
        resources: [
          `arn:aws:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/ecs/recruitment-${props.environmentName}-*`,
        ],
      })
    );

    // Create task definition
    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      memoryLimitMiB: props.config.taskMemory,
      cpu: props.config.taskCpu,
      executionRole: this.executionRole,
      taskRole: this.taskRole,
      family: `recruitment-${props.environmentName}-backend`,
    });

    // Add X-Ray sidecar if enabled
    if (props.enableXRay) {
      this.taskDefinition.addContainer('xray-daemon', {
        image: ecs.ContainerImage.fromRegistry('amazon/aws-xray-daemon:latest'),
        memoryLimitMiB: 32,
        cpu: 32,
        essential: false,
        portMappings: [
          {
            containerPort: 2000,
            protocol: ecs.Protocol.UDP,
          },
        ],
        logging: ecs.LogDrivers.awsLogs({
          streamPrefix: 'xray-daemon',
          logGroup: this.logGroup,
        }),
        environment: {
          AWS_REGION: cdk.Aws.REGION,
        },
      });
    }

    // Create application container
    const appContainer = this.taskDefinition.addContainer('app', {
      image: ecs.ContainerImage.fromEcrRepository(this.repository, 'latest'),
      memoryLimitMiB: props.config.taskMemory - (props.enableXRay ? 32 : 0),
      cpu: props.config.taskCpu - (props.enableXRay ? 32 : 0),
      essential: true,
      portMappings: [
        {
          containerPort: 3000,
          protocol: ecs.Protocol.TCP,
        },
      ],
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'app',
        logGroup: this.logGroup,
      }),
      environment: {
        NODE_ENV: props.environmentName === 'prod' ? 'production' : 'development',
        PORT: '3000',
        REDIS_HOST: props.redisEndpoint,
        REDIS_PORT: '6379',
        AWS_REGION: cdk.Aws.REGION,
        AWS_DEFAULT_REGION: cdk.Aws.REGION,
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(props.databaseSecret, 'DATABASE_URL'),
        JWT_SECRET: ecs.Secret.fromSecretsManager(props.databaseSecret, 'JWT_SECRET'),
        SMTP_HOST: ecs.Secret.fromSecretsManager(props.databaseSecret, 'SMTP_HOST'),
        SMTP_USER: ecs.Secret.fromSecretsManager(props.databaseSecret, 'SMTP_USER'),
        SMTP_PASSWORD: ecs.Secret.fromSecretsManager(props.databaseSecret, 'SMTP_PASSWORD'),
      },
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    // Enable execute command if specified
    if (props.config.enableExecuteCommand) {
      this.taskRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'ssmmessages:CreateControlChannel',
            'ssmmessages:CreateDataChannel',
            'ssmmessages:OpenControlChannel',
            'ssmmessages:OpenDataChannel',
          ],
          resources: ['*'],
        })
      );
    }

    // Create service discovery if enabled
    if (props.enableServiceDiscovery) {
      const namespace = new servicediscovery.PrivateDnsNamespace(this, 'ServiceDiscoveryNamespace', {
        name: `recruitment-${props.environmentName}.local`,
        vpc: props.vpc,
        description: `Service discovery namespace for recruitment ${props.environmentName}`,
      });

      this.serviceDiscovery = new servicediscovery.Service(this, 'ServiceDiscovery', {
        namespace,
        name: 'backend',
        description: 'Service discovery for backend service',
        dnsRecordType: servicediscovery.DnsRecordType.A,
        dnsTtl: cdk.Duration.seconds(60),
        healthCheckGracePeriod: cdk.Duration.seconds(props.config.healthCheckGracePeriod),
      });
    }

    // Create Fargate service
    this.service = new ecs.FargateService(this, 'Service', {
      cluster: props.cluster,
      taskDefinition: this.taskDefinition,
      desiredCount: props.config.desiredCapacity,
      minHealthyPercent: 50,
      maxHealthyPercent: 200,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [props.securityGroup],
      enableExecuteCommand: props.config.enableExecuteCommand,
      serviceName: `recruitment-${props.environmentName}-backend`,
      cloudMapOptions: this.serviceDiscovery ? {
        service: this.serviceDiscovery,
        containerPort: 3000,
      } : undefined,
      healthCheckGracePeriod: cdk.Duration.seconds(props.config.healthCheckGracePeriod),
    });

    // Create target group
    this.targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      vpc: props.vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        enabled: true,
        path: props.config.healthCheckPath,
        interval: cdk.Duration.seconds(props.config.healthCheckInterval),
        timeout: cdk.Duration.seconds(props.config.healthCheckTimeout),
        healthyThresholdCount: props.config.healthyThresholdCount,
        unhealthyThresholdCount: props.config.unhealthyThresholdCount,
        healthyHttpCodes: '200',
        protocol: elbv2.Protocol.HTTP,
      },
      targets: [this.service],
    });

    // Create listener
    this.listener = props.loadBalancer.addListener('Listener', {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultTargetGroups: [this.targetGroup],
    });

    // Setup auto scaling
    this.autoScalingTarget = this.service.autoScaleTaskCount({
      minCapacity: props.config.minCapacity,
      maxCapacity: props.config.maxCapacity,
    });

    // CPU scaling
    this.autoScalingTarget.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: props.config.targetCpuUtilization,
      scaleInCooldown: cdk.Duration.seconds(300),
      scaleOutCooldown: cdk.Duration.seconds(300),
    });

    // Memory scaling
    this.autoScalingTarget.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: props.config.targetMemoryUtilization,
      scaleInCooldown: cdk.Duration.seconds(300),
      scaleOutCooldown: cdk.Duration.seconds(300),
    });

    // Create CloudWatch alarms
    this.createServiceAlarms(props.environmentName);

    // Add tags
    this.addTags(props.environmentName);
  }

  private createServiceAlarms(environmentName: string): void {
    // Service CPU utilization alarm
    const cpuAlarm = new cdk.aws_cloudwatch.Alarm(this, 'ServiceCpuAlarm', {
      alarmName: `recruitment-${environmentName}-backend-cpu-utilization`,
      alarmDescription: 'Backend service CPU utilization is high',
      metric: this.service.metricCpuUtilization(),
      threshold: 80,
      evaluationPeriods: 2,
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Service memory utilization alarm
    const memoryAlarm = new cdk.aws_cloudwatch.Alarm(this, 'ServiceMemoryAlarm', {
      alarmName: `recruitment-${environmentName}-backend-memory-utilization`,
      alarmDescription: 'Backend service memory utilization is high',
      metric: this.service.metricMemoryUtilization(),
      threshold: 85,
      evaluationPeriods: 2,
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Target group healthy hosts alarm
    const healthyHostsAlarm = new cdk.aws_cloudwatch.Alarm(this, 'HealthyHostsAlarm', {
      alarmName: `recruitment-${environmentName}-backend-healthy-hosts`,
      alarmDescription: 'Backend service healthy hosts count is low',
      metric: this.targetGroup.metricHealthyHostCount(),
      threshold: 1,
      evaluationPeriods: 2,
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.BREACHING,
    });

    // Target group response time alarm
    const responseTimeAlarm = new cdk.aws_cloudwatch.Alarm(this, 'ResponseTimeAlarm', {
      alarmName: `recruitment-${environmentName}-backend-response-time`,
      alarmDescription: 'Backend service response time is high',
      metric: this.targetGroup.metricTargetResponseTime(),
      threshold: 1, // 1 second
      evaluationPeriods: 2,
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Add alarms to a list for external reference
    (this as any).alarms = [cpuAlarm, memoryAlarm, healthyHostsAlarm, responseTimeAlarm];
  }

  private addTags(environmentName: string): void {
    const tags = {
      Environment: environmentName,
      Component: 'Backend',
      ManagedBy: 'CDK',
    };

    Object.entries(tags).forEach(([key, value]) => {
      cdk.Tags.of(this.service).add(key, value);
      cdk.Tags.of(this.taskDefinition).add(key, value);
      cdk.Tags.of(this.repository).add(key, value);
      cdk.Tags.of(this.logGroup).add(key, value);
      cdk.Tags.of(this.targetGroup).add(key, value);
    });
  }

  public getServiceUrl(): string {
    return `http://${this.loadBalancer.loadBalancerDnsName}`;
  }

  public addEnvironmentVariable(name: string, value: string): void {
    const container = this.taskDefinition.findContainer('app');
    if (container) {
      container.addEnvironment(name, value);
    }
  }

  public addSecret(name: string, secret: ecs.Secret): void {
    const container = this.taskDefinition.findContainer('app');
    if (container) {
      container.addSecret(name, secret);
    }
  }

  public addContainerPort(port: number, protocol: ecs.Protocol = ecs.Protocol.TCP): void {
    const container = this.taskDefinition.findContainer('app');
    if (container) {
      container.addPortMappings({
        containerPort: port,
        protocol,
      });
    }
  }

  private get loadBalancer(): elbv2.ApplicationLoadBalancer {
    return this.listener.loadBalancer as elbv2.ApplicationLoadBalancer;
  }
}