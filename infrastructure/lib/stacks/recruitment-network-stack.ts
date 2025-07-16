import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NetworkConstruct } from '../constructs/network-construct';
import { NetworkStackProps } from '../config/types';

export class RecruitmentNetworkStack extends cdk.Stack {
  public readonly vpc: cdk.aws_ec2.Vpc;
  public readonly cluster: cdk.aws_ecs.Cluster;
  public readonly loadBalancer: cdk.aws_elasticloadbalancingv2.ApplicationLoadBalancer;
  public readonly backendSecurityGroup: cdk.aws_ec2.SecurityGroup;
  public readonly databaseSecurityGroup: cdk.aws_ec2.SecurityGroup;
  public readonly redisSecurityGroup: cdk.aws_ec2.SecurityGroup;
  public readonly networkConstruct: NetworkConstruct;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    // Create the network construct
    this.networkConstruct = new NetworkConstruct(this, 'Network', {
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

  private addEnvironmentSpecificSecurityRules(environmentName: string): void {
    // Development environment: Allow SSH access from anywhere (for debugging)
    if (environmentName === 'dev') {
      this.backendSecurityGroup.addIngressRule(
        cdk.aws_ec2.Peer.anyIpv4(),
        cdk.aws_ec2.Port.tcp(22),
        'SSH access for development debugging'
      );
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