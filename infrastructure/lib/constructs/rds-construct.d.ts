import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { RdsConfig } from '../config/environment-config';
export interface RdsConstructProps {
    vpc: ec2.IVpc;
    securityGroup: ec2.ISecurityGroup;
    rdsConfig: RdsConfig;
    environment: string;
}
export declare class RdsConstruct extends Construct {
    readonly database: rds.DatabaseInstance;
    readonly databaseCredentials: secretsmanager.ISecret;
    readonly databaseEndpoint: string;
    readonly databasePort: number;
    constructor(scope: Construct, id: string, props: RdsConstructProps);
    private createDatabaseCredentials;
    private createSubnetGroup;
    private createParameterGroup;
    private createDatabase;
    private createCloudWatchAlarms;
    private createOutputs;
    /**
     * Get the database connection string for the application
     */
    getDatabaseUrl(): string;
    /**
     * Create a read replica for scaling (production use)
     */
    createReadReplica(environment: string): rds.DatabaseInstanceReadReplica;
}
