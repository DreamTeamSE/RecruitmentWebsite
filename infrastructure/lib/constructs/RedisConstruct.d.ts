import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { RedisConfig } from '../config/EnvironmentConfig';
export interface RedisConstructProps {
    vpc: ec2.Vpc;
    securityGroup: ec2.SecurityGroup;
    config: RedisConfig;
    environment: string;
    kmsKey?: kms.Key;
    alertsTopic?: sns.Topic;
}
export declare class RedisConstruct extends Construct {
    readonly cluster: elasticache.CfnReplicationGroup;
    readonly subnetGroup: elasticache.CfnSubnetGroup;
    readonly parameterGroup: elasticache.CfnParameterGroup;
    readonly endpoint: string;
    readonly port: number;
    constructor(scope: Construct, id: string, props: RedisConstructProps);
    private createCloudWatchAlarms;
    /**
     * Get the Redis connection string
     */
    getConnectionString(): string;
    /**
     * Get the Redis configuration for application
     */
    getRedisConfig(): {
        [key: string]: any;
    };
}
