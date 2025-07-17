import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { DatabaseConstruct } from '../constructs/database-construct';
import { RedisConstruct } from '../constructs/redis-construct';
import { DatabaseStackProps } from '../config/types';
export declare class RecruitmentDataStack extends cdk.Stack {
    readonly database: cdk.aws_rds.DatabaseInstance;
    readonly redis: cdk.aws_elasticache.CfnCacheCluster;
    readonly assetsBucket: s3.Bucket;
    readonly backupBucket: s3.Bucket;
    readonly databaseConstruct: DatabaseConstruct;
    readonly redisConstruct: RedisConstruct;
    constructor(scope: Construct, id: string, props: DatabaseStackProps);
    private addTags;
}
