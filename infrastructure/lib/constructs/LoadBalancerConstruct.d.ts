import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';
export interface LoadBalancerConstructProps {
    vpc: ec2.Vpc;
    securityGroup: ec2.SecurityGroup;
    environment: string;
    domainName?: string;
    certificateArn?: string;
    alertsTopic?: sns.Topic;
    webAcl?: wafv2.CfnWebACL;
}
export declare class LoadBalancerConstruct extends Construct {
    readonly loadBalancer: elbv2.ApplicationLoadBalancer;
    readonly targetGroup: elbv2.ApplicationTargetGroup;
    readonly httpsListener: elbv2.ApplicationListener;
    readonly httpListener: elbv2.ApplicationListener;
    readonly certificate?: acm.Certificate;
    constructor(scope: Construct, id: string, props: LoadBalancerConstructProps);
    private addListenerRules;
    private createDnsRecord;
    private createCloudWatchAlarms;
    private enableAccessLogs;
    /**
     * Add custom listener rule
     */
    addListenerRule(id: string, priority: number, conditions: elbv2.ListenerCondition[], action: elbv2.ListenerAction): void;
    /**
     * Get the load balancer DNS name
     */
    getDnsName(): string;
    /**
     * Get the load balancer ARN
     */
    getArn(): string;
}
