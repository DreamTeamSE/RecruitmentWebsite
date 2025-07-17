import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NetworkConstruct } from '../constructs/network-construct';
import { NetworkStackProps } from '../config/types';
export declare class RecruitmentNetworkStack extends cdk.Stack {
    readonly vpc: cdk.aws_ec2.Vpc;
    readonly cluster: cdk.aws_ecs.Cluster;
    readonly loadBalancer: cdk.aws_elasticloadbalancingv2.ApplicationLoadBalancer;
    readonly backendSecurityGroup: cdk.aws_ec2.SecurityGroup;
    readonly databaseSecurityGroup: cdk.aws_ec2.SecurityGroup;
    readonly redisSecurityGroup: cdk.aws_ec2.SecurityGroup;
    readonly networkConstruct: NetworkConstruct;
    constructor(scope: Construct, id: string, props: NetworkStackProps);
    private addEnvironmentSpecificSecurityRules;
}
