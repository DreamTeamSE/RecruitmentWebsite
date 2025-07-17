import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';
import { EcsConfig } from '../config/types';
export interface EcsConstructProps {
    config: EcsConfig;
    environmentName: string;
    vpc: ec2.Vpc;
    cluster: ecs.Cluster;
    loadBalancer: elbv2.ApplicationLoadBalancer;
    securityGroup: ec2.SecurityGroup;
    databaseSecret: secretsmanager.Secret;
    redisEndpoint: string;
    enableXRay?: boolean;
    enableLogging?: boolean;
    enableServiceDiscovery?: boolean;
}
export declare class EcsConstruct extends Construct {
    readonly service: ecs.FargateService;
    readonly taskDefinition: ecs.FargateTaskDefinition;
    readonly taskRole: iam.Role;
    readonly executionRole: iam.Role;
    readonly repository: ecr.Repository;
    readonly logGroup: logs.LogGroup;
    readonly targetGroup: elbv2.ApplicationTargetGroup;
    readonly listener: elbv2.ApplicationListener;
    readonly serviceDiscovery?: servicediscovery.Service;
    readonly autoScalingTarget: ecs.ScalableTaskCount;
    constructor(scope: Construct, id: string, props: EcsConstructProps);
    private createServiceAlarms;
    private addTags;
    getServiceUrl(): string;
    addEnvironmentVariable(name: string, value: string): void;
    addSecret(name: string, secret: ecs.Secret): void;
    addContainerPort(port: number, protocol?: ecs.Protocol): void;
    private get loadBalancer();
}
