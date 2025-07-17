import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
export interface VpcConstructProps {
    environment: string;
    enableVpcFlowLogs?: boolean;
    enableNatGateway?: boolean;
}
export declare class VpcConstruct extends Construct {
    readonly vpc: ec2.Vpc;
    readonly privateSubnets: ec2.ISubnet[];
    readonly publicSubnets: ec2.ISubnet[];
    readonly databaseSubnets: ec2.ISubnet[];
    readonly securityGroups: {
        alb: ec2.SecurityGroup;
        ecs: ec2.SecurityGroup;
        rds: ec2.SecurityGroup;
        redis: ec2.SecurityGroup;
    };
    constructor(scope: Construct, id: string, props: VpcConstructProps);
    private createSecurityGroups;
    /**
     * Create VPC Endpoints for AWS services to reduce NAT Gateway costs
     */
    createVpcEndpoints(): void;
}
