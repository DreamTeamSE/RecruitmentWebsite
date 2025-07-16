import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { DatabaseConstruct } from '../constructs/database-construct';
import { RedisConstruct } from '../constructs/redis-construct';
import { DatabaseStackProps } from '../config/types';

export class RecruitmentDataStack extends cdk.Stack {
  public readonly database: cdk.aws_rds.DatabaseInstance;
  public readonly redis: cdk.aws_elasticache.CfnCacheCluster;
  public readonly assetsBucket: s3.Bucket;
  public readonly backupBucket: s3.Bucket;
  public readonly databaseConstruct: DatabaseConstruct;
  public readonly redisConstruct: RedisConstruct;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // Create S3 bucket for assets
    this.assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
      bucketName: `recruitment-${props.config.environmentName}-assets-${cdk.Aws.ACCOUNT_ID}`,
      removalPolicy: props.config.environmentName === 'prod' ? 
        cdk.RemovalPolicy.RETAIN : 
        cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.config.environmentName !== 'prod',
      versioned: props.config.environmentName === 'prod',
      encryption: props.config.security.enableEncryption ? 
        s3.BucketEncryption.S3_MANAGED : 
        s3.BucketEncryption.UNENCRYPTED,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
          allowedOrigins: ['*'], // Should be restricted to your domain in production
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          id: 'DeleteIncompleteMultipartUploads',
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
        {
          id: 'TransitionToIA',
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
        },
      ],
    });

    // Create S3 bucket for backups if enabled
    if (props.config.security.enableBackupVault) {
      this.backupBucket = new s3.Bucket(this, 'BackupBucket', {
        bucketName: `recruitment-${props.config.environmentName}-backups-${cdk.Aws.ACCOUNT_ID}`,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        versioned: true,
        encryption: s3.BucketEncryption.KMS_MANAGED,
        publicReadAccess: false,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        lifecycleRules: [
          {
            id: 'DeleteOldBackups',
            expiration: cdk.Duration.days(props.config.security.backupRetentionDays),
          },
          {
            id: 'TransitionToGlacier',
            transitions: [
              {
                storageClass: s3.StorageClass.GLACIER,
                transitionAfter: cdk.Duration.days(90),
              },
            ],
          },
        ],
      });
    }

    // Create database construct
    this.databaseConstruct = new DatabaseConstruct(this, 'Database', {
      config: props.config.database,
      environmentName: props.config.environmentName,
      vpc: props.vpc,
      securityGroup: props.databaseSecurityGroup,
      enableEncryption: props.config.security.enableEncryption,
      enablePerformanceInsights: props.config.monitoring.enablePerformanceInsights,
      enableEnhancedMonitoring: props.config.monitoring.enableEnhancedMonitoring,
      enableBackups: props.config.security.enableBackupVault,
      enableLogging: props.config.monitoring.enableEnhancedMonitoring,
    });

    this.database = this.databaseConstruct.database;

    // Create Redis construct
    this.redisConstruct = new RedisConstruct(this, 'Redis', {
      config: props.config.redis,
      environmentName: props.config.environmentName,
      vpc: props.vpc,
      securityGroup: props.redisSecurityGroup,
      enableEncryption: props.config.security.enableEncryption,
      enableLogging: props.config.monitoring.enableEnhancedMonitoring,
    });

    this.redis = this.redisConstruct.redis;

    // Create CloudFormation outputs
    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.database.instanceEndpoint.hostname,
      description: 'Database endpoint',
      exportName: `${props.config.environmentName}-database-endpoint`,
    });

    new cdk.CfnOutput(this, 'DatabasePort', {
      value: this.database.instanceEndpoint.port.toString(),
      description: 'Database port',
      exportName: `${props.config.environmentName}-database-port`,
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: this.databaseConstruct.secret.secretArn,
      description: 'Database secret ARN',
      exportName: `${props.config.environmentName}-database-secret-arn`,
    });

    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: this.redisConstruct.getRedisEndpoint(),
      description: 'Redis endpoint',
      exportName: `${props.config.environmentName}-redis-endpoint`,
    });

    new cdk.CfnOutput(this, 'RedisPort', {
      value: this.redisConstruct.getRedisPort(),
      description: 'Redis port',
      exportName: `${props.config.environmentName}-redis-port`,
    });

    new cdk.CfnOutput(this, 'AssetsBucketName', {
      value: this.assetsBucket.bucketName,
      description: 'Assets bucket name',
      exportName: `${props.config.environmentName}-assets-bucket-name`,
    });

    new cdk.CfnOutput(this, 'AssetsBucketArn', {
      value: this.assetsBucket.bucketArn,
      description: 'Assets bucket ARN',
      exportName: `${props.config.environmentName}-assets-bucket-arn`,
    });

    if (this.backupBucket) {
      new cdk.CfnOutput(this, 'BackupBucketName', {
        value: this.backupBucket.bucketName,
        description: 'Backup bucket name',
        exportName: `${props.config.environmentName}-backup-bucket-name`,
      });

      new cdk.CfnOutput(this, 'BackupBucketArn', {
        value: this.backupBucket.bucketArn,
        description: 'Backup bucket ARN',
        exportName: `${props.config.environmentName}-backup-bucket-arn`,
      });
    }

    // Add tags
    this.addTags(props.config.environmentName);
  }

  private addTags(environmentName: string): void {
    const tags = {
      Environment: environmentName,
      Component: 'Data',
      ManagedBy: 'CDK',
    };

    Object.entries(tags).forEach(([key, value]) => {
      cdk.Tags.of(this.assetsBucket).add(key, value);
      if (this.backupBucket) {
        cdk.Tags.of(this.backupBucket).add(key, value);
      }
    });
  }
}