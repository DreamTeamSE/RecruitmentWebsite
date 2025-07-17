import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
export interface CloudFrontConstructProps {
    environment: string;
    domainName?: string;
    certificateArn?: string;
    albDomainName: string;
    webAcl?: wafv2.CfnWebACL;
    alertsTopic?: sns.Topic;
}
export declare class CloudFrontConstruct extends Construct {
    readonly distribution: cloudfront.Distribution;
    readonly s3Bucket: s3.Bucket;
    readonly originAccessIdentity: cloudfront.OriginAccessIdentity;
    readonly certificate?: acm.Certificate;
    constructor(scope: Construct, id: string, props: CloudFrontConstructProps);
    private createLogBucket;
    private createDnsRecords;
    private createCloudWatchAlarms;
    /**
     * Get the CloudFront distribution domain name
     */
    getDomainName(): string;
    /**
     * Get the CloudFront distribution ID
     */
    getDistributionId(): string;
    /**
     * Get the S3 bucket for static assets
     */
    getStaticAssetsBucket(): s3.Bucket;
}
