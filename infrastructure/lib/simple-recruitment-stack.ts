import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

export class SimpleRecruitmentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
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

    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic from anywhere'
    );

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

    ecsSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(80),
      'Allow HTTP traffic from ALB'
    );

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

    frontendSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow SSH access'
    );

    frontendSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP access'
    );

    frontendSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(3001),
      'Allow Next.js app access'
    );

    frontendSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(3001),
      'Allow ALB to frontend'
    );

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
    userData.addCommands(
      'yum update -y',
      'yum install -y nodejs npm',
      
      // Install serve globally
      'npm install -g serve',
      
      // Create app directory
      'mkdir -p /opt/recruitment-frontend',
      
      // Create a simple index.html
      'cat > /opt/recruitment-frontend/index.html << EOF',
      '<!DOCTYPE html>',
      '<html><head><title>Recruitment Website</title></head>',
      '<body>',
      '<h1>Recruitment Website Frontend</h1>',
      '<p>This is running on EC2!</p>',
      '<p>Backend URL: http://' + loadBalancer.loadBalancerDnsName + '</p>',
      '<p>Instance ID: ' + '$(curl -s http://169.254.169.254/latest/meta-data/instance-id)' + '</p>',
      '</body></html>',
      'EOF',
      
      // Start serve in background on port 3001
      'cd /opt/recruitment-frontend && nohup serve . -p 3001 > /var/log/frontend.log 2>&1 &',
      
      // Also start a simple Python HTTP server on port 80 as backup
      'cd /opt/recruitment-frontend && nohup python3 -m http.server 80 > /var/log/backup-server.log 2>&1 &'
    );

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