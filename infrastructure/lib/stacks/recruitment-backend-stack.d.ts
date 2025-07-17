import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EcsConstruct } from '../constructs/ecs-construct';
import { BackendStackProps } from '../config/types';
export declare class RecruitmentBackendStack extends cdk.Stack {
    readonly backendService: cdk.aws_ecs.FargateService;
    readonly backendUrl: string;
    readonly ecsConstruct: EcsConstruct;
    constructor(scope: Construct, id: string, props: BackendStackProps);
    private createSSMParameters;
    private getCorsOrigins;
    private addTags;
}
