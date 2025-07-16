import * as cdk from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

export interface WafConstructProps {
  environment: string;
  scope: 'REGIONAL' | 'CLOUDFRONT';
  alertsTopic?: sns.Topic;
  enableLogging?: boolean;
}

export class WafConstruct extends Construct {
  public readonly webAcl: wafv2.CfnWebACL;
  public readonly ipSet: wafv2.CfnIPSet;
  public readonly logGroup?: logs.LogGroup;
  public readonly logBucket?: s3.Bucket;

  constructor(scope: Construct, id: string, props: WafConstructProps) {
    super(scope, id);

    // Create IP set for known bad IPs
    this.ipSet = new wafv2.CfnIPSet(this, 'MaliciousIPSet', {
      name: `recruitment-malicious-ips-${props.environment}`,
      scope: props.scope,
      ipAddressVersion: 'IPV4',
      addresses: [
        // Add known malicious IPs here
        '192.0.2.0/24', // Example reserved IP block
      ],
      description: 'Known malicious IP addresses',
    });

    // Create WAF Web ACL
    this.webAcl = new wafv2.CfnWebACL(this, 'WebACL', {
      name: `recruitment-waf-${props.environment}`,
      scope: props.scope,
      defaultAction: {
        allow: {},
      },
      description: `WAF rules for recruitment website ${props.environment}`,
      
      rules: [
        // 1. Block malicious IPs
        {
          name: 'BlockMaliciousIPs',
          priority: 1,
          statement: {
            ipSetReferenceStatement: {
              arn: this.ipSet.attrArn,
            },
          },
          action: {
            block: {},
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'BlockMaliciousIPs',
          },
        },

        // 2. Rate limiting per IP
        {
          name: 'RateLimitPerIP',
          priority: 2,
          statement: {
            rateBasedStatement: {
              limit: 2000, // 2000 requests per 5 minutes
              aggregateKeyType: 'IP',
            },
          },
          action: {
            block: {},
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitPerIP',
          },
        },

        // 3. AWS Managed Rules - Core Rule Set
        {
          name: 'AWSManagedRulesCore',
          priority: 3,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
              excludedRules: [
                // Exclude rules that might cause false positives
                { name: 'SizeRestrictions_BODY' },
                { name: 'GenericRFI_BODY' },
              ],
            },
          },
          action: {
            block: {},
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesCore',
          },
        },

        // 4. AWS Managed Rules - Known Bad Inputs
        {
          name: 'AWSManagedRulesKnownBadInputs',
          priority: 4,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          action: {
            block: {},
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesKnownBadInputs',
          },
        },

        // 5. AWS Managed Rules - SQL Injection
        {
          name: 'AWSManagedRulesSQLi',
          priority: 5,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesSQLiRuleSet',
            },
          },
          action: {
            block: {},
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesSQLi',
          },
        },

