import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { DatabaseConfig } from '../config/types';
export interface DatabaseConstructProps {
    config: DatabaseConfig;
    environmentName: string;
    vpc: ec2.Vpc;
    securityGroup: ec2.SecurityGroup;
    enableEncryption?: boolean;
    enablePerformanceInsights?: boolean;
    enableEnhancedMonitoring?: boolean;
    enableBackups?: boolean;
    enableLogging?: boolean;
    kmsKey?: kms.Key;
}
export declare class DatabaseConstruct extends Construct {
    readonly database: rds.DatabaseInstance;
    readonly secret: secretsmanager.Secret;
    readonly subnetGroup: rds.SubnetGroup;
    readonly parameterGroup: rds.ParameterGroup;
    readonly optionGroup?: rds.OptionGroup;
    readonly logGroup?: logs.LogGroup;
    readonly monitoringRole?: cdk.aws_iam.Role;
    constructor(scope: Construct, id: string, props: DatabaseConstructProps);
    private createKmsKey;
    private getInstanceSize;
    private createDatabaseAlarms;
    private addTags;
    createReadReplica(id: string, config: DatabaseConfig): rds.DatabaseInstanceReadReplica;
    addDatabaseConnectionFromSecurityGroup(securityGroup: ec2.SecurityGroup, description: string): void;
}
