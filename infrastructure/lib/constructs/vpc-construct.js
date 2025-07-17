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
const constructs_1 = require("constructs");
class VpcConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { vpcConfig, environment } = props;
        // Create VPC with public and private subnets
        this.vpc = new ec2.Vpc(this, 'RecruitmentVpc', {
            maxAzs: vpcConfig.maxAzs,
            natGateways: vpcConfig.natGateways,
            enableDnsHostnames: vpcConfig.enableDnsHostnames,
            enableDnsSupport: vpcConfig.enableDnsSupport,
            createInternetGateway: vpcConfig.createInternetGateway,
            // Define subnet configuration
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
            // Use single AZ for cost optimization in dev
            cidr: '10.0.0.0/16',
        });
        // Store subnet references for easy access
        this.publicSubnets = this.vpc.publicSubnets;
        this.privateSubnets = this.vpc.privateSubnets;
        // Add VPC endpoints for cost optimization (reduces NAT gateway usage)
        this.addVpcEndpoints();
        // Tag all subnets appropriately
        this.tagSubnets(environment);
        // Add VPC Flow Logs for monitoring (optional based on environment)
        if (environment !== 'dev') {
            this.addVpcFlowLogs();
        }
    }
    addVpcEndpoints() {
        // Add VPC endpoints for AWS services to reduce NAT gateway costs
        // S3 Gateway endpoint (no additional cost)
        this.vpc.addGatewayEndpoint('S3Endpoint', {
            service: ec2.GatewayVpcEndpointAwsService.S3,
            subnets: [
                { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
                { subnetType: ec2.SubnetType.PRIVATE_ISOLATED }
            ],
        });
        // DynamoDB Gateway endpoint (no additional cost)
        this.vpc.addGatewayEndpoint('DynamoDBEndpoint', {
            service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
            subnets: [
                { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
                { subnetType: ec2.SubnetType.PRIVATE_ISOLATED }
            ],
        });
        // ECR API endpoint for Docker image pulls
        this.vpc.addInterfaceEndpoint('ECRApiEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.ECR,
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
        // ECR Docker endpoint for Docker image layers
        this.vpc.addInterfaceEndpoint('ECRDockerEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
        // CloudWatch Logs endpoint
        this.vpc.addInterfaceEndpoint('CloudWatchLogsEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
        // Secrets Manager endpoint
        this.vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
            subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        });
    }
    tagSubnets(environment) {
        const commonTags = {
            Environment: environment,
            Project: 'RecruitmentWebsite',
            ManagedBy: 'CDK',
        };
        // Tag public subnets
        this.publicSubnets.forEach((subnet, index) => {
            cdk.Tags.of(subnet).add('Name', `recruitment-public-${index + 1}`);
            cdk.Tags.of(subnet).add('Type', 'Public');
            Object.entries(commonTags).forEach(([key, value]) => {
                cdk.Tags.of(subnet).add(key, value);
            });
        });
        // Tag private subnets
        this.privateSubnets.forEach((subnet, index) => {
            cdk.Tags.of(subnet).add('Name', `recruitment-private-${index + 1}`);
            cdk.Tags.of(subnet).add('Type', 'Private');
            Object.entries(commonTags).forEach(([key, value]) => {
                cdk.Tags.of(subnet).add(key, value);
            });
        });
        // Tag database subnets
        this.vpc.isolatedSubnets.forEach((subnet, index) => {
            cdk.Tags.of(subnet).add('Name', `recruitment-database-${index + 1}`);
            cdk.Tags.of(subnet).add('Type', 'Database');
            Object.entries(commonTags).forEach(([key, value]) => {
                cdk.Tags.of(subnet).add(key, value);
            });
        });
    }
    addVpcFlowLogs() {
        // Create CloudWatch Log Group for VPC Flow Logs
        const flowLogGroup = new cdk.aws_logs.LogGroup(this, 'VpcFlowLogGroup', {
            logGroupName: `/aws/vpc/flowlogs/${this.vpc.vpcId}`,
            retention: cdk.aws_logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Create IAM role for VPC Flow Logs
        const flowLogRole = new cdk.aws_iam.Role(this, 'VpcFlowLogRole', {
            assumedBy: new cdk.aws_iam.ServicePrincipal('vpc-flow-logs.amazonaws.com'),
            inlinePolicies: {
                CloudWatchLogPolicy: new cdk.aws_iam.PolicyDocument({
                    statements: [
                        new cdk.aws_iam.PolicyStatement({
                            effect: cdk.aws_iam.Effect.ALLOW,
                            actions: [
                                'logs:CreateLogGroup',
                                'logs:CreateLogStream',
                                'logs:PutLogEvents',
                                'logs:DescribeLogGroups',
                                'logs:DescribeLogStreams',
                            ],
                            resources: [flowLogGroup.logGroupArn],
                        }),
                    ],
                }),
            },
        });
        // Create VPC Flow Logs
        new ec2.FlowLog(this, 'VpcFlowLog', {
            resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc),
            destination: ec2.FlowLogDestination.toCloudWatchLogs(flowLogGroup, flowLogRole),
            trafficType: ec2.FlowLogTrafficType.ALL,
        });
    }
    /**
     * Create a database subnet group from isolated subnets
     */
    createDatabaseSubnetGroup() {
        return new cdk.aws_rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
            description: 'Subnet group for RDS database',
            vpc: this.vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            },
        });
    }
    /**
     * Create an ElastiCache subnet group from private subnets
     */
    createCacheSubnetGroup() {
        return new cdk.aws_elasticache.CfnSubnetGroup(this, 'CacheSubnetGroup', {
            description: 'Subnet group for ElastiCache',
            subnetIds: this.privateSubnets.map(subnet => subnet.subnetId),
        });
    }
}
exports.VpcConstruct = VpcConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidnBjLWNvbnN0cnVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInZwYy1jb25zdHJ1Y3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHlEQUEyQztBQUMzQywyQ0FBdUM7QUFRdkMsTUFBYSxZQUFhLFNBQVEsc0JBQVM7SUFLekMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF3QjtRQUNoRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRXpDLDZDQUE2QztRQUM3QyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDN0MsTUFBTSxFQUFFLFNBQVMsQ0FBQyxNQUFNO1lBQ3hCLFdBQVcsRUFBRSxTQUFTLENBQUMsV0FBVztZQUNsQyxrQkFBa0IsRUFBRSxTQUFTLENBQUMsa0JBQWtCO1lBQ2hELGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxnQkFBZ0I7WUFDNUMscUJBQXFCLEVBQUUsU0FBUyxDQUFDLHFCQUFxQjtZQUV0RCw4QkFBOEI7WUFDOUIsbUJBQW1CLEVBQUU7Z0JBQ25CO29CQUNFLElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU07b0JBQ2pDLFFBQVEsRUFBRSxFQUFFO2lCQUNiO2dCQUNEO29CQUNFLElBQUksRUFBRSxTQUFTO29CQUNmLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLG1CQUFtQjtvQkFDOUMsUUFBUSxFQUFFLEVBQUU7aUJBQ2I7Z0JBQ0Q7b0JBQ0UsSUFBSSxFQUFFLFVBQVU7b0JBQ2hCLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLGdCQUFnQjtvQkFDM0MsUUFB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RyxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0I7YUFDNUM7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxzQkFBc0I7UUFDM0IsT0FBTyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUN0RSxXQUFXLEVBQUUsOEJBQThCO1lBQzNDLFNBQVMsRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7U0FDOUQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBdE1ELG9DQXNNQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCB7IFZwY0NvbmZpZyB9IGZyb20gJy4uL2NvbmZpZy9lbnZpcm9ubWVudC1jb25maWcnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBWcGNDb25zdHJ1Y3RQcm9wcyB7XHJcbiAgdnBjQ29uZmlnOiBWcGNDb25maWc7XHJcbiAgZW52aXJvbm1lbnQ6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFZwY0NvbnN0cnVjdCBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgcHVibGljIHJlYWRvbmx5IHZwYzogZWMyLlZwYztcclxuICBwdWJsaWMgcmVhZG9ubHkgcHJpdmF0ZVN1Ym5ldHM6IGVjMi5JU3VibmV0W107XHJcbiAgcHVibGljIHJlYWRvbmx5IHB1YmxpY1N1Ym5ldHM6IGVjMi5JU3VibmV0W107XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBWcGNDb25zdHJ1Y3RQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICBjb25zdCB7IHZwY0NvbmZpZywgZW52aXJvbm1lbnQgfSA9IHByb3BzO1xyXG5cclxuICAgIC8vIENyZWF0ZSBWUEMgd2l0aCBwdWJsaWMgYW5kIHByaXZhdGUgc3VibmV0c1xyXG4gICAgdGhpcy52cGMgPSBuZXcgZWMyLlZwYyh0aGlzLCAnUmVjcnVpdG1lbnRWcGMnLCB7XHJcbiAgICAgIG1heEF6czogdnBjQ29uZmlnLm1heEF6cyxcclxuICAgICAgbmF0R2F0ZXdheXM6IHZwY0NvbmZpZy5uYXRHYXRld2F5cyxcclxuICAgICAgZW5hYmxlRG5zSG9zdG5hbWVzOiB2cGNDb25maWcuZW5hYmxlRG5zSG9zdG5hbWVzLFxyXG4gICAgICBlbmFibGVEbnNTdXBwb3J0OiB2cGNDb25maWcuZW5hYmxlRG5zU3VwcG9ydCxcclxuICAgICAgY3JlYXRlSW50ZXJuZXRHYXRld2F5OiB2cGNDb25maWcuY3JlYXRlSW50ZXJuZXRHYXRld2F5LFxyXG4gICAgICBcclxuICAgICAgLy8gRGVmaW5lIHN1Ym5ldCBjb25maWd1cmF0aW9uXHJcbiAgICAgIHN1Ym5ldENvbmZpZ3VyYXRpb246IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBuYW1lOiAnUHVibGljJyxcclxuICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBVQkxJQyxcclxuICAgICAgICAgIGNpZHJNYXNrOiAyNCxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIG5hbWU6ICdQcml2YXRlJyxcclxuICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MsXHJcbiAgICAgICAgICBjaWRyTWFzazogMjQsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBuYW1lOiAnRGF0YWJhc2UnLFxyXG4gICAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9JU09MQVRFRCxcclxuICAgICAgICAgIGNpZHJNYXNrOiAyNCxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG5cclxuICAgICAgLy8gVXNlIHNpbmdsZSBBWiBmb3IgY29zdCBvcHRpbWl6YXRpb24gaW4gZGV2XHJcbiAgICAgIGNpZHI6ICcxMC4wLjAuMC8xNicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTdG9yZSBzdWJuZXQgcmVmZXJlbmNlcyBmb3IgZWFzeSBhY2Nlc3NcclxuICAgIHRoaXMucHVibGljU3VibmV0cyA9IHRoaXMudnBjLnB1YmxpY1N1Ym5ldHM7XHJcbiAgICB0aGlzLnByaXZhdGVTdWJuZXRzID0gdGhpcy52cGMucHJpdmF0ZVN1Ym5ldHM7XHJcblxyXG4gICAgLy8gQWRkIFZQQyBlbmRwb2ludHMgZm9yIGNvc3Qgb3B0aW1pemF0aW9uIChyZWR1Y2VzIE5BVCBnYXRld2F5IHVzYWdlKVxyXG4gICAgdGhpcy5hZGRWcGNFbmRwb2ludHMoKTtcclxuXHJcbiAgICAvLyBUYWcgYWxsIHN1Ym5ldHMgYXBwcm9wcmlhdGVseVxyXG4gICAgdGhpcy50YWdTdWJuZXRzKGVudmlyb25tZW50KTtcclxuXHJcbiAgICAvLyBBZGQgVlBDIEZsb3cgTG9ncyBmb3IgbW9uaXRvcmluZyAob3B0aW9uYWwgYmFzZWQgb24gZW52aXJvbm1lbnQpXHJcbiAgICBpZiAoZW52aXJvbm1lbnQgIT09ICdkZXYnKSB7XHJcbiAgICAgIHRoaXMuYWRkVnBjRmxvd0xvZ3MoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgYWRkVnBjRW5kcG9pbnRzKCk6IHZvaWQge1xyXG4gICAgLy8gQWRkIFZQQyBlbmRwb2ludHMgZm9yIEFXUyBzZXJ2aWNlcyB0byByZWR1Y2UgTkFUIGdhdGV3YXkgY29zdHNcclxuICAgIFxyXG4gICAgLy8gUzMgR2F0ZXdheSBlbmRwb2ludCAobm8gYWRkaXRpb25hbCBjb3N0KVxyXG4gICAgdGhpcy52cGMuYWRkR2F0ZXdheUVuZHBvaW50KCdTM0VuZHBvaW50Jywge1xyXG4gICAgICBzZXJ2aWNlOiBlYzIuR2F0ZXdheVZwY0VuZHBvaW50QXdzU2VydmljZS5TMyxcclxuICAgICAgc3VibmV0czogW1xyXG4gICAgICAgIHsgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyB9LFxyXG4gICAgICAgIHsgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9JU09MQVRFRCB9XHJcbiAgICAgIF0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBEeW5hbW9EQiBHYXRld2F5IGVuZHBvaW50IChubyBhZGRpdGlvbmFsIGNvc3QpXHJcbiAgICB0aGlzLnZwYy5hZGRHYXRld2F5RW5kcG9pbnQoJ0R5bmFtb0RCRW5kcG9pbnQnLCB7XHJcbiAgICAgIHNlcnZpY2U6IGVjMi5HYXRld2F5VnBjRW5kcG9pbnRBd3NTZXJ2aWNlLkRZTkFNT0RCLFxyXG4gICAgICBzdWJuZXRzOiBbXHJcbiAgICAgICAgeyBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTIH0sXHJcbiAgICAgICAgeyBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX0lTT0xBVEVEIH1cclxuICAgICAgXSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEVDUiBBUEkgZW5kcG9pbnQgZm9yIERvY2tlciBpbWFnZSBwdWxsc1xyXG4gICAgdGhpcy52cGMuYWRkSW50ZXJmYWNlRW5kcG9pbnQoJ0VDUkFwaUVuZHBvaW50Jywge1xyXG4gICAgICBzZXJ2aWNlOiBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnRBd3NTZXJ2aWNlLkVDUixcclxuICAgICAgc3VibmV0czogeyBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBFQ1IgRG9ja2VyIGVuZHBvaW50IGZvciBEb2NrZXIgaW1hZ2UgbGF5ZXJzXHJcbiAgICB0aGlzLnZwYy5hZGRJbnRlcmZhY2VFbmRwb2ludCgnRUNSRG9ja2VyRW5kcG9pbnQnLCB7XHJcbiAgICAgIHNlcnZpY2U6IGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuRUNSX0RPQ0tFUixcclxuICAgICAgc3VibmV0czogeyBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDbG91ZFdhdGNoIExvZ3MgZW5kcG9pbnRcclxuICAgIHRoaXMudnBjLmFkZEludGVyZmFjZUVuZHBvaW50KCdDbG91ZFdhdGNoTG9nc0VuZHBvaW50Jywge1xyXG4gICAgICBzZXJ2aWNlOiBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnRBd3NTZXJ2aWNlLkNMT1VEV0FUQ0hfTE9HUyxcclxuICAgICAgc3VibmV0czogeyBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTZWNyZXRzIE1hbmFnZXIgZW5kcG9pbnRcclxuICAgIHRoaXMudnBjLmFkZEludGVyZmFjZUVuZHBvaW50KCdTZWNyZXRzTWFuYWdlckVuZHBvaW50Jywge1xyXG4gICAgICBzZXJ2aWNlOiBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnRBd3NTZXJ2aWNlLlNFQ1JFVFNfTUFOQUdFUixcclxuICAgICAgc3VibmV0czogeyBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTIH0sXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgdGFnU3VibmV0cyhlbnZpcm9ubWVudDogc3RyaW5nKTogdm9pZCB7XHJcbiAgICBjb25zdCBjb21tb25UYWdzID0ge1xyXG4gICAgICBFbnZpcm9ubWVudDogZW52aXJvbm1lbnQsXHJcbiAgICAgIFByb2plY3Q6ICdSZWNydWl0bWVudFdlYnNpdGUnLFxyXG4gICAgICBNYW5hZ2VkQnk6ICdDREsnLFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBUYWcgcHVibGljIHN1Ym5ldHNcclxuICAgIHRoaXMucHVibGljU3VibmV0cy5mb3JFYWNoKChzdWJuZXQsIGluZGV4KSA9PiB7XHJcbiAgICAgIGNkay5UYWdzLm9mKHN1Ym5ldCkuYWRkKCdOYW1lJywgYHJlY3J1aXRtZW50LXB1YmxpYy0ke2luZGV4ICsgMX1gKTtcclxuICAgICAgY2RrLlRhZ3Mub2Yoc3VibmV0KS5hZGQoJ1R5cGUnLCAnUHVibGljJyk7XHJcbiAgICAgIE9iamVjdC5lbnRyaWVzKGNvbW1vblRhZ3MpLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xyXG4gICAgICAgIGNkay5UYWdzLm9mKHN1Ym5ldCkuYWRkKGtleSwgdmFsdWUpO1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRhZyBwcml2YXRlIHN1Ym5ldHNcclxuICAgIHRoaXMucHJpdmF0ZVN1Ym5ldHMuZm9yRWFjaCgoc3VibmV0LCBpbmRleCkgPT4ge1xyXG4gICAgICBjZGsuVGFncy5vZihzdWJuZXQpLmFkZCgnTmFtZScsIGByZWNydWl0bWVudC1wcml2YXRlLSR7aW5kZXggKyAxfWApO1xyXG4gICAgICBjZGsuVGFncy5vZihzdWJuZXQpLmFkZCgnVHlwZScsICdQcml2YXRlJyk7XHJcbiAgICAgIE9iamVjdC5lbnRyaWVzKGNvbW1vblRhZ3MpLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xyXG4gICAgICAgIGNkay5UYWdzLm9mKHN1Ym5ldCkuYWRkKGtleSwgdmFsdWUpO1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRhZyBkYXRhYmFzZSBzdWJuZXRzXHJcbiAgICB0aGlzLnZwYy5pc29sYXRlZFN1Ym5ldHMuZm9yRWFjaCgoc3VibmV0LCBpbmRleCkgPT4ge1xyXG4gICAgICBjZGsuVGFncy5vZihzdWJuZXQpLmFkZCgnTmFtZScsIGByZWNydWl0bWVudC1kYXRhYmFzZS0ke2luZGV4ICsgMX1gKTtcclxuICAgICAgY2RrLlRhZ3Mub2Yoc3VibmV0KS5hZGQoJ1R5cGUnLCAnRGF0YWJhc2UnKTtcclxuICAgICAgT2JqZWN0LmVudHJpZXMoY29tbW9uVGFncykuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XHJcbiAgICAgICAgY2RrLlRhZ3Mub2Yoc3VibmV0KS5hZGQoa2V5LCB2YWx1ZSk7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFkZFZwY0Zsb3dMb2dzKCk6IHZvaWQge1xyXG4gICAgLy8gQ3JlYXRlIENsb3VkV2F0Y2ggTG9nIEdyb3VwIGZvciBWUEMgRmxvdyBMb2dzXHJcbiAgICBjb25zdCBmbG93TG9nR3JvdXAgPSBuZXcgY2RrLmF3c19sb2dzLkxvZ0dyb3VwKHRoaXMsICdWcGNGbG93TG9nR3JvdXAnLCB7XHJcbiAgICAgIGxvZ0dyb3VwTmFtZTogYC9hd3MvdnBjL2Zsb3dsb2dzLyR7dGhpcy52cGMudnBjSWR9YCxcclxuICAgICAgcmV0ZW50aW9uOiBjZGsuYXdzX2xvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBJQU0gcm9sZSBmb3IgVlBDIEZsb3cgTG9nc1xyXG4gICAgY29uc3QgZmxvd0xvZ1JvbGUgPSBuZXcgY2RrLmF3c19pYW0uUm9sZSh0aGlzLCAnVnBjRmxvd0xvZ1JvbGUnLCB7XHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGNkay5hd3NfaWFtLlNlcnZpY2VQcmluY2lwYWwoJ3ZwYy1mbG93LWxvZ3MuYW1hem9uYXdzLmNvbScpLFxyXG4gICAgICBpbmxpbmVQb2xpY2llczoge1xyXG4gICAgICAgIENsb3VkV2F0Y2hMb2dQb2xpY3k6IG5ldyBjZGsuYXdzX2lhbS5Qb2xpY3lEb2N1bWVudCh7XHJcbiAgICAgICAgICBzdGF0ZW1lbnRzOiBbXHJcbiAgICAgICAgICAgIG5ldyBjZGsuYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICAgIGVmZmVjdDogY2RrLmF3c19pYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgICdsb2dzOkNyZWF0ZUxvZ0dyb3VwJyxcclxuICAgICAgICAgICAgICAgICdsb2dzOkNyZWF0ZUxvZ1N0cmVhbScsXHJcbiAgICAgICAgICAgICAgICAnbG9nczpQdXRMb2dFdmVudHMnLFxyXG4gICAgICAgICAgICAgICAgJ2xvZ3M6RGVzY3JpYmVMb2dHcm91cHMnLFxyXG4gICAgICAgICAgICAgICAgJ2xvZ3M6RGVzY3JpYmVMb2dTdHJlYW1zJyxcclxuICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgIHJlc291cmNlczogW2Zsb3dMb2dHcm91cC5sb2dHcm91cEFybl0sXHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICB9KSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBWUEMgRmxvdyBMb2dzXHJcbiAgICBuZXcgZWMyLkZsb3dMb2codGhpcywgJ1ZwY0Zsb3dMb2cnLCB7XHJcbiAgICAgIHJlc291cmNlVHlwZTogZWMyLkZsb3dMb2dSZXNvdXJjZVR5cGUuZnJvbVZwYyh0aGlzLnZwYyksXHJcbiAgICAgIGRlc3RpbmF0aW9uOiBlYzIuRmxvd0xvZ0Rlc3RpbmF0aW9uLnRvQ2xvdWRXYXRjaExvZ3MoZmxvd0xvZ0dyb3VwLCBmbG93TG9nUm9sZSksXHJcbiAgICAgIHRyYWZmaWNUeXBlOiBlYzIuRmxvd0xvZ1RyYWZmaWNUeXBlLkFMTCxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIGEgZGF0YWJhc2Ugc3VibmV0IGdyb3VwIGZyb20gaXNvbGF0ZWQgc3VibmV0c1xyXG4gICAqL1xyXG4gIHB1YmxpYyBjcmVhdGVEYXRhYmFzZVN1Ym5ldEdyb3VwKCk6IGNkay5hd3NfcmRzLlN1Ym5ldEdyb3VwIHtcclxuICAgIHJldHVybiBuZXcgY2RrLmF3c19yZHMuU3VibmV0R3JvdXAodGhpcywgJ0RhdGFiYXNlU3VibmV0R3JvdXAnLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU3VibmV0IGdyb3VwIGZvciBSRFMgZGF0YWJhc2UnLFxyXG4gICAgICB2cGM6IHRoaXMudnBjLFxyXG4gICAgICB2cGNTdWJuZXRzOiB7XHJcbiAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9JU09MQVRFRCxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIGFuIEVsYXN0aUNhY2hlIHN1Ym5ldCBncm91cCBmcm9tIHByaXZhdGUgc3VibmV0c1xyXG4gICAqL1xyXG4gIHB1YmxpYyBjcmVhdGVDYWNoZVN1Ym5ldEdyb3VwKCk6IGNkay5hd3NfZWxhc3RpY2FjaGUuQ2ZuU3VibmV0R3JvdXAge1xyXG4gICAgcmV0dXJuIG5ldyBjZGsuYXdzX2VsYXN0aWNhY2hlLkNmblN1Ym5ldEdyb3VwKHRoaXMsICdDYWNoZVN1Ym5ldEdyb3VwJywge1xyXG4gICAgICBkZXNjcmlwdGlvbjogJ1N1Ym5ldCBncm91cCBmb3IgRWxhc3RpQ2FjaGUnLFxyXG4gICAgICBzdWJuZXRJZHM6IHRoaXMucHJpdmF0ZVN1Ym5ldHMubWFwKHN1Ym5ldCA9PiBzdWJuZXQuc3VibmV0SWQpLFxyXG4gICAgfSk7XHJcbiAgfVxyXG59Il19