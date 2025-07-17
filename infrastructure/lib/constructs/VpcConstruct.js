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
exports.VpcConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const constructs_1 = require("constructs");
class VpcConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // Create VPC with high availability across multiple AZs
        this.vpc = new ec2.Vpc(this, 'VPC', {
            maxAzs: 3, // Use 3 AZs for high availability
            cidr: '10.0.0.0/16',
            enableDnsHostnames: true,
            enableDnsSupport: true,
            natGateways: props.enableNatGateway !== false ? 3 : 0, // One NAT Gateway per AZ
            subnetConfiguration: [
                {
                    name: 'Public',
                    subnetType: ec2.SubnetType.PUBLIC,
                    cidrMask: 24,
                },
                {
                    name: 'Private',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidrMask: 24,
                },
                {
                    name: 'Database',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                    cidrMask: 24,
                },
            ],
        });
        // Store subnet references
        this.privateSubnets = this.vpc.privateSubnets;
        this.publicSubnets = this.vpc.publicSubnets;
        this.databaseSubnets = this.vpc.isolatedSubnets;
        // Create VPC Flow Logs for security monitoring
        if (props.enableVpcFlowLogs !== false) {
            const flowLogGroup = new logs.LogGroup(this, 'VpcFlowLogGroup', {
                logGroupName: `/aws/vpc/flowlogs/${props.environment}`,
                retention: logs.RetentionDays.ONE_MONTH,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
            });
            new ec2.FlowLog(this, 'VpcFlowLog', {
                resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc),
                destination: ec2.FlowLogDestination.toCloudWatchLogs(flowLogGroup),
                trafficType: ec2.FlowLogTrafficType.ALL,
            });
        }
        // Create Security Groups
        this.securityGroups = this.createSecurityGroups();
        // Add common tags
        cdk.Tags.of(this.vpc).add('Name', `RecruitmentWebsite-VPC-${props.environment}`);
        cdk.Tags.of(this.vpc).add('Component', 'Networking');
    }
    createSecurityGroups() {
        // ALB Security Group
        const albSecurityGroup = new ec2.SecurityGroup(this, 'ALBSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for Application Load Balancer',
            allowAllOutbound: true,
        });
        // Allow HTTP and HTTPS traffic from anywhere
        albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic');
        albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic');
        // ECS Security Group
        const ecsSecurityGroup = new ec2.SecurityGroup(this, 'ECSSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for ECS tasks',
            allowAllOutbound: true,
        });
        // Allow traffic from ALB to ECS
        ecsSecurityGroup.addIngressRule(albSecurityGroup, ec2.Port.tcp(3000), 'Allow traffic from ALB');
        // RDS Security Group
        const rdsSecurityGroup = new ec2.SecurityGroup(this, 'RDSSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for RDS database',
            allowAllOutbound: false,
        });
        // Allow PostgreSQL traffic from ECS
        rdsSecurityGroup.addIngressRule(ecsSecurityGroup, ec2.Port.tcp(5432), 'Allow PostgreSQL traffic from ECS');
        // Redis Security Group
        const redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for Redis cluster',
            allowAllOutbound: false,
        });
        // Allow Redis traffic from ECS
        redisSecurityGroup.addIngressRule(ecsSecurityGroup, ec2.Port.tcp(6379), 'Allow Redis traffic from ECS');
        return {
            alb: albSecurityGroup,
            ecs: ecsSecurityGroup,
            rds: rdsSecurityGroup,
            redis: redisSecurityGroup,
        };
    }
    /**
     * Create VPC Endpoints for AWS services to reduce NAT Gateway costs
     */
    createVpcEndpoints() {
        // S3 Gateway Endpoint
        this.vpc.addGatewayEndpoint('S3Endpoint', {
            service: ec2.GatewayVpcEndpointAwsService.S3,
            subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
        });
        // DynamoDB Gateway Endpoint
        this.vpc.addGatewayEndpoint('DynamoDBEndpoint', {
            service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
            subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
        });
        // ECR Interface Endpoints
        this.vpc.addInterfaceEndpoint('ECREndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.ECR,
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
        this.vpc.addInterfaceEndpoint('ECRDockerEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
        // CloudWatch Logs Interface Endpoint
        this.vpc.addInterfaceEndpoint('CloudWatchLogsEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
        // Secrets Manager Interface Endpoint
        this.vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
    }
}
exports.VpcConstruct = VpcConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVnBjQ29uc3RydWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiVnBjQ29uc3RydWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx5REFBMkM7QUFDM0MsMkRBQTZDO0FBQzdDLDJDQUF1QztBQVF2QyxNQUFhLFlBQWEsU0FBUSxzQkFBUztJQVl6QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXdCO1FBQ2hFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsd0RBQXdEO1FBQ3hELElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUU7WUFDbEMsTUFBTSxFQUFFLENBQUMsRUFBRSxrQ0FBa0M7WUFDN0MsSUFBSSxFQUFFLGFBQWE7WUFDbkIsa0JBQWtCLEVBQUUsSUFBSTtZQUN4QixnQkFBZ0IsRUFBRSxJQUFJO1lBQ3RCLFdBQVcsRUFBRSxLQUFLLENBQUMsZ0JBQWdCLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSx5QkFBeUI7WUFDaEYsbUJBQW1CLEVBQUU7Z0JBQ25CO29CQUNFLElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU07b0JBQ2pDLFFBQVEsRUFBRSxFQUFFO2lCQUNiO2dCQUNEO29CQUNFLElBQUksRUFBRSxTQUFTO29CQUNmLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLG1CQUFtQjtvQkFDOUMsUUFBUSxFQUFFLEVBQUU7aUJBQ2I7Z0JBQ0Q7b0JBQ0UsSUFBSSxFQUFFLFVBQVU7b0JBQ2hCLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLGdCQUFnQjtvQkFDM0MsUUFBUSxFQUFFLEVBQUU7aUJBQ2I7YUFDRjtTQUNG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QztJQUNMLENBQUM7Q0FDRjtBQWxMRCxvQ0FrTEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XHJcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVnBjQ29uc3RydWN0UHJvcHMge1xyXG4gIGVudmlyb25tZW50OiBzdHJpbmc7XHJcbiAgZW5hYmxlVnBjRmxvd0xvZ3M/OiBib29sZWFuO1xyXG4gIGVuYWJsZU5hdEdhdGV3YXk/OiBib29sZWFuO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVnBjQ29uc3RydWN0IGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgdnBjOiBlYzIuVnBjO1xyXG4gIHB1YmxpYyByZWFkb25seSBwcml2YXRlU3VibmV0czogZWMyLklTdWJuZXRbXTtcclxuICBwdWJsaWMgcmVhZG9ubHkgcHVibGljU3VibmV0czogZWMyLklTdWJuZXRbXTtcclxuICBwdWJsaWMgcmVhZG9ubHkgZGF0YWJhc2VTdWJuZXRzOiBlYzIuSVN1Ym5ldFtdO1xyXG4gIHB1YmxpYyByZWFkb25seSBzZWN1cml0eUdyb3Vwczoge1xyXG4gICAgYWxiOiBlYzIuU2VjdXJpdHlHcm91cDtcclxuICAgIGVjczogZWMyLlNlY3VyaXR5R3JvdXA7XHJcbiAgICByZHM6IGVjMi5TZWN1cml0eUdyb3VwO1xyXG4gICAgcmVkaXM6IGVjMi5TZWN1cml0eUdyb3VwO1xyXG4gIH07XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBWcGNDb25zdHJ1Y3RQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgVlBDIHdpdGggaGlnaCBhdmFpbGFiaWxpdHkgYWNyb3NzIG11bHRpcGxlIEFac1xyXG4gICAgdGhpcy52cGMgPSBuZXcgZWMyLlZwYyh0aGlzLCAnVlBDJywge1xyXG4gICAgICBtYXhBenM6IDMsIC8vIFVzZSAzIEFacyBmb3IgaGlnaCBhdmFpbGFiaWxpdHlcclxuICAgICAgY2lkcjogJzEwLjAuMC4wLzE2JyxcclxuICAgICAgZW5hYmxlRG5zSG9zdG5hbWVzOiB0cnVlLFxyXG4gICAgICBlbmFibGVEbnNTdXBwb3J0OiB0cnVlLFxyXG4gICAgICBuYXRHYXRld2F5czogcHJvcHMuZW5hYmxlTmF0R2F0ZXdheSAhPT0gZmFsc2UgPyAzIDogMCwgLy8gT25lIE5BVCBHYXRld2F5IHBlciBBWlxyXG4gICAgICBzdWJuZXRDb25maWd1cmF0aW9uOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgbmFtZTogJ1B1YmxpYycsXHJcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QVUJMSUMsXHJcbiAgICAgICAgICBjaWRyTWFzazogMjQsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBuYW1lOiAnUHJpdmF0ZScsXHJcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTLFxyXG4gICAgICAgICAgY2lkck1hc2s6IDI0LFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgbmFtZTogJ0RhdGFiYXNlJyxcclxuICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfSVNPTEFURUQsXHJcbiAgICAgICAgICBjaWRyTWFzazogMjQsXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFN0b3JlIHN1Ym5ldCByZWZlcmVuY2VzXHJcbiAgICB0aGlzLnByaXZhdGVTdWJuZXRzID0gdGhpcy52cGMucHJpdmF0ZVN1Ym5ldHM7XHJcbiAgICB0aGlzLnB1YmxpY1N1Ym5ldHMgPSB0aGlzLnZwYy5wdWJsaWNTdWJuZXRzO1xyXG4gICAgdGhpcy5kYXRhYmFzZVN1Ym5ldHMgPSB0aGlzLnZwYy5pc29sYXRlZFN1Ym5ldHM7XHJcblxyXG4gICAgLy8gQ3JlYXRlIFZQQyBGbG93IExvZ3MgZm9yIHNlY3VyaXR5IG1vbml0b3JpbmdcclxuICAgIGlmIChwcm9wcy5lbmFibGVWcGNGbG93TG9ncyAhPT0gZmFsc2UpIHtcclxuICAgICAgY29uc3QgZmxvd0xvZ0dyb3VwID0gbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ1ZwY0Zsb3dMb2dHcm91cCcsIHtcclxuICAgICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL3ZwYy9mbG93bG9ncy8ke3Byb3BzLmVudmlyb25tZW50fWAsXHJcbiAgICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX01PTlRILFxyXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgbmV3IGVjMi5GbG93TG9nKHRoaXMsICdWcGNGbG93TG9nJywge1xyXG4gICAgICAgIHJlc291cmNlVHlwZTogZWMyLkZsb3dMb2dSZXNvdXJjZVR5cGUuZnJvbVZwYyh0aGlzLnZwYyksXHJcbiAgICAgICAgZGVzdGluYXRpb246IGVjMi5GbG93TG9nRGVzdGluYXRpb24udG9DbG91ZFdhdGNoTG9ncyhmbG93TG9nR3JvdXApLFxyXG4gICAgICAgIHRyYWZmaWNUeXBlOiBlYzIuRmxvd0xvZ1RyYWZmaWNUeXBlLkFMTCxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ3JlYXRlIFNlY3VyaXR5IEdyb3Vwc1xyXG4gICAgdGhpcy5zZWN1cml0eUdyb3VwcyA9IHRoaXMuY3JlYXRlU2VjdXJpdHlHcm91cHMoKTtcclxuXHJcbiAgICAvLyBBZGQgY29tbW9uIHRhZ3NcclxuICAgIGNkay5UYWdzLm9mKHRoaXMudnBjKS5hZGQoJ05hbWUnLCBgUmVjcnVpdG1lbnRXZWJzaXRlLVZQQy0ke3Byb3BzLmVudmlyb25tZW50fWApO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy52cGMpLmFkZCgnQ29tcG9uZW50JywgJ05ldHdvcmtpbmcnKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlU2VjdXJpdHlHcm91cHMoKSB7XHJcbiAgICAvLyBBTEIgU2VjdXJpdHkgR3JvdXBcclxuICAgIGNvbnN0IGFsYlNlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ0FMQlNlY3VyaXR5R3JvdXAnLCB7XHJcbiAgICAgIHZwYzogdGhpcy52cGMsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2VjdXJpdHkgZ3JvdXAgZm9yIEFwcGxpY2F0aW9uIExvYWQgQmFsYW5jZXInLFxyXG4gICAgICBhbGxvd0FsbE91dGJvdW5kOiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWxsb3cgSFRUUCBhbmQgSFRUUFMgdHJhZmZpYyBmcm9tIGFueXdoZXJlXHJcbiAgICBhbGJTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxyXG4gICAgICBlYzIuUGVlci5hbnlJcHY0KCksXHJcbiAgICAgIGVjMi5Qb3J0LnRjcCg4MCksXHJcbiAgICAgICdBbGxvdyBIVFRQIHRyYWZmaWMnXHJcbiAgICApO1xyXG4gICAgYWxiU2VjdXJpdHlHcm91cC5hZGRJbmdyZXNzUnVsZShcclxuICAgICAgZWMyLlBlZXIuYW55SXB2NCgpLFxyXG4gICAgICBlYzIuUG9ydC50Y3AoNDQzKSxcclxuICAgICAgJ0FsbG93IEhUVFBTIHRyYWZmaWMnXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEVDUyBTZWN1cml0eSBHcm91cFxyXG4gICAgY29uc3QgZWNzU2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnRUNTU2VjdXJpdHlHcm91cCcsIHtcclxuICAgICAgdnBjOiB0aGlzLnZwYyxcclxuICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgRUNTIHRhc2tzJyxcclxuICAgICAgYWxsb3dBbGxPdXRib3VuZDogdHJ1ZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFsbG93IHRyYWZmaWMgZnJvbSBBTEIgdG8gRUNTXHJcbiAgICBlY3NTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxyXG4gICAgICBhbGJTZWN1cml0eUdyb3VwLFxyXG4gICAgICBlYzIuUG9ydC50Y3AoMzAwMCksXHJcbiAgICAgICdBbGxvdyB0cmFmZmljIGZyb20gQUxCJ1xyXG4gICAgKTtcclxuXHJcbiAgICAvLyBSRFMgU2VjdXJpdHkgR3JvdXBcclxuICAgIGNvbnN0IHJkc1NlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ1JEU1NlY3VyaXR5R3JvdXAnLCB7XHJcbiAgICAgIHZwYzogdGhpcy52cGMsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2VjdXJpdHkgZ3JvdXAgZm9yIFJEUyBkYXRhYmFzZScsXHJcbiAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IGZhbHNlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWxsb3cgUG9zdGdyZVNRTCB0cmFmZmljIGZyb20gRUNTXHJcbiAgICByZHNTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxyXG4gICAgICBlY3NTZWN1cml0eUdyb3VwLFxyXG4gICAgICBlYzIuUG9ydC50Y3AoNTQzMiksXHJcbiAgICAgICdBbGxvdyBQb3N0Z3JlU1FMIHRyYWZmaWMgZnJvbSBFQ1MnXHJcbiAgICApO1xyXG5cclxuICAgIC8vIFJlZGlzIFNlY3VyaXR5IEdyb3VwXHJcbiAgICBjb25zdCByZWRpc1NlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ1JlZGlzU2VjdXJpdHlHcm91cCcsIHtcclxuICAgICAgdnBjOiB0aGlzLnZwYyxcclxuICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgUmVkaXMgY2x1c3RlcicsXHJcbiAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IGZhbHNlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWxsb3cgUmVkaXMgdHJhZmZpYyBmcm9tIEVDU1xyXG4gICAgcmVkaXNTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxyXG4gICAgICBlY3NTZWN1cml0eUdyb3VwLFxyXG4gICAgICBlYzIuUG9ydC50Y3AoNjM3OSksXHJcbiAgICAgICdBbGxvdyBSZWRpcyB0cmFmZmljIGZyb20gRUNTJ1xyXG4gICAgKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBhbGI6IGFsYlNlY3VyaXR5R3JvdXAsXHJcbiAgICAgIGVjczogZWNzU2VjdXJpdHlHcm91cCxcclxuICAgICAgcmRzOiByZHNTZWN1cml0eUdyb3VwLFxyXG4gICAgICByZWRpczogcmVkaXNTZWN1cml0eUdyb3VwLFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBWUEMgRW5kcG9pbnRzIGZvciBBV1Mgc2VydmljZXMgdG8gcmVkdWNlIE5BVCBHYXRld2F5IGNvc3RzXHJcbiAgICovXHJcbiAgcHVibGljIGNyZWF0ZVZwY0VuZHBvaW50cygpOiB2b2lkIHtcclxuICAgIC8vIFMzIEdhdGV3YXkgRW5kcG9pbnRcclxuICAgIHRoaXMudnBjLmFkZEdhdGV3YXlFbmRwb2ludCgnUzNFbmRwb2ludCcsIHtcclxuICAgICAgc2VydmljZTogZWMyLkdhdGV3YXlWcGNFbmRwb2ludEF3c1NlcnZpY2UuUzMsXHJcbiAgICAgIHN1Ym5ldHM6IFt7IHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MgfV0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBEeW5hbW9EQiBHYXRld2F5IEVuZHBvaW50XHJcbiAgICB0aGlzLnZwYy5hZGRHYXRld2F5RW5kcG9pbnQoJ0R5bmFtb0RCRW5kcG9pbnQnLCB7XHJcbiAgICAgIHNlcnZpY2U6IGVjMi5HYXRld2F5VnBjRW5kcG9pbnRBd3NTZXJ2aWNlLkRZTkFNT0RCLFxyXG4gICAgICBzdWJuZXRzOiBbeyBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTIH1dLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRUNSIEludGVyZmFjZSBFbmRwb2ludHNcclxuICAgIHRoaXMudnBjLmFkZEludGVyZmFjZUVuZHBvaW50KCdFQ1JFbmRwb2ludCcsIHtcclxuICAgICAgc2VydmljZTogZWMyLkludGVyZmFjZVZwY0VuZHBvaW50QXdzU2VydmljZS5FQ1IsXHJcbiAgICAgIHN1Ym5ldHM6IHsgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy52cGMuYWRkSW50ZXJmYWNlRW5kcG9pbnQoJ0VDUkRvY2tlckVuZHBvaW50Jywge1xyXG4gICAgICBzZXJ2aWNlOiBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnRBd3NTZXJ2aWNlLkVDUl9ET0NLRVIsXHJcbiAgICAgIHN1Ym5ldHM6IHsgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ2xvdWRXYXRjaCBMb2dzIEludGVyZmFjZSBFbmRwb2ludFxyXG4gICAgdGhpcy52cGMuYWRkSW50ZXJmYWNlRW5kcG9pbnQoJ0Nsb3VkV2F0Y2hMb2dzRW5kcG9pbnQnLCB7XHJcbiAgICAgIHNlcnZpY2U6IGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuQ0xPVURXQVRDSF9MT0dTLFxyXG4gICAgICBzdWJuZXRzOiB7IHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNlY3JldHMgTWFuYWdlciBJbnRlcmZhY2UgRW5kcG9pbnRcclxuICAgIHRoaXMudnBjLmFkZEludGVyZmFjZUVuZHBvaW50KCdTZWNyZXRzTWFuYWdlckVuZHBvaW50Jywge1xyXG4gICAgICBzZXJ2aWNlOiBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnRBd3NTZXJ2aWNlLlNFQ1JFVFNfTUFOQUdFUixcclxuICAgICAgc3VibmV0czogeyBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTIH0sXHJcbiAgICB9KTtcclxuICB9XHJcbn0iXX0=