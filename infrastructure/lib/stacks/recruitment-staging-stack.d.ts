import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/types';
export interface RecruitmentStagingStackProps extends cdk.StackProps {
    config: EnvironmentConfig;
}
export declare class RecruitmentStagingStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: RecruitmentStagingStackProps);
}
