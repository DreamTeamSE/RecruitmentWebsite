import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentConfig } from '../config/types';
export interface RecruitmentProdStackProps extends cdk.StackProps {
    config: EnvironmentConfig;
}
export declare class RecruitmentProdStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: RecruitmentProdStackProps);
}