        // 6. AWS Managed Rules - Linux Operating System
        {
          name: 'AWSManagedRulesLinux',
          priority: 6,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesLinuxRuleSet',
            },
          },
          action: {
            block: {},
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesLinux',
          },
        },

        // 7. AWS Managed Rules - Amazon IP Reputation
        {
          name: 'AWSManagedRulesAmazonIpReputation',
          priority: 7,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesAmazonIpReputationList',
            },
          },
          action: {
            block: {},
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesAmazonIpReputation',
          },
        },

        // 8. Block requests to admin paths
        {
          name: 'BlockAdminPaths',
          priority: 8,
          statement: {
            byteMatchStatement: {
              searchString: '/admin',
              fieldToMatch: {
                uriPath: {},
              },
              textTransformations: [
                {
                  priority: 0,
                  type: 'LOWERCASE',
                },
              ],
              positionalConstraint: 'STARTS_WITH',
            },
          },
          action: {
            block: {},
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'BlockAdminPaths',
          },
        },

        // 9. Block requests with suspicious user agents
        {
          name: 'BlockSuspiciousUserAgents',
          priority: 9,
          statement: {
            orStatement: {
              statements: [
                {
                  byteMatchStatement: {
                    searchString: 'bot',
                    fieldToMatch: {
                      singleHeader: {
                        name: 'user-agent',
                      },
                    },
                    textTransformations: [
                      {
                        priority: 0,
                        type: 'LOWERCASE',
                      },
                    ],
                    positionalConstraint: 'CONTAINS',
                  },
                },
                {
                  byteMatchStatement: {
                    searchString: 'scanner',
                    fieldToMatch: {
                      singleHeader: {
                        name: 'user-agent',
                      },
                    },
                    textTransformations: [
                      {
                        priority: 0,
                        type: 'LOWERCASE',
                      },
                    ],
                    positionalConstraint: 'CONTAINS',
                  },
                },
              ],
            },
          },
          action: {
            block: {},
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'BlockSuspiciousUserAgents',
          },
        },

        // 10. Geo-blocking for high-risk countries
        {
          name: 'GeoBlocking',
          priority: 10,
          statement: {
            geoMatchStatement: {
              countryCodes: ['CN', 'RU', 'KP', 'IR'], // Block China, Russia, North Korea, Iran
            },
          },
          action: {
            block: {},
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'GeoBlocking',
          },
        },

        // 11. Block requests with no user agent
        {
          name: 'BlockNoUserAgent',
          priority: 11,
          statement: {
            byteMatchStatement: {
              searchString: '',
              fieldToMatch: {
                singleHeader: {
                  name: 'user-agent',
                },
              },
              textTransformations: [
                {
                  priority: 0,
                  type: 'NONE',
                },
              ],
              positionalConstraint: 'EXACTLY',
            },
          },
          action: {
            block: {},
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'BlockNoUserAgent',
          },
        },

        // 12. Size restrictions
        {
          name: 'SizeRestrictions',
          priority: 12,
          statement: {
            orStatement: {
              statements: [
                {
                  sizeConstraintStatement: {
                    fieldToMatch: {
                      body: {},
                    },
                    comparisonOperator: 'GT',
                    size: 8192, // 8KB limit for body
                    textTransformations: [
                      {
                        priority: 0,
                        type: 'NONE',
                      },
                    ],
                  },
                },
                {
                  sizeConstraintStatement: {
                    fieldToMatch: {
                      uriPath: {},
                    },
                    comparisonOperator: 'GT',
                    size: 1024, // 1KB limit for URI path
                    textTransformations: [
                      {
                        priority: 0,
                        type: 'NONE',
                      },
                    ],
                  },
                },
              ],
            },
          },
          action: {
            block: {},
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'SizeRestrictions',
          },
        },
      ],

      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `recruitment-waf-${props.environment}`,
      },
    });

    // Create logging configuration if enabled
    if (props.enableLogging !== false) {
      this.setupLogging(props.environment);
    }

    // Create CloudWatch alarms
    this.createCloudWatchAlarms(props.alertsTopic, props.environment);

    // Add tags
    cdk.Tags.of(this.webAcl).add('Component', 'WAF');
    cdk.Tags.of(this.ipSet).add('Component', 'WAF');
  }

  private setupLogging(environment: string): void {
    // Create KMS key for log encryption
    const kmsKey = new kms.Key(this, 'LogsKmsKey', {
      description: `WAF logs encryption key for ${environment}`,
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create CloudWatch log group
    this.logGroup = new logs.LogGroup(this, 'WAFLogGroup', {
      logGroupName: `/aws/waf/recruitment-${environment}`,
      retention: logs.RetentionDays.ONE_MONTH,
      encryptionKey: kmsKey,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create S3 bucket for long-term storage
    this.logBucket = new s3.Bucket(this, 'WAFLogsBucket', {
      bucketName: `recruitment-waf-logs-${environment}-${cdk.Aws.ACCOUNT_ID}`,
      versioned: false,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: kmsKey,
      lifecycleRules: [
        {
          id: 'DeleteOldLogs',
          enabled: true,
          expiration: cdk.Duration.days(90),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Create WAF logging configuration
    new wafv2.CfnLoggingConfiguration(this, 'WAFLoggingConfiguration', {
      resourceArn: this.webAcl.attrArn,
      logDestinationConfigs: [
        this.logGroup.logGroupArn,
      ],
      redactedFields: [
        {
          singleHeader: {
            name: 'authorization',
          },
        },
        {
          singleHeader: {
            name: 'cookie',
          },
        },
      ],
    });
  }

  private createCloudWatchAlarms(alertsTopic: sns.Topic | undefined, environment: string): void {
    if (!alertsTopic) return;

    // Create alarms for each WAF rule
    const ruleNames = [
      'BlockMaliciousIPs',
      'RateLimitPerIP',
      'AWSManagedRulesCore',
      'AWSManagedRulesKnownBadInputs',
      'AWSManagedRulesSQLi',
      'AWSManagedRulesLinux',
      'AWSManagedRulesAmazonIpReputation',
      'BlockAdminPaths',
      'BlockSuspiciousUserAgents',
      'GeoBlocking',
      'BlockNoUserAgent',
      'SizeRestrictions',
    ];

    ruleNames.forEach((ruleName) => {
      const alarm = new cloudwatch.Alarm(this, `${ruleName}Alarm`, {
        metric: new cloudwatch.Metric({
          namespace: 'AWS/WAFV2',
          metricName: 'BlockedRequests',
          dimensionsMap: {
            WebACL: `recruitment-waf-${environment}`,
            Rule: ruleName,
          },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 100, // Threshold for blocked requests
        evaluationPeriods: 2,
        alarmDescription: `High number of blocked requests for WAF rule: ${ruleName}`,
      });
      alarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));
    });

    // General blocked requests alarm
    const generalBlockedAlarm = new cloudwatch.Alarm(this, 'GeneralBlockedRequestsAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/WAFV2',
        metricName: 'BlockedRequests',
        dimensionsMap: {
          WebACL: `recruitment-waf-${environment}`,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 500, // Total blocked requests threshold
      evaluationPeriods: 2,
      alarmDescription: 'High number of total blocked requests',
    });
    generalBlockedAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));

    // Allowed requests alarm (for monitoring traffic)
    const allowedRequestsAlarm = new cloudwatch.Alarm(this, 'AllowedRequestsAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/WAFV2',
        metricName: 'AllowedRequests',
        dimensionsMap: {
          WebACL: `recruitment-waf-${environment}`,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10000, // High traffic threshold
      evaluationPeriods: 2,
      alarmDescription: 'Unusually high traffic volume',
    });
    allowedRequestsAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));
  }

  /**
   * Add IP addresses to the malicious IP set
   */
  public addMaliciousIPs(ipAddresses: string[]): void {
    // This would typically be done through a Lambda function
    // that updates the IP set based on threat intelligence
    console.log('Adding malicious IPs:', ipAddresses);
  }

  /**
   * Get the Web ACL ARN
   */
  public getWebAclArn(): string {
    return this.webAcl.attrArn;
  }

  /**
   * Get the Web ACL ID
   */
  public getWebAclId(): string {
    return this.webAcl.attrId;
  }
}