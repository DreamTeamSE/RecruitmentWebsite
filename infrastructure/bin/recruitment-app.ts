#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SimpleRecruitmentStack } from '../lib/simple-recruitment-stack';

const app = new cdk.App();

// Create the simplified recruitment infrastructure
new SimpleRecruitmentStack(app, 'RecruitmentStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-2',
  },
});