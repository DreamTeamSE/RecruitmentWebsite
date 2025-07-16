import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { VpcConfig } from '../config/environment-config';

export interface VpcConstructProps {
  vpcConfig: VpcConfig;
  environment: string;
}

export class VpcConstruct extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly privateSubnets: ec2.ISubnet[];
  public readonly publicSubnets: ec2.ISubnet[];

  constructor(scope: Construct, id: string, props: VpcConstructProps) {
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

  private addVpcEndpoints(): void {
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

  private tagSubnets(environment: string): void {
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

  private addVpcFlowLogs(): void {
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
  public createDatabaseSubnetGroup(): cdk.aws_rds.SubnetGroup {
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
  public createCacheSubnetGroup(): cdk.aws_elasticache.CfnSubnetGroup {
    return new cdk.aws_elasticache.CfnSubnetGroup(this, 'CacheSubnetGroup', {
      description: 'Subnet group for ElastiCache',
      subnetIds: this.privateSubnets.map(subnet => subnet.subnetId),
    });
  }
}