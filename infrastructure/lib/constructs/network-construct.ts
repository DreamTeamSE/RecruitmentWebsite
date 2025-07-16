import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { NetworkConfig } from '../config/types';

export interface NetworkConstructProps {
  config: NetworkConfig;
  environmentName: string;
  enableVpcFlowLogs?: boolean;
}

export class NetworkConstruct extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly cluster: ecs.Cluster;
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;
  public readonly backendSecurityGroup: ec2.SecurityGroup;
  public readonly databaseSecurityGroup: ec2.SecurityGroup;
  public readonly redisSecurityGroup: ec2.SecurityGroup;
  public readonly publicSubnets: ec2.ISubnet[];
  public readonly privateSubnets: ec2.ISubnet[];
  public readonly isolatedSubnets: ec2.ISubnet[];

  constructor(scope: Construct, id: string, props: NetworkConstructProps) {
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

  private setupSecurityGroupRules(): void {
    // Allow ALB to access backend
    this.backendSecurityGroup.addIngressRule(
      this.loadBalancer.connections.securityGroups[0],
      ec2.Port.tcp(3000),
      'Allow ALB to access backend'
    );

    // Allow backend to access database
    this.databaseSecurityGroup.addIngressRule(
      this.backendSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow backend to access PostgreSQL'
    );

    // Allow backend to access Redis
    this.redisSecurityGroup.addIngressRule(
      this.backendSecurityGroup,
      ec2.Port.tcp(6379),
      'Allow backend to access Redis'
    );

    // Allow health check connections
    this.backendSecurityGroup.addIngressRule(
      this.backendSecurityGroup,
      ec2.Port.tcp(3000),
      'Allow health checks'
    );
  }

  private createLoadBalancerSecurityGroup(): ec2.SecurityGroup {
    const albSecurityGroup = new ec2.SecurityGroup(this, 'LoadBalancerSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Application Load Balancer',
      allowAllOutbound: true,
    });

    // Allow HTTP and HTTPS traffic
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic'
    );

    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic'
    );

    return albSecurityGroup;
  }

  private addTags(environmentName: string): void {
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

  public addSecurityGroupRule(
    securityGroup: ec2.SecurityGroup,
    peer: ec2.IPeer,
    port: ec2.Port,
    description: string
  ): void {
    securityGroup.addIngressRule(peer, port, description);
  }

  public createCustomSecurityGroup(name: string, description: string): ec2.SecurityGroup {
    return new ec2.SecurityGroup(this, name, {
      vpc: this.vpc,
      description,
      allowAllOutbound: true,
    });
  }
}