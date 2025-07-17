import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RecruitmentNetworkStack } from './recruitment-network-stack';
import { RecruitmentDataStack } from './recruitment-data-stack';
import { RecruitmentBackendStack } from './recruitment-backend-stack';
import { RecruitmentFrontendStack } from './recruitment-frontend-stack';
import { EnvironmentConfig } from '../config/types';

export interface RecruitmentStagingStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
}

export class RecruitmentStagingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: RecruitmentStagingStackProps) {
    super(scope, id, props);

    // Create Network Stack
    const networkStack = new RecruitmentNetworkStack(this, 'NetworkStack', {
      env: props.config.env,
      config: props.config,
    });

    // Create Data Stack
    const dataStack = new RecruitmentDataStack(this, 'DataStack', {
      env: props.config.env,
      config: props.config,
      vpc: networkStack.vpc,
      databaseSecurityGroup: networkStack.databaseSecurityGroup,
      redisSecurityGroup: networkStack.redisSecurityGroup,
    });

    // Create Backend Stack
    const backendStack = new RecruitmentBackendStack(this, 'BackendStack', {
      env: props.config.env,
      config: props.config,
      vpc: networkStack.vpc,
      cluster: networkStack.cluster,
      loadBalancer: networkStack.loadBalancer,
      backendSecurityGroup: networkStack.backendSecurityGroup,
      database: dataStack.databaseConstruct,
      redis: dataStack.redis,
      assetsBucket: dataStack.assetsBucket,
    });

    // Create Frontend Stack
    const frontendStack = new RecruitmentFrontendStack(this, 'FrontendStack', {
      env: props.config.env,
      config: props.config,
      backendUrl: backendStack.backendUrl,
    });

    // Add dependencies
    dataStack.addDependency(networkStack);
    backendStack.addDependency(dataStack);
    frontendStack.addDependency(backendStack);

    // Add tags to all resources
    cdk.Tags.of(this).add('Environment', props.config.environmentName);
    cdk.Tags.of(this).add('Project', 'RecruitmentWebsite');
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}