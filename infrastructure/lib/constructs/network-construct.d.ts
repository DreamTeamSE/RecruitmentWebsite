import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';
import { NetworkConfig } from '../config/types';
export interface NetworkConstructProps {
    config: NetworkConfig;
    environmentName: string;
    enableVpcFlowLogs?: boolean;
}
export declare class NetworkConstruct extends Construct {
    readonly vpc: ec2.Vpc;
    readonly cluster: ecs.Cluster;
    readonly loadBalancer: elbv2.ApplicationLoadBalancer;
    readonly backendSecurityGroup: ec2.SecurityGroup;
    readonly databaseSecurityGroup: ec2.SecurityGroup;
    readonly redisSecurityGroup: ec2.SecurityGroup;
    readonly publicSubnets: ec2.ISubnet[];
    readonly privateSubnets: ec2.ISubnet[];
    readonly isolatedSubnets: ec2.ISubnet[];
    constructor(scope: Construct, id: string, props: NetworkConstructProps);
    private setupSecurityGroupRules;
    private createLoadBalancerSecurityGroup;
    private addTags;
    addSecurityGroupRule(securityGroup: ec2.SecurityGroup, peer: ec2.IPeer, port: ec2.Port, description: string): void;
    createCustomSecurityGroup(name: string, description: string): ec2.SecurityGroup;
}
