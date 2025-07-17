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
exports.SimpleRecruitmentStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const rds = __importStar(require("aws-cdk-lib/aws-rds"));
const ecs = __importStar(require("aws-cdk-lib/aws-ecs"));
const elbv2 = __importStar(require("aws-cdk-lib/aws-elasticloadbalancingv2"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const ecr = __importStar(require("aws-cdk-lib/aws-ecr"));
class SimpleRecruitmentStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // VPC
        const vpc = new ec2.Vpc(this, 'VPC', {
            maxAzs: 2,
            cidr: '10.0.0.0/16',
            subnetConfiguration: [
                {
                    name: 'Public',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    name: 'Private',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
                {
                    name: 'Isolated',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                },
            ],
        });
        // S3 Bucket for assets
        const assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
            bucketName: `recruitment-dev-assets-${cdk.Aws.ACCOUNT_ID}`,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });
        // RDS Database
        const database = new rds.DatabaseInstance(this, 'Database', {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_15_8,
            }),
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
            vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            },
            credentials: rds.Credentials.fromGeneratedSecret('postgres'),
            allocatedStorage: 20,
            deleteAutomatedBackups: true,
            deletionProtection: false,
        });
        // ECS Cluster
        const cluster = new ecs.Cluster(this, 'Cluster', {
            vpc,
            containerInsights: false,
        });
        // ECR Repository
        const repository = new ecr.Repository(this, 'BackendRepository', {
            repositoryName: 'recruitment-backend',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Security Group for Load Balancer
        const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
            vpc,
            description: 'Security group for Application Load Balancer',
            allowAllOutbound: true,
        });
        albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic from anywhere');
        // Application Load Balancer
        const loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
            vpc,
            internetFacing: true,
            securityGroup: albSecurityGroup,
        });
        // Task Definition
        const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
            memoryLimitMiB: 512,
            cpu: 256,
        });
        // Container Definition (using nginx temporarily until we build the backend image)
        const container = taskDefinition.addContainer('backend', {
            image: ecs.ContainerImage.fromRegistry('nginx:alpine'),
            memoryLimitMiB: 512,
            environment: {
                NGINX_PORT: '80',
            },
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: 'recruitment-backend',
                logRetention: 14,
            }),
        });
        container.addPortMappings({
            containerPort: 80,
            protocol: ecs.Protocol.TCP,
        });
        // Security Group for ECS Service
        const ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
            vpc,
            description: 'Security group for ECS service',
            allowAllOutbound: true,
        });
        ecsSecurityGroup.addIngressRule(albSecurityGroup, ec2.Port.tcp(80), 'Allow HTTP traffic from ALB');
        // ECS Service
        const service = new ecs.FargateService(this, 'Service', {
            cluster,
            taskDefinition,
            desiredCount: 1,
            assignPublicIp: false,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            securityGroups: [ecsSecurityGroup],
        });
        // Target Group
        const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
            vpc,
            port: 80,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targets: [service],
            healthCheck: {
                path: '/',
                interval: cdk.Duration.seconds(30),
            },
        });
        // Listener
        loadBalancer.addListener('Listener', {
            port: 80,
            defaultTargetGroups: [targetGroup],
        });
        // Security Group for Frontend EC2
        const frontendSecurityGroup = new ec2.SecurityGroup(this, 'FrontendSecurityGroup', {
            vpc,
            description: 'Security group for frontend EC2 instance',
            allowAllOutbound: true,
        });
        frontendSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH access');
        frontendSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP access');
        frontendSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3001), 'Allow Next.js app access');
        frontendSecurityGroup.addIngressRule(albSecurityGroup, ec2.Port.tcp(3001), 'Allow ALB to frontend');
        // IAM Role for EC2 to access ECR and other AWS services
        const frontendRole = new iam.Role(this, 'FrontendRole', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
            ],
        });
        // Instance Profile
        const frontendInstanceProfile = new iam.CfnInstanceProfile(this, 'FrontendInstanceProfile', {
            roles: [frontendRole.roleName],
        });
        // User Data Script to install Node.js and deploy the frontend
        const userData = ec2.UserData.forLinux();
        userData.addCommands('yum update -y', 'yum install -y nodejs npm', 
        // Install serve globally
        'npm install -g serve', 
        // Create app directory
        'mkdir -p /opt/recruitment-frontend', 
        // Create a simple index.html
        'cat > /opt/recruitment-frontend/index.html << EOF', '<!DOCTYPE html>', '<html><head><title>Recruitment Website</title></head>', '<body>', '<h1>Recruitment Website Frontend</h1>', '<p>This is running on EC2!</p>', '<p>Backend URL: http://' + loadBalancer.loadBalancerDnsName + '</p>', '<p>Instance ID: ' + '$(curl -s http://169.254.169.254/latest/meta-data/instance-id)' + '</p>', '</body></html>', 'EOF', 
        // Start serve in background on port 3001
        'cd /opt/recruitment-frontend && nohup serve . -p 3001 > /var/log/frontend.log 2>&1 &', 
        // Also start a simple Python HTTP server on port 80 as backup
        'cd /opt/recruitment-frontend && nohup python3 -m http.server 80 > /var/log/backup-server.log 2>&1 &');
        // EC2 Instance for Frontend (v2)
        const frontendInstance = new ec2.Instance(this, 'FrontendInstance', {
            vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PUBLIC,
            },
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
            machineImage: ec2.MachineImage.latestAmazonLinux2(),
            securityGroup: frontendSecurityGroup,
            role: frontendRole,
            userData: userData,
            // No key pair needed for automatic deployment
        });
        // Outputs
        new cdk.CfnOutput(this, 'VpcId', {
            value: vpc.vpcId,
            description: 'VPC ID',
        });
        new cdk.CfnOutput(this, 'DatabaseEndpoint', {
            value: database.instanceEndpoint.hostname,
            description: 'Database endpoint',
        });
        new cdk.CfnOutput(this, 'LoadBalancerUrl', {
            value: `http://${loadBalancer.loadBalancerDnsName}`,
            description: 'Load balancer URL',
        });
        new cdk.CfnOutput(this, 'ECRRepositoryUri', {
            value: repository.repositoryUri,
            description: 'ECR repository URI',
        });
        new cdk.CfnOutput(this, 'AssetsBucketName', {
            value: assetsBucket.bucketName,
            description: 'Assets bucket name',
        });
        new cdk.CfnOutput(this, 'FrontendInstanceId', {
            value: frontendInstance.instanceId,
            description: 'Frontend EC2 instance ID',
        });
        new cdk.CfnOutput(this, 'FrontendUrl', {
            value: `http://${frontendInstance.instancePublicDnsName}:3001`,
            description: 'Frontend URL',
        });
        new cdk.CfnOutput(this, 'FrontendPublicIp', {
            value: frontendInstance.instancePublicIp,
            description: 'Frontend EC2 public IP',
        });
    }
}
exports.SimpleRecruitmentStack = SimpleRecruitmentStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlLXJlY3J1aXRtZW50LXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2ltcGxlLXJlY3J1aXRtZW50LXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLHlEQUEyQztBQUMzQyw4RUFBZ0U7QUFDaEUsdURBQXlDO0FBQ3pDLHlEQUEyQztBQUMzQyx5REFBMkM7QUFHM0MsTUFBYSxzQkFBdUIsU0FBUSxHQUFHLENBQUMsS0FBSztJQUNuRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU07UUFDTixNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRTtZQUNuQyxNQUFNLEVBQUUsQ0FBQztZQUNULElBQUksRUFBRSxhQUFhO1lBQ25CLG1CQUFtQixFQUFFO2dCQUNuQjtvQkFDRSxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNO2lCQUNsQztnQkFDRDtvQkFDRSxJQUFJLEVBQUUsU0FBUztvQkFDZixVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxtQkFBbUI7aUJBQy9DO2dCQUNEO29CQUNFLElBQUksRUFBRSxVQUFVO29CQUNoQixVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0I7aUJBQzVDO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCx1QkFBdUI7UUFDdkIsTUFBTSxZQUFZLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDdkQsVUFBVSxFQUFFLDBCQUEwQixHQUFHLENBQUMsR0FBRyxD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Q0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDckMsS0FBSyxFQUFFLFVBQVUsZ0JBQWdCLENBQUMscUJBQXFCLE9BQU87WUFDOUQsV0FBVyxFQUFFLGNBQWM7U0FDNUIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsZ0JBQWdCO1lBQ3hDLFdBQVcsRUFBRSx3QkFBd0I7U0FDdEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBclJELHdEQXFSQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcclxuaW1wb3J0ICogYXMgcmRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yZHMnO1xyXG5pbXBvcnQgKiBhcyBlY3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjcyc7XHJcbmltcG9ydCAqIGFzIGVsYnYyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lbGFzdGljbG9hZGJhbGFuY2luZ3YyJztcclxuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgKiBhcyBlY3IgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjcic7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNpbXBsZVJlY3J1aXRtZW50U3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIC8vIFZQQ1xyXG4gICAgY29uc3QgdnBjID0gbmV3IGVjMi5WcGModGhpcywgJ1ZQQycsIHtcclxuICAgICAgbWF4QXpzOiAyLFxyXG4gICAgICBjaWRyOiAnMTAuMC4wLjAvMTYnLFxyXG4gICAgICBzdWJuZXRDb25maWd1cmF0aW9uOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgbmFtZTogJ1B1YmxpYycsXHJcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QVUJMSUMsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBuYW1lOiAnUHJpdmF0ZScsXHJcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgbmFtZTogJ0lzb2xhdGVkJyxcclxuICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfSVNPTEFURUQsXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFMzIEJ1Y2tldCBmb3IgYXNzZXRzXHJcbiAgICBjb25zdCBhc3NldHNCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdBc3NldHNCdWNrZXQnLCB7XHJcbiAgICAgIGJ1Y2tldE5hbWU6IGByZWNydWl0bWVudC1kZXYtYXNzZXRzLSR7Y2RrLkF3cy5BQ0NPVU5UX0lEfWAsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUkRTIERhdGFiYXNlXHJcbiAgICBjb25zdCBkYXRhYmFzZSA9IG5ldyByZHMuRGF0YWJhc2VJbnN0YW5jZSh0aGlzLCAnRGF0YWJhc2UnLCB7XHJcbiAgICAgIGVuZ2luZTogcmRzLkRhdGFiYXNlSW5zdGFuY2VFbmdpbmUucG9zdGdyZXMoe1xyXG4gICAgICAgIHZlcnNpb246IHJkcy5Qb3N0Z3Jlc0VuZ2luZVZlcnNpb24uVkVSXzE1XzgsXHJcbiAgICAgIH0pLFxyXG4gICAgICBpbnN0YW5jZVR5cGU6IGVjMi5JbnN0YW5jZVR5cGUub2YoZWMyLkluc3RhbmNlQ2xhc3MuVDMsIGVjMi5JbnN0YW5jZVNpemUuTUlDUk8pLFxyXG4gICAgICB2cGMsXHJcbiAgICAgIHZwY1N1Ym5ldHM6IHtcclxuICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX0lTT0xBVEVELFxyXG4gICAgICB9LFxyXG4gICAgICBjcmVkZW50aWFsczogcmRzLkNyZWRlbnRpYWxzLmZyb21HZW5lcmF0ZWRTZWNyZXQoJ3Bvc3RncmVzJyksXHJcbiAgICAgIGFsbG9jYXRlZFN0b3JhZ2U6IDIwLFxyXG4gICAgICBkZWxldGVBdXRvbWF0ZWRCYWNrdXBzOiB0cnVlLFxyXG4gICAgICBkZWxldGlvblByb3RlY3Rpb246IGZhbHNlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRUNTIENsdXN0ZXJcclxuICAgIGNvbnN0IGNsdXN0ZXIgPSBuZXcgZWNzLkNsdXN0ZXIodGhpcywgJ0NsdXN0ZXInLCB7XHJcbiAgICAgIHZwYyxcclxuICAgICAgY29udGFpbmVySW5zaWdodHM6IGZhbHNlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRUNSIFJlcG9zaXRvcnlcclxuICAgIGNvbnN0IHJlcG9zaXRvcnkgPSBuZXcgZWNyLlJlcG9zaXRvcnkodGhpcywgJ0JhY2tlbmRSZXBvc2l0b3J5Jywge1xyXG4gICAgICByZXBvc2l0b3J5TmFtZTogJ3JlY3J1aXRtZW50LWJhY2tlbmQnLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU2VjdXJpdHkgR3JvdXAgZm9yIExvYWQgQmFsYW5jZXJcclxuICAgIGNvbnN0IGFsYlNlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ0FsYlNlY3VyaXR5R3JvdXAnLCB7XHJcbiAgICAgIHZwYyxcclxuICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgQXBwbGljYXRpb24gTG9hZCBCYWxhbmNlcicsXHJcbiAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IHRydWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhbGJTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxyXG4gICAgICBlYzIuUGVlci5hbnlJcHY0KCksXHJcbiAgICAgIGVjMi5Qb3J0LnRjcCg4MCksXHJcbiAgICAgICdBbGxvdyBIVFRQIHRyYWZmaWMgZnJvbSBhbnl3aGVyZSdcclxuICAgICk7XHJcblxyXG4gICAgLy8gQXBwbGljYXRpb24gTG9hZCBCYWxhbmNlclxyXG4gICAgY29uc3QgbG9hZEJhbGFuY2VyID0gbmV3IGVsYnYyLkFwcGxpY2F0aW9uTG9hZEJhbGFuY2VyKHRoaXMsICdMb2FkQmFsYW5jZXInLCB7XHJcbiAgICAgIHZwYyxcclxuICAgICAgaW50ZXJuZXRGYWNpbmc6IHRydWUsXHJcbiAgICAgIHNlY3VyaXR5R3JvdXA6IGFsYlNlY3VyaXR5R3JvdXAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBUYXNrIERlZmluaXRpb25cclxuICAgIGNvbnN0IHRhc2tEZWZpbml0aW9uID0gbmV3IGVjcy5GYXJnYXRlVGFza0RlZmluaXRpb24odGhpcywgJ1Rhc2tEZWZpbml0aW9uJywge1xyXG4gICAgICBtZW1vcnlMaW1pdE1pQjogNTEyLFxyXG4gICAgICBjcHU6IDI1NixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENvbnRhaW5lciBEZWZpbml0aW9uICh1c2luZyBuZ2lueCB0ZW1wb3JhcmlseSB1bnRpbCB3ZSBidWlsZCB0aGUgYmFja2VuZCBpbWFnZSlcclxuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRhc2tEZWZpbml0aW9uLmFkZENvbnRhaW5lcignYmFja2VuZCcsIHtcclxuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoJ25naW54OmFscGluZScpLFxyXG4gICAgICBtZW1vcnlMaW1pdE1pQjogNTEyLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIE5HSU5YX1BPUlQ6ICc4MCcsXHJcbiAgICAgIH0sXHJcbiAgICAgIGxvZ2dpbmc6IGVjcy5Mb2dEcml2ZXJzLmF3c0xvZ3Moe1xyXG4gICAgICAgIHN0cmVhbVByZWZpeDogJ3JlY3J1aXRtZW50LWJhY2tlbmQnLFxyXG4gICAgICAgIGxvZ1JldGVudGlvbjogMTQsXHJcbiAgICAgIH0pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29udGFpbmVyLmFkZFBvcnRNYXBwaW5ncyh7XHJcbiAgICAgIGNvbnRhaW5lclBvcnQ6IDgwLFxyXG4gICAgICBwcm90b2NvbDogZWNzLlByb3RvY29sLlRDUCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNlY3VyaXR5IEdyb3VwIGZvciBFQ1MgU2VydmljZVxyXG4gICAgY29uc3QgZWNzU2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnRWNzU2VjdXJpdHlHcm91cCcsIHtcclxuICAgICAgdnBjLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBFQ1Mgc2VydmljZScsXHJcbiAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IHRydWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICBlY3NTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxyXG4gICAgICBhbGJTZWN1cml0eUdyb3VwLFxyXG4gICAgICBlYzIuUG9ydC50Y3AoODApLFxyXG4gICAgICAnQWxsb3cgSFRUUCB0cmFmZmljIGZyb20gQUxCJ1xyXG4gICAgKTtcclxuXHJcbiAgICAvLyBFQ1MgU2VydmljZVxyXG4gICAgY29uc3Qgc2VydmljZSA9IG5ldyBlY3MuRmFyZ2F0ZVNlcnZpY2UodGhpcywgJ1NlcnZpY2UnLCB7XHJcbiAgICAgIGNsdXN0ZXIsXHJcbiAgICAgIHRhc2tEZWZpbml0aW9uLFxyXG4gICAgICBkZXNpcmVkQ291bnQ6IDEsXHJcbiAgICAgIGFzc2lnblB1YmxpY0lwOiBmYWxzZSxcclxuICAgICAgdnBjU3VibmV0czoge1xyXG4gICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MsXHJcbiAgICAgIH0sXHJcbiAgICAgIHNlY3VyaXR5R3JvdXBzOiBbZWNzU2VjdXJpdHlHcm91cF0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBUYXJnZXQgR3JvdXBcclxuICAgIGNvbnN0IHRhcmdldEdyb3VwID0gbmV3IGVsYnYyLkFwcGxpY2F0aW9uVGFyZ2V0R3JvdXAodGhpcywgJ1RhcmdldEdyb3VwJywge1xyXG4gICAgICB2cGMsXHJcbiAgICAgIHBvcnQ6IDgwLFxyXG4gICAgICBwcm90b2NvbDogZWxidjIuQXBwbGljYXRpb25Qcm90b2NvbC5IVFRQLFxyXG4gICAgICB0YXJnZXRzOiBbc2VydmljZV0sXHJcbiAgICAgIGhlYWx0aENoZWNrOiB7XHJcbiAgICAgICAgcGF0aDogJy8nLFxyXG4gICAgICAgIGludGVydmFsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBMaXN0ZW5lclxyXG4gICAgbG9hZEJhbGFuY2VyLmFkZExpc3RlbmVyKCdMaXN0ZW5lcicsIHtcclxuICAgICAgcG9ydDogODAsXHJcbiAgICAgIGRlZmF1bHRUYXJnZXRHcm91cHM6IFt0YXJnZXRHcm91cF0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTZWN1cml0eSBHcm91cCBmb3IgRnJvbnRlbmQgRUMyXHJcbiAgICBjb25zdCBmcm9udGVuZFNlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ0Zyb250ZW5kU2VjdXJpdHlHcm91cCcsIHtcclxuICAgICAgdnBjLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBmcm9udGVuZCBFQzIgaW5zdGFuY2UnLFxyXG4gICAgICBhbGxvd0FsbE91dGJvdW5kOiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgZnJvbnRlbmRTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxyXG4gICAgICBlYzIuUGVlci5hbnlJcHY0KCksXHJcbiAgICAgIGVjMi5Qb3J0LnRjcCgyMiksXHJcbiAgICAgICdBbGxvdyBTU0ggYWNjZXNzJ1xyXG4gICAgKTtcclxuXHJcbiAgICBmcm9udGVuZFNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXHJcbiAgICAgIGVjMi5QZWVyLmFueUlwdjQoKSxcclxuICAgICAgZWMyLlBvcnQudGNwKDgwKSxcclxuICAgICAgJ0FsbG93IEhUVFAgYWNjZXNzJ1xyXG4gICAgKTtcclxuXHJcbiAgICBmcm9udGVuZFNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXHJcbiAgICAgIGVjMi5QZWVyLmFueUlwdjQoKSxcclxuICAgICAgZWMyLlBvcnQudGNwKDMwMDEpLFxyXG4gICAgICAnQWxsb3cgTmV4dC5qcyBhcHAgYWNjZXNzJ1xyXG4gICAgKTtcclxuXHJcbiAgICBmcm9udGVuZFNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXHJcbiAgICAgIGFsYlNlY3VyaXR5R3JvdXAsXHJcbiAgICAgIGVjMi5Qb3J0LnRjcCgzMDAxKSxcclxuICAgICAgJ0FsbG93IEFMQiB0byBmcm9udGVuZCdcclxuICAgICk7XHJcblxyXG4gICAgLy8gSUFNIFJvbGUgZm9yIEVDMiB0byBhY2Nlc3MgRUNSIGFuZCBvdGhlciBBV1Mgc2VydmljZXNcclxuICAgIGNvbnN0IGZyb250ZW5kUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnRnJvbnRlbmRSb2xlJywge1xyXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnZWMyLmFtYXpvbmF3cy5jb20nKSxcclxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXHJcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBbWF6b25FQzJDb250YWluZXJSZWdpc3RyeVJlYWRPbmx5JyksXHJcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdDbG91ZFdhdGNoQWdlbnRTZXJ2ZXJQb2xpY3knKSxcclxuICAgICAgXSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEluc3RhbmNlIFByb2ZpbGVcclxuICAgIGNvbnN0IGZyb250ZW5kSW5zdGFuY2VQcm9maWxlID0gbmV3IGlhbS5DZm5JbnN0YW5jZVByb2ZpbGUodGhpcywgJ0Zyb250ZW5kSW5zdGFuY2VQcm9maWxlJywge1xyXG4gICAgICByb2xlczogW2Zyb250ZW5kUm9sZS5yb2xlTmFtZV0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBVc2VyIERhdGEgU2NyaXB0IHRvIGluc3RhbGwgTm9kZS5qcyBhbmQgZGVwbG95IHRoZSBmcm9udGVuZFxyXG4gICAgY29uc3QgdXNlckRhdGEgPSBlYzIuVXNlckRhdGEuZm9yTGludXgoKTtcclxuICAgIHVzZXJEYXRhLmFkZENvbW1hbmRzKFxyXG4gICAgICAneXVtIHVwZGF0ZSAteScsXHJcbiAgICAgICd5dW0gaW5zdGFsbCAteSBub2RlanMgbnBtJyxcclxuICAgICAgXHJcbiAgICAgIC8vIEluc3RhbGwgc2VydmUgZ2xvYmFsbHlcclxuICAgICAgJ25wbSBpbnN0YWxsIC1nIHNlcnZlJyxcclxuICAgICAgXHJcbiAgICAgIC8vIENyZWF0ZSBhcHAgZGlyZWN0b3J5XHJcbiAgICAgICdta2RpciAtcCAvb3B0L3JlY3J1aXRtZW50LWZyb250ZW5kJyxcclxuICAgICAgXHJcbiAgICAgIC8vIENyZWF0ZSBhIHNpbXBsZSBpbmRleC5odG1sXHJcbiAgICAgICdjYXQgPiAvb3B0L3JlY3J1aXRtZW50LWZyb250ZW5kL2luZGV4Lmh0bWwgPDwgRU9GJyxcclxuICAgICAgJzwhRE9DVFlQRSBodG1sPicsXHJcbiAgICAgICc8aHRtbD48aGVhZD48dGl0bGU+UmVjcnVpdG1lbnQgV2Vic2l0ZTwvdGl0bGU+PC9oZWFkPicsXHJcbiAgICAgICc8Ym9keT4nLFxyXG4gICAgICAnPGgxPlJlY3J1aXRtZW50IFdlYnNpdGUgRnJvbnRlbmQ8L2gxPicsXHJcbiAgICAgICc8cD5UaGlzIGlzIHJ1bm5pbmcgb24gRUMyITwvcD4nLFxyXG4gICAgICAnPHA+QmFja2VuZCBVUkw6IGh0dHA6Ly8nICsgbG9hZEJhbGFuY2VyLmxvYWRCYWxhbmNlckRuc05hbWUgKyAnPC9wPicsXHJcbiAgICAgICc8cD5JbnN0YW5jZSBJRDogJyArICckKGN1cmwgLXMgaHR0cDovLzE2OS4yNTQuMTY5LjI1NC9sYXRlc3QvbWV0YS1kYXRhL2luc3RhbmNlLWlkKScgKyAnPC9wPicsXHJcbiAgICAgICc8L2JvZHk+PC9odG1sPicsXHJcbiAgICAgICdFT0YnLFxyXG4gICAgICBcclxuICAgICAgLy8gU3RhcnQgc2VydmUgaW4gYmFja2dyb3VuZCBvbiBwb3J0IDMwMDFcclxuICAgICAgJ2NkIC9vcHQvcmVjcnVpdG1lbnQtZnJvbnRlbmQgJiYgbm9odXAgc2VydmUgLiAtcCAzMDAxID4gL3Zhci9sb2cvZnJvbnRlbmQubG9nIDI+JjEgJicsXHJcbiAgICAgIFxyXG4gICAgICAvLyBBbHNvIHN0YXJ0IGEgc2ltcGxlIFB5dGhvbiBIVFRQIHNlcnZlciBvbiBwb3J0IDgwIGFzIGJhY2t1cFxyXG4gICAgICAnY2QgL29wdC9yZWNydWl0bWVudC1mcm9udGVuZCAmJiBub2h1cCBweXRob24zIC1tIGh0dHAuc2VydmVyIDgwID4gL3Zhci9sb2cvYmFja3VwLXNlcnZlci5sb2cgMj4mMSAmJ1xyXG4gICAgKTtcclxuXHJcbiAgICAvLyBFQzIgSW5zdGFuY2UgZm9yIEZyb250ZW5kICh2MilcclxuICAgIGNvbnN0IGZyb250ZW5kSW5zdGFuY2UgPSBuZXcgZWMyLkluc3RhbmNlKHRoaXMsICdGcm9udGVuZEluc3RhbmNlJywge1xyXG4gICAgICB2cGMsXHJcbiAgICAgIHZwY1N1Ym5ldHM6IHtcclxuICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QVUJMSUMsXHJcbiAgICAgIH0sXHJcbiAgICAgIGluc3RhbmNlVHlwZTogZWMyLkluc3RhbmNlVHlwZS5vZihlYzIuSW5zdGFuY2VDbGFzcy5UMywgZWMyLkluc3RhbmNlU2l6ZS5NSUNSTyksXHJcbiAgICAgIG1hY2hpbmVJbWFnZTogZWMyLk1hY2hpbmVJbWFnZS5sYXRlc3RBbWF6b25MaW51eDIoKSxcclxuICAgICAgc2VjdXJpdHlHcm91cDogZnJvbnRlbmRTZWN1cml0eUdyb3VwLFxyXG4gICAgICByb2xlOiBmcm9udGVuZFJvbGUsXHJcbiAgICAgIHVzZXJEYXRhOiB1c2VyRGF0YSxcclxuICAgICAgLy8gTm8ga2V5IHBhaXIgbmVlZGVkIGZvciBhdXRvbWF0aWMgZGVwbG95bWVudFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0c1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1ZwY0lkJywge1xyXG4gICAgICB2YWx1ZTogdnBjLnZwY0lkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1ZQQyBJRCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGF0YWJhc2VFbmRwb2ludCcsIHtcclxuICAgICAgdmFsdWU6IGRhdGFiYXNlLmluc3RhbmNlRW5kcG9pbnQuaG9zdG5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnRGF0YWJhc2UgZW5kcG9pbnQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xvYWRCYWxhbmNlclVybCcsIHtcclxuICAgICAgdmFsdWU6IGBodHRwOi8vJHtsb2FkQmFsYW5jZXIubG9hZEJhbGFuY2VyRG5zTmFtZX1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0xvYWQgYmFsYW5jZXIgVVJMJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdFQ1JSZXBvc2l0b3J5VXJpJywge1xyXG4gICAgICB2YWx1ZTogcmVwb3NpdG9yeS5yZXBvc2l0b3J5VXJpLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0VDUiByZXBvc2l0b3J5IFVSSScsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXNzZXRzQnVja2V0TmFtZScsIHtcclxuICAgICAgdmFsdWU6IGFzc2V0c0J1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0Fzc2V0cyBidWNrZXQgbmFtZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRnJvbnRlbmRJbnN0YW5jZUlkJywge1xyXG4gICAgICB2YWx1ZTogZnJvbnRlbmRJbnN0YW5jZS5pbnN0YW5jZUlkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0Zyb250ZW5kIEVDMiBpbnN0YW5jZSBJRCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRnJvbnRlbmRVcmwnLCB7XHJcbiAgICAgIHZhbHVlOiBgaHR0cDovLyR7ZnJvbnRlbmRJbnN0YW5jZS5pbnN0YW5jZVB1YmxpY0Ruc05hbWV9OjMwMDFgLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0Zyb250ZW5kIFVSTCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRnJvbnRlbmRQdWJsaWNJcCcsIHtcclxuICAgICAgdmFsdWU6IGZyb250ZW5kSW5zdGFuY2UuaW5zdGFuY2VQdWJsaWNJcCxcclxuICAgICAgZGVzY3JpcHRpb246ICdGcm9udGVuZCBFQzIgcHVibGljIElQJyxcclxuICAgIH0pO1xyXG4gIH1cclxufSJdfQ==