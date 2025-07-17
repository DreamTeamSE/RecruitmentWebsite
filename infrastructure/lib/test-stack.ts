import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class TestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Simple S3 bucket to test deployment
    const testBucket = new s3.Bucket(this, 'TestBucket', {
      bucketName: `recruitment-test-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new cdk.CfnOutput(this, 'TestBucketName', {
      value: testBucket.bucketName,
      description: 'Test bucket name',
    });
  }
}