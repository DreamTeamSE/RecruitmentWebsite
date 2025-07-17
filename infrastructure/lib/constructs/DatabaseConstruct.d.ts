import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { DatabaseConfig } from '../config/EnvironmentConfig';
export interface DatabaseConstructProps {
    vpc: ec2.Vpc;
    securityGroup: ec2.SecurityGroup;
    config: DatabaseConfig;
    environment: string;
    kmsKey?: kms.Key;
    alertsTopic?: sns.Topic;
}
export declare class DatabaseConstruct extends Construct {
    readonly instance: rds.DatabaseInstance;
    readonly secret: secretsmanager.Secret;
    readonly subnetGroup: rds.SubnetGroup;
    readonly parameterGroup: rds.ParameterGroup;
    readonly optionGroup: rds.OptionGroup;
    readonly readReplicas: rds.DatabaseInstance[];
    constructor(scope: Construct, id: string, props: DatabaseConstructProps);
    private createReadReplicas;
    private createCloudWatchAlarms;
    private createBackupMonitoring;
    /**
     * Create a database migration Lambda function
     */
    createMigrationFunction(): void;
}
