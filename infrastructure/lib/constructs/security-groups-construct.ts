import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface SecurityGroupsConstructProps {
  vpc: ec2.IVpc;
  environment: string;
}

export class SecurityGroupsConstruct extends Construct {
  public readonly albSecurityGroup: ec2.SecurityGroup;
  public readonly ecsSecurityGroup: ec2.SecurityGroup;
  public readonly rdsSecurityGroup: ec2.SecurityGroup;
  public readonly redisSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: SecurityGroupsConstructProps) {
    super(scope, id);

    const { vpc, environment } = props;

    // Create security groups
    this.albSecurityGroup = this.createAlbSecurityGroup(vpc, environment);
    this.ecsSecurityGroup = this.createEcsSecurityGroup(vpc, environment);
    this.rdsSecurityGroup = this.createRdsSecurityGroup(vpc, environment);
    this.redisSecurityGroup = this.createRedisSecurityGroup(vpc, environment);

    // Configure security group rules
    this.configureSecurityGroupRules();
  }

  private createAlbSecurityGroup(vpc: ec2.IVpc, environment: string): ec2.SecurityGroup {
    const sg = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc,
      description: 'Security group for Application Load Balancer',
      securityGroupName: `recruitment-alb-sg-${environment}`,
      allowAllOutbound: true,
    });

    // Allow HTTP and HTTPS traffic from anywhere
    sg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic from anywhere'
    );

    sg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic from anywhere'
    );

    // For development, also allow direct access to port 3000
    if (environment === 'dev') {
      sg.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(3000),
        'Allow direct access to backend port for development'
      );
    }

    this.addCommonTags(sg, 'ALB', environment);
    return sg;
  }

  private createEcsSecurityGroup(vpc: ec2.IVpc, environment: string): ec2.SecurityGroup {
    const sg = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
      vpc,
      description: 'Security group for ECS Fargate tasks',
      securityGroupName: `recruitment-ecs-sg-${environment}`,
      allowAllOutbound: true,
    });

    // Allow traffic from ALB on port 3000 (backend port)
    sg.addIngressRule(
      this.albSecurityGroup,
      ec2.Port.tcp(3000),
      'Allow traffic from ALB to backend'
    );

    // Allow health check traffic
    sg.addIngressRule(
      this.albSecurityGroup,
      ec2.Port.tcp(3000),
      'Allow health check traffic from ALB'
    );

    this.addCommonTags(sg, 'ECS', environment);
    return sg;
  }

  private createRdsSecurityGroup(vpc: ec2.IVpc, environment: string): ec2.SecurityGroup {
    const sg = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
      vpc,
      description: 'Security group for RDS PostgreSQL database',
      securityGroupName: `recruitment-rds-sg-${environment}`,
      allowAllOutbound: false,
    });

    // Allow PostgreSQL traffic from ECS tasks
    sg.addIngressRule(
      this.ecsSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL traffic from ECS tasks'
    );

    // For development, allow access from VPC CIDR for debugging
    if (environment === 'dev') {
      sg.addIngressRule(
        ec2.Peer.ipv4(vpc.vpcCidrBlock),
        ec2.Port.tcp(5432),
        'Allow PostgreSQL access from VPC for development'
      );
    }

    this.addCommonTags(sg, 'RDS', environment);
    return sg;
  }

  private createRedisSecurityGroup(vpc: ec2.IVpc, environment: string): ec2.SecurityGroup {
    const sg = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc,
      description: 'Security group for ElastiCache Redis',
      securityGroupName: `recruitment-redis-sg-${environment}`,
      allowAllOutbound: false,
    });

    // Allow Redis traffic from ECS tasks
    sg.addIngressRule(
      this.ecsSecurityGroup,
      ec2.Port.tcp(6379),
      'Allow Redis traffic from ECS tasks'
    );

    // For development, allow access from VPC CIDR for debugging
    if (environment === 'dev') {
      sg.addIngressRule(
        ec2.Peer.ipv4(vpc.vpcCidrBlock),
        ec2.Port.tcp(6379),
        'Allow Redis access from VPC for development'
      );
    }

    this.addCommonTags(sg, 'Redis', environment);
    return sg;
  }

  private configureSecurityGroupRules(): void {
    // Additional security group rules can be added here
    // For example, allowing communication between services

    // Allow ECS tasks to connect to RDS
    this.rdsSecurityGroup.connections.allowFrom(
      this.ecsSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow ECS to connect to RDS'
    );

    // Allow ECS tasks to connect to Redis
    this.redisSecurityGroup.connections.allowFrom(
      this.ecsSecurityGroup,
      ec2.Port.tcp(6379),
      'Allow ECS to connect to Redis'
    );
  }

  private addCommonTags(sg: ec2.SecurityGroup, type: string, environment: string): void {
    const tags = {
      Name: `recruitment-${type.toLowerCase()}-sg-${environment}`,
      Environment: environment,
      Project: 'RecruitmentWebsite',
      Type: type,
      ManagedBy: 'CDK',
    };

    Object.entries(tags).forEach(([key, value]) => {
      cdk.Tags.of(sg).add(key, value);
    });
  }

  /**
   * Create a security group for bastion host (if needed for debugging)
   */
  public createBastionSecurityGroup(vpc: ec2.IVpc, environment: string): ec2.SecurityGroup {
    const sg = new ec2.SecurityGroup(this, 'BastionSecurityGroup', {
      vpc,
      description: 'Security group for bastion host',
      securityGroupName: `recruitment-bastion-sg-${environment}`,
      allowAllOutbound: true,
    });

    // Allow SSH access from specific IP ranges (customize as needed)
    sg.addIngressRule(
      ec2.Peer.ipv4('0.0.0.0/0'), // Replace with your IP range
      ec2.Port.tcp(22),
      'Allow SSH access to bastion host'
    );

    this.addCommonTags(sg, 'Bastion', environment);
    return sg;
  }

  /**
   * Add additional ingress rules for development/debugging
   */
  public addDevelopmentRules(): void {
    // Allow all traffic within VPC for development
    this.ecsSecurityGroup.addIngressRule(
      ec2.Peer.ipv4('10.0.0.0/16'),
      ec2.Port.allTraffic(),
      'Allow all traffic within VPC for development'
    );
  }

  /**
   * Add production-specific security rules
   */
  public addProductionRules(): void {
    // Add stricter rules for production
    // For example, restrict source IP ranges, add WAF integration, etc.
  }
}