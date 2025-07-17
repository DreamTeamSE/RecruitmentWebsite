import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';
import { EcsConfig } from '../config/environment-config';
export interface AlbConstructProps {
    vpc: ec2.IVpc;
    securityGroup: ec2.ISecurityGroup;
    ecsService: ecs.FargateService;
    ecsContainer: ecs.ContainerDefinition;
    ecsConfig: EcsConfig;
    environment: string;
    domainName?: string;
    certificateArn?: string;
}
export declare class AlbConstruct extends Construct {
    readonly loadBalancer: elbv2.ApplicationLoadBalancer;
    readonly listener: elbv2.ApplicationListener;
    readonly targetGroup: elbv2.ApplicationTargetGroup;
    readonly dnsName: string;
    constructor(scope: Construct, id: string, props: AlbConstructProps);
    private createLoadBalancer;
    private createTargetGroup;
    private createListener;
    private attachEcsService;
    private createCloudWatchAlarms;
    private setupCustomDomain;
    private createOutputs;
    /**
     * Add additional listener rules for path-based routing
     */
    addPathRule(pathPattern: string, targetGroup: elbv2.ApplicationTargetGroup, priority: number): void;
    /**
     * Add additional listener rules for host-based routing
     */
    addHostRule(hostHeader: string, targetGroup: elbv2.ApplicationTargetGroup, priority: number): void;
    /**
     * Enable WAF for additional security
     */
    enableWaf(environment: string): void;
}
