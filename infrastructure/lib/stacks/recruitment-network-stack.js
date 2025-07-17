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
exports.RecruitmentNetworkStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const network_construct_1 = require("../constructs/network-construct");
class RecruitmentNetworkStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Create the network construct
        this.networkConstruct = new network_construct_1.NetworkConstruct(this, 'Network', {
            config: props.config.network,
            environmentName: props.config.environmentName,
            enableVpcFlowLogs: props.config.security.enableVpcFlowLogs,
        });
        // Export the network resources for use in other stacks
        this.vpc = this.networkConstruct.vpc;
        this.cluster = this.networkConstruct.cluster;
        this.loadBalancer = this.networkConstruct.loadBalancer;
        this.backendSecurityGroup = this.networkConstruct.backendSecurityGroup;
        this.databaseSecurityGroup = this.networkConstruct.databaseSecurityGroup;
        this.redisSecurityGroup = this.networkConstruct.redisSecurityGroup;
        // Create CloudFormation outputs
        new cdk.CfnOutput(this, 'VpcId', {
            value: this.vpc.vpcId,
            description: 'VPC ID',
            exportName: `${props.config.environmentName}-vpc-id`,
        });
        new cdk.CfnOutput(this, 'ClusterName', {
            value: this.cluster.clusterName,
            description: 'ECS Cluster Name',
            exportName: `${props.config.environmentName}-cluster-name`,
        });
        new cdk.CfnOutput(this, 'LoadBalancerDnsName', {
            value: this.loadBalancer.loadBalancerDnsName,
            description: 'Load Balancer DNS Name',
            exportName: `${props.config.environmentName}-alb-dns-name`,
        });
        new cdk.CfnOutput(this, 'LoadBalancerArn', {
            value: this.loadBalancer.loadBalancerArn,
            description: 'Load Balancer ARN',
            exportName: `${props.config.environmentName}-alb-arn`,
        });
        new cdk.CfnOutput(this, 'PrivateSubnetIds', {
            value: this.vpc.privateSubnets.map(subnet => subnet.subnetId).join(','),
            description: 'Private Subnet IDs',
            exportName: `${props.config.environmentName}-private-subnet-ids`,
        });
        new cdk.CfnOutput(this, 'PublicSubnetIds', {
            value: this.vpc.publicSubnets.map(subnet => subnet.subnetId).join(','),
            description: 'Public Subnet IDs',
            exportName: `${props.config.environmentName}-public-subnet-ids`,
        });
        new cdk.CfnOutput(this, 'IsolatedSubnetIds', {
            value: this.vpc.isolatedSubnets.map(subnet => subnet.subnetId).join(','),
            description: 'Isolated Subnet IDs',
            exportName: `${props.config.environmentName}-isolated-subnet-ids`,
        });
        new cdk.CfnOutput(this, 'BackendSecurityGroupId', {
            value: this.backendSecurityGroup.securityGroupId,
            description: 'Backend Security Group ID',
            exportName: `${props.config.environmentName}-backend-sg-id`,
        });
        new cdk.CfnOutput(this, 'DatabaseSecurityGroupId', {
            value: this.databaseSecurityGroup.securityGroupId,
            description: 'Database Security Group ID',
            exportName: `${props.config.environmentName}-database-sg-id`,
        });
        new cdk.CfnOutput(this, 'RedisSecurityGroupId', {
            value: this.redisSecurityGroup.securityGroupId,
            description: 'Redis Security Group ID',
            exportName: `${props.config.environmentName}-redis-sg-id`,
        });
        // Add additional security group rules based on environment
        this.addEnvironmentSpecificSecurityRules(props.config.environmentName);
    }
    addEnvironmentSpecificSecurityRules(environmentName) {
        // Development environment: Allow SSH access from anywhere (for debugging)
        if (environmentName === 'dev') {
            this.backendSecurityGroup.addIngressRule(cdk.aws_ec2.Peer.anyIpv4(), cdk.aws_ec2.Port.tcp(22), 'SSH access for development debugging');
        }
        // Production environment: More restrictive rules
        if (environmentName === 'prod') {
            // Allow only specific IP ranges or VPN access
            // This would be configured based on your organization's requirements
            // Example: Allow access from office IP range
            // this.backendSecurityGroup.addIngressRule(
            //   cdk.aws_ec2.Peer.ipv4('10.0.0.0/8'),
            //   cdk.aws_ec2.Port.tcp(22),
            //   'SSH access from office network'
            // );
        }
    }
}
exports.RecruitmentNetworkStack = RecruitmentNetworkStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjcnVpdG1lbnQtbmV0d29yay1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJlY3J1aXRtZW50LW5ldHdvcmstc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBRW5DLHVFQUFtRTtBQUduRSxNQUFhLHVCQUF3QixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBU3BELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBd0I7UUFDaEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsK0JBQStCO1FBQy9CLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLG9DQUFnQixDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDNUQsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTztZQUM1QixlQUFlLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxlQUFlO1lBQzdDLGlCQUFpQixFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGlCQUFpQjtTQUMzRCxDQUFDLENBQUM7UUFFSCx1REFBdUQ7UUFDdkQsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQztRQUM3QyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUM7UUFDdkQsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQztRQUN2RSxJQUFJLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixDQUFDO1FBQ3pFLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMs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IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCB7IE5ldHdvcmtDb25zdHJ1Y3QgfSBmcm9tICcuLi9jb25zdHJ1Y3RzL25ldHdvcmstY29uc3RydWN0JztcclxuaW1wb3J0IHsgTmV0d29ya1N0YWNrUHJvcHMgfSBmcm9tICcuLi9jb25maWcvdHlwZXMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFJlY3J1aXRtZW50TmV0d29ya1N0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcclxuICBwdWJsaWMgcmVhZG9ubHkgdnBjOiBjZGsuYXdzX2VjMi5WcGM7XHJcbiAgcHVibGljIHJlYWRvbmx5IGNsdXN0ZXI6IGNkay5hd3NfZWNzLkNsdXN0ZXI7XHJcbiAgcHVibGljIHJlYWRvbmx5IGxvYWRCYWxhbmNlcjogY2RrLmF3c19lbGFzdGljbG9hZGJhbGFuY2luZ3YyLkFwcGxpY2F0aW9uTG9hZEJhbGFuY2VyO1xyXG4gIHB1YmxpYyByZWFkb25seSBiYWNrZW5kU2VjdXJpdHlHcm91cDogY2RrLmF3c19lYzIuU2VjdXJpdHlHcm91cDtcclxuICBwdWJsaWMgcmVhZG9ubHkgZGF0YWJhc2VTZWN1cml0eUdyb3VwOiBjZGsuYXdzX2VjMi5TZWN1cml0eUdyb3VwO1xyXG4gIHB1YmxpYyByZWFkb25seSByZWRpc1NlY3VyaXR5R3JvdXA6IGNkay5hd3NfZWMyLlNlY3VyaXR5R3JvdXA7XHJcbiAgcHVibGljIHJlYWRvbmx5IG5ldHdvcmtDb25zdHJ1Y3Q6IE5ldHdvcmtDb25zdHJ1Y3Q7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBOZXR3b3JrU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIHRoZSBuZXR3b3JrIGNvbnN0cnVjdFxyXG4gICAgdGhpcy5uZXR3b3JrQ29uc3RydWN0ID0gbmV3IE5ldHdvcmtDb25zdHJ1Y3QodGhpcywgJ05ldHdvcmsnLCB7XHJcbiAgICAgIGNvbmZpZzogcHJvcHMuY29uZmlnLm5ldHdvcmssXHJcbiAgICAgIGVudmlyb25tZW50TmFtZTogcHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZSxcclxuICAgICAgZW5hYmxlVnBjRmxvd0xvZ3M6IHByb3BzLmNvbmZpZy5zZWN1cml0eS5lbmFibGVWcGNGbG93TG9ncyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEV4cG9ydCB0aGUgbmV0d29yayByZXNvdXJjZXMgZm9yIHVzZSBpbiBvdGhlciBzdGFja3NcclxuICAgIHRoaXMudnBjID0gdGhpcy5uZXR3b3JrQ29uc3RydWN0LnZwYztcclxuICAgIHRoaXMuY2x1c3RlciA9IHRoaXMubmV0d29ya0NvbnN0cnVjdC5jbHVzdGVyO1xyXG4gICAgdGhpcy5sb2FkQmFsYW5jZXIgPSB0aGlzLm5ldHdvcmtDb25zdHJ1Y3QubG9hZEJhbGFuY2VyO1xyXG4gICAgdGhpcy5iYWNrZW5kU2VjdXJpdHlHcm91cCA9IHRoaXMubmV0d29ya0NvbnN0cnVjdC5iYWNrZW5kU2VjdXJpdHlHcm91cDtcclxuICAgIHRoaXMuZGF0YWJhc2VTZWN1cml0eUdyb3VwID0gdGhpcy5uZXR3b3JrQ29uc3RydWN0LmRhdGFiYXNlU2VjdXJpdHlHcm91cDtcclxuICAgIHRoaXMucmVkaXNTZWN1cml0eUdyb3VwID0gdGhpcy5uZXR3b3JrQ29uc3RydWN0LnJlZGlzU2VjdXJpdHlHcm91cDtcclxuXHJcbiAgICAvLyBDcmVhdGUgQ2xvdWRGb3JtYXRpb24gb3V0cHV0c1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1ZwY0lkJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy52cGMudnBjSWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnVlBDIElEJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZX0tdnBjLWlkYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDbHVzdGVyTmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuY2x1c3Rlci5jbHVzdGVyTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdFQ1MgQ2x1c3RlciBOYW1lJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZX0tY2x1c3Rlci1uYW1lYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMb2FkQmFsYW5jZXJEbnNOYW1lJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5sb2FkQmFsYW5jZXIubG9hZEJhbGFuY2VyRG5zTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdMb2FkIEJhbGFuY2VyIEROUyBOYW1lJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZX0tYWxiLWRucy1uYW1lYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMb2FkQmFsYW5jZXJBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmxvYWRCYWxhbmNlci5sb2FkQmFsYW5jZXJBcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnTG9hZCBCYWxhbmNlciBBUk4nLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lfS1hbGItYXJuYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdQcml2YXRlU3VibmV0SWRzJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy52cGMucHJpdmF0ZVN1Ym5ldHMubWFwKHN1Ym5ldCA9PiBzdWJuZXQuc3VibmV0SWQpLmpvaW4oJywnKSxcclxuICAgICAgZGVzY3JpcHRpb246ICdQcml2YXRlIFN1Ym5ldCBJRHMnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lfS1wcml2YXRlLXN1Ym5ldC1pZHNgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1B1YmxpY1N1Ym5ldElkcycsIHtcclxuICAgICAgdmFsdWU6IHRoaXMudnBjLnB1YmxpY1N1Ym5ldHMubWFwKHN1Ym5ldCA9PiBzdWJuZXQuc3VibmV0SWQpLmpvaW4oJywnKSxcclxuICAgICAgZGVzY3JpcHRpb246ICdQdWJsaWMgU3VibmV0IElEcycsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmNvbmZpZy5lbnZpcm9ubWVudE5hbWV9LXB1YmxpYy1zdWJuZXQtaWRzYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdJc29sYXRlZFN1Ym5ldElkcycsIHtcclxuICAgICAgdmFsdWU6IHRoaXMudnBjLmlzb2xhdGVkU3VibmV0cy5tYXAoc3VibmV0ID0+IHN1Ym5ldC5zdWJuZXRJZCkuam9pbignLCcpLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0lzb2xhdGVkIFN1Ym5ldCBJRHMnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lfS1pc29sYXRlZC1zdWJuZXQtaWRzYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdCYWNrZW5kU2VjdXJpdHlHcm91cElkJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5iYWNrZW5kU2VjdXJpdHlHcm91cC5zZWN1cml0eUdyb3VwSWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQmFja2VuZCBTZWN1cml0eSBHcm91cCBJRCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3Byb3BzLmNvbmZpZy5lbnZpcm9ubWVudE5hbWV9LWJhY2tlbmQtc2ctaWRgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0RhdGFiYXNlU2VjdXJpdHlHcm91cElkJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5kYXRhYmFzZVNlY3VyaXR5R3JvdXAuc2VjdXJpdHlHcm91cElkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0RhdGFiYXNlIFNlY3VyaXR5IEdyb3VwIElEJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZX0tZGF0YWJhc2Utc2ctaWRgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1JlZGlzU2VjdXJpdHlHcm91cElkJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5yZWRpc1NlY3VyaXR5R3JvdXAuc2VjdXJpdHlHcm91cElkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1JlZGlzIFNlY3VyaXR5IEdyb3VwIElEJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZX0tcmVkaXMtc2ctaWRgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIGFkZGl0aW9uYWwgc2VjdXJpdHkgZ3JvdXAgcnVsZXMgYmFzZWQgb24gZW52aXJvbm1lbnRcclxuICAgIHRoaXMuYWRkRW52aXJvbm1lbnRTcGVjaWZpY1NlY3VyaXR5UnVsZXMocHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFkZEVudmlyb25tZW50U3BlY2lmaWNTZWN1cml0eVJ1bGVzKGVudmlyb25tZW50TmFtZTogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAvLyBEZXZlbG9wbWVudCBlbnZpcm9ubWVudDogQWxsb3cgU1NIIGFjY2VzcyBmcm9tIGFueXdoZXJlIChmb3IgZGVidWdnaW5nKVxyXG4gICAgaWYgKGVudmlyb25tZW50TmFtZSA9PT0gJ2RldicpIHtcclxuICAgICAgdGhpcy5iYWNrZW5kU2VjdXJpdHlHcm91cC5hZGRJbmdyZXNzUnVsZShcclxuICAgICAgICBjZGsuYXdzX2VjMi5QZWVyLmFueUlwdjQoKSxcclxuICAgICAgICBjZGsuYXdzX2VjMi5Qb3J0LnRjcCgyMiksXHJcbiAgICAgICAgJ1NTSCBhY2Nlc3MgZm9yIGRldmVsb3BtZW50IGRlYnVnZ2luZydcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBQcm9kdWN0aW9uIGVudmlyb25tZW50OiBNb3JlIHJlc3RyaWN0aXZlIHJ1bGVzXHJcbiAgICBpZiAoZW52aXJvbm1lbnROYW1lID09PSAncHJvZCcpIHtcclxuICAgICAgLy8gQWxsb3cgb25seSBzcGVjaWZpYyBJUCByYW5nZXMgb3IgVlBOIGFjY2Vzc1xyXG4gICAgICAvLyBUaGlzIHdvdWxkIGJlIGNvbmZpZ3VyZWQgYmFzZWQgb24geW91ciBvcmdhbml6YXRpb24ncyByZXF1aXJlbWVudHNcclxuICAgICAgXHJcbiAgICAgIC8vIEV4YW1wbGU6IEFsbG93IGFjY2VzcyBmcm9tIG9mZmljZSBJUCByYW5nZVxyXG4gICAgICAvLyB0aGlzLmJhY2tlbmRTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxyXG4gICAgICAvLyAgIGNkay5hd3NfZWMyLlBlZXIuaXB2NCgnMTAuMC4wLjAvOCcpLFxyXG4gICAgICAvLyAgIGNkay5hd3NfZWMyLlBvcnQudGNwKDIyKSxcclxuICAgICAgLy8gICAnU1NIIGFjY2VzcyBmcm9tIG9mZmljZSBuZXR3b3JrJ1xyXG4gICAgICAvLyApO1xyXG4gICAgfVxyXG4gIH1cclxufSJdfQ==