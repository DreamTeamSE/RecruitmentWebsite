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
exports.EcsConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ecs = __importStar(require("aws-cdk-lib/aws-ecs"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const elbv2 = __importStar(require("aws-cdk-lib/aws-elasticloadbalancingv2"));
const ecr = __importStar(require("aws-cdk-lib/aws-ecr"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const servicediscovery = __importStar(require("aws-cdk-lib/aws-servicediscovery"));
const constructs_1 = require("constructs");
class EcsConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
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
        this.executionRole.addToPolicy(new iam.PolicyStatement({
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
        }));
        // Create task role
        this.taskRole = new iam.Role(this, 'TaskRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        });
        // Add X-Ray permissions if enabled
        if (props.enableXRay) {
            this.taskRole.addToPolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'xray:PutTraceSegments',
                    'xray:PutTelemetryRecords',
                    'xray:GetSamplingRules',
                    'xray:GetSamplingTargets',
                    'xray:GetSamplingStatisticSummaries',
                ],
                resources: ['*'],
            }));
        }
        // Add CloudWatch permissions
        this.taskRole.addToPolicy(new iam.PolicyStatement({
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
        }));
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
            this.taskRole.addToPolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'ssmmessages:CreateControlChannel',
                    'ssmmessages:CreateDataChannel',
                    'ssmmessages:OpenControlChannel',
                    'ssmmessages:OpenDataChannel',
                ],
                resources: ['*'],
            }));
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
    createServiceAlarms(environmentName) {
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
        this.alarms = [cpuAlarm, memoryAlarm, healthyHostsAlarm, responseTimeAlarm];
    }
    addTags(environmentName) {
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
    getServiceUrl() {
        return `http://${this.loadBalancer.loadBalancerDnsName}`;
    }
    addEnvironmentVariable(name, value) {
        const container = this.taskDefinition.findContainer('app');
        if (container) {
            container.addEnvironment(name, value);
        }
    }
    addSecret(name, secret) {
        const container = this.taskDefinition.findContainer('app');
        if (container) {
            container.addSecret(name, secret);
        }
    }
    addContainerPort(port, protocol = ecs.Protocol.TCP) {
        const container = this.taskDefinition.findContainer('app');
        if (container) {
            container.addPortMappings({
                containerPort: port,
                protocol,
            });
        }
    }
    get loadBalancer() {
        return this.listener.loadBalancer;
    }
}
exports.EcsConstruct = EcsConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWNzLWNvbnN0cnVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImVjcy1jb25zdHJ1Y3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHlEQUEyQztBQUMzQyx5REFBMkM7QUFDM0MsOEVBQWdFO0FBQ2hFLHlEQUEyQztBQUMzQywyREFBNkM7QUFDN0MseURBQTJDO0FBRzNDLG1GQUFxRTtBQUNyRSwyQ0FBdUM7QUFpQnZDLE1BQWEsWUFBYSxTQUFRLHNCQUFTO0lBWXpDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBd0I7UUFDaEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQix3QkFBd0I7UUFDeEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUN2RCxjQUFjLEVBQUUsZUFBZSxLQUFLLENBQUMsZUFBZSxVQUFVO1lBQzlELGtCQUFrQixFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUM3QyxlQUFlLEVBQUUsSUFBSTtZQUNyQixjQUFjLEVBQUU7Z0JBQ2Q7b0JBQ0UsWUFBWSxFQUFFLENBQUM7b0JBQ2YsV0FBVyxFQUFFLHFCQUFxQjtvQkFDbEMsU0FBUyxFQUFFO3dCQUNULFNBQVMsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU07d0JBQy9CLGFBQWEsRUFBRSxDQUFDLEdBQUcsQ0FBQzt3QkFDcEIsU0FBUyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMscUJBQXFCO3dCQUM5QyxXQUFXLEVBQUUsRUFBRTtxQkFDaEI7b0JBQ0QsTUFBTSxFQUFFLEdBQUcsQ0FBQyxlQUFlLENBQUMsTUFBTTtpQkFDbkM7Z0JBQ0Q7b0JBQ0UsWUFBWSxFQUFFLENBQUM7b0JBQ2YsV0FBVyxFQUFFLHlDQUF5QztvQkFDdEQsU0FBUyxFQUFF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QVksRUFBRSxLQUFhO1FBQ3ZELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNELElBQUksU0FBUyxFQUFFLENBQUM7WUFDZCxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN4QyxDQUFDO0lBQ0gsQ0FBQztJQUVNLFNBQVMsQ0FBQyxJQUFZLEVBQUUsTUFBa0I7UUFDL0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0QsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNkLFNBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3BDLENBQUM7SUFDSCxDQUFDO0lBRU0sZ0JBQWdCLENBQUMsSUFBWSxFQUFFLFdBQXlCLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRztRQUM3RSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzRCxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2QsU0FBUyxDQUFDLGVBQWUsQ0FBQztnQkFDeEIsYUFBYSxFQUFFLElBQUk7Z0JBQ25CLFFBQVE7YUFDVCxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQztJQUVELElBQVksWUFBWTtRQUN0QixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBNkMsQ0FBQztJQUNyRSxDQUFDO0NBQ0Y7QUF4WUQsb0NBd1lDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgZWNzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lY3MnO1xyXG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XHJcbmltcG9ydCAqIGFzIGVsYnYyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lbGFzdGljbG9hZGJhbGFuY2luZ3YyJztcclxuaW1wb3J0ICogYXMgZWNyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lY3InO1xyXG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgKiBhcyBzZWNyZXRzbWFuYWdlciBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc2VjcmV0c21hbmFnZXInO1xyXG5pbXBvcnQgKiBhcyBzc20gZnJvbSAnYXdzLWNkay1saWIvYXdzLXNzbSc7XHJcbmltcG9ydCAqIGFzIHNlcnZpY2VkaXNjb3ZlcnkgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlcnZpY2VkaXNjb3ZlcnknO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuaW1wb3J0IHsgRWNzQ29uZmlnIH0gZnJvbSAnLi4vY29uZmlnL3R5cGVzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRWNzQ29uc3RydWN0UHJvcHMge1xyXG4gIGNvbmZpZzogRWNzQ29uZmlnO1xyXG4gIGVudmlyb25tZW50TmFtZTogc3RyaW5nO1xyXG4gIHZwYzogZWMyLlZwYztcclxuICBjbHVzdGVyOiBlY3MuQ2x1c3RlcjtcclxuICBsb2FkQmFsYW5jZXI6IGVsYnYyLkFwcGxpY2F0aW9uTG9hZEJhbGFuY2VyO1xyXG4gIHNlY3VyaXR5R3JvdXA6IGVjMi5TZWN1cml0eUdyb3VwO1xyXG4gIGRhdGFiYXNlU2VjcmV0OiBzZWNyZXRzbWFuYWdlci5TZWNyZXQ7XHJcbiAgcmVkaXNFbmRwb2ludDogc3RyaW5nO1xyXG4gIGVuYWJsZVhSYXk/OiBib29sZWFuO1xyXG4gIGVuYWJsZUxvZ2dpbmc/OiBib29sZWFuO1xyXG4gIGVuYWJsZVNlcnZpY2VEaXNjb3Zlcnk/OiBib29sZWFuO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRWNzQ29uc3RydWN0IGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgc2VydmljZTogZWNzLkZhcmdhdGVTZXJ2aWNlO1xyXG4gIHB1YmxpYyByZWFkb25seSB0YXNrRGVmaW5pdGlvbjogZWNzLkZhcmdhdGVUYXNrRGVmaW5pdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgdGFza1JvbGU6IGlhbS5Sb2xlO1xyXG4gIHB1YmxpYyByZWFkb25seSBleGVjdXRpb25Sb2xlOiBpYW0uUm9sZTtcclxuICBwdWJsaWMgcmVhZG9ubHkgcmVwb3NpdG9yeTogZWNyLlJlcG9zaXRvcnk7XHJcbiAgcHVibGljIHJlYWRvbmx5IGxvZ0dyb3VwOiBsb2dzLkxvZ0dyb3VwO1xyXG4gIHB1YmxpYyByZWFkb25seSB0YXJnZXRHcm91cDogZWxidjIuQXBwbGljYXRpb25UYXJnZXRHcm91cDtcclxuICBwdWJsaWMgcmVhZG9ubHkgbGlzdGVuZXI6IGVsYnYyLkFwcGxpY2F0aW9uTGlzdGVuZXI7XHJcbiAgcHVibGljIHJlYWRvbmx5IHNlcnZpY2VEaXNjb3Zlcnk/OiBzZXJ2aWNlZGlzY292ZXJ5LlNlcnZpY2U7XHJcbiAgcHVibGljIHJlYWRvbmx5IGF1dG9TY2FsaW5nVGFyZ2V0OiBlY3MuU2NhbGFibGVUYXNrQ291bnQ7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBFY3NDb25zdHJ1Y3RQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgRUNSIHJlcG9zaXRvcnlcclxuICAgIHRoaXMucmVwb3NpdG9yeSA9IG5ldyBlY3IuUmVwb3NpdG9yeSh0aGlzLCAnUmVwb3NpdG9yeScsIHtcclxuICAgICAgcmVwb3NpdG9yeU5hbWU6IGByZWNydWl0bWVudC0ke3Byb3BzLmVudmlyb25tZW50TmFtZX0tYmFja2VuZGAsXHJcbiAgICAgIGltYWdlVGFnTXV0YWJpbGl0eTogZWNyLlRhZ011dGFiaWxpdHkuTVVUQUJMRSxcclxuICAgICAgaW1hZ2VTY2FuT25QdXNoOiB0cnVlLFxyXG4gICAgICBsaWZlY3ljbGVSdWxlczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIHJ1bGVQcmlvcml0eTogMSxcclxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnS2VlcCBsYXN0IDEwIGltYWdlcycsXHJcbiAgICAgICAgICBzZWxlY3Rpb246IHtcclxuICAgICAgICAgICAgdGFnU3RhdHVzOiBlY3IuVGFnU3RhdHVzLlRBR0dFRCxcclxuICAgICAgICAgICAgdGFnUHJlZml4TGlzdDogWyd2J10sXHJcbiAgICAgICAgICAgIGNvdW50VHlwZTogZWNyLkNvdW50VHlwZS5JTUFHRV9DT1VOVF9NT1JFX1RIQU4sXHJcbiAgICAgICAgICAgIGNvdW50TnVtYmVyOiAxMCxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBhY3Rpb246IGVjci5MaWZlY3ljbGVBY3Rpb24uRVhQSVJFLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgcnVsZVByaW9yaXR5OiAyLFxyXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdEZWxldGUgdW50YWdnZWQgaW1hZ2VzIG9sZGVyIHRoYW4gMSBkYXknLFxyXG4gICAgICAgICAgc2VsZWN0aW9uOiB7XHJcbiAgICAgICAgICAgIHRhZ1N0YXR1czogZWNyLlRhZ1N0YXR1cy5VTlRBR0dFRCxcclxuICAgICAgICAgICAgY291bnRUeXBlOiBlY3IuQ291bnRUeXBlLlNJTkNFX0lNQUdFX1BVU0hFRCxcclxuICAgICAgICAgICAgY291bnROdW1iZXI6IDEsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYWN0aW9uOiBlY3IuTGlmZWN5Y2xlQWN0aW9uLkVYUElSRSxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIENsb3VkV2F0Y2ggbG9nIGdyb3VwXHJcbiAgICB0aGlzLmxvZ0dyb3VwID0gbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ0xvZ0dyb3VwJywge1xyXG4gICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL2Vjcy9yZWNydWl0bWVudC0ke3Byb3BzLmVudmlyb25tZW50TmFtZX0tYmFja2VuZGAsXHJcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9NT05USCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSB0YXNrIGV4ZWN1dGlvbiByb2xlXHJcbiAgICB0aGlzLmV4ZWN1dGlvblJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0V4ZWN1dGlvblJvbGUnLCB7XHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlY3MtdGFza3MuYW1hem9uYXdzLmNvbScpLFxyXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcclxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BbWF6b25FQ1NUYXNrRXhlY3V0aW9uUm9sZVBvbGljeScpLFxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIHBlcm1pc3Npb25zIGZvciBzZWNyZXRzIGFuZCBwYXJhbWV0ZXJzXHJcbiAgICB0aGlzLmV4ZWN1dGlvblJvbGUuYWRkVG9Qb2xpY3koXHJcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgJ3NlY3JldHNtYW5hZ2VyOkdldFNlY3JldFZhbHVlJyxcclxuICAgICAgICAgICdzc206R2V0UGFyYW1ldGVyJyxcclxuICAgICAgICAgICdzc206R2V0UGFyYW1ldGVycycsXHJcbiAgICAgICAgICAnc3NtOkdldFBhcmFtZXRlcnNCeVBhdGgnLFxyXG4gICAgICAgICAgJ2ttczpEZWNyeXB0JyxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICAgYGFybjphd3M6c2VjcmV0c21hbmFnZXI6JHtjZGsuQXdzLlJFR0lPTn06JHtjZGsuQXdzLkFDQ09VTlRfSUR9OnNlY3JldDpyZWNydWl0bWVudC0ke3Byb3BzLmVudmlyb25tZW50TmFtZX0tKmAsXHJcbiAgICAgICAgICBgYXJuOmF3czpzc206JHtjZGsuQXdzLlJFR0lPTn06JHtjZGsuQXdzLkFDQ09VTlRfSUR9OnBhcmFtZXRlci9yZWNydWl0bWVudC8ke3Byb3BzLmVudmlyb25tZW50TmFtZX0vKmAsXHJcbiAgICAgICAgICBgYXJuOmF3czprbXM6JHtjZGsuQXdzLlJFR0lPTn06JHtjZGsuQXdzLkFDQ09VTlRfSUR9OmtleS8qYCxcclxuICAgICAgICBdLFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgdGFzayByb2xlXHJcbiAgICB0aGlzLnRhc2tSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdUYXNrUm9sZScsIHtcclxuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2Vjcy10YXNrcy5hbWF6b25hd3MuY29tJyksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgWC1SYXkgcGVybWlzc2lvbnMgaWYgZW5hYmxlZFxyXG4gICAgaWYgKHByb3BzLmVuYWJsZVhSYXkpIHtcclxuICAgICAgdGhpcy50YXNrUm9sZS5hZGRUb1BvbGljeShcclxuICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICd4cmF5OlB1dFRyYWNlU2VnbWVudHMnLFxyXG4gICAgICAgICAgICAneHJheTpQdXRUZWxlbWV0cnlSZWNvcmRzJyxcclxuICAgICAgICAgICAgJ3hyYXk6R2V0U2FtcGxpbmdSdWxlcycsXHJcbiAgICAgICAgICAgICd4cmF5OkdldFNhbXBsaW5nVGFyZ2V0cycsXHJcbiAgICAgICAgICAgICd4cmF5OkdldFNhbXBsaW5nU3RhdGlzdGljU3VtbWFyaWVzJyxcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQWRkIENsb3VkV2F0Y2ggcGVybWlzc2lvbnNcclxuICAgIHRoaXMudGFza1JvbGUuYWRkVG9Qb2xpY3koXHJcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nR3JvdXAnLFxyXG4gICAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nU3RyZWFtJyxcclxuICAgICAgICAgICdsb2dzOlB1dExvZ0V2ZW50cycsXHJcbiAgICAgICAgICAnbG9nczpEZXNjcmliZUxvZ1N0cmVhbXMnLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgICBgYXJuOmF3czpsb2dzOiR7Y2RrLkF3cy5SRUdJT059OiR7Y2RrLkF3cy5BQ0NPVU5UX0lEfTpsb2ctZ3JvdXA6L2F3cy9lY3MvcmVjcnVpdG1lbnQtJHtwcm9wcy5lbnZpcm9ubWVudE5hbWV9LSpgLFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIC8vIENyZWF0ZSB0YXNrIGRlZmluaXRpb25cclxuICAgIHRoaXMudGFza0RlZmluaXRpb24gPSBuZXcgZWNzLkZhcmdhdGVUYXNrRGVmaW5pdGlvbih0aGlzLCAnVGFza0RlZmluaXRpb24nLCB7XHJcbiAgICAgIG1lbW9yeUxpbWl0TWlCOiBwcm9wcy5jb25maWcudGFza01lbW9yeSxcclxuICAgICAgY3B1OiBwcm9wcy5jb25maWcudGFza0NwdSxcclxuICAgICAgZXhlY3V0aW9uUm9sZTogdGhpcy5leGVjdXRpb25Sb2xlLFxyXG4gICAgICB0YXNrUm9sZTogdGhpcy50YXNrUm9sZSxcclxuICAgICAgZmFtaWx5OiBgcmVjcnVpdG1lbnQtJHtwcm9wcy5lbnZpcm9ubWVudE5hbWV9LWJhY2tlbmRgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIFgtUmF5IHNpZGVjYXIgaWYgZW5hYmxlZFxyXG4gICAgaWYgKHByb3BzLmVuYWJsZVhSYXkpIHtcclxuICAgICAgdGhpcy50YXNrRGVmaW5pdGlvbi5hZGRDb250YWluZXIoJ3hyYXktZGFlbW9uJywge1xyXG4gICAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbVJlZ2lzdHJ5KCdhbWF6b24vYXdzLXhyYXktZGFlbW9uOmxhdGVzdCcpLFxyXG4gICAgICAgIG1lbW9yeUxpbWl0TWlCOiAzMixcclxuICAgICAgICBjcHU6IDMyLFxyXG4gICAgICAgIGVzc2VudGlhbDogZmFsc2UsXHJcbiAgICAgICAgcG9ydE1hcHBpbmdzOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbnRhaW5lclBvcnQ6IDIwMDAsXHJcbiAgICAgICAgICAgIHByb3RvY29sOiBlY3MuUHJvdG9jb2wuVURQLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIGxvZ2dpbmc6IGVjcy5Mb2dEcml2ZXJzLmF3c0xvZ3Moe1xyXG4gICAgICAgICAgc3RyZWFtUHJlZml4OiAneHJheS1kYWVtb24nLFxyXG4gICAgICAgICAgbG9nR3JvdXA6IHRoaXMubG9nR3JvdXAsXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAgIEFXU19SRUdJT046IGNkay5Bd3MuUkVHSU9OLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBhcHBsaWNhdGlvbiBjb250YWluZXJcclxuICAgIGNvbnN0IGFwcENvbnRhaW5lciA9IHRoaXMudGFza0RlZmluaXRpb24uYWRkQ29udGFpbmVyKCdhcHAnLCB7XHJcbiAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbUVjclJlcG9zaXRvcnkodGhpcy5yZXBvc2l0b3J5LCAnbGF0ZXN0JyksXHJcbiAgICAgIG1lbW9yeUxpbWl0TWlCOiBwcm9wcy5jb25maWcudGFza01lbW9yeSAtIChwcm9wcy5lbmFibGVYUmF5ID8gMzIgOiAwKSxcclxuICAgICAgY3B1OiBwcm9wcy5jb25maWcudGFza0NwdSAtIChwcm9wcy5lbmFibGVYUmF5ID8gMzIgOiAwKSxcclxuICAgICAgZXNzZW50aWFsOiB0cnVlLFxyXG4gICAgICBwb3J0TWFwcGluZ3M6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBjb250YWluZXJQb3J0OiAzMDAwLFxyXG4gICAgICAgICAgcHJvdG9jb2w6IGVjcy5Qcm90b2NvbC5UQ1AsXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgICAgbG9nZ2luZzogZWNzLkxvZ0RyaXZlcnMuYXdzTG9ncyh7XHJcbiAgICAgICAgc3RyZWFtUHJlZml4OiAnYXBwJyxcclxuICAgICAgICBsb2dHcm91cDogdGhpcy5sb2dHcm91cCxcclxuICAgICAgfSksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgTk9ERV9FTlY6IHByb3BzLmVudmlyb25tZW50TmFtZSA9PT0gJ3Byb2QnID8gJ3Byb2R1Y3Rpb24nIDogJ2RldmVsb3BtZW50JyxcclxuICAgICAgICBQT1JUOiAnMzAwMCcsXHJcbiAgICAgICAgUkVESVNfSE9TVDogcHJvcHMucmVkaXNFbmRwb2ludCxcclxuICAgICAgICBSRURJU19QT1JUOiAnNjM3OScsXHJcbiAgICAgICAgQVdTX1JFR0lPTjogY2RrLkF3cy5SRUdJT04sXHJcbiAgICAgICAgQVdTX0RFRkFVTFRfUkVHSU9OOiBjZGsuQXdzLlJFR0lPTixcclxuICAgICAgfSxcclxuICAgICAgc2VjcmV0czoge1xyXG4gICAgICAgIERBVEFCQVNFX1VSTDogZWNzLlNlY3JldC5mcm9tU2VjcmV0c01hbmFnZXIocHJvcHMuZGF0YWJhc2VTZWNyZXQsICdEQVRBQkFTRV9VUkwnKSxcclxuICAgICAgICBKV1RfU0VDUkVUOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihwcm9wcy5kYXRhYmFzZVNlY3JldCwgJ0pXVF9TRUNSRVQnKSxcclxuICAgICAgICBTTVRQX0hPU1Q6IGVjcy5TZWNyZXQuZnJvbVNlY3JldHNNYW5hZ2VyKHByb3BzLmRhdGFiYXNlU2VjcmV0LCAnU01UUF9IT1NUJyksXHJcbiAgICAgICAgU01UUF9VU0VSOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihwcm9wcy5kYXRhYmFzZVNlY3JldCwgJ1NNVFBfVVNFUicpLFxyXG4gICAgICAgIFNNVFBfUEFTU1dPUkQ6IGVjcy5TZWNyZXQuZnJvbVNlY3JldHNNYW5hZ2VyKHByb3BzLmRhdGFiYXNlU2VjcmV0LCAnU01UUF9QQVNTV09SRCcpLFxyXG4gICAgICB9LFxyXG4gICAgICBoZWFsdGhDaGVjazoge1xyXG4gICAgICAgIGNvbW1hbmQ6IFsnQ01ELVNIRUxMJywgJ2N1cmwgLWYgaHR0cDovL2xvY2FsaG9zdDozMDAwL2hlYWx0aCB8fCBleGl0IDEnXSxcclxuICAgICAgICBpbnRlcnZhbDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDUpLFxyXG4gICAgICAgIHJldHJpZXM6IDMsXHJcbiAgICAgICAgc3RhcnRQZXJpb2Q6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDYwKSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEVuYWJsZSBleGVjdXRlIGNvbW1hbmQgaWYgc3BlY2lmaWVkXHJcbiAgICBpZiAocHJvcHMuY29uZmlnLmVuYWJsZUV4ZWN1dGVDb21tYW5kKSB7XHJcbiAgICAgIHRoaXMudGFza1JvbGUuYWRkVG9Qb2xpY3koXHJcbiAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgICAnc3NtbWVzc2FnZXM6Q3JlYXRlQ29udHJvbENoYW5uZWwnLFxyXG4gICAgICAgICAgICAnc3NtbWVzc2FnZXM6Q3JlYXRlRGF0YUNoYW5uZWwnLFxyXG4gICAgICAgICAgICAnc3NtbWVzc2FnZXM6T3BlbkNvbnRyb2xDaGFubmVsJyxcclxuICAgICAgICAgICAgJ3NzbW1lc3NhZ2VzOk9wZW5EYXRhQ2hhbm5lbCcsXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBzZXJ2aWNlIGRpc2NvdmVyeSBpZiBlbmFibGVkXHJcbiAgICBpZiAocHJvcHMuZW5hYmxlU2VydmljZURpc2NvdmVyeSkge1xyXG4gICAgICBjb25zdCBuYW1lc3BhY2UgPSBuZXcgc2VydmljZWRpc2NvdmVyeS5Qcml2YXRlRG5zTmFtZXNwYWNlKHRoaXMsICdTZXJ2aWNlRGlzY292ZXJ5TmFtZXNwYWNlJywge1xyXG4gICAgICAgIG5hbWU6IGByZWNydWl0bWVudC0ke3Byb3BzLmVudmlyb25tZW50TmFtZX0ubG9jYWxgLFxyXG4gICAgICAgIHZwYzogcHJvcHMudnBjLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgU2VydmljZSBkaXNjb3ZlcnkgbmFtZXNwYWNlIGZvciByZWNydWl0bWVudCAke3Byb3BzLmVudmlyb25tZW50TmFtZX1gLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHRoaXMuc2VydmljZURpc2NvdmVyeSA9IG5ldyBzZXJ2aWNlZGlzY292ZXJ5LlNlcnZpY2UodGhpcywgJ1NlcnZpY2VEaXNjb3ZlcnknLCB7XHJcbiAgICAgICAgbmFtZXNwYWNlLFxyXG4gICAgICAgIG5hbWU6ICdiYWNrZW5kJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ1NlcnZpY2UgZGlzY292ZXJ5IGZvciBiYWNrZW5kIHNlcnZpY2UnLFxyXG4gICAgICAgIGRuc1JlY29yZFR5cGU6IHNlcnZpY2VkaXNjb3ZlcnkuRG5zUmVjb3JkVHlwZS5BLFxyXG4gICAgICAgIGRuc1R0bDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLFxyXG4gICAgICAgIGhlYWx0aENoZWNrR3JhY2VQZXJpb2Q6IGNkay5EdXJhdGlvbi5zZWNvbmRzKHByb3BzLmNvbmZpZy5oZWFsdGhDaGVja0dyYWNlUGVyaW9kKSxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ3JlYXRlIEZhcmdhdGUgc2VydmljZVxyXG4gICAgdGhpcy5zZXJ2aWNlID0gbmV3IGVjcy5GYXJnYXRlU2VydmljZSh0aGlzLCAnU2VydmljZScsIHtcclxuICAgICAgY2x1c3RlcjogcHJvcHMuY2x1c3RlcixcclxuICAgICAgdGFza0RlZmluaXRpb246IHRoaXMudGFza0RlZmluaXRpb24sXHJcbiAgICAgIGRlc2lyZWRDb3VudDogcHJvcHMuY29uZmlnLmRlc2lyZWRDYXBhY2l0eSxcclxuICAgICAgbWluSGVhbHRoeVBlcmNlbnQ6IDUwLFxyXG4gICAgICBtYXhIZWFsdGh5UGVyY2VudDogMjAwLFxyXG4gICAgICB2cGNTdWJuZXRzOiB7XHJcbiAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyxcclxuICAgICAgfSxcclxuICAgICAgc2VjdXJpdHlHcm91cHM6IFtwcm9wcy5zZWN1cml0eUdyb3VwXSxcclxuICAgICAgZW5hYmxlRXhlY3V0ZUNvbW1hbmQ6IHByb3BzLmNvbmZpZy5lbmFibGVFeGVjdXRlQ29tbWFuZCxcclxuICAgICAgc2VydmljZU5hbWU6IGByZWNydWl0bWVudC0ke3Byb3BzLmVudmlyb25tZW50TmFtZX0tYmFja2VuZGAsXHJcbiAgICAgIGNsb3VkTWFwT3B0aW9uczogdGhpcy5zZXJ2aWNlRGlzY292ZXJ5ID8ge1xyXG4gICAgICAgIHNlcnZpY2U6IHRoaXMuc2VydmljZURpc2NvdmVyeSxcclxuICAgICAgICBjb250YWluZXJQb3J0OiAzMDAwLFxyXG4gICAgICB9IDogdW5kZWZpbmVkLFxyXG4gICAgICBoZWFsdGhDaGVja0dyYWNlUGVyaW9kOiBjZGsuRHVyYXRpb24uc2Vjb25kcyhwcm9wcy5jb25maWcuaGVhbHRoQ2hlY2tHcmFjZVBlcmlvZCksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgdGFyZ2V0IGdyb3VwXHJcbiAgICB0aGlzLnRhcmdldEdyb3VwID0gbmV3IGVsYnYyLkFwcGxpY2F0aW9uVGFyZ2V0R3JvdXAodGhpcywgJ1RhcmdldEdyb3VwJywge1xyXG4gICAgICB2cGM6IHByb3BzLnZwYyxcclxuICAgICAgcG9ydDogMzAwMCxcclxuICAgICAgcHJvdG9jb2w6IGVsYnYyLkFwcGxpY2F0aW9uUHJvdG9jb2wuSFRUUCxcclxuICAgICAgdGFyZ2V0VHlwZTogZWxidjIuVGFyZ2V0VHlwZS5JUCxcclxuICAgICAgaGVhbHRoQ2hlY2s6IHtcclxuICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIHBhdGg6IHByb3BzLmNvbmZpZy5oZWFsdGhDaGVja1BhdGgsXHJcbiAgICAgICAgaW50ZXJ2YWw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKHByb3BzLmNvbmZpZy5oZWFsdGhDaGVja0ludGVydmFsKSxcclxuICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyhwcm9wcy5jb25maWcuaGVhbHRoQ2hlY2tUaW1lb3V0KSxcclxuICAgICAgICBoZWFsdGh5VGhyZXNob2xkQ291bnQ6IHByb3BzLmNvbmZpZy5oZWFsdGh5VGhyZXNob2xkQ291bnQsXHJcbiAgICAgICAgdW5oZWFsdGh5VGhyZXNob2xkQ291bnQ6IHByb3BzLmNvbmZpZy51bmhlYWx0aHlUaHJlc2hvbGRDb3VudCxcclxuICAgICAgICBoZWFsdGh5SHR0cENvZGVzOiAnMjAwJyxcclxuICAgICAgICBwcm90b2NvbDogZWxidjIuUHJvdG9jb2wuSFRUUCxcclxuICAgICAgfSxcclxuICAgICAgdGFyZ2V0czogW3RoaXMuc2VydmljZV0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgbGlzdGVuZXJcclxuICAgIHRoaXMubGlzdGVuZXIgPSBwcm9wcy5sb2FkQmFsYW5jZXIuYWRkTGlzdGVuZXIoJ0xpc3RlbmVyJywge1xyXG4gICAgICBwb3J0OiA4MCxcclxuICAgICAgcHJvdG9jb2w6IGVsYnYyLkFwcGxpY2F0aW9uUHJvdG9jb2wuSFRUUCxcclxuICAgICAgZGVmYXVsdFRhcmdldEdyb3VwczogW3RoaXMudGFyZ2V0R3JvdXBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU2V0dXAgYXV0byBzY2FsaW5nXHJcbiAgICB0aGlzLmF1dG9TY2FsaW5nVGFyZ2V0ID0gdGhpcy5zZXJ2aWNlLmF1dG9TY2FsZVRhc2tDb3VudCh7XHJcbiAgICAgIG1pbkNhcGFjaXR5OiBwcm9wcy5jb25maWcubWluQ2FwYWNpdHksXHJcbiAgICAgIG1heENhcGFjaXR5OiBwcm9wcy5jb25maWcubWF4Q2FwYWNpdHksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDUFUgc2NhbGluZ1xyXG4gICAgdGhpcy5hdXRvU2NhbGluZ1RhcmdldC5zY2FsZU9uQ3B1VXRpbGl6YXRpb24oJ0NwdVNjYWxpbmcnLCB7XHJcbiAgICAgIHRhcmdldFV0aWxpemF0aW9uUGVyY2VudDogcHJvcHMuY29uZmlnLnRhcmdldENwdVV0aWxpemF0aW9uLFxyXG4gICAgICBzY2FsZUluQ29vbGRvd246IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwMCksXHJcbiAgICAgIHNjYWxlT3V0Q29vbGRvd246IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwMCksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBNZW1vcnkgc2NhbGluZ1xyXG4gICAgdGhpcy5hdXRvU2NhbGluZ1RhcmdldC5zY2FsZU9uTWVtb3J5VXRpbGl6YXRpb24oJ01lbW9yeVNjYWxpbmcnLCB7XHJcbiAgICAgIHRhcmdldFV0aWxpemF0aW9uUGVyY2VudDogcHJvcHMuY29uZmlnLnRhcmdldE1lbW9yeVV0aWxpemF0aW9uLFxyXG4gICAgICBzY2FsZUluQ29vbGRvd246IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwMCksXHJcbiAgICAgIHNjYWxlT3V0Q29vbGRvd246IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwMCksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgQ2xvdWRXYXRjaCBhbGFybXNcclxuICAgIHRoaXMuY3JlYXRlU2VydmljZUFsYXJtcyhwcm9wcy5lbnZpcm9ubWVudE5hbWUpO1xyXG5cclxuICAgIC8vIEFkZCB0YWdzXHJcbiAgICB0aGlzLmFkZFRhZ3MocHJvcHMuZW52aXJvbm1lbnROYW1lKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlU2VydmljZUFsYXJtcyhlbnZpcm9ubWVudE5hbWU6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgLy8gU2VydmljZSBDUFUgdXRpbGl6YXRpb24gYWxhcm1cclxuICAgIGNvbnN0IGNwdUFsYXJtID0gbmV3IGNkay5hd3NfY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnU2VydmljZUNwdUFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6IGByZWNydWl0bWVudC0ke2Vudmlyb25tZW50TmFtZX0tYmFja2VuZC1jcHUtdXRpbGl6YXRpb25gLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQmFja2VuZCBzZXJ2aWNlIENQVSB1dGlsaXphdGlvbiBpcyBoaWdoJyxcclxuICAgICAgbWV0cmljOiB0aGlzLnNlcnZpY2UubWV0cmljQ3B1VXRpbGl6YXRpb24oKSxcclxuICAgICAgdGhyZXNob2xkOiA4MCxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2RrLmF3c19jbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjZGsuYXdzX2Nsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU2VydmljZSBtZW1vcnkgdXRpbGl6YXRpb24gYWxhcm1cclxuICAgIGNvbnN0IG1lbW9yeUFsYXJtID0gbmV3IGNkay5hd3NfY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnU2VydmljZU1lbW9yeUFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6IGByZWNydWl0bWVudC0ke2Vudmlyb25tZW50TmFtZX0tYmFja2VuZC1tZW1vcnktdXRpbGl6YXRpb25gLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQmFja2VuZCBzZXJ2aWNlIG1lbW9yeSB1dGlsaXphdGlvbiBpcyBoaWdoJyxcclxuICAgICAgbWV0cmljOiB0aGlzLnNlcnZpY2UubWV0cmljTWVtb3J5VXRpbGl6YXRpb24oKSxcclxuICAgICAgdGhyZXNob2xkOiA4NSxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2RrLmF3c19jbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjZGsuYXdzX2Nsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gVGFyZ2V0IGdyb3VwIGhlYWx0aHkgaG9zdHMgYWxhcm1cclxuICAgIGNvbnN0IGhlYWx0aHlIb3N0c0FsYXJtID0gbmV3IGNkay5hd3NfY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnSGVhbHRoeUhvc3RzQWxhcm0nLCB7XHJcbiAgICAgIGFsYXJtTmFtZTogYHJlY3J1aXRtZW50LSR7ZW52aXJvbm1lbnROYW1lfS1iYWNrZW5kLWhlYWx0aHktaG9zdHNgLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQmFja2VuZCBzZXJ2aWNlIGhlYWx0aHkgaG9zdHMgY291bnQgaXMgbG93JyxcclxuICAgICAgbWV0cmljOiB0aGlzLnRhcmdldEdyb3VwLm1ldHJpY0hlYWx0aHlIb3N0Q291bnQoKSxcclxuICAgICAgdGhyZXNob2xkOiAxLFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjZGsuYXdzX2Nsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkxFU1NfVEhBTl9USFJFU0hPTEQsXHJcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNkay5hd3NfY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLkJSRUFDSElORyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRhcmdldCBncm91cCByZXNwb25zZSB0aW1lIGFsYXJtXHJcbiAgICBjb25zdCByZXNwb25zZVRpbWVBbGFybSA9IG5ldyBjZGsuYXdzX2Nsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ1Jlc3BvbnNlVGltZUFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6IGByZWNydWl0bWVudC0ke2Vudmlyb25tZW50TmFtZX0tYmFja2VuZC1yZXNwb25zZS10aW1lYCxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0JhY2tlbmQgc2VydmljZSByZXNwb25zZSB0aW1lIGlzIGhpZ2gnLFxyXG4gICAgICBtZXRyaWM6IHRoaXMudGFyZ2V0R3JvdXAubWV0cmljVGFyZ2V0UmVzcG9uc2VUaW1lKCksXHJcbiAgICAgIHRocmVzaG9sZDogMSwgLy8gMSBzZWNvbmRcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2RrLmF3c19jbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjZGsuYXdzX2Nsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIGFsYXJtcyB0byBhIGxpc3QgZm9yIGV4dGVybmFsIHJlZmVyZW5jZVxyXG4gICAgKHRoaXMgYXMgYW55KS5hbGFybXMgPSBbY3B1QWxhcm0sIG1lbW9yeUFsYXJtLCBoZWFsdGh5SG9zdHNBbGFybSwgcmVzcG9uc2VUaW1lQWxhcm1dO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhZGRUYWdzKGVudmlyb25tZW50TmFtZTogc3RyaW5nKTogdm9pZCB7XHJcbiAgICBjb25zdCB0YWdzID0ge1xyXG4gICAgICBFbnZpcm9ubWVudDogZW52aXJvbm1lbnROYW1lLFxyXG4gICAgICBDb21wb25lbnQ6ICdCYWNrZW5kJyxcclxuICAgICAgTWFuYWdlZEJ5OiAnQ0RLJyxcclxuICAgIH07XHJcblxyXG4gICAgT2JqZWN0LmVudHJpZXModGFncykuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XHJcbiAgICAgIGNkay5UYWdzLm9mKHRoaXMuc2VydmljZSkuYWRkKGtleSwgdmFsdWUpO1xyXG4gICAgICBjZGsuVGFncy5vZih0aGlzLnRhc2tEZWZpbml0aW9uKS5hZGQoa2V5LCB2YWx1ZSk7XHJcbiAgICAgIGNkay5UYWdzLm9mKHRoaXMucmVwb3NpdG9yeSkuYWRkKGtleSwgdmFsdWUpO1xyXG4gICAgICBjZGsuVGFncy5vZih0aGlzLmxvZ0dyb3VwKS5hZGQoa2V5LCB2YWx1ZSk7XHJcbiAgICAgIGNkay5UYWdzLm9mKHRoaXMudGFyZ2V0R3JvdXApLmFkZChrZXksIHZhbHVlKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGdldFNlcnZpY2VVcmwoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBgaHR0cDovLyR7dGhpcy5sb2FkQmFsYW5jZXIubG9hZEJhbGFuY2VyRG5zTmFtZX1gO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGFkZEVudmlyb25tZW50VmFyaWFibGUobmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKTogdm9pZCB7XHJcbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLnRhc2tEZWZpbml0aW9uLmZpbmRDb250YWluZXIoJ2FwcCcpO1xyXG4gICAgaWYgKGNvbnRhaW5lcikge1xyXG4gICAgICBjb250YWluZXIuYWRkRW52aXJvbm1lbnQobmFtZSwgdmFsdWUpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFkZFNlY3JldChuYW1lOiBzdHJpbmcsIHNlY3JldDogZWNzLlNlY3JldCk6IHZvaWQge1xyXG4gICAgY29uc3QgY29udGFpbmVyID0gdGhpcy50YXNrRGVmaW5pdGlvbi5maW5kQ29udGFpbmVyKCdhcHAnKTtcclxuICAgIGlmIChjb250YWluZXIpIHtcclxuICAgICAgY29udGFpbmVyLmFkZFNlY3JldChuYW1lLCBzZWNyZXQpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGFkZENvbnRhaW5lclBvcnQocG9ydDogbnVtYmVyLCBwcm90b2NvbDogZWNzLlByb3RvY29sID0gZWNzLlByb3RvY29sLlRDUCk6IHZvaWQge1xyXG4gICAgY29uc3QgY29udGFpbmVyID0gdGhpcy50YXNrRGVmaW5pdGlvbi5maW5kQ29udGFpbmVyKCdhcHAnKTtcclxuICAgIGlmIChjb250YWluZXIpIHtcclxuICAgICAgY29udGFpbmVyLmFkZFBvcnRNYXBwaW5ncyh7XHJcbiAgICAgICAgY29udGFpbmVyUG9ydDogcG9ydCxcclxuICAgICAgICBwcm90b2NvbCxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGdldCBsb2FkQmFsYW5jZXIoKTogZWxidjIuQXBwbGljYXRpb25Mb2FkQmFsYW5jZXIge1xyXG4gICAgcmV0dXJuIHRoaXMubGlzdGVuZXIubG9hZEJhbGFuY2VyIGFzIGVsYnYyLkFwcGxpY2F0aW9uTG9hZEJhbGFuY2VyO1xyXG4gIH1cclxufSJdfQ==