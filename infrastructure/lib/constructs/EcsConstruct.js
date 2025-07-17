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
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const ecs = __importStar(require("aws-cdk-lib/aws-ecs"));
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
    setupAutoScaling(config) {
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
    createMigrationTask() {
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
                DATABASE_URL: ecs.Secret.fromSecretsManager(this.taskDefinition.containers[0].secrets?.DATABASE_URL?.secretsManagerSecret, 'DATABASE_URL'),
            },
        });
        return migrationTaskDefinition;
    }
}
exports.EcsConstruct = EcsConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRWNzQ29uc3RydWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiRWNzQ29uc3RydWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLHlEQUEyQztBQUUzQywyREFBNkM7QUFDN0MseURBQTJDO0FBQzNDLG1GQUFxRTtBQUVyRSwyQ0FBdUM7QUFpQnZDLE1BQWEsWUFBYSxTQUFRLHNCQUFTO0lBTXpDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBd0I7UUFDaEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQix3QkFBd0I7UUFDeEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUN2RCxjQUFjLEVBQUUsK0JBQStCLEtBQUssQ0FBQyxXQUFXLEVBQUU7WUFDbEUsa0JBQWtCLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQzdDLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLGNBQWMsRUFBRTtnQkFDZDtvQkFDRSxXQUFXLEVBQUUscUJBQXFCO29CQUNsQyxhQUFhLEVBQUUsRUFBRTtpQkFDbEI7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILHFCQUFxQjtRQUNyQixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFO1lBQzlDLFdBQVcsRUFBRSx1QkFBdUIsS0FBSyxDQUFDLFdBQVcsRUFBRTtZQUN2RCxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUc7WUFDZCxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLDhCQUE4QixFQUFFLElBQUk7U0FDckMsQ0FBQyxDQUFDO1FBRUgscUNBQXFDO1FBQ3JDLE1BQU0sU0FBUyxHQUFHLElBQUksZ0JBQWdC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Q0FBQyxDQUFDO1FBRUgsT0FBTyx1QkFBdUIsQ0FBQztJQUNqQyxDQUFDO0NBQ0Y7QUFyUUQsb0NBcVFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xyXG5pbXBvcnQgKiBhcyBlY3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjcyc7XHJcbmltcG9ydCAqIGFzIGVjciBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWNyJztcclxuaW1wb3J0ICogYXMgZWxidjIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVsYXN0aWNsb2FkYmFsYW5jaW5ndjInO1xyXG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgKiBhcyBzZXJ2aWNlZGlzY292ZXJ5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zZXJ2aWNlZGlzY292ZXJ5JztcclxuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCB7IEVjc0NvbmZpZyB9IGZyb20gJy4uL2NvbmZpZy9FbnZpcm9ubWVudENvbmZpZyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEVjc0NvbnN0cnVjdFByb3BzIHtcclxuICB2cGM6IGVjMi5WcGM7XHJcbiAgc2VjdXJpdHlHcm91cDogZWMyLlNlY3VyaXR5R3JvdXA7XHJcbiAgYWxiVGFyZ2V0R3JvdXA6IGVsYnYyLkFwcGxpY2F0aW9uVGFyZ2V0R3JvdXA7XHJcbiAgY29uZmlnOiBFY3NDb25maWc7XHJcbiAgZW52aXJvbm1lbnQ6IHN0cmluZztcclxuICBzZWNyZXRzOiB7XHJcbiAgICBkYXRhYmFzZVNlY3JldDogc2VjcmV0c21hbmFnZXIuU2VjcmV0O1xyXG4gICAgand0U2VjcmV0OiBzZWNyZXRzbWFuYWdlci5TZWNyZXQ7XHJcbiAgICBzbXRwU2VjcmV0OiBzZWNyZXRzbWFuYWdlci5TZWNyZXQ7XHJcbiAgfTtcclxuICByZWRpc0VuZHBvaW50Pzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRWNzQ29uc3RydWN0IGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgY2x1c3RlcjogZWNzLkNsdXN0ZXI7XHJcbiAgcHVibGljIHJlYWRvbmx5IHNlcnZpY2U6IGVjcy5GYXJnYXRlU2VydmljZTtcclxuICBwdWJsaWMgcmVhZG9ubHkgdGFza0RlZmluaXRpb246IGVjcy5GYXJnYXRlVGFza0RlZmluaXRpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IHJlcG9zaXRvcnk6IGVjci5SZXBvc2l0b3J5O1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogRWNzQ29uc3RydWN0UHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIEVDUiByZXBvc2l0b3J5XHJcbiAgICB0aGlzLnJlcG9zaXRvcnkgPSBuZXcgZWNyLlJlcG9zaXRvcnkodGhpcywgJ1JlcG9zaXRvcnknLCB7XHJcbiAgICAgIHJlcG9zaXRvcnlOYW1lOiBgcmVjcnVpdG1lbnQtd2Vic2l0ZS1iYWNrZW5kLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcclxuICAgICAgaW1hZ2VUYWdNdXRhYmlsaXR5OiBlY3IuVGFnTXV0YWJpbGl0eS5NVVRBQkxFLFxyXG4gICAgICBpbWFnZVNjYW5PblB1c2g6IHRydWUsXHJcbiAgICAgIGxpZmVjeWNsZVJ1bGVzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdLZWVwIGxhc3QgMTAgaW1hZ2VzJyxcclxuICAgICAgICAgIG1heEltYWdlQ291bnQ6IDEwLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIF0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgRUNTIGNsdXN0ZXJcclxuICAgIHRoaXMuY2x1c3RlciA9IG5ldyBlY3MuQ2x1c3Rlcih0aGlzLCAnQ2x1c3RlcicsIHtcclxuICAgICAgY2x1c3Rlck5hbWU6IGByZWNydWl0bWVudC13ZWJzaXRlLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcclxuICAgICAgdnBjOiBwcm9wcy52cGMsXHJcbiAgICAgIGNvbnRhaW5lckluc2lnaHRzOiB0cnVlLFxyXG4gICAgICBlbmFibGVGYXJnYXRlQ2FwYWNpdHlQcm92aWRlcnM6IHRydWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgc2VydmljZSBkaXNjb3ZlcnkgbmFtZXNwYWNlXHJcbiAgICBjb25zdCBuYW1lc3BhY2UgPSBuZXcgc2VydmljZWRpc2NvdmVyeS5Qcml2YXRlRG5zTmFtZXNwYWNlKHRoaXMsICdTZXJ2aWNlRGlzY292ZXJ5Jywge1xyXG4gICAgICBuYW1lOiBgcmVjcnVpdG1lbnQtd2Vic2l0ZS0ke3Byb3BzLmVudmlyb25tZW50fS5sb2NhbGAsXHJcbiAgICAgIHZwYzogcHJvcHMudnBjLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIHRhc2sgZXhlY3V0aW9uIHJvbGVcclxuICAgIGNvbnN0IHRhc2tFeGVjdXRpb25Sb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdUYXNrRXhlY3V0aW9uUm9sZScsIHtcclxuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2Vjcy10YXNrcy5hbWF6b25hd3MuY29tJyksXHJcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW1xyXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FtYXpvbkVDU1Rhc2tFeGVjdXRpb25Sb2xlUG9saWN5JyksXHJcbiAgICAgIF0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBwZXJtaXNzaW9ucyB0byByZWFkIHNlY3JldHNcclxuICAgIHByb3BzLnNlY3JldHMuZGF0YWJhc2VTZWNyZXQuZ3JhbnRSZWFkKHRhc2tFeGVjdXRpb25Sb2xlKTtcclxuICAgIHByb3BzLnNlY3JldHMuand0U2VjcmV0LmdyYW50UmVhZCh0YXNrRXhlY3V0aW9uUm9sZSk7XHJcbiAgICBwcm9wcy5zZWNyZXRzLnNtdHBTZWNyZXQuZ3JhbnRSZWFkKHRhc2tFeGVjdXRpb25Sb2xlKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgdGFzayByb2xlXHJcbiAgICBjb25zdCB0YXNrUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnVGFza1JvbGUnLCB7XHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlY3MtdGFza3MuYW1hem9uYXdzLmNvbScpLFxyXG4gICAgICBpbmxpbmVQb2xpY2llczoge1xyXG4gICAgICAgIENsb3VkV2F0Y2hQb2xpY3k6IG5ldyBpYW0uUG9saWN5RG9jdW1lbnQoe1xyXG4gICAgICAgICAgc3RhdGVtZW50czogW1xyXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgICdjbG91ZHdhdGNoOlB1dE1ldHJpY0RhdGEnLFxyXG4gICAgICAgICAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nR3JvdXAnLFxyXG4gICAgICAgICAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nU3RyZWFtJyxcclxuICAgICAgICAgICAgICAgICdsb2dzOlB1dExvZ0V2ZW50cycsXHJcbiAgICAgICAgICAgICAgICAnbG9nczpEZXNjcmliZUxvZ1N0cmVhbXMnLFxyXG4gICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIFhSYXlQb2xpY3k6IG5ldyBpYW0uUG9saWN5RG9jdW1lbnQoe1xyXG4gICAgICAgICAgc3RhdGVtZW50czogW1xyXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgICd4cmF5OlB1dFRyYWNlU2VnbWVudHMnLFxyXG4gICAgICAgICAgICAgICAgJ3hyYXk6UHV0VGVsZW1ldHJ5UmVjb3JkcycsXHJcbiAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgbG9nIGdyb3VwXHJcbiAgICBjb25zdCBsb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdMb2dHcm91cCcsIHtcclxuICAgICAgbG9nR3JvdXBOYW1lOiBgL2Vjcy9yZWNydWl0bWVudC13ZWJzaXRlLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcclxuICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX01PTlRILFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIHRhc2sgZGVmaW5pdGlvblxyXG4gICAgdGhpcy50YXNrRGVmaW5pdGlvbiA9IG5ldyBlY3MuRmFyZ2F0ZVRhc2tEZWZpbml0aW9uKHRoaXMsICdUYXNrRGVmaW5pdGlvbicsIHtcclxuICAgICAgZmFtaWx5OiBgcmVjcnVpdG1lbnQtd2Vic2l0ZS0ke3Byb3BzLmVudmlyb25tZW50fWAsXHJcbiAgICAgIGNwdTogcHJvcHMuY29uZmlnLmNwdSxcclxuICAgICAgbWVtb3J5TGltaXRNaUI6IHByb3BzLmNvbmZpZy5tZW1vcnksXHJcbiAgICAgIGV4ZWN1dGlvblJvbGU6IHRhc2tFeGVjdXRpb25Sb2xlLFxyXG4gICAgICB0YXNrUm9sZTogdGFza1JvbGUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgY29udGFpbmVyIGRlZmluaXRpb25cclxuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMudGFza0RlZmluaXRpb24uYWRkQ29udGFpbmVyKCdCYWNrZW5kQ29udGFpbmVyJywge1xyXG4gICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21FY3JSZXBvc2l0b3J5KHRoaXMucmVwb3NpdG9yeSwgJ2xhdGVzdCcpLFxyXG4gICAgICBsb2dnaW5nOiBlY3MuTG9nRHJpdmVycy5hd3NMb2dzKHtcclxuICAgICAgICBzdHJlYW1QcmVmaXg6ICdiYWNrZW5kJyxcclxuICAgICAgICBsb2dHcm91cDogbG9nR3JvdXAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIE5PREVfRU5WOiAncHJvZHVjdGlvbicsXHJcbiAgICAgICAgUE9SVDogJzMwMDAnLFxyXG4gICAgICAgIEZST05URU5EX1VSTDogcHJvcHMuZW52aXJvbm1lbnQgPT09ICdwcm9kJyBcclxuICAgICAgICAgID8gJ2h0dHBzOi8vcmVjcnVpdG1lbnR3ZWJzaXRlLmNvbSdcclxuICAgICAgICAgIDogYGh0dHBzOi8vJHtwcm9wcy5lbnZpcm9ubWVudH0ucmVjcnVpdG1lbnR3ZWJzaXRlLmNvbWAsXHJcbiAgICAgICAgUkVESVNfSE9TVDogcHJvcHMucmVkaXNFbmRwb2ludCB8fCAnJyxcclxuICAgICAgfSxcclxuICAgICAgc2VjcmV0czoge1xyXG4gICAgICAgIERBVEFCQVNFX1VSTDogZWNzLlNlY3JldC5mcm9tU2VjcmV0c01hbmFnZXIocHJvcHMuc2VjcmV0cy5kYXRhYmFzZVNlY3JldCwgJ0RBVEFCQVNFX1VSTCcpLFxyXG4gICAgICAgIEpXVF9TRUNSRVQ6IGVjcy5TZWNyZXQuZnJvbVNlY3JldHNNYW5hZ2VyKHByb3BzLnNlY3JldHMuand0U2VjcmV0LCAnSldUX1NFQ1JFVCcpLFxyXG4gICAgICAgIFNNVFBfSE9TVDogZWNzLlNlY3JldC5mcm9tU2VjcmV0c01hbmFnZXIocHJvcHMuc2VjcmV0cy5zbXRwU2VjcmV0LCAnU01UUF9IT1NUJyksXHJcbiAgICAgICAgU01UUF9VU0VSOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihwcm9wcy5zZWNyZXRzLnNtdHBTZWNyZXQsICdTTVRQX1VTRVInKSxcclxuICAgICAgICBTTVRQX1BBU1NXT1JEOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihwcm9wcy5zZWNyZXRzLnNtdHBTZWNyZXQsICdTTVRQX1BBU1NXT1JEJyksXHJcbiAgICAgIH0sXHJcbiAgICAgIGhlYWx0aENoZWNrOiB7XHJcbiAgICAgICAgY29tbWFuZDogWydDTUQtU0hFTEwnLCAnY3VybCAtZiBodHRwOi8vbG9jYWxob3N0OjMwMDAvaGVhbHRoIHx8IGV4aXQgMSddLFxyXG4gICAgICAgIGludGVydmFsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNSksXHJcbiAgICAgICAgcmV0cmllczogMyxcclxuICAgICAgICBzdGFydFBlcmlvZDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIFgtUmF5IHNpZGVjYXIgZm9yIHRyYWNpbmdcclxuICAgIHRoaXMudGFza0RlZmluaXRpb24uYWRkQ29udGFpbmVyKCdYUmF5RGFlbW9uJywge1xyXG4gICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeSgncHVibGljLmVjci5hd3MveHJheS9hd3MteHJheS1kYWVtb246bGF0ZXN0JyksXHJcbiAgICAgIGNwdTogMzIsXHJcbiAgICAgIG1lbW9yeUxpbWl0TWlCOiAyNTYsXHJcbiAgICAgIGVzc2VudGlhbDogZmFsc2UsXHJcbiAgICAgIGxvZ2dpbmc6IGVjcy5Mb2dEcml2ZXJzLmF3c0xvZ3Moe1xyXG4gICAgICAgIHN0cmVhbVByZWZpeDogJ3hyYXknLFxyXG4gICAgICAgIGxvZ0dyb3VwOiBsb2dHcm91cCxcclxuICAgICAgfSksXHJcbiAgICAgIHBvcnRNYXBwaW5nczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGNvbnRhaW5lclBvcnQ6IDIwMDAsXHJcbiAgICAgICAgICBwcm90b2NvbDogZWNzLlByb3RvY29sLlVEUCxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIHBvcnQgbWFwcGluZyBmb3IgbWFpbiBjb250YWluZXJcclxuICAgIGNvbnRhaW5lci5hZGRQb3J0TWFwcGluZ3Moe1xyXG4gICAgICBjb250YWluZXJQb3J0OiAzMDAwLFxyXG4gICAgICBwcm90b2NvbDogZWNzLlByb3RvY29sLlRDUCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBGYXJnYXRlIHNlcnZpY2VcclxuICAgIHRoaXMuc2VydmljZSA9IG5ldyBlY3MuRmFyZ2F0ZVNlcnZpY2UodGhpcywgJ1NlcnZpY2UnLCB7XHJcbiAgICAgIGNsdXN0ZXI6IHRoaXMuY2x1c3RlcixcclxuICAgICAgdGFza0RlZmluaXRpb246IHRoaXMudGFza0RlZmluaXRpb24sXHJcbiAgICAgIHNlcnZpY2VOYW1lOiBgcmVjcnVpdG1lbnQtd2Vic2l0ZS0ke3Byb3BzLmVudmlyb25tZW50fWAsXHJcbiAgICAgIGRlc2lyZWRDb3VudDogcHJvcHMuY29uZmlnLmRlc2lyZWRDb3VudCxcclxuICAgICAgbWluSGVhbHRoeVBlcmNlbnQ6IDUwLFxyXG4gICAgICBtYXhIZWFsdGh5UGVyY2VudDogMjAwLFxyXG4gICAgICB2cGNTdWJuZXRzOiB7XHJcbiAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyxcclxuICAgICAgfSxcclxuICAgICAgc2VjdXJpdHlHcm91cHM6IFtwcm9wcy5zZWN1cml0eUdyb3VwXSxcclxuICAgICAgYXNzaWduUHVibGljSXA6IGZhbHNlLFxyXG4gICAgICBjYXBhY2l0eVByb3ZpZGVyU3RyYXRlZ2llczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGNhcGFjaXR5UHJvdmlkZXI6ICdGQVJHQVRFJyxcclxuICAgICAgICAgIHdlaWdodDogMSxcclxuICAgICAgICAgIGJhc2U6IHByb3BzLmNvbmZpZy5kZXNpcmVkQ291bnQsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBjYXBhY2l0eVByb3ZpZGVyOiAnRkFSR0FURV9TUE9UJyxcclxuICAgICAgICAgIHdlaWdodDogNCxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgICBjbG91ZE1hcE9wdGlvbnM6IHtcclxuICAgICAgICBjbG91ZE1hcE5hbWVzcGFjZTogbmFtZXNwYWNlLFxyXG4gICAgICAgIG5hbWU6ICdiYWNrZW5kJyxcclxuICAgICAgfSxcclxuICAgICAgZW5hYmxlRXhlY3V0ZUNvbW1hbmQ6IHRydWUsIC8vIEZvciBkZWJ1Z2dpbmdcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEF0dGFjaCB0byBBTEIgdGFyZ2V0IGdyb3VwXHJcbiAgICB0aGlzLnNlcnZpY2UuYXR0YWNoVG9BcHBsaWNhdGlvblRhcmdldEdyb3VwKHByb3BzLmFsYlRhcmdldEdyb3VwKTtcclxuXHJcbiAgICAvLyBDb25maWd1cmUgYXV0by1zY2FsaW5nXHJcbiAgICB0aGlzLnNldHVwQXV0b1NjYWxpbmcocHJvcHMuY29uZmlnKTtcclxuXHJcbiAgICAvLyBBZGQgdGFnc1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5jbHVzdGVyKS5hZGQoJ0NvbXBvbmVudCcsICdFQ1MnKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMuc2VydmljZSkuYWRkKCdDb21wb25lbnQnLCAnQmFja2VuZFNlcnZpY2UnKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgc2V0dXBBdXRvU2NhbGluZyhjb25maWc6IEVjc0NvbmZpZyk6IHZvaWQge1xyXG4gICAgLy8gQ3JlYXRlIHNjYWxhYmxlIHRhcmdldFxyXG4gICAgY29uc3Qgc2NhbGFibGVUYXJnZXQgPSB0aGlzLnNlcnZpY2UuYXV0b1NjYWxlVGFza0NvdW50KHtcclxuICAgICAgbWluQ2FwYWNpdHk6IGNvbmZpZy5taW5DYXBhY2l0eSxcclxuICAgICAgbWF4Q2FwYWNpdHk6IGNvbmZpZy5tYXhDYXBhY2l0eSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENQVS1iYXNlZCBzY2FsaW5nXHJcbiAgICBzY2FsYWJsZVRhcmdldC5zY2FsZU9uQ3B1VXRpbGl6YXRpb24oJ0NwdVNjYWxpbmcnLCB7XHJcbiAgICAgIHRhcmdldFV0aWxpemF0aW9uUGVyY2VudDogY29uZmlnLnRhcmdldENwdVV0aWxpemF0aW9uLFxyXG4gICAgICBzY2FsZUluQ29vbGRvd246IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwMCksXHJcbiAgICAgIHNjYWxlT3V0Q29vbGRvd246IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwMCksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBNZW1vcnktYmFzZWQgc2NhbGluZ1xyXG4gICAgc2NhbGFibGVUYXJnZXQuc2NhbGVPbk1lbW9yeVV0aWxpemF0aW9uKCdNZW1vcnlTY2FsaW5nJywge1xyXG4gICAgICB0YXJnZXRVdGlsaXphdGlvblBlcmNlbnQ6IGNvbmZpZy50YXJnZXRNZW1vcnlVdGlsaXphdGlvbixcclxuICAgICAgc2NhbGVJbkNvb2xkb3duOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMDApLFxyXG4gICAgICBzY2FsZU91dENvb2xkb3duOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMDApLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUmVxdWVzdC1iYXNlZCBzY2FsaW5nXHJcbiAgICBzY2FsYWJsZVRhcmdldC5zY2FsZU9uUmVxdWVzdENvdW50KCdSZXF1ZXN0U2NhbGluZycsIHtcclxuICAgICAgcmVxdWVzdHNQZXJUYXJnZXQ6IDEwMDAsXHJcbiAgICAgIHNjYWxlSW5Db29sZG93bjogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzAwKSxcclxuICAgICAgc2NhbGVPdXRDb29sZG93bjogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgYSBzY2hlZHVsZWQgdGFzayBmb3IgZGF0YWJhc2UgbWlncmF0aW9uc1xyXG4gICAqL1xyXG4gIHB1YmxpYyBjcmVhdGVNaWdyYXRpb25UYXNrKCk6IGVjcy5GYXJnYXRlVGFza0RlZmluaXRpb24ge1xyXG4gICAgY29uc3QgbWlncmF0aW9uVGFza0RlZmluaXRpb24gPSBuZXcgZWNzLkZhcmdhdGVUYXNrRGVmaW5pdGlvbih0aGlzLCAnTWlncmF0aW9uVGFza0RlZmluaXRpb24nLCB7XHJcbiAgICAgIGZhbWlseTogYHJlY3J1aXRtZW50LXdlYnNpdGUtbWlncmF0aW9uLSR7dGhpcy5ub2RlLnRyeUdldENvbnRleHQoJ2Vudmlyb25tZW50Jyl9YCxcclxuICAgICAgY3B1OiA1MTIsXHJcbiAgICAgIG1lbW9yeUxpbWl0TWlCOiAxMDI0LFxyXG4gICAgICBleGVjdXRpb25Sb2xlOiB0aGlzLnRhc2tEZWZpbml0aW9uLmV4ZWN1dGlvblJvbGUsXHJcbiAgICAgIHRhc2tSb2xlOiB0aGlzLnRhc2tEZWZpbml0aW9uLnRhc2tSb2xlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbWlncmF0aW9uVGFza0RlZmluaXRpb24uYWRkQ29udGFpbmVyKCdNaWdyYXRpb25Db250YWluZXInLCB7XHJcbiAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbUVjclJlcG9zaXRvcnkodGhpcy5yZXBvc2l0b3J5LCAnbGF0ZXN0JyksXHJcbiAgICAgIGNvbW1hbmQ6IFsnbnBtJywgJ3J1bicsICdtaWdyYXRlJ10sXHJcbiAgICAgIGxvZ2dpbmc6IGVjcy5Mb2dEcml2ZXJzLmF3c0xvZ3Moe1xyXG4gICAgICAgIHN0cmVhbVByZWZpeDogJ21pZ3JhdGlvbicsXHJcbiAgICAgICAgbG9nR3JvdXA6IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdNaWdyYXRpb25Mb2dHcm91cCcsIHtcclxuICAgICAgICAgIGxvZ0dyb3VwTmFtZTogYC9lY3MvcmVjcnVpdG1lbnQtd2Vic2l0ZS1taWdyYXRpb24tJHt0aGlzLm5vZGUudHJ5R2V0Q29udGV4dCgnZW52aXJvbm1lbnQnKX1gLFxyXG4gICAgICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXHJcbiAgICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9KSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBOT0RFX0VOVjogJ3Byb2R1Y3Rpb24nLFxyXG4gICAgICB9LFxyXG4gICAgICBzZWNyZXRzOiB7XHJcbiAgICAgICAgREFUQUJBU0VfVVJMOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihcclxuICAgICAgICAgIHRoaXMudGFza0RlZmluaXRpb24uY29udGFpbmVyc1swXS5zZWNyZXRzPy5EQVRBQkFTRV9VUkw/LnNlY3JldHNNYW5hZ2VyU2VjcmV0ISxcclxuICAgICAgICAgICdEQVRBQkFTRV9VUkwnXHJcbiAgICAgICAgKSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBtaWdyYXRpb25UYXNrRGVmaW5pdGlvbjtcclxuICB9XHJcbn0iXX0=