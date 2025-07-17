import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
export interface SecurityGroupsConstructProps {
    vpc: ec2.IVpc;
    environment: string;
}
export declare class SecurityGroupsConstruct extends Construct {
    readonly albSecurityGroup: ec2.SecurityGroup;
    readonly ecsSecurityGroup: ec2.SecurityGroup;
    readonly rdsSecurityGroup: ec2.SecurityGroup;
    readonly redisSecurityGroup: ec2.SecurityGroup;
    constructor(scope: Construct, id: string, props: SecurityGroupsConstructProps);
    private createAlbSecurityGroup;
    private createEcsSecurityGroup;
    private createRdsSecurityGroup;
    private createRedisSecurityGroup;
    private configureSecurityGroupRules;
    private addCommonTags;
    /**
     * Create a security group for bastion host (if needed for debugging)
     */
    createBastionSecurityGroup(vpc: ec2.IVpc, environment: string): ec2.SecurityGroup;
    /**
     * Add additional ingress rules for development/debugging
     */
    addDevelopmentRules(): void;
    /**
     * Add production-specific security rules
     */
    addProductionRules(): void;
}
