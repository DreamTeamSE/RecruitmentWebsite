import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { EcsConfig } from '../config/EnvironmentConfig';
export interface EcsConstructProps {
    vpc: ec2.Vpc;
    securityGroup: ec2.SecurityGroup;
    albTargetGroup: elbv2.ApplicationTargetGroup;
    config: EcsConfig;
    environment: string;
    secrets: {
        databaseSecret: secretsmanager.Secret;
        jwtSecret: secretsmanager.Secret;
        smtpSecret: secretsmanager.Secret;
    };
    redisEndpoint?: string;
}
export declare class EcsConstruct extends Construct {
    readonly cluster: ecs.Cluster;
    readonly service: ecs.FargateService;
    readonly taskDefinition: ecs.FargateTaskDefinition;
    readonly repository: ecr.Repository;
    constructor(scope: Construct, id: string, props: EcsConstructProps);
    private setupAutoScaling;
    /**
     * Create a scheduled task for database migrations
     */
    createMigrationTask(): ecs.FargateTaskDefinition;
}
