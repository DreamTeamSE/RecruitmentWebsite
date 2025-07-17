import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { RedisConfig } from '../config/types';
export interface RedisConstructProps {
    config: RedisConfig;
    environmentName: string;
    vpc: ec2.Vpc;
    securityGroup: ec2.SecurityGroup;
    enableEncryption?: boolean;
    enableLogging?: boolean;
    kmsKey?: kms.Key;
}
export declare class RedisConstruct extends Construct {
    readonly redis: elasticache.CfnCacheCluster;
    readonly subnetGroup: elasticache.CfnSubnetGroup;
    readonly parameterGroup: elasticache.CfnParameterGroup;
    readonly logGroup?: logs.LogGroup;
    readonly encryptionKey?: kms.Key;
    constructor(scope: Construct, id: string, props: RedisConstructProps);
    private createKmsKey;
    private createRedisAlarms;
    private addTags;
    getRedisEndpoint(): string;
    getRedisPort(): string;
    addConnectionFromSecurityGroup(securityGroup: ec2.SecurityGroup, description: string): void;
}
