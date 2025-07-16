#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RecruitmentDevStack } from '../lib/stacks/recruitment-dev-stack';
import { RecruitmentStagingStack } from '../lib/stacks/recruitment-staging-stack';
import { RecruitmentProdStack } from '../lib/stacks/recruitment-prod-stack';
import { getEnvironmentConfig } from '../lib/config/environment-config';

const app = new cdk.App();
const environment = app.node.tryGetContext('environment') || 'dev';

// Load environment-specific configuration
const config = getEnvironmentConfig(environment);

// Create stacks based on environment
switch (environment) {
  case 'dev':
    new RecruitmentDevStack(app, 'RecruitmentDevStack', {
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
      },
      ...config
    });
    break;
  
  case 'staging':
    new RecruitmentStagingStack(app, 'RecruitmentStagingStack', {
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
      },
      ...config
    });
    break;
  
  case 'prod':
    new RecruitmentProdStack(app, 'RecruitmentProdStack', {
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
      },
      ...config
    });
    break;
  
  default:
    throw new Error(`Unknown environment: ${environment}`);
}