import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { VpcConfig } from '../config/environment-config';
export interface VpcConstructProps {
    vpcConfig: VpcConfig;
    environment: string;
}
export declare class VpcConstruct extends Construct {
    readonly vpc: ec2.Vpc;
    readonly privateSubnets: ec2.ISubnet[];
    readonly publicSubnets: ec2.ISubnet[];
    constructor(scope: Construct, id: string, props: VpcConstructProps);
    private addVpcEndpoints;
    private tagSubnets;
    private addVpcFlowLogs;
    /**
     * Create a database subnet group from isolated subnets
     */
    createDatabaseSubnetGroup(): cdk.aws_rds.SubnetGroup;
    /**
     * Create an ElastiCache subnet group from private subnets
     */
    createCacheSubnetGroup(): cdk.aws_elasticache.CfnSubnetGroup;
}
