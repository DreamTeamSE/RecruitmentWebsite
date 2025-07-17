import * as cdk from 'aws-cdk-lib';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import { Construct } from 'constructs';
import { FrontendStackProps } from '../config/types';
export declare class RecruitmentFrontendStack extends cdk.Stack {
    readonly amplifyApp: amplify.App;
    readonly frontendUrl: string;
    readonly mainBranch: amplify.Branch;
    readonly customDomain?: amplify.Domain;
    constructor(scope: Construct, id: string, props: FrontendStackProps);
    private getStageFromEnvironment;
    private getNextAuthUrl;
    private generateNextAuthSecret;
    private addEnvironmentBranches;
    private addSecurityHeaders;
    private addTags;
}
