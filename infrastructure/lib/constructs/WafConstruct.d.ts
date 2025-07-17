import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
export interface WafConstructProps {
    environment: string;
    scope: 'REGIONAL' | 'CLOUDFRONT';
    alertsTopic?: sns.Topic;
    enableLogging?: boolean;
}
export declare class WafConstruct extends Construct {
    readonly webAcl: wafv2.CfnWebACL;
    readonly ipSet: wafv2.CfnIPSet;
    readonly logGroup?: logs.LogGroup;
    readonly logBucket?: s3.Bucket;
    constructor(scope: Construct, id: string, props: WafConstructProps);
    private setupLogging;
    private createCloudWatchAlarms;
    /**
     * Add IP addresses to the malicious IP set
     */
    addMaliciousIPs(ipAddresses: string[]): void;
    /**
     * Get the Web ACL ARN
     */
    getWebAclArn(): string;
    /**
     * Get the Web ACL ID
     */
    getWebAclId(): string;
}
