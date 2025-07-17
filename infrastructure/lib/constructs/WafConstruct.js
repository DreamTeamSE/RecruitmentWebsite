"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WafConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const wafv2 = __importStar(require("aws-cdk-lib/aws-wafv2"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const constructs_1 = require("constructs");
class WafConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
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
    setupLogging(environment) {
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
    createCloudWatchAlarms(alertsTopic, environment) {
        if (!alertsTopic)
            return;
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
    addMaliciousIPs(ipAddresses) {
        // This would typically be done through a Lambda function
        // that updates the IP set based on threat intelligence
        console.log('Adding malicious IPs:', ipAddresses);
    }
    /**
     * Get the Web ACL ARN
     */
    getWebAclArn() {
        return this.webAcl.attrArn;
    }
    /**
     * Get the Web ACL ID
     */
    getWebAclId() {
        return this.webAcl.attrId;
    }
}
exports.WafConstruct = WafConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV2FmQ29uc3RydWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiV2FmQ29uc3RydWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyw2REFBK0M7QUFDL0MsMkRBQTZDO0FBQzdDLHVEQUF5QztBQUN6Qyx5REFBMkM7QUFFM0MsdUVBQXlEO0FBQ3pELDJDQUF1QztBQVN2QyxNQUFhLFlBQWEsU0FBUSxzQkFBUztJQU16QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXdCO1FBQ2hFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsa0NBQWtDO1FBQ2xDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN0RCxJQUFJLEVBQUUsNkJBQTZCLEtBQUssQ0FBQyxXQUFXLEVBQUU7WUFDdEQsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO1lBQ2xCLGdCQUFnQixFQUFFLE1BQU07WUFDeEIsU0FBUyxFQUFFO2dCQUNULCtCQUErQjtnQkFDL0IsY0FBYyxFQUFFLDRCQUE0QjthQUM3QztZQUNELFdBQVcsRUFBRSw4QkFBOEI7U0FDNUMsQ0FBQyxDQUFDO1FBRUgscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUU7WUFDaEQsSUFBSSxFQUFFLG1CQUFtQixLQUFLLENBQUMsV0FBVyxFQUFFO1lBQzVDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztZQUNsQixhQUFhLEVBQUU7Z0JBQ2IsS0FBSyxFQUFFLEVBQUU7YUFDVjtZQUNELFdBQVcsRUFBRSxxQ0FBcUMsS0FBSyxDQUFDLFdBQVcsRUFBRTtZQUVyRSxLQUFLLEVBQUU7Z0JBQ0wseUJBQXlCO2dCQUN6QjtvQkFD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QUFFO1lBQzlFLE1BQU0sRUFBRSxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7Z0JBQzVCLFNBQVMsRUFBRSxXQUFXO2dCQUN0QixVQUFVLEVBQUUsaUJBQWlCO2dCQUM3QixhQUFhLEVBQUU7b0JBQ2IsTUFBTSxFQUFFLG1CQUFtQixXQUFXLEVBQUU7aUJBQ3pDO2dCQUNELFNBQVMsRUFBRSxLQUFLO2dCQUNoQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2FBQ2hDLENBQUM7WUFDRixTQUFTLEVBQUUsS0FBSyxFQUFFLHlCQUF5QjtZQUMzQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ3BCLGdCQUFnQixFQUFFLCtCQUErQjtTQUNsRCxDQUFDLENBQUM7UUFDSCxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxVQUFVLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDN0UsQ0FBQztJQUVEOztPQUVHO0lBQ0ksZUFBZSxDQUFDLFdBQXFCO1FBQzFDLHlEQUF5RDtRQUN6RCx1REFBdUQ7UUFDdkQsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRSxXQUFXLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxZQUFZO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7SUFDN0IsQ0FBQztJQUVEOztPQUVHO0lBQ0ksV0FBVztRQUNoQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQzVCLENBQUM7Q0FDRjtBQWxoQkQsb0NBa2hCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIHdhZnYyIGZyb20gJ2F3cy1jZGstbGliL2F3cy13YWZ2Mic7XHJcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xyXG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xyXG5pbXBvcnQgKiBhcyBrbXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWttcyc7XHJcbmltcG9ydCAqIGFzIHNucyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc25zJztcclxuaW1wb3J0ICogYXMgY2xvdWR3YXRjaCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWR3YXRjaCc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBXYWZDb25zdHJ1Y3RQcm9wcyB7XHJcbiAgZW52aXJvbm1lbnQ6IHN0cmluZztcclxuICBzY29wZTogJ1JFR0lPTkFMJyB8ICdDTE9VREZST05UJztcclxuICBhbGVydHNUb3BpYz86IHNucy5Ub3BpYztcclxuICBlbmFibGVMb2dnaW5nPzogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFdhZkNvbnN0cnVjdCBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgcHVibGljIHJlYWRvbmx5IHdlYkFjbDogd2FmdjIuQ2ZuV2ViQUNMO1xyXG4gIHB1YmxpYyByZWFkb25seSBpcFNldDogd2FmdjIuQ2ZuSVBTZXQ7XHJcbiAgcHVibGljIHJlYWRvbmx5IGxvZ0dyb3VwPzogbG9ncy5Mb2dHcm91cDtcclxuICBwdWJsaWMgcmVhZG9ubHkgbG9nQnVja2V0PzogczMuQnVja2V0O1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogV2FmQ29uc3RydWN0UHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIElQIHNldCBmb3Iga25vd24gYmFkIElQc1xyXG4gICAgdGhpcy5pcFNldCA9IG5ldyB3YWZ2Mi5DZm5JUFNldCh0aGlzLCAnTWFsaWNpb3VzSVBTZXQnLCB7XHJcbiAgICAgIG5hbWU6IGByZWNydWl0bWVudC1tYWxpY2lvdXMtaXBzLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcclxuICAgICAgc2NvcGU6IHByb3BzLnNjb3BlLFxyXG4gICAgICBpcEFkZHJlc3NWZXJzaW9uOiAnSVBWNCcsXHJcbiAgICAgIGFkZHJlc3NlczogW1xyXG4gICAgICAgIC8vIEFkZCBrbm93biBtYWxpY2lvdXMgSVBzIGhlcmVcclxuICAgICAgICAnMTkyLjAuMi4wLzI0JywgLy8gRXhhbXBsZSByZXNlcnZlZCBJUCBibG9ja1xyXG4gICAgICBdLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0tub3duIG1hbGljaW91cyBJUCBhZGRyZXNzZXMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIFdBRiBXZWIgQUNMXHJcbiAgICB0aGlzLndlYkFjbCA9IG5ldyB3YWZ2Mi5DZm5XZWJBQ0wodGhpcywgJ1dlYkFDTCcsIHtcclxuICAgICAgbmFtZTogYHJlY3J1aXRtZW50LXdhZi0ke3Byb3BzLmVudmlyb25tZW50fWAsXHJcbiAgICAgIHNjb3BlOiBwcm9wcy5zY29wZSxcclxuICAgICAgZGVmYXVsdEFjdGlvbjoge1xyXG4gICAgICAgIGFsbG93OiB7fSxcclxuICAgICAgfSxcclxuICAgICAgZGVzY3JpcHRpb246IGBXQUYgcnVsZXMgZm9yIHJlY3J1aXRtZW50IHdlYnNpdGUgJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxyXG4gICAgICBcclxuICAgICAgcnVsZXM6IFtcclxuICAgICAgICAvLyAxLiBCbG9jayBtYWxpY2lvdXMgSVBzXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgbmFtZTogJ0Jsb2NrTWFsaWNpb3VzSVBzJyxcclxuICAgICAgICAgIHByaW9yaXR5OiAxLFxyXG4gICAgICAgICAgc3RhdGVtZW50OiB7XHJcbiAgICAgICAgICAgIGlwU2V0UmVmZXJlbmNlU3RhdGVtZW50OiB7XHJcbiAgICAgICAgICAgICAgYXJuOiB0aGlzLmlwU2V0LmF0dHJBcm4sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYWN0aW9uOiB7XHJcbiAgICAgICAgICAgIGJsb2NrOiB7fSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XHJcbiAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIGNsb3VkV2F0Y2hNZXRyaWNzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0Jsb2NrTWFsaWNpb3VzSVBzJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLy8gMi4gUmF0ZSBsaW1pdGluZyBwZXIgSVBcclxuICAgICAgICB7XHJcbiAgICAgICAgICBuYW1lOiAnUmF0ZUxpbWl0UGVySVAnLFxyXG4gICAgICAgICAgcHJpb3JpdHk6IDIsXHJcbiAgICAgICAgICBzdGF0ZW1lbnQ6IHtcclxuICAgICAgICAgICAgcmF0ZUJhc2VkU3RhdGVtZW50OiB7XHJcbiAgICAgICAgICAgICAgbGltaXQ6IDIwMDAsIC8vIDIwMDAgcmVxdWVzdHMgcGVyIDUgbWludXRlc1xyXG4gICAgICAgICAgICAgIGFnZ3JlZ2F0ZUtleVR5cGU6ICdJUCcsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYWN0aW9uOiB7XHJcbiAgICAgICAgICAgIGJsb2NrOiB7fSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XHJcbiAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIGNsb3VkV2F0Y2hNZXRyaWNzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ1JhdGVMaW1pdFBlcklQJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLy8gMy4gQVdTIE1hbmFnZWQgUnVsZXMgLSBDb3JlIFJ1bGUgU2V0XHJcbiAgICAgICAge1xyXG4gICAgICAgICAgbmFtZTogJ0FXU01hbmFnZWRSdWxlc0NvcmUnLFxyXG4gICAgICAgICAgcHJpb3JpdHk6IDMsXHJcbiAgICAgICAgICBzdGF0ZW1lbnQ6IHtcclxuICAgICAgICAgICAgbWFuYWdlZFJ1bGVHcm91cFN0YXRlbWVudDoge1xyXG4gICAgICAgICAgICAgIHZlbmRvck5hbWU6ICdBV1MnLFxyXG4gICAgICAgICAgICAgIG5hbWU6ICdBV1NNYW5hZ2VkUnVsZXNDb21tb25SdWxlU2V0JyxcclxuICAgICAgICAgICAgICBleGNsdWRlZFJ1bGVzOiBbXHJcbiAgICAgICAgICAgICAgICAvLyBFeGNsdWRlIHJ1bGVzIHRoYXQgbWlnaHQgY2F1c2UgZmFsc2UgcG9zaXRpdmVzXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdTaXplUmVzdHJpY3Rpb25zX0JPRFknIH0sXHJcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdHZW5lcmljUkZJX0JPRFknIH0sXHJcbiAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBhY3Rpb246IHtcclxuICAgICAgICAgICAgYmxvY2s6IHt9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHZpc2liaWxpdHlDb25maWc6IHtcclxuICAgICAgICAgICAgc2FtcGxlZFJlcXVlc3RzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnQVdTTWFuYWdlZFJ1bGVzQ29yZScsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIC8vIDQuIEFXUyBNYW5hZ2VkIFJ1bGVzIC0gS25vd24gQmFkIElucHV0c1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIG5hbWU6ICdBV1NNYW5hZ2VkUnVsZXNLbm93bkJhZElucHV0cycsXHJcbiAgICAgICAgICBwcmlvcml0eTogNCxcclxuICAgICAgICAgIHN0YXRlbWVudDoge1xyXG4gICAgICAgICAgICBtYW5hZ2VkUnVsZUdyb3VwU3RhdGVtZW50OiB7XHJcbiAgICAgICAgICAgICAgdmVuZG9yTmFtZTogJ0FXUycsXHJcbiAgICAgICAgICAgICAgbmFtZTogJ0FXU01hbmFnZWRSdWxlc0tub3duQmFkSW5wdXRzUnVsZVNldCcsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYWN0aW9uOiB7XHJcbiAgICAgICAgICAgIGJsb2NrOiB7fSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XHJcbiAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIGNsb3VkV2F0Y2hNZXRyaWNzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0FXU01hbmFnZWRSdWxlc0tub3duQmFkSW5wdXRzJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLy8gNS4gQVdTIE1hbmFnZWQgUnVsZXMgLSBTUUwgSW5qZWN0aW9uXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgbmFtZTogJ0FXU01hbmFnZWRSdWxlc1NRTGknLFxyXG4gICAgICAgICAgcHJpb3JpdHk6IDUsXHJcbiAgICAgICAgICBzdGF0ZW1lbnQ6IHtcclxuICAgICAgICAgICAgbWFuYWdlZFJ1bGVHcm91cFN0YXRlbWVudDoge1xyXG4gICAgICAgICAgICAgIHZlbmRvck5hbWU6ICdBV1MnLFxyXG4gICAgICAgICAgICAgIG5hbWU6ICdBV1NNYW5hZ2VkUnVsZXNTUUxpUnVsZVNldCcsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYWN0aW9uOiB7XHJcbiAgICAgICAgICAgIGJsb2NrOiB7fSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XHJcbiAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIGNsb3VkV2F0Y2hNZXRyaWNzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0FXU01hbmFnZWRSdWxlc1NRTGknLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvLyA2LiBBV1MgTWFuYWdlZCBSdWxlcyAtIExpbnV4IE9wZXJhdGluZyBTeXN0ZW1cclxuICAgICAgICB7XHJcbiAgICAgICAgICBuYW1lOiAnQVdTTWFuYWdlZFJ1bGVzTGludXgnLFxyXG4gICAgICAgICAgcHJpb3JpdHk6IDYsXHJcbiAgICAgICAgICBzdGF0ZW1lbnQ6IHtcclxuICAgICAgICAgICAgbWFuYWdlZFJ1bGVHcm91cFN0YXRlbWVudDoge1xyXG4gICAgICAgICAgICAgIHZlbmRvck5hbWU6ICdBV1MnLFxyXG4gICAgICAgICAgICAgIG5hbWU6ICdBV1NNYW5hZ2VkUnVsZXNMaW51eFJ1bGVTZXQnLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGFjdGlvbjoge1xyXG4gICAgICAgICAgICBibG9jazoge30sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgdmlzaWJpbGl0eUNvbmZpZzoge1xyXG4gICAgICAgICAgICBzYW1wbGVkUmVxdWVzdHNFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICBjbG91ZFdhdGNoTWV0cmljc0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdBV1NNYW5hZ2VkUnVsZXNMaW51eCcsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIC8vIDcuIEFXUyBNYW5hZ2VkIFJ1bGVzIC0gQW1hem9uIElQIFJlcHV0YXRpb25cclxuICAgICAgICB7XHJcbiAgICAgICAgICBuYW1lOiAnQVdTTWFuYWdlZFJ1bGVzQW1hem9uSXBSZXB1dGF0aW9uJyxcclxuICAgICAgICAgIHByaW9yaXR5OiA3LFxyXG4gICAgICAgICAgc3RhdGVtZW50OiB7XHJcbiAgICAgICAgICAgIG1hbmFnZWRSdWxlR3JvdXBTdGF0ZW1lbnQ6IHtcclxuICAgICAgICAgICAgICB2ZW5kb3JOYW1lOiAnQVdTJyxcclxuICAgICAgICAgICAgICBuYW1lOiAnQVdTTWFuYWdlZFJ1bGVzQW1hem9uSXBSZXB1dGF0aW9uTGlzdCcsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYWN0aW9uOiB7XHJcbiAgICAgICAgICAgIGJsb2NrOiB7fSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XHJcbiAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIGNsb3VkV2F0Y2hNZXRyaWNzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0FXU01hbmFnZWRSdWxlc0FtYXpvbklwUmVwdXRhdGlvbicsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIC8vIDguIEJsb2NrIHJlcXVlc3RzIHRvIGFkbWluIHBhdGhzXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgbmFtZTogJ0Jsb2NrQWRtaW5QYXRocycsXHJcbiAgICAgICAgICBwcmlvcml0eTogOCxcclxuICAgICAgICAgIHN0YXRlbWVudDoge1xyXG4gICAgICAgICAgICBieXRlTWF0Y2hTdGF0ZW1lbnQ6IHtcclxuICAgICAgICAgICAgICBzZWFyY2hTdHJpbmc6ICcvYWRtaW4nLFxyXG4gICAgICAgICAgICAgIGZpZWxkVG9NYXRjaDoge1xyXG4gICAgICAgICAgICAgICAgdXJpUGF0aDoge30sXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICB0ZXh0VHJhbnNmb3JtYXRpb25zOiBbXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiAwLFxyXG4gICAgICAgICAgICAgICAgICB0eXBlOiAnTE9XRVJDQVNFJyxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICBwb3NpdGlvbmFsQ29uc3RyYWludDogJ1NUQVJUU19XSVRIJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBhY3Rpb246IHtcclxuICAgICAgICAgICAgYmxvY2s6IHt9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHZpc2liaWxpdHlDb25maWc6IHtcclxuICAgICAgICAgICAgc2FtcGxlZFJlcXVlc3RzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnQmxvY2tBZG1pblBhdGhzJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLy8gOS4gQmxvY2sgcmVxdWVzdHMgd2l0aCBzdXNwaWNpb3VzIHVzZXIgYWdlbnRzXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgbmFtZTogJ0Jsb2NrU3VzcGljaW91c1VzZXJBZ2VudHMnLFxyXG4gICAgICAgICAgcHJpb3JpdHk6IDksXHJcbiAgICAgICAgICBzdGF0ZW1lbnQ6IHtcclxuICAgICAgICAgICAgb3JTdGF0ZW1lbnQ6IHtcclxuICAgICAgICAgICAgICBzdGF0ZW1lbnRzOiBbXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgIGJ5dGVNYXRjaFN0YXRlbWVudDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlYXJjaFN0cmluZzogJ2JvdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgZmllbGRUb01hdGNoOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzaW5nbGVIZWFkZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogJ3VzZXItYWdlbnQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHRUcmFuc2Zvcm1hdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdMT1dFUkNBU0UnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uYWxDb25zdHJhaW50OiAnQ09OVEFJTlMnLFxyXG4gICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgYnl0ZU1hdGNoU3RhdGVtZW50OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoU3RyaW5nOiAnc2Nhbm5lcicsXHJcbiAgICAgICAgICAgICAgICAgICAgZmllbGRUb01hdGNoOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzaW5nbGVIZWFkZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogJ3VzZXItYWdlbnQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHRleHRUcmFuc2Zvcm1hdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdMT1dFUkNBU0UnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uYWxDb25zdHJhaW50OiAnQ09OVEFJTlMnLFxyXG4gICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGFjdGlvbjoge1xyXG4gICAgICAgICAgICBibG9jazoge30sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgdmlzaWJpbGl0eUNvbmZpZzoge1xyXG4gICAgICAgICAgICBzYW1wbGVkUmVxdWVzdHNFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICBjbG91ZFdhdGNoTWV0cmljc0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdCbG9ja1N1c3BpY2lvdXNVc2VyQWdlbnRzJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLy8gMTAuIEdlby1ibG9ja2luZyBmb3IgaGlnaC1yaXNrIGNvdW50cmllc1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIG5hbWU6ICdHZW9CbG9ja2luZycsXHJcbiAgICAgICAgICBwcmlvcml0eTogMTAsXHJcbiAgICAgICAgICBzdGF0ZW1lbnQ6IHtcclxuICAgICAgICAgICAgZ2VvTWF0Y2hTdGF0ZW1lbnQ6IHtcclxuICAgICAgICAgICAgICBjb3VudHJ5Q29kZXM6IFsnQ04nLCAnUlUnLCAnS1AnLCAnSVInXSwgLy8gQmxvY2sgQ2hpbmEsIFJ1c3NpYSwgTm9ydGggS29yZWEsIElyYW5cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBhY3Rpb246IHtcclxuICAgICAgICAgICAgYmxvY2s6IHt9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHZpc2liaWxpdHlDb25maWc6IHtcclxuICAgICAgICAgICAgc2FtcGxlZFJlcXVlc3RzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnR2VvQmxvY2tpbmcnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvLyAxMS4gQmxvY2sgcmVxdWVzdHMgd2l0aCBubyB1c2VyIGFnZW50XHJcbiAgICAgICAge1xyXG4gICAgICAgICAgbmFtZTogJ0Jsb2NrTm9Vc2VyQWdlbnQnLFxyXG4gICAgICAgICAgcHJpb3JpdHk6IDExLFxyXG4gICAgICAgICAgc3RhdGVtZW50OiB7XHJcbiAgICAgICAgICAgIGJ5dGVNYXRjaFN0YXRlbWVudDoge1xyXG4gICAgICAgICAgICAgIHNlYXJjaFN0cmluZzogJycsXHJcbiAgICAgICAgICAgICAgZmllbGRUb01hdGNoOiB7XHJcbiAgICAgICAgICAgICAgICBzaW5nbGVIZWFkZXI6IHtcclxuICAgICAgICAgICAgICAgICAgbmFtZTogJ3VzZXItYWdlbnQnLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIHRleHRUcmFuc2Zvcm1hdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IDAsXHJcbiAgICAgICAgICAgICAgICAgIHR5cGU6ICdOT05FJyxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICBwb3NpdGlvbmFsQ29uc3RyYWludDogJ0VYQUNUTFknLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGFjdGlvbjoge1xyXG4gICAgICAgICAgICBibG9jazoge30sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgdmlzaWJpbGl0eUNvbmZpZzoge1xyXG4gICAgICAgICAgICBzYW1wbGVkUmVxdWVzdHNFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICBjbG91ZFdhdGNoTWV0cmljc0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdCbG9ja05vVXNlckFnZW50JyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLy8gMTIuIFNpemUgcmVzdHJpY3Rpb25zXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgbmFtZTogJ1NpemVSZXN0cmljdGlvbnMnLFxyXG4gICAgICAgICAgcHJpb3JpdHk6IDEyLFxyXG4gICAgICAgICAgc3RhdGVtZW50OiB7XHJcbiAgICAgICAgICAgIG9yU3RhdGVtZW50OiB7XHJcbiAgICAgICAgICAgICAgc3RhdGVtZW50czogW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICBzaXplQ29uc3RyYWludFN0YXRlbWVudDoge1xyXG4gICAgICAgICAgICAgICAgICAgIGZpZWxkVG9NYXRjaDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgYm9keToge30sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBjb21wYXJpc29uT3BlcmF0b3I6ICdHVCcsXHJcbiAgICAgICAgICAgICAgICAgICAgc2l6ZTogODE5MiwgLy8gOEtCIGxpbWl0IGZvciBib2R5XHJcbiAgICAgICAgICAgICAgICAgICAgdGV4dFRyYW5zZm9ybWF0aW9uczogW1xyXG4gICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmlvcml0eTogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ05PTkUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgc2l6ZUNvbnN0cmFpbnRTdGF0ZW1lbnQ6IHtcclxuICAgICAgICAgICAgICAgICAgICBmaWVsZFRvTWF0Y2g6IHtcclxuICAgICAgICAgICAgICAgICAgICAgIHVyaVBhdGg6IHt9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiAnR1QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHNpemU6IDEwMjQsIC8vIDFLQiBsaW1pdCBmb3IgVVJJIHBhdGhcclxuICAgICAgICAgICAgICAgICAgICB0ZXh0VHJhbnNmb3JtYXRpb25zOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW9yaXR5OiAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnTk9ORScsXHJcbiAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYWN0aW9uOiB7XHJcbiAgICAgICAgICAgIGJsb2NrOiB7fSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XHJcbiAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgIGNsb3VkV2F0Y2hNZXRyaWNzRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ1NpemVSZXN0cmljdGlvbnMnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG5cclxuICAgICAgdmlzaWJpbGl0eUNvbmZpZzoge1xyXG4gICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIG1ldHJpY05hbWU6IGByZWNydWl0bWVudC13YWYtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGxvZ2dpbmcgY29uZmlndXJhdGlvbiBpZiBlbmFibGVkXHJcbiAgICBpZiAocHJvcHMuZW5hYmxlTG9nZ2luZyAhPT0gZmFsc2UpIHtcclxuICAgICAgdGhpcy5zZXR1cExvZ2dpbmcocHJvcHMuZW52aXJvbm1lbnQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBDbG91ZFdhdGNoIGFsYXJtc1xyXG4gICAgdGhpcy5jcmVhdGVDbG91ZFdhdGNoQWxhcm1zKHByb3BzLmFsZXJ0c1RvcGljLCBwcm9wcy5lbnZpcm9ubWVudCk7XHJcblxyXG4gICAgLy8gQWRkIHRhZ3NcclxuICAgIGNkay5UYWdzLm9mKHRoaXMud2ViQWNsKS5hZGQoJ0NvbXBvbmVudCcsICdXQUYnKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMuaXBTZXQpLmFkZCgnQ29tcG9uZW50JywgJ1dBRicpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBzZXR1cExvZ2dpbmcoZW52aXJvbm1lbnQ6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgLy8gQ3JlYXRlIEtNUyBrZXkgZm9yIGxvZyBlbmNyeXB0aW9uXHJcbiAgICBjb25zdCBrbXNLZXkgPSBuZXcga21zLktleSh0aGlzLCAnTG9nc0ttc0tleScsIHtcclxuICAgICAgZGVzY3JpcHRpb246IGBXQUYgbG9ncyBlbmNyeXB0aW9uIGtleSBmb3IgJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBlbmFibGVLZXlSb3RhdGlvbjogdHJ1ZSxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBDbG91ZFdhdGNoIGxvZyBncm91cFxyXG4gICAgdGhpcy5sb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdXQUZMb2dHcm91cCcsIHtcclxuICAgICAgbG9nR3JvdXBOYW1lOiBgL2F3cy93YWYvcmVjcnVpdG1lbnQtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfTU9OVEgsXHJcbiAgICAgIGVuY3J5cHRpb25LZXk6IGttc0tleSxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBTMyBidWNrZXQgZm9yIGxvbmctdGVybSBzdG9yYWdlXHJcbiAgICB0aGlzLmxvZ0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ1dBRkxvZ3NCdWNrZXQnLCB7XHJcbiAgICAgIGJ1Y2tldE5hbWU6IGByZWNydWl0bWVudC13YWYtbG9ncy0ke2Vudmlyb25tZW50fS0ke2Nkay5Bd3MuQUNDT1VOVF9JRH1gLFxyXG4gICAgICB2ZXJzaW9uZWQ6IGZhbHNlLFxyXG4gICAgICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSxcclxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcclxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5LTVMsXHJcbiAgICAgIGVuY3J5cHRpb25LZXk6IGttc0tleSxcclxuICAgICAgbGlmZWN5Y2xlUnVsZXM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogJ0RlbGV0ZU9sZExvZ3MnLFxyXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgIGV4cGlyYXRpb246IGNkay5EdXJhdGlvbi5kYXlzKDkwKSxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBXQUYgbG9nZ2luZyBjb25maWd1cmF0aW9uXHJcbiAgICBuZXcgd2FmdjIuQ2ZuTG9nZ2luZ0NvbmZpZ3VyYXRpb24odGhpcywgJ1dBRkxvZ2dpbmdDb25maWd1cmF0aW9uJywge1xyXG4gICAgICByZXNvdXJjZUFybjogdGhpcy53ZWJBY2wuYXR0ckFybixcclxuICAgICAgbG9nRGVzdGluYXRpb25Db25maWdzOiBbXHJcbiAgICAgICAgdGhpcy5sb2dHcm91cC5sb2dHcm91cEFybixcclxuICAgICAgXSxcclxuICAgICAgcmVkYWN0ZWRGaWVsZHM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBzaW5nbGVIZWFkZXI6IHtcclxuICAgICAgICAgICAgbmFtZTogJ2F1dGhvcml6YXRpb24nLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHNpbmdsZUhlYWRlcjoge1xyXG4gICAgICAgICAgICBuYW1lOiAnY29va2llJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjcmVhdGVDbG91ZFdhdGNoQWxhcm1zKGFsZXJ0c1RvcGljOiBzbnMuVG9waWMgfCB1bmRlZmluZWQsIGVudmlyb25tZW50OiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIGlmICghYWxlcnRzVG9waWMpIHJldHVybjtcclxuXHJcbiAgICAvLyBDcmVhdGUgYWxhcm1zIGZvciBlYWNoIFdBRiBydWxlXHJcbiAgICBjb25zdCBydWxlTmFtZXMgPSBbXHJcbiAgICAgICdCbG9ja01hbGljaW91c0lQcycsXHJcbiAgICAgICdSYXRlTGltaXRQZXJJUCcsXHJcbiAgICAgICdBV1NNYW5hZ2VkUnVsZXNDb3JlJyxcclxuICAgICAgJ0FXU01hbmFnZWRSdWxlc0tub3duQmFkSW5wdXRzJyxcclxuICAgICAgJ0FXU01hbmFnZWRSdWxlc1NRTGknLFxyXG4gICAgICAnQVdTTWFuYWdlZFJ1bGVzTGludXgnLFxyXG4gICAgICAnQVdTTWFuYWdlZFJ1bGVzQW1hem9uSXBSZXB1dGF0aW9uJyxcclxuICAgICAgJ0Jsb2NrQWRtaW5QYXRocycsXHJcbiAgICAgICdCbG9ja1N1c3BpY2lvdXNVc2VyQWdlbnRzJyxcclxuICAgICAgJ0dlb0Jsb2NraW5nJyxcclxuICAgICAgJ0Jsb2NrTm9Vc2VyQWdlbnQnLFxyXG4gICAgICAnU2l6ZVJlc3RyaWN0aW9ucycsXHJcbiAgICBdO1xyXG5cclxuICAgIHJ1bGVOYW1lcy5mb3JFYWNoKChydWxlTmFtZSkgPT4ge1xyXG4gICAgICBjb25zdCBhbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsIGAke3J1bGVOYW1lfUFsYXJtYCwge1xyXG4gICAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9XQUZWMicsXHJcbiAgICAgICAgICBtZXRyaWNOYW1lOiAnQmxvY2tlZFJlcXVlc3RzJyxcclxuICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgV2ViQUNMOiBgcmVjcnVpdG1lbnQtd2FmLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgICAgICAgUnVsZTogcnVsZU5hbWUsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgdGhyZXNob2xkOiAxMDAsIC8vIFRocmVzaG9sZCBmb3IgYmxvY2tlZCByZXF1ZXN0c1xyXG4gICAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICAgIGFsYXJtRGVzY3JpcHRpb246IGBIaWdoIG51bWJlciBvZiBibG9ja2VkIHJlcXVlc3RzIGZvciBXQUYgcnVsZTogJHtydWxlTmFtZX1gLFxyXG4gICAgICB9KTtcclxuICAgICAgYWxhcm0uYWRkQWxhcm1BY3Rpb24obmV3IGNsb3Vkd2F0Y2guU25zQWN0aW9uKGFsZXJ0c1RvcGljKSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHZW5lcmFsIGJsb2NrZWQgcmVxdWVzdHMgYWxhcm1cclxuICAgIGNvbnN0IGdlbmVyYWxCbG9ja2VkQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnR2VuZXJhbEJsb2NrZWRSZXF1ZXN0c0FsYXJtJywge1xyXG4gICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlOiAnQVdTL1dBRlYyJyxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnQmxvY2tlZFJlcXVlc3RzJyxcclxuICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICBXZWJBQ0w6IGByZWNydWl0bWVudC13YWYtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICB9KSxcclxuICAgICAgdGhyZXNob2xkOiA1MDAsIC8vIFRvdGFsIGJsb2NrZWQgcmVxdWVzdHMgdGhyZXNob2xkXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnSGlnaCBudW1iZXIgb2YgdG90YWwgYmxvY2tlZCByZXF1ZXN0cycsXHJcbiAgICB9KTtcclxuICAgIGdlbmVyYWxCbG9ja2VkQWxhcm0uYWRkQWxhcm1BY3Rpb24obmV3IGNsb3Vkd2F0Y2guU25zQWN0aW9uKGFsZXJ0c1RvcGljKSk7XHJcblxyXG4gICAgLy8gQWxsb3dlZCByZXF1ZXN0cyBhbGFybSAoZm9yIG1vbml0b3JpbmcgdHJhZmZpYylcclxuICAgIGNvbnN0IGFsbG93ZWRSZXF1ZXN0c0FsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0FsbG93ZWRSZXF1ZXN0c0FsYXJtJywge1xyXG4gICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlOiAnQVdTL1dBRlYyJyxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnQWxsb3dlZFJlcXVlc3RzJyxcclxuICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICBXZWJBQ0w6IGByZWNydWl0bWVudC13YWYtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICB9KSxcclxuICAgICAgdGhyZXNob2xkOiAxMDAwMCwgLy8gSGlnaCB0cmFmZmljIHRocmVzaG9sZFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ1VudXN1YWxseSBoaWdoIHRyYWZmaWMgdm9sdW1lJyxcclxuICAgIH0pO1xyXG4gICAgYWxsb3dlZFJlcXVlc3RzQWxhcm0uYWRkQWxhcm1BY3Rpb24obmV3IGNsb3Vkd2F0Y2guU25zQWN0aW9uKGFsZXJ0c1RvcGljKSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBZGQgSVAgYWRkcmVzc2VzIHRvIHRoZSBtYWxpY2lvdXMgSVAgc2V0XHJcbiAgICovXHJcbiAgcHVibGljIGFkZE1hbGljaW91c0lQcyhpcEFkZHJlc3Nlczogc3RyaW5nW10pOiB2b2lkIHtcclxuICAgIC8vIFRoaXMgd291bGQgdHlwaWNhbGx5IGJlIGRvbmUgdGhyb3VnaCBhIExhbWJkYSBmdW5jdGlvblxyXG4gICAgLy8gdGhhdCB1cGRhdGVzIHRoZSBJUCBzZXQgYmFzZWQgb24gdGhyZWF0IGludGVsbGlnZW5jZVxyXG4gICAgY29uc29sZS5sb2coJ0FkZGluZyBtYWxpY2lvdXMgSVBzOicsIGlwQWRkcmVzc2VzKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCB0aGUgV2ViIEFDTCBBUk5cclxuICAgKi9cclxuICBwdWJsaWMgZ2V0V2ViQWNsQXJuKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdGhpcy53ZWJBY2wuYXR0ckFybjtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCB0aGUgV2ViIEFDTCBJRFxyXG4gICAqL1xyXG4gIHB1YmxpYyBnZXRXZWJBY2xJZCgpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIHRoaXMud2ViQWNsLmF0dHJJZDtcclxuICB9XHJcbn0iXX0=