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
exports.NetworkConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const elbv2 = __importStar(require("aws-cdk-lib/aws-elasticloadbalancingv2"));
const ecs = __importStar(require("aws-cdk-lib/aws-ecs"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const constructs_1 = require("constructs");
class NetworkConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // Create VPC
        this.vpc = new ec2.Vpc(this, 'Vpc', {
            cidr: props.config.vpcCidr,
            maxAzs: props.config.maxAzs,
            enableDnsHostnames: props.config.enableDnsHostnames,
            enableDnsSupport: props.config.enableDnsSupport,
            natGateways: props.config.enableNatGateway ? props.config.natGateways : 0,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: props.config.publicSubnetNames[0],
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: props.config.privateSubnetNames[0],
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
                {
                    cidrMask: 24,
                    name: props.config.isolatedSubnetNames[0],
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                },
            ],
        });
        // Store subnet references
        this.publicSubnets = this.vpc.publicSubnets;
        this.privateSubnets = this.vpc.privateSubnets;
        this.isolatedSubnets = this.vpc.isolatedSubnets;
        // Create VPC Flow Logs if enabled
        if (props.enableVpcFlowLogs) {
            const flowLogsRole = new cdk.aws_iam.Role(this, 'FlowLogsRole', {
                assumedBy: new cdk.aws_iam.ServicePrincipal('vpc-flow-logs.amazonaws.com'),
                managedPolicies: [
                    cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/VPCFlowLogsDeliveryRolePolicy'),
                ],
            });
            const flowLogsGroup = new logs.LogGroup(this, 'VpcFlowLogsGroup', {
                logGroupName: `/aws/vpc/flowlogs/${props.environmentName}`,
                retention: logs.RetentionDays.ONE_MONTH,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
            });
            new ec2.FlowLog(this, 'VpcFlowLogs', {
                resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc),
                destination: ec2.FlowLogDestination.toCloudWatchLogs(flowLogsGroup, flowLogsRole),
                trafficType: ec2.FlowLogTrafficType.ALL,
            });
        }
        // Create Security Groups
        this.backendSecurityGroup = new ec2.SecurityGroup(this, 'BackendSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for backend services',
            allowAllOutbound: true,
        });
        this.databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for database',
            allowAllOutbound: false,
        });
        this.redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for Redis cache',
            allowAllOutbound: false,
        });
        // Configure security group rules
        this.setupSecurityGroupRules();
        // Create ECS Cluster
        this.cluster = new ecs.Cluster(this, 'Cluster', {
            vpc: this.vpc,
            clusterName: `recruitment-${props.environmentName}-cluster`,
            containerInsights: true,
            enableFargateCapacityProviders: true,
        });
        // Create Application Load Balancer
        this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
            vpc: this.vpc,
            internetFacing: true,
            vpcSubnets: {
                subnets: this.publicSubnets,
            },
            securityGroup: this.createLoadBalancerSecurityGroup(),
            loadBalancerName: `recruitment-${props.environmentName}-alb`,
        });
        // Add tags
        this.addTags(props.environmentName);
    }
    setupSecurityGroupRules() {
        // Allow ALB to access backend
        this.backendSecurityGroup.addIngressRule(this.loadBalancer.connections.securityGroups[0], ec2.Port.tcp(3000), 'Allow ALB to access backend');
        // Allow backend to access database
        this.databaseSecurityGroup.addIngressRule(this.backendSecurityGroup, ec2.Port.tcp(5432), 'Allow backend to access PostgreSQL');
        // Allow backend to access Redis
        this.redisSecurityGroup.addIngressRule(this.backendSecurityGroup, ec2.Port.tcp(6379), 'Allow backend to access Redis');
        // Allow health check connections
        this.backendSecurityGroup.addIngressRule(this.backendSecurityGroup, ec2.Port.tcp(3000), 'Allow health checks');
    }
    createLoadBalancerSecurityGroup() {
        const albSecurityGroup = new ec2.SecurityGroup(this, 'LoadBalancerSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for Application Load Balancer',
            allowAllOutbound: true,
        });
        // Allow HTTP and HTTPS traffic
        albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic');
        albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic');
        return albSecurityGroup;
    }
    addTags(environmentName) {
        const tags = {
            Environment: environmentName,
            Component: 'Network',
            ManagedBy: 'CDK',
        };
        Object.entries(tags).forEach(([key, value]) => {
            cdk.Tags.of(this.vpc).add(key, value);
            cdk.Tags.of(this.cluster).add(key, value);
            cdk.Tags.of(this.loadBalancer).add(key, value);
            cdk.Tags.of(this.backendSecurityGroup).add(key, value);
            cdk.Tags.of(this.databaseSecurityGroup).add(key, value);
            cdk.Tags.of(this.redisSecurityGroup).add(key, value);
        });
    }
    addSecurityGroupRule(securityGroup, peer, port, description) {
        securityGroup.addIngressRule(peer, port, description);
    }
    createCustomSecurityGroup(name, description) {
        return new ec2.SecurityGroup(this, name, {
            vpc: this.vpc,
            description,
            allowAllOutbound: true,
        });
    }
}
exports.NetworkConstruct = NetworkConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV0d29yay1jb25zdHJ1Y3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJuZXR3b3JrLWNvbnN0cnVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMseURBQTJDO0FBQzNDLDhFQUFnRTtBQUNoRSx5REFBMkM7QUFDM0MsMkRBQTZDO0FBQzdDLDJDQUF1QztBQVN2QyxNQUFhLGdCQUFpQixTQUFRLHNCQUFTO0lBVzdDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBNEI7UUFDcEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixhQUFhO1FBQ2IsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRTtZQUNsQyxJQUFJLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPO1lBQzFCLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU07WUFDM0Isa0JBQWtCLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0I7WUFDbkQsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0I7WUFDL0MsV0FBVyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pFLG1CQUFtQixFQUFFO2dCQUNuQjtvQkFDRSxRQUFRLEVBQUUsRUFBRTtvQkFDWixJQUFJLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7b0JBQ3ZDLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU07aUJBQ2xDO2dCQUNEO29CQUNFLFFBQVEsRUFBRSxFQUFFO29CQUNaLElBQUksRUFBRSxLQUFLLENBQUMs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QUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUF0TUQsNENBc01DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xyXG5pbXBvcnQgKiBhcyBlbGJ2MiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWxhc3RpY2xvYWRiYWxhbmNpbmd2Mic7XHJcbmltcG9ydCAqIGFzIGVjcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWNzJztcclxuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5pbXBvcnQgeyBOZXR3b3JrQ29uZmlnIH0gZnJvbSAnLi4vY29uZmlnL3R5cGVzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTmV0d29ya0NvbnN0cnVjdFByb3BzIHtcclxuICBjb25maWc6IE5ldHdvcmtDb25maWc7XHJcbiAgZW52aXJvbm1lbnROYW1lOiBzdHJpbmc7XHJcbiAgZW5hYmxlVnBjRmxvd0xvZ3M/OiBib29sZWFuO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTmV0d29ya0NvbnN0cnVjdCBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgcHVibGljIHJlYWRvbmx5IHZwYzogZWMyLlZwYztcclxuICBwdWJsaWMgcmVhZG9ubHkgY2x1c3RlcjogZWNzLkNsdXN0ZXI7XHJcbiAgcHVibGljIHJlYWRvbmx5IGxvYWRCYWxhbmNlcjogZWxidjIuQXBwbGljYXRpb25Mb2FkQmFsYW5jZXI7XHJcbiAgcHVibGljIHJlYWRvbmx5IGJhY2tlbmRTZWN1cml0eUdyb3VwOiBlYzIuU2VjdXJpdHlHcm91cDtcclxuICBwdWJsaWMgcmVhZG9ubHkgZGF0YWJhc2VTZWN1cml0eUdyb3VwOiBlYzIuU2VjdXJpdHlHcm91cDtcclxuICBwdWJsaWMgcmVhZG9ubHkgcmVkaXNTZWN1cml0eUdyb3VwOiBlYzIuU2VjdXJpdHlHcm91cDtcclxuICBwdWJsaWMgcmVhZG9ubHkgcHVibGljU3VibmV0czogZWMyLklTdWJuZXRbXTtcclxuICBwdWJsaWMgcmVhZG9ubHkgcHJpdmF0ZVN1Ym5ldHM6IGVjMi5JU3VibmV0W107XHJcbiAgcHVibGljIHJlYWRvbmx5IGlzb2xhdGVkU3VibmV0czogZWMyLklTdWJuZXRbXTtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IE5ldHdvcmtDb25zdHJ1Y3RQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgVlBDXHJcbiAgICB0aGlzLnZwYyA9IG5ldyBlYzIuVnBjKHRoaXMsICdWcGMnLCB7XHJcbiAgICAgIGNpZHI6IHByb3BzLmNvbmZpZy52cGNDaWRyLFxyXG4gICAgICBtYXhBenM6IHByb3BzLmNvbmZpZy5tYXhBenMsXHJcbiAgICAgIGVuYWJsZURuc0hvc3RuYW1lczogcHJvcHMuY29uZmlnLmVuYWJsZURuc0hvc3RuYW1lcyxcclxuICAgICAgZW5hYmxlRG5zU3VwcG9ydDogcHJvcHMuY29uZmlnLmVuYWJsZURuc1N1cHBvcnQsXHJcbiAgICAgIG5hdEdhdGV3YXlzOiBwcm9wcy5jb25maWcuZW5hYmxlTmF0R2F0ZXdheSA/IHByb3BzLmNvbmZpZy5uYXRHYXRld2F5cyA6IDAsXHJcbiAgICAgIHN1Ym5ldENvbmZpZ3VyYXRpb246IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBjaWRyTWFzazogMjQsXHJcbiAgICAgICAgICBuYW1lOiBwcm9wcy5jb25maWcucHVibGljU3VibmV0TmFtZXNbMF0sXHJcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QVUJMSUMsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBjaWRyTWFzazogMjQsXHJcbiAgICAgICAgICBuYW1lOiBwcm9wcy5jb25maWcucHJpdmF0ZVN1Ym5ldE5hbWVzWzBdLFxyXG4gICAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGNpZHJNYXNrOiAyNCxcclxuICAgICAgICAgIG5hbWU6IHByb3BzLmNvbmZpZy5pc29sYXRlZFN1Ym5ldE5hbWVzWzBdLFxyXG4gICAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9JU09MQVRFRCxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU3RvcmUgc3VibmV0IHJlZmVyZW5jZXNcclxuICAgIHRoaXMucHVibGljU3VibmV0cyA9IHRoaXMudnBjLnB1YmxpY1N1Ym5ldHM7XHJcbiAgICB0aGlzLnByaXZhdGVTdWJuZXRzID0gdGhpcy52cGMucHJpdmF0ZVN1Ym5ldHM7XHJcbiAgICB0aGlzLmlzb2xhdGVkU3VibmV0cyA9IHRoaXMudnBjLmlzb2xhdGVkU3VibmV0cztcclxuXHJcbiAgICAvLyBDcmVhdGUgVlBDIEZsb3cgTG9ncyBpZiBlbmFibGVkXHJcbiAgICBpZiAocHJvcHMuZW5hYmxlVnBjRmxvd0xvZ3MpIHtcclxuICAgICAgY29uc3QgZmxvd0xvZ3NSb2xlID0gbmV3IGNkay5hd3NfaWFtLlJvbGUodGhpcywgJ0Zsb3dMb2dzUm9sZScsIHtcclxuICAgICAgICBhc3N1bWVkQnk6IG5ldyBjZGsuYXdzX2lhbS5TZXJ2aWNlUHJpbmNpcGFsKCd2cGMtZmxvdy1sb2dzLmFtYXpvbmF3cy5jb20nKSxcclxuICAgICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcclxuICAgICAgICAgIGNkay5hd3NfaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdzZXJ2aWNlLXJvbGUvVlBDRmxvd0xvZ3NEZWxpdmVyeVJvbGVQb2xpY3knKSxcclxuICAgICAgICBdLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGZsb3dMb2dzR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnVnBjRmxvd0xvZ3NHcm91cCcsIHtcclxuICAgICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL3ZwYy9mbG93bG9ncy8ke3Byb3BzLmVudmlyb25tZW50TmFtZX1gLFxyXG4gICAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9NT05USCxcclxuICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIG5ldyBlYzIuRmxvd0xvZyh0aGlzLCAnVnBjRmxvd0xvZ3MnLCB7XHJcbiAgICAgICAgcmVzb3VyY2VUeXBlOiBlYzIuRmxvd0xvZ1Jlc291cmNlVHlwZS5mcm9tVnBjKHRoaXMudnBjKSxcclxuICAgICAgICBkZXN0aW5hdGlvbjogZWMyLkZsb3dMb2dEZXN0aW5hdGlvbi50b0Nsb3VkV2F0Y2hMb2dzKGZsb3dMb2dzR3JvdXAsIGZsb3dMb2dzUm9sZSksXHJcbiAgICAgICAgdHJhZmZpY1R5cGU6IGVjMi5GbG93TG9nVHJhZmZpY1R5cGUuQUxMLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDcmVhdGUgU2VjdXJpdHkgR3JvdXBzXHJcbiAgICB0aGlzLmJhY2tlbmRTZWN1cml0eUdyb3VwID0gbmV3IGVjMi5TZWN1cml0eUdyb3VwKHRoaXMsICdCYWNrZW5kU2VjdXJpdHlHcm91cCcsIHtcclxuICAgICAgdnBjOiB0aGlzLnZwYyxcclxuICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgYmFja2VuZCBzZXJ2aWNlcycsXHJcbiAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IHRydWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmRhdGFiYXNlU2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnRGF0YWJhc2VTZWN1cml0eUdyb3VwJywge1xyXG4gICAgICB2cGM6IHRoaXMudnBjLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBkYXRhYmFzZScsXHJcbiAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IGZhbHNlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5yZWRpc1NlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ1JlZGlzU2VjdXJpdHlHcm91cCcsIHtcclxuICAgICAgdnBjOiB0aGlzLnZwYyxcclxuICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgUmVkaXMgY2FjaGUnLFxyXG4gICAgICBhbGxvd0FsbE91dGJvdW5kOiBmYWxzZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENvbmZpZ3VyZSBzZWN1cml0eSBncm91cCBydWxlc1xyXG4gICAgdGhpcy5zZXR1cFNlY3VyaXR5R3JvdXBSdWxlcygpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBFQ1MgQ2x1c3RlclxyXG4gICAgdGhpcy5jbHVzdGVyID0gbmV3IGVjcy5DbHVzdGVyKHRoaXMsICdDbHVzdGVyJywge1xyXG4gICAgICB2cGM6IHRoaXMudnBjLFxyXG4gICAgICBjbHVzdGVyTmFtZTogYHJlY3J1aXRtZW50LSR7cHJvcHMuZW52aXJvbm1lbnROYW1lfS1jbHVzdGVyYCxcclxuICAgICAgY29udGFpbmVySW5zaWdodHM6IHRydWUsXHJcbiAgICAgIGVuYWJsZUZhcmdhdGVDYXBhY2l0eVByb3ZpZGVyczogdHJ1ZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBBcHBsaWNhdGlvbiBMb2FkIEJhbGFuY2VyXHJcbiAgICB0aGlzLmxvYWRCYWxhbmNlciA9IG5ldyBlbGJ2Mi5BcHBsaWNhdGlvbkxvYWRCYWxhbmNlcih0aGlzLCAnTG9hZEJhbGFuY2VyJywge1xyXG4gICAgICB2cGM6IHRoaXMudnBjLFxyXG4gICAgICBpbnRlcm5ldEZhY2luZzogdHJ1ZSxcclxuICAgICAgdnBjU3VibmV0czoge1xyXG4gICAgICAgIHN1Ym5ldHM6IHRoaXMucHVibGljU3VibmV0cyxcclxuICAgICAgfSxcclxuICAgICAgc2VjdXJpdHlHcm91cDogdGhpcy5jcmVhdGVMb2FkQmFsYW5jZXJTZWN1cml0eUdyb3VwKCksXHJcbiAgICAgIGxvYWRCYWxhbmNlck5hbWU6IGByZWNydWl0bWVudC0ke3Byb3BzLmVudmlyb25tZW50TmFtZX0tYWxiYCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCB0YWdzXHJcbiAgICB0aGlzLmFkZFRhZ3MocHJvcHMuZW52aXJvbm1lbnROYW1lKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgc2V0dXBTZWN1cml0eUdyb3VwUnVsZXMoKTogdm9pZCB7XHJcbiAgICAvLyBBbGxvdyBBTEIgdG8gYWNjZXNzIGJhY2tlbmRcclxuICAgIHRoaXMuYmFja2VuZFNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXHJcbiAgICAgIHRoaXMubG9hZEJhbGFuY2VyLmNvbm5lY3Rpb25zLnNlY3VyaXR5R3JvdXBzWzBdLFxyXG4gICAgICBlYzIuUG9ydC50Y3AoMzAwMCksXHJcbiAgICAgICdBbGxvdyBBTEIgdG8gYWNjZXNzIGJhY2tlbmQnXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEFsbG93IGJhY2tlbmQgdG8gYWNjZXNzIGRhdGFiYXNlXHJcbiAgICB0aGlzLmRhdGFiYXNlU2VjdXJpdHlHcm91cC5hZGRJbmdyZXNzUnVsZShcclxuICAgICAgdGhpcy5iYWNrZW5kU2VjdXJpdHlHcm91cCxcclxuICAgICAgZWMyLlBvcnQudGNwKDU0MzIpLFxyXG4gICAgICAnQWxsb3cgYmFja2VuZCB0byBhY2Nlc3MgUG9zdGdyZVNRTCdcclxuICAgICk7XHJcblxyXG4gICAgLy8gQWxsb3cgYmFja2VuZCB0byBhY2Nlc3MgUmVkaXNcclxuICAgIHRoaXMucmVkaXNTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxyXG4gICAgICB0aGlzLmJhY2tlbmRTZWN1cml0eUdyb3VwLFxyXG4gICAgICBlYzIuUG9ydC50Y3AoNjM3OSksXHJcbiAgICAgICdBbGxvdyBiYWNrZW5kIHRvIGFjY2VzcyBSZWRpcydcclxuICAgICk7XHJcblxyXG4gICAgLy8gQWxsb3cgaGVhbHRoIGNoZWNrIGNvbm5lY3Rpb25zXHJcbiAgICB0aGlzLmJhY2tlbmRTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxyXG4gICAgICB0aGlzLmJhY2tlbmRTZWN1cml0eUdyb3VwLFxyXG4gICAgICBlYzIuUG9ydC50Y3AoMzAwMCksXHJcbiAgICAgICdBbGxvdyBoZWFsdGggY2hlY2tzJ1xyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlTG9hZEJhbGFuY2VyU2VjdXJpdHlHcm91cCgpOiBlYzIuU2VjdXJpdHlHcm91cCB7XHJcbiAgICBjb25zdCBhbGJTZWN1cml0eUdyb3VwID0gbmV3IGVjMi5TZWN1cml0eUdyb3VwKHRoaXMsICdMb2FkQmFsYW5jZXJTZWN1cml0eUdyb3VwJywge1xyXG4gICAgICB2cGM6IHRoaXMudnBjLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBBcHBsaWNhdGlvbiBMb2FkIEJhbGFuY2VyJyxcclxuICAgICAgYWxsb3dBbGxPdXRib3VuZDogdHJ1ZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFsbG93IEhUVFAgYW5kIEhUVFBTIHRyYWZmaWNcclxuICAgIGFsYlNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXHJcbiAgICAgIGVjMi5QZWVyLmFueUlwdjQoKSxcclxuICAgICAgZWMyLlBvcnQudGNwKDgwKSxcclxuICAgICAgJ0FsbG93IEhUVFAgdHJhZmZpYydcclxuICAgICk7XHJcblxyXG4gICAgYWxiU2VjdXJpdHlHcm91cC5hZGRJbmdyZXNzUnVsZShcclxuICAgICAgZWMyLlBlZXIuYW55SXB2NCgpLFxyXG4gICAgICBlYzIuUG9ydC50Y3AoNDQzKSxcclxuICAgICAgJ0FsbG93IEhUVFBTIHRyYWZmaWMnXHJcbiAgICApO1xyXG5cclxuICAgIHJldHVybiBhbGJTZWN1cml0eUdyb3VwO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhZGRUYWdzKGVudmlyb25tZW50TmFtZTogc3RyaW5nKTogdm9pZCB7XHJcbiAgICBjb25zdCB0YWdzID0ge1xyXG4gICAgICBFbnZpcm9ubWVudDogZW52aXJvbm1lbnROYW1lLFxyXG4gICAgICBDb21wb25lbnQ6ICdOZXR3b3JrJyxcclxuICAgICAgTWFuYWdlZEJ5OiAnQ0RLJyxcclxuICAgIH07XHJcblxyXG4gICAgT2JqZWN0LmVudHJpZXModGFncykuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XHJcbiAgICAgIGNkay5UYWdzLm9mKHRoaXMudnBjKS5hZGQoa2V5LCB2YWx1ZSk7XHJcbiAgICAgIGNkay5UYWdzLm9mKHRoaXMuY2x1c3RlcikuYWRkKGtleSwgdmFsdWUpO1xyXG4gICAgICBjZGsuVGFncy5vZih0aGlzLmxvYWRCYWxhbmNlcikuYWRkKGtleSwgdmFsdWUpO1xyXG4gICAgICBjZGsuVGFncy5vZih0aGlzLmJhY2tlbmRTZWN1cml0eUdyb3VwKS5hZGQoa2V5LCB2YWx1ZSk7XHJcbiAgICAgIGNkay5UYWdzLm9mKHRoaXMuZGF0YWJhc2VTZWN1cml0eUdyb3VwKS5hZGQoa2V5LCB2YWx1ZSk7XHJcbiAgICAgIGNkay5UYWdzLm9mKHRoaXMucmVkaXNTZWN1cml0eUdyb3VwKS5hZGQoa2V5LCB2YWx1ZSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhZGRTZWN1cml0eUdyb3VwUnVsZShcclxuICAgIHNlY3VyaXR5R3JvdXA6IGVjMi5TZWN1cml0eUdyb3VwLFxyXG4gICAgcGVlcjogZWMyLklQZWVyLFxyXG4gICAgcG9ydDogZWMyLlBvcnQsXHJcbiAgICBkZXNjcmlwdGlvbjogc3RyaW5nXHJcbiAgKTogdm9pZCB7XHJcbiAgICBzZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKHBlZXIsIHBvcnQsIGRlc2NyaXB0aW9uKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBjcmVhdGVDdXN0b21TZWN1cml0eUdyb3VwKG5hbWU6IHN0cmluZywgZGVzY3JpcHRpb246IHN0cmluZyk6IGVjMi5TZWN1cml0eUdyb3VwIHtcclxuICAgIHJldHVybiBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgbmFtZSwge1xyXG4gICAgICB2cGM6IHRoaXMudnBjLFxyXG4gICAgICBkZXNjcmlwdGlvbixcclxuICAgICAgYWxsb3dBbGxPdXRib3VuZDogdHJ1ZSxcclxuICAgIH0pO1xyXG4gIH1cclxufSJdfQ==