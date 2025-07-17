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
exports.MonitoringConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const sns = __importStar(require("aws-cdk-lib/aws-sns"));
const snsSubscriptions = __importStar(require("aws-cdk-lib/aws-sns-subscriptions"));
const cloudwatchActions = __importStar(require("aws-cdk-lib/aws-cloudwatch-actions"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const events = __importStar(require("aws-cdk-lib/aws-events"));
const eventsTargets = __importStar(require("aws-cdk-lib/aws-events-targets"));
const constructs_1 = require("constructs");
class MonitoringConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { monitoringConfig, environment, notificationEmail } = props;
        // Create SNS topic for alarm notifications
        this.alarmTopic = this.createAlarmTopic(environment, notificationEmail);
        // Create log groups for different components
        this.logGroups = this.createLogGroups(monitoringConfig, environment);
        // Create CloudWatch dashboard
        this.dashboard = this.createDashboard(environment);
        // Create custom metrics and alarms
        this.createCustomMetrics(environment);
        // Set up log analysis and alerts
        this.setupLogAnalysis(environment);
        // Create EventBridge rules for system events
        this.createEventBridgeRules(environment);
        // Create outputs
        this.createOutputs();
    }
    createAlarmTopic(environment, notificationEmail) {
        const topic = new sns.Topic(this, 'AlarmTopic', {
            topicName: `recruitment-alarms-${environment}`,
            displayName: `Recruitment Website Alarms - ${environment}`,
        });
        // Add email subscription if provided
        if (notificationEmail) {
            topic.addSubscription(new snsSubscriptions.EmailSubscription(notificationEmail));
        }
        // Add tags
        cdk.Tags.of(topic).add('Environment', environment);
        cdk.Tags.of(topic).add('Project', 'RecruitmentWebsite');
        return topic;
    }
    createLogGroups(monitoringConfig, environment) {
        const logGroups = [];
        // Application logs
        const appLogGroup = new logs.LogGroup(this, 'ApplicationLogGroup', {
            logGroupName: `/aws/recruitment/application/${environment}`,
            retention: logs.RetentionDays.valueOf(monitoringConfig.logRetentionDays),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        logGroups.push(appLogGroup);
        // Error logs
        const errorLogGroup = new logs.LogGroup(this, 'ErrorLogGroup', {
            logGroupName: `/aws/recruitment/errors/${environment}`,
            retention: logs.RetentionDays.valueOf(monitoringConfig.logRetentionDays),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        logGroups.push(errorLogGroup);
        // Access logs
        const accessLogGroup = new logs.LogGroup(this, 'AccessLogGroup', {
            logGroupName: `/aws/recruitment/access/${environment}`,
            retention: logs.RetentionDays.valueOf(monitoringConfig.logRetentionDays),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        logGroups.push(accessLogGroup);
        // Performance logs
        const performanceLogGroup = new logs.LogGroup(this, 'PerformanceLogGroup', {
            logGroupName: `/aws/recruitment/performance/${environment}`,
            retention: logs.RetentionDays.valueOf(monitoringConfig.logRetentionDays),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        logGroups.push(performanceLogGroup);
        // Security logs
        const securityLogGroup = new logs.LogGroup(this, 'SecurityLogGroup', {
            logGroupName: `/aws/recruitment/security/${environment}`,
            retention: logs.RetentionDays.valueOf(monitoringConfig.logRetentionDays),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        logGroups.push(securityLogGroup);
        return logGroups;
    }
    createDashboard(environment) {
        const dashboard = new cloudwatch.Dashboard(this, 'MonitoringDashboard', {
            dashboardName: `recruitment-dashboard-${environment}`,
        });
        // Add widgets to dashboard
        this.addSystemOverviewWidget(dashboard);
        this.addApplicationMetricsWidget(dashboard);
        this.addDatabaseMetricsWidget(dashboard);
        this.addLoadBalancerMetricsWidget(dashboard);
        this.addErrorRateWidget(dashboard);
        this.addCustomMetricsWidget(dashboard);
        return dashboard;
    }
    addSystemOverviewWidget(dashboard) {
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'System Overview',
            width: 12,
            height: 6,
            left: [
                new cloudwatch.Metric({
                    namespace: 'AWS/ECS',
                    metricName: 'CPUUtilization',
                    statistic: 'Average',
                }),
                new cloudwatch.Metric({
                    namespace: 'AWS/ECS',
                    metricName: 'MemoryUtilization',
                    statistic: 'Average',
                }),
            ],
            right: [
                new cloudwatch.Metric({
                    namespace: 'AWS/ApplicationELB',
                    metricName: 'RequestCount',
                    statistic: 'Sum',
                }),
            ],
        }));
    }
    addApplicationMetricsWidget(dashboard) {
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'Application Metrics',
            width: 12,
            height: 6,
            left: [
                new cloudwatch.Metric({
                    namespace: 'AWS/ApplicationELB',
                    metricName: 'TargetResponseTime',
                    statistic: 'Average',
                }),
                new cloudwatch.Metric({
                    namespace: 'AWS/ApplicationELB',
                    metricName: 'HTTPCode_Target_2XX_Count',
                    statistic: 'Sum',
                }),
            ],
            right: [
                new cloudwatch.Metric({
                    namespace: 'AWS/ApplicationELB',
                    metricName: 'HTTPCode_Target_4XX_Count',
                    statistic: 'Sum',
                }),
                new cloudwatch.Metric({
                    namespace: 'AWS/ApplicationELB',
                    metricName: 'HTTPCode_Target_5XX_Count',
                    statistic: 'Sum',
                }),
            ],
        }));
    }
    addDatabaseMetricsWidget(dashboard) {
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'Database Metrics',
            width: 12,
            height: 6,
            left: [
                new cloudwatch.Metric({
                    namespace: 'AWS/RDS',
                    metricName: 'CPUUtilization',
                    statistic: 'Average',
                }),
                new cloudwatch.Metric({
                    namespace: 'AWS/RDS',
                    metricName: 'DatabaseConnections',
                    statistic: 'Average',
                }),
            ],
            right: [
                new cloudwatch.Metric({
                    namespace: 'AWS/RDS',
                    metricName: 'ReadLatency',
                    statistic: 'Average',
                }),
                new cloudwatch.Metric({
                    namespace: 'AWS/RDS',
                    metricName: 'WriteLatency',
                    statistic: 'Average',
                }),
            ],
        }));
    }
    addLoadBalancerMetricsWidget(dashboard) {
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'Load Balancer Metrics',
            width: 12,
            height: 6,
            left: [
                new cloudwatch.Metric({
                    namespace: 'AWS/ApplicationELB',
                    metricName: 'ActiveConnectionCount',
                    statistic: 'Sum',
                }),
                new cloudwatch.Metric({
                    namespace: 'AWS/ApplicationELB',
                    metricName: 'NewConnectionCount',
                    statistic: 'Sum',
                }),
            ],
            right: [
                new cloudwatch.Metric({
                    namespace: 'AWS/ApplicationELB',
                    metricName: 'HealthyHostCount',
                    statistic: 'Average',
                }),
                new cloudwatch.Metric({
                    namespace: 'AWS/ApplicationELB',
                    metricName: 'UnHealthyHostCount',
                    statistic: 'Average',
                }),
            ],
        }));
    }
    addErrorRateWidget(dashboard) {
        dashboard.addWidgets(new cloudwatch.SingleValueWidget({
            title: 'Error Rate',
            width: 6,
            height: 6,
            metrics: [
                new cloudwatch.MathExpression({
                    expression: '(m1 / m2) * 100',
                    usingMetrics: {
                        m1: new cloudwatch.Metric({
                            namespace: 'AWS/ApplicationELB',
                            metricName: 'HTTPCode_Target_5XX_Count',
                            statistic: 'Sum',
                        }),
                        m2: new cloudwatch.Metric({
                            namespace: 'AWS/ApplicationELB',
                            metricName: 'RequestCount',
                            statistic: 'Sum',
                        }),
                    },
                    label: 'Error Rate %',
                }),
            ],
        }));
    }
    addCustomMetricsWidget(dashboard) {
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'Custom Application Metrics',
            width: 12,
            height: 6,
            left: [
                new cloudwatch.Metric({
                    namespace: 'RecruitmentWebsite',
                    metricName: 'ApplicationSubmissions',
                    statistic: 'Sum',
                }),
                new cloudwatch.Metric({
                    namespace: 'RecruitmentWebsite',
                    metricName: 'UserRegistrations',
                    statistic: 'Sum',
                }),
            ],
            right: [
                new cloudwatch.Metric({
                    namespace: 'RecruitmentWebsite',
                    metricName: 'EmailsSent',
                    statistic: 'Sum',
                }),
                new cloudwatch.Metric({
                    namespace: 'RecruitmentWebsite',
                    metricName: 'LoginAttempts',
                    statistic: 'Sum',
                }),
            ],
        }));
    }
    createCustomMetrics(environment) {
        // Create custom metrics for business logic monitoring
        // Application submission rate alarm
        const submissionRateAlarm = new cloudwatch.Alarm(this, 'SubmissionRateAlarm', {
            metric: new cloudwatch.Metric({
                namespace: 'RecruitmentWebsite',
                metricName: 'ApplicationSubmissions',
                statistic: 'Sum',
                period: cdk.Duration.hours(1),
            }),
            threshold: 0,
            comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
            evaluationPeriods: 2,
            alarmName: `recruitment-no-submissions-${environment}`,
            alarmDescription: 'No application submissions in the last 2 hours',
            treatMissingData: cloudwatch.TreatMissingData.BREACHING,
        });
        submissionRateAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
        // High error rate alarm
        const errorRateAlarm = new cloudwatch.Alarm(this, 'ErrorRateAlarm', {
            metric: new cloudwatch.MathExpression({
                expression: '(errors / requests) * 100',
                usingMetrics: {
                    errors: new cloudwatch.Metric({
                        namespace: 'AWS/ApplicationELB',
                        metricName: 'HTTPCode_Target_5XX_Count',
                        statistic: 'Sum',
                    }),
                    requests: new cloudwatch.Metric({
                        namespace: 'AWS/ApplicationELB',
                        metricName: 'RequestCount',
                        statistic: 'Sum',
                    }),
                },
                period: cdk.Duration.minutes(5),
            }),
            threshold: 5, // 5% error rate
            evaluationPeriods: 2,
            alarmName: `recruitment-high-error-rate-${environment}`,
            alarmDescription: 'High error rate detected',
        });
        errorRateAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    }
    setupLogAnalysis(environment) {
        // Create log filters for error detection
        const errorFilter = new logs.MetricFilter(this, 'ErrorFilter', {
            logGroup: this.logGroups[1], // Error log group
            metricNamespace: 'RecruitmentWebsite',
            metricName: 'ApplicationErrors',
            filterPattern: logs.FilterPattern.literal('[timestamp, request_id, level="ERROR", ...]'),
            metricValue: '1',
        });
        // Create alarm for error filter
        const errorFilterAlarm = new cloudwatch.Alarm(this, 'ErrorFilterAlarm', {
            metric: errorFilter.metric(),
            threshold: 5,
            evaluationPeriods: 1,
            alarmName: `recruitment-application-errors-${environment}`,
            alarmDescription: 'Application errors detected in logs',
        });
        errorFilterAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
        // Create log filter for slow queries
        const slowQueryFilter = new logs.MetricFilter(this, 'SlowQueryFilter', {
            logGroup: this.logGroups[3], // Performance log group
            metricNamespace: 'RecruitmentWebsite',
            metricName: 'SlowQueries',
            filterPattern: logs.FilterPattern.literal('[timestamp, request_id, level="WARN", message="Slow query detected", ...]'),
            metricValue: '1',
        });
        // Create alarm for slow queries
        const slowQueryAlarm = new cloudwatch.Alarm(this, 'SlowQueryAlarm', {
            metric: slowQueryFilter.metric(),
            threshold: 10,
            evaluationPeriods: 2,
            alarmName: `recruitment-slow-queries-${environment}`,
            alarmDescription: 'Slow database queries detected',
        });
        slowQueryAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    }
    createEventBridgeRules(environment) {
        // Create EventBridge rule for ECS task state changes
        const ecsTaskStateRule = new events.Rule(this, 'EcsTaskStateRule', {
            ruleName: `recruitment-ecs-task-state-${environment}`,
            eventPattern: {
                source: ['aws.ecs'],
                detailType: ['ECS Task State Change'],
                detail: {
                    lastStatus: ['STOPPED'],
                    stoppedReason: ['Essential container in task exited'],
                },
            },
        });
        // Create Lambda function to handle ECS task failures
        const ecsTaskFailureHandler = new lambda.Function(this, 'EcsTaskFailureHandler', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const sns = new AWS.SNS();
        
        exports.handler = async (event) => {
          const message = {
            Subject: 'ECS Task Failure Alert',
            Message: JSON.stringify(event, null, 2),
            TopicArn: process.env.SNS_TOPIC_ARN,
          };
          
          await sns.publish(message).promise();
          return { statusCode: 200 };
        };
      `),
            environment: {
                SNS_TOPIC_ARN: this.alarmTopic.topicArn,
            },
        });
        // Grant permission to publish to SNS
        this.alarmTopic.grantPublish(ecsTaskFailureHandler);
        // Add Lambda as target
        ecsTaskStateRule.addTarget(new eventsTargets.LambdaFunction(ecsTaskFailureHandler));
        // Create EventBridge rule for RDS events
        const rdsEventRule = new events.Rule(this, 'RdsEventRule', {
            ruleName: `recruitment-rds-events-${environment}`,
            eventPattern: {
                source: ['aws.rds'],
                detailType: ['RDS DB Instance Event'],
                detail: {
                    EventCategories: ['failure', 'maintenance', 'notification'],
                },
            },
        });
        rdsEventRule.addTarget(new eventsTargets.SnsTopic(this.alarmTopic));
    }
    createOutputs() {
        // Output dashboard URL
        new cdk.CfnOutput(this, 'DashboardUrl', {
            value: `https://console.aws.amazon.com/cloudwatch/home?region=${cdk.Stack.of(this).region}#dashboards:name=${this.dashboard.dashboardName}`,
            description: 'CloudWatch dashboard URL',
            exportName: `recruitment-dashboard-url-${this.node.scope}`,
        });
        // Output alarm topic ARN
        new cdk.CfnOutput(this, 'AlarmTopicArn', {
            value: this.alarmTopic.topicArn,
            description: 'SNS topic ARN for alarms',
            exportName: `recruitment-alarm-topic-${this.node.scope}`,
        });
    }
    /**
     * Add a custom metric filter to a log group
     */
    addMetricFilter(logGroup, name, filterPattern, metricName, namespace = 'RecruitmentWebsite') {
        return new logs.MetricFilter(this, name, {
            logGroup,
            metricNamespace: namespace,
            metricName,
            filterPattern,
            metricValue: '1',
        });
    }
    /**
     * Create a composite alarm from multiple alarms
     */
    createCompositeAlarm(name, description, alarms) {
        return new cloudwatch.CompositeAlarm(this, name, {
            alarmDescription: description,
            alarmRule: cloudwatch.AlarmRule.anyOf(...alarms),
        });
    }
}
exports.MonitoringConstruct = MonitoringConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uaXRvcmluZy1jb25zdHJ1Y3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtb25pdG9yaW5nLWNvbnN0cnVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsdUVBQXlEO0FBQ3pELDJEQUE2QztBQUM3Qyx5REFBMkM7QUFDM0Msb0ZBQXNFO0FBQ3RFLHNGQUF3RTtBQUV4RSwrREFBaUQ7QUFDakQsK0RBQWlEO0FBQ2pELDhFQUFnRTtBQUNoRSwyQ0FBdUM7QUFTdkMsTUFBYSxtQkFBb0IsU0FBUSxzQkFBUztJQUtoRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQStCO1FBQ3ZFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUVuRSwyQ0FBMkM7UUFDM0MsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFFeEUsNkNBQTZDO1FBQzdDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUVyRSw4QkFBOEI7UUFDOUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRW5ELG1DQUFtQztRQUNuQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFdEMsaUNBQWlDO1FBQ2pDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUVuQyw2Q0FBNkM7UUFDN0MsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRXpDLGlCQUFpQjtRQUNqQixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVPLGdCQUFnQixDQUFDLFdBQW1CLEVBQUUsaUJBQTBCO1FBQ3RFLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQzlDLFNBQVMsRUFBRSxzQkFBc0IsV0FBVyxFQUFFO1lBQzlDLFdBQVcsRUFBRSxnQ0FBZ0MsV0FBVyxFQUFFO1NBQzNELENBQUMsQ0FBQztRQUVILHFDQUFxQztRQUNyQyxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDdEIsS0FBSyxDQUFDLGVBQWUsQ0FDbkIsSUFBSSxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUMxRCxDQUFDO1FBQ0osQ0FBQztRQUVELFdBQVc7UUFDWCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ25ELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUV4RCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFTyxlQUFlLENBQUMsZ0JBQWtDLEVBQUUsV0FBbUI7UUFDN0UsTUFBTSxTQUFTLEdBQW9CLEVBQUUsQ0FBQztRQUV0QyxtQkFBbUI7UUFDbkIsTUFBTSxXQUFXLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUNqRSxZQUFZLEVBQUUsZ0NBQWdDLFdBQVcsRUFBRTtZQUMzRCxTQUFTLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUM7WUFDeEUsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUM7UUFDSCxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRTVCLGFBQWE7UUFDYixNQUFNLGFBQWEsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUM3RCxZQUFZLEVBQUUsMkJBQTJCLFdBQVcsRUFBRTtZQUN0RCxTQUFTLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUM7WUFDeEUsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUM7UUFDSCxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRTlCLGNBQWM7UUFDZCxNQUFNLGNBQWMsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQy9ELFlBQVksRUFBRSwyQkFBMkIsV0FBVyxFQUFFO1lBQ3RELFNBQVMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQztZQUN4RSxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1NBQ3pDLENBQUMsQ0FBQztRQUNILFNBQVMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFL0IsbUJBQW1CO1FBQ25CLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUN6RSxZQUFZLEVBQUUsZ0NBQWdDLFdBQVcsRUFBRTtZQUMzRCxTQUFTLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUM7WUFDeEUsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUM7UUFDSCxTQUFTLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFFcEMsZ0JBQWdCO1FBQ2hCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUNuRSxZQUFZLEVBQUUsNkJBQTZCLFdBQVcsRUFBRTtZQUN4RCxTQUFTLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUM7WUFDeEUsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUM7UUFDSCxTQUFTLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFakMsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztJQUVPLGVBQWUsQ0FBQyxXQUFtQjtRQUN6QyxNQUFNLFNBQVMsR0FBRyxJQUFJLFVBQVUsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQ3RFLGFBQWEsRUFBRSx5QkFBeUIsV0FBVyxFQUFFO1NBQ3RELENBQUMsQ0FBQztRQUVILDJCQUEyQjtRQUMzQixJQUFJLENBQUMsdUJBQXVCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDeEMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN6QyxJQUFJLENBQUMsNEJBQTRCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUV2QyxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBRU8sdUJBQXVCLENBQUMsU0FBK0I7UUFDN0QsU0FBUyxDQUFDLFVBQVUsQ0FDbEIsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQ3pCLEtBQUssRUFBRSxpQkFBaUI7WUFDeEIsS0FBSyxFQUFFLEVBQUU7WUFDVCxNQUFNLEVBQUUsQ0FBQztZQUNULElBQUksRUFBRTtnQkFDSixJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7b0JBQ3BCLFNBQVMsRUFBRSxTQUFTO29CQUNwQixVQUFVLEVBQUUsZ0JBQWdCO29CQUM1QixTQUFTLEVBQUUsU0FBUztpQkFDckIsQ0FBQztnQkFDRixJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7b0JBQ3BCLFNBQVMsRUFBRSxTQUFTO29CQUNwQixVQUFVLEVBQUUsbUJBQW1CO29CQUMvQixTQUFTLEVBQUUsU0FBUztpQkFDckIsQ0FBQzthQUNIO1lBQ0QsS0FBSyxFQUFFO2dCQUNMLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQztvQkFDcEIsU0FBUyxFQUFFLG9CQUFvQjtvQkFDL0IsVUFBVSxFQUFFLGNBQWM7b0JBQzFCLFNBQVMsRUFBRSxLQUFLO2lCQUNqQixDQUFDO2FBQ0g7U0FDRixDQUFDLENBQ0gsQ0FBQztJQUNKLENBQUM7SUFFTywyQkFBMkIsQ0FBQyxTQUErQjtRQUNqRSxTQUFTLENBQUMsVUFBVSxDQUNsQixJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDekIsS0FBSyxFQUFFLHFCQUFxQjtZQUM1QixLQUFLLEVBQUUsRUFBRTtZQUNULE1BQU0sRUFBRSxDQUFDO1lBQ1QsSUFBSSxFQUFFO2dCQUNKLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQztvQkFDcEIsU0FBUyxFQUFFLG9CQUFvQjtvQkFDL0IsVUFBVSxFQUFFLG9CQUFvQjtvQkFDaEMsU0FBUyxFQUFFLFNBQVM7aUJBQ3JCLENBQUM7Z0JBQ0YsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDO29CQUNwQixTQUFTLEVBQUUsb0JBQW9CO29CQUMvQixVQUFVLEVBQUUsMkJBQTJCO29CQUN2QyxTQUFTLEVBQUUsS0FBSztpQkFDakIsQ0FBQzthQUNIO1lBQ0QsS0FBSyxFQUFFO2dCQUNMLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQztvQkFDcEIsU0FBUyxFQUFFLG9CQUFvQjtvQkFDL0IsVUFBVSxFQUFFLDJCQUEyQjtvQkFDdkMsU0FBUyxFQUFFLEtBQUs7aUJBQ2pCLENBQUM7Z0JBQ0YsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDO29CQUNwQixTQUFTLEVBQUUsb0JBQW9CO29CQUMvQixVQUFVLEVBQUUsMkJBQTJCO29CQUN2QyxTQUFTLEVBQUUsS0FBSztpQkFDakIsQ0FBQzthQUNIO1NBQ0YsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDO0lBRU8sd0JBQXdCLENBQUMsU0FBK0I7UUFDOUQsU0FBUyxDQUFDLFVBQVUsQ0FDbEIsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQ3pCLEtBQUssRUFBRSxrQkFBa0I7WUFDekIsS0FBSyxFQUFFLEVBQUU7WUFDVCxNQUFNLEVBQUUsQ0FBQztZQUNULElBQUksRUFBRTtnQkFDSixJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7b0JBQ3BCLFNBQVMsRUFBRSxTQUFTO29CQUNwQixVQUFVLEVBQUUsZ0JBQWdCO29CQUM1QixTQUFTLEVBQUUsU0FBUztpQkFDckIsQ0FBQztnQkFDRixJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7b0JBQ3BCLFNBQVMsRUFBRSxTQUFTO29CQUNwQixVQUFVLEVBQUUscUJBQXFCO29CQUNqQyxTQUFTLEVBQUUsU0FBUztpQkFDckIsQ0FBQzthQUNIO1lBQ0QsS0FBSyxFQUFFO2dCQUNMLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQztvQkFDcEIsU0FBUyxFQUFFLFNBQVM7b0JBQ3BCLFVBQVUsRUFBRSxhQUFhO29CQUN6QixTQUFTLEVBQUUsU0FBUztpQkFDckIsQ0FBQztnQkFDRixJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7b0JBQ3BCLFNBQVMsRUFBRSxTQUFTO29CQUNwQixVQUFVLEVBQUUsY0FBYztvQkFDMUIsU0FBUyxFQUFFLFNBQVM7aUJBQ3JCLENBQUM7YUFDSDtTQUNGLENBQUMsQ0FDSCxDQUFDO0lBQ0osQ0FBQztJQUVPLDRCQUE0QixDQUFDLFNBQStCO1FBQ2xFLFNBQVMsQ0FBQyxVQUFVLENBQ2xCLElBQUksVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUN6QixLQUFLLEVBQUUsdUJBQXVCO1lBQzlCLEtBQUssRUFBRSxFQUFFO1lBQ1QsTUFBTSxFQUFFLENBQUM7WUFDVCxJQUFJLEVBQUU7Z0JBQ0osSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDO29CQUNwQixTQUFTLEVBQUUsb0JBQW9CO29CQUMvQixVQUFVLEVBQUUsdUJBQXVCO29CQUNuQyxTQUFTLEVBQUUsS0FBSztpQkFDakIsQ0FBQztnQkFDRixJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7b0JBQ3BCLFNBQVMsRUFBRSxvQkFBb0I7b0JBQy9CLFVBQVUsRUFBRSxvQkFBb0I7b0JBQ2hDLFNBQVMsRUFBRSxLQUFLO2lCQUNqQixDQUFDO2FBQ0g7WUFDRCxLQUFLLEVBQUU7Z0JBQ0wsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDO29CQUNwQixTQUFTLEVBQUUsb0JBQW9CO29CQUMvQixVQUFVLEVBQUUsa0JBQWtCO29CQUM5QixTQUFTLEVBQUUsU0FBUztpQkFDckIsQ0FBQztnQkFDRixJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7b0JBQ3BCLFNBQVMsRUFBRSxvQkFBb0I7b0JBQy9CLFVBQVUsRUFBRSxvQkFBb0I7b0JBQ2hDLFNBQVMsRUFBRSxTQUFTO2lCQUNyQixDQUFDO2FBQ0g7U0FDRixDQUFDLENBQ0gsQ0FBQztJQUNKLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxTQUErQjtRQUN4RCxTQUFTLENBQUMsVUFBVSxDQUNsQixJQUFJLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQztZQUMvQixLQUFLLEVBQUUsWUFBWTtZQUNuQixLQUFLLEVBQUUsQ0FBQztZQUNSLE1BQU0sRUFBRSxDQUFDO1lBQ1QsT0FBTyxFQUFFO2dCQUNQLElBQUksVUFBVSxDQUFDLGNBQWMsQ0FBQztvQkFDNUIsVUFBVSxFQUFFLGlCQUFpQjtvQkFDN0IsWUFBWSxFQUFFO3dCQUNaLEVBQUUsRUFBRSxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7NEJBQ3hCLFNBQVMsRUFBRSxvQkFBb0I7NEJBQy9CLFVBQVUsRUFBRSwyQkFBMkI7NEJBQ3ZDLFNBQVMsRUFBRSxLQUFLO3lCQUNqQixDQUFDO3dCQUNGLEVBQUUsRUFBRSxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7NEJBQ3hCLFNBQVMsRUFBRSxvQkFBb0I7NEJBQy9CLFVBQVUsRUFBRSxjQUFjOzRCQUMxQixTQUFTLEVBQUUsS0FBSzt5QkFDakIsQ0FBQztxQkFDSDtvQkFDRCxLQUFLLEVBQUUsY0FBYztpQkFDdEIsQ0FBQzthQUNIO1NBQ0YsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDO0lBRU8sc0JBQXNCLENBQUMsU0FBK0I7UUFDNUQsU0FBUyxDQUFDLFVBQVUsQ0FDbEIsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQ3pCLEtBQUssRUFBRSw0QkFBNEI7WUFDbkMsS0FBSyxFQUFFLEVBQUU7WUFDVCxNQUFNLEVBQUUsQ0FBQztZQUNULElBQUksRUFBRTtnQkFDSixJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7b0JBQ3BCLFNBQVMsRUFBRSxvQkFBb0I7b0JBQy9CLFVBQVUsRUFBRSx3QkFBd0I7b0JBQ3BDLFNBQVMsRUFBRSxLQUFLO2lCQUNqQixDQUFDO2dCQUNGLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQztvQkFDcEIsU0FBUyxFQUFFLG9CQUFvQjtvQkFDL0IsVUFBVSxFQUFFLG1CQUFtQjtvQkFDL0IsU0FBUyxFQUFFLEtBQUs7aUJBQ2pCLENBQUM7YUFDSDtZQUNELEtBQUssRUFBRTtnQkFDTCxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7b0JBQ3BCLFNBQVMsRUFBRSxvQkFBb0I7b0JBQy9CLFVBQVUsRUFBRSxZQUFZO29CQUN4QixTQUFTLEVBQUUsS0FBSztpQkFDakIsQ0FBQztnQkFDRixJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7b0JBQ3BCLFNBQVMsRUFBRSxvQkFBb0I7b0JBQy9CLFVBQVUsRUFBRSxlQUFlO29CQUMzQixTQUFTLEVBQUUsS0FBSztpQkFDakIsQ0FBQzthQUNIO1NBQ0YsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDO0lBRU8sbUJBQW1CLENBQUMsV0FBbUI7UUFDN0Msc0RBQXNEO1FBRXRELG9DQUFvQztRQUNwQyxNQUFNLG1CQUFtQixHQUFHLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDNUUsTUFBTSxFQUFFLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQztnQkFDNUIsU0FBUyxFQUFFLG9CQUFvQjtnQkFDL0IsVUFBVSxFQUFFLHdCQUF3QjtnQkFDcEMsU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7YUFDOUIsQ0FBQztZQUNGLFNBQVMsRUFBRSxDQUFDO1lBQ1osa0JBQWtCLEVBQUUsVUFBVSxDQUFDLGtCQUFrQixDQUFDLCtCQUErQjtZQUNqRixpQkFBaUIsRUFBRSxDQUFDO1lBQ3BCLFNBQVMsRUFBRSw4QkFBOEIsV0FBVyxFQUFFO1lBQ3RELGdCQUFnQixFQUFFLGdEQUFnRDtZQUNsRSxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsZ0JBQWdCLENBQUMsU0FBUztTQUN4RCxDQUFDLENBQUM7UUFFSCxtQkFBbUIsQ0FBQyxjQUFjLENBQ2hDLElBQUksaUJBQWlCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FDakQsQ0FBQztRQUVGLHdCQUF3QjtRQUN4QixNQUFNLGNBQWMsR0FBRyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ2xFLE1BQU0sRUFBRSxJQUFJLFVBQVUsQ0FBQyxjQUFjLENBQUM7Z0JBQ3BDLFVBQVUsRUFBRSwyQkFBMkI7Z0JBQ3ZDLFlBQVksRUFBRTtvQkFDWixNQUFNLEVBQUUsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDO3dCQUM1QixTQUFTLEVBQUUsb0JBQW9CO3dCQUMvQixVQUFVLEVBQUUsMkJBQTJCO3dCQUN2QyxTQUFTLEVBQUUsS0FBSztxQkFDakIsQ0FBQztvQkFDRixRQUFRLEVBQUUsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDO3dCQUM5QixTQUFTLEVBQUUsb0JBQW9CO3dCQUMvQixVQUFVLEVBQUUsY0FBYzt3QkFDMUIsU0FBUyxFQUFFLEtBQUs7cUJBQ2pCLENBQUM7aUJBQ0g7Z0JBQ0QsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQzthQUNoQyxDQUFDO1lBQ0YsU0FBUyxFQUFFLENBQUMsRUFBRSxnQkFBZ0I7WUFDOUIsaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixTQUFTLEVBQUUsK0JBQStCLFdBQVcsRUFBRTtZQUN2RCxnQkFBZ0IsRUFBRSwwQkFBMEI7U0FDN0MsQ0FBQyxDQUFDO1FBRUgsY0FBYyxDQUFDLGNBQWMsQ0FDM0IsSUFBSSxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUNqRCxDQUFDO0lBQ0osQ0FBQztJQUVPLGdCQUFnQixDQUFDLFdBQW1CO1FBQzFDLHlDQUF5QztRQUN6QyxNQUFNLFdBQVcsR0FBRyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUM3RCxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxrQkFBa0I7WUFDL0MsZUFBZSxFQUFFLG9CQUFvQjtZQUNyQyxVQUFVLEVBQUUsbUJBQW1CO1lBQy9CLGFBQWEsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyw2Q0FBNkMsQ0FBQztZQUN4RixXQUFXLEVBQUUsR0FBRztTQUNqQixDQUFDLENBQUM7UUFFSCxnQ0FBZ0M7UUFDaEMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQ3RFLE1BQU0sRUFBRSxXQUFXLENBQUMsTUFBTSxFQUFFO1lBQzVCLFNBQVMsRUFBRSxDQUFDO1lBQ1osaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixTQUFTLEVBQUUsa0NBQWtDLFdBQVcsRUFBRTtZQUMxRCxnQkFBZ0IsRUFBRSxxQ0FBcUM7U0FDeEQsQ0FBQyxDQUFDO1FBRUgsZ0JBQWdCLENBQUMsY0FBYyxDQUM3QixJQUFJLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQ2pELENBQUM7UUFFRixxQ0FBcUM7UUFDckMsTUFBTSxlQUFlLEdBQUcsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUNyRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSx3QkFBd0I7WUFDckQsZUFBZSxFQUFFLG9CQUFvQjtZQUNyQyxVQUFVLEVBQUUsYUFBYTtZQUN6QixhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsMkVBQTJFLENBQUM7WUFDdEgsV0FBVyxFQUFFLEdBQUc7U0FDakIsQ0FBQyxDQUFDO1FBRUgsZ0NBQWdDO1FBQ2hDLE1BQU0sY0FBYyxHQUFHLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDbEUsTUFBTSxFQUFFLGVBQWUsQ0FBQyxNQUFNLEVBQUU7WUFDaEMsU0FBUyxFQUFFLEVBQUU7WUFDYixpQkFBaUIsRUFBRSxDQUFDO1lBQ3BCLFNBQVMsRUFBRSw0QkFBNEIsV0FBVyxFQUFFO1lBQ3BELGdCQUFnQixFQUFFLGdDQUFnQztTQUNuRCxDQUFDLENBQUM7UUFFSCxjQUFjLENBQUMsY0FBYyxDQUMzQixJQUFJLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQ2pELENBQUM7SUFDSixDQUFDO0lBRU8sc0JBQXNCLENBQUMsV0FBbUI7UUFDaEQscURBQXFEO1FBQ3JELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUNqRSxRQUFRLEVBQUUsOEJBQThCLFdBQVcsRUFBRTtZQUNyRCxZQUFZLEVBQUU7Z0JBQ1osTUFBTSxFQUFFLENBQUMsU0FBUyxDQUFDO2dCQUNuQixVQUFVLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQztnQkFDckMsTUFBTSxFQUFFO29CQUNOLFVBQVUsRUFBRSxDQUFDLFNBQVMsQ0FBQztvQkFDdkIsYUFBYSxFQUFFLENBQUMsb0NBQW9DLENBQUM7aUJBQ3REO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCxxREFBcUQ7UUFDckQsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1lBQy9FLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDOzs7Ozs7Ozs7Ozs7OztPQWM1QixDQUFDO1lBQ0YsV0FBVyxFQUFFO2dCQUNYLGFBQWEsRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVE7YUFDeEM7U0FDRixDQUFDLENBQUM7UUFFSCxxQ0FBcUM7UUFDckMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUVwRCx1QkFBdUI7UUFDdkIsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7UUFFcEYseUNBQXlDO1FBQ3pDLE1BQU0sWUFBWSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ3pELFFBQVEsRUFBRSwwQkFBMEIsV0FBVyxFQUFFO1lBQ2pELFlBQVksRUFBRTtnQkFDWixNQUFNLEVBQUUsQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLFVBQVUsRUFBRSxDQUFDLHVCQUF1QixDQUFDO2dCQUNyQyxNQUFNLEVBQUU7b0JBQ04sZUFBZSxFQUFFLENBQUMsU0FBUyxFQUFFLGFBQWEsRUFBRSxjQUFjLENBQUM7aUJBQzVEO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCxZQUFZLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBRU8sYUFBYTtRQUNuQix1QkFBdUI7UUFDdkIsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDdEMsS0FBSyxFQUFFLHlEQUF5RCxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLG9CQUFvQixJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRTtZQUMzSSxXQUFXLEVBQUUsMEJBQTBCO1lBQ3ZDLFVBQVUsRUFBRSw2QkFBNkIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7U0FDM0QsQ0FBQyxDQUFDO1FBRUgseUJBQXlCO1FBQ3pCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3ZDLEtBQUssRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVE7WUFDL0IsV0FBVyxFQUFFLDBCQUEwQjtZQUN2QyxVQUFVLEVBQUUsMkJBQTJCLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO1NBQ3pELENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRDs7T0FFRztJQUNJLGVBQWUsQ0FDcEIsUUFBdUIsRUFDdkIsSUFBWSxFQUNaLGFBQWtDLEVBQ2xDLFVBQWtCLEVBQ2xCLFlBQW9CLG9CQUFvQjtRQUV4QyxPQUFPLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFO1lBQ3ZDLFFBQVE7WUFDUixlQUFlLEVBQUUsU0FBUztZQUMxQixVQUFVO1lBQ1YsYUFBYTtZQUNiLFdBQVcsRUFBRSxHQUFHO1NBQ2pCLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRDs7T0FFRztJQUNJLG9CQUFvQixDQUN6QixJQUFZLEVBQ1osV0FBbUIsRUFDbkIsTUFBMkI7UUFFM0IsT0FBTyxJQUFJLFVBQVUsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRTtZQUMvQyxnQkFBZ0IsRUFBRSxXQUFXO1lBQzdCLFNBQVMsRUFBRSxVQUFVLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxHQUFHLE1BQU0sQ0FBQztTQUNqRCxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFoZ0JELGtEQWdnQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBjbG91ZHdhdGNoIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZHdhdGNoJztcclxuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XHJcbmltcG9ydCAqIGFzIHNucyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc25zJztcclxuaW1wb3J0ICogYXMgc25zU3Vic2NyaXB0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc25zLXN1YnNjcmlwdGlvbnMnO1xyXG5pbXBvcnQgKiBhcyBjbG91ZHdhdGNoQWN0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWR3YXRjaC1hY3Rpb25zJztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGV2ZW50cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzJztcclxuaW1wb3J0ICogYXMgZXZlbnRzVGFyZ2V0cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzLXRhcmdldHMnO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuaW1wb3J0IHsgTW9uaXRvcmluZ0NvbmZpZyB9IGZyb20gJy4uL2NvbmZpZy9lbnZpcm9ubWVudC1jb25maWcnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBNb25pdG9yaW5nQ29uc3RydWN0UHJvcHMge1xyXG4gIG1vbml0b3JpbmdDb25maWc6IE1vbml0b3JpbmdDb25maWc7XHJcbiAgZW52aXJvbm1lbnQ6IHN0cmluZztcclxuICBub3RpZmljYXRpb25FbWFpbD86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1vbml0b3JpbmdDb25zdHJ1Y3QgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHB1YmxpYyByZWFkb25seSBkYXNoYm9hcmQ6IGNsb3Vkd2F0Y2guRGFzaGJvYXJkO1xyXG4gIHB1YmxpYyByZWFkb25seSBhbGFybVRvcGljOiBzbnMuVG9waWM7XHJcbiAgcHVibGljIHJlYWRvbmx5IGxvZ0dyb3VwczogbG9ncy5Mb2dHcm91cFtdO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogTW9uaXRvcmluZ0NvbnN0cnVjdFByb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIGNvbnN0IHsgbW9uaXRvcmluZ0NvbmZpZywgZW52aXJvbm1lbnQsIG5vdGlmaWNhdGlvbkVtYWlsIH0gPSBwcm9wcztcclxuXHJcbiAgICAvLyBDcmVhdGUgU05TIHRvcGljIGZvciBhbGFybSBub3RpZmljYXRpb25zXHJcbiAgICB0aGlzLmFsYXJtVG9waWMgPSB0aGlzLmNyZWF0ZUFsYXJtVG9waWMoZW52aXJvbm1lbnQsIG5vdGlmaWNhdGlvbkVtYWlsKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgbG9nIGdyb3VwcyBmb3IgZGlmZmVyZW50IGNvbXBvbmVudHNcclxuICAgIHRoaXMubG9nR3JvdXBzID0gdGhpcy5jcmVhdGVMb2dHcm91cHMobW9uaXRvcmluZ0NvbmZpZywgZW52aXJvbm1lbnQpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBDbG91ZFdhdGNoIGRhc2hib2FyZFxyXG4gICAgdGhpcy5kYXNoYm9hcmQgPSB0aGlzLmNyZWF0ZURhc2hib2FyZChlbnZpcm9ubWVudCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGN1c3RvbSBtZXRyaWNzIGFuZCBhbGFybXNcclxuICAgIHRoaXMuY3JlYXRlQ3VzdG9tTWV0cmljcyhlbnZpcm9ubWVudCk7XHJcblxyXG4gICAgLy8gU2V0IHVwIGxvZyBhbmFseXNpcyBhbmQgYWxlcnRzXHJcbiAgICB0aGlzLnNldHVwTG9nQW5hbHlzaXMoZW52aXJvbm1lbnQpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBFdmVudEJyaWRnZSBydWxlcyBmb3Igc3lzdGVtIGV2ZW50c1xyXG4gICAgdGhpcy5jcmVhdGVFdmVudEJyaWRnZVJ1bGVzKGVudmlyb25tZW50KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgb3V0cHV0c1xyXG4gICAgdGhpcy5jcmVhdGVPdXRwdXRzKCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNyZWF0ZUFsYXJtVG9waWMoZW52aXJvbm1lbnQ6IHN0cmluZywgbm90aWZpY2F0aW9uRW1haWw/OiBzdHJpbmcpOiBzbnMuVG9waWMge1xyXG4gICAgY29uc3QgdG9waWMgPSBuZXcgc25zLlRvcGljKHRoaXMsICdBbGFybVRvcGljJywge1xyXG4gICAgICB0b3BpY05hbWU6IGByZWNydWl0bWVudC1hbGFybXMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBkaXNwbGF5TmFtZTogYFJlY3J1aXRtZW50IFdlYnNpdGUgQWxhcm1zIC0gJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIGVtYWlsIHN1YnNjcmlwdGlvbiBpZiBwcm92aWRlZFxyXG4gICAgaWYgKG5vdGlmaWNhdGlvbkVtYWlsKSB7XHJcbiAgICAgIHRvcGljLmFkZFN1YnNjcmlwdGlvbihcclxuICAgICAgICBuZXcgc25zU3Vic2NyaXB0aW9ucy5FbWFpbFN1YnNjcmlwdGlvbihub3RpZmljYXRpb25FbWFpbClcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBBZGQgdGFnc1xyXG4gICAgY2RrLlRhZ3Mub2YodG9waWMpLmFkZCgnRW52aXJvbm1lbnQnLCBlbnZpcm9ubWVudCk7XHJcbiAgICBjZGsuVGFncy5vZih0b3BpYykuYWRkKCdQcm9qZWN0JywgJ1JlY3J1aXRtZW50V2Vic2l0ZScpO1xyXG5cclxuICAgIHJldHVybiB0b3BpYztcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlTG9nR3JvdXBzKG1vbml0b3JpbmdDb25maWc6IE1vbml0b3JpbmdDb25maWcsIGVudmlyb25tZW50OiBzdHJpbmcpOiBsb2dzLkxvZ0dyb3VwW10ge1xyXG4gICAgY29uc3QgbG9nR3JvdXBzOiBsb2dzLkxvZ0dyb3VwW10gPSBbXTtcclxuXHJcbiAgICAvLyBBcHBsaWNhdGlvbiBsb2dzXHJcbiAgICBjb25zdCBhcHBMb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdBcHBsaWNhdGlvbkxvZ0dyb3VwJywge1xyXG4gICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL3JlY3J1aXRtZW50L2FwcGxpY2F0aW9uLyR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMudmFsdWVPZihtb25pdG9yaW5nQ29uZmlnLmxvZ1JldGVudGlvbkRheXMpLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcbiAgICBsb2dHcm91cHMucHVzaChhcHBMb2dHcm91cCk7XHJcblxyXG4gICAgLy8gRXJyb3IgbG9nc1xyXG4gICAgY29uc3QgZXJyb3JMb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdFcnJvckxvZ0dyb3VwJywge1xyXG4gICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL3JlY3J1aXRtZW50L2Vycm9ycy8ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLnZhbHVlT2YobW9uaXRvcmluZ0NvbmZpZy5sb2dSZXRlbnRpb25EYXlzKSxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG4gICAgbG9nR3JvdXBzLnB1c2goZXJyb3JMb2dHcm91cCk7XHJcblxyXG4gICAgLy8gQWNjZXNzIGxvZ3NcclxuICAgIGNvbnN0IGFjY2Vzc0xvZ0dyb3VwID0gbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ0FjY2Vzc0xvZ0dyb3VwJywge1xyXG4gICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL3JlY3J1aXRtZW50L2FjY2Vzcy8ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLnZhbHVlT2YobW9uaXRvcmluZ0NvbmZpZy5sb2dSZXRlbnRpb25EYXlzKSxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG4gICAgbG9nR3JvdXBzLnB1c2goYWNjZXNzTG9nR3JvdXApO1xyXG5cclxuICAgIC8vIFBlcmZvcm1hbmNlIGxvZ3NcclxuICAgIGNvbnN0IHBlcmZvcm1hbmNlTG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnUGVyZm9ybWFuY2VMb2dHcm91cCcsIHtcclxuICAgICAgbG9nR3JvdXBOYW1lOiBgL2F3cy9yZWNydWl0bWVudC9wZXJmb3JtYW5jZS8ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLnZhbHVlT2YobW9uaXRvcmluZ0NvbmZpZy5sb2dSZXRlbnRpb25EYXlzKSxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG4gICAgbG9nR3JvdXBzLnB1c2gocGVyZm9ybWFuY2VMb2dHcm91cCk7XHJcblxyXG4gICAgLy8gU2VjdXJpdHkgbG9nc1xyXG4gICAgY29uc3Qgc2VjdXJpdHlMb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdTZWN1cml0eUxvZ0dyb3VwJywge1xyXG4gICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL3JlY3J1aXRtZW50L3NlY3VyaXR5LyR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMudmFsdWVPZihtb25pdG9yaW5nQ29uZmlnLmxvZ1JldGVudGlvbkRheXMpLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcbiAgICBsb2dHcm91cHMucHVzaChzZWN1cml0eUxvZ0dyb3VwKTtcclxuXHJcbiAgICByZXR1cm4gbG9nR3JvdXBzO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjcmVhdGVEYXNoYm9hcmQoZW52aXJvbm1lbnQ6IHN0cmluZyk6IGNsb3Vkd2F0Y2guRGFzaGJvYXJkIHtcclxuICAgIGNvbnN0IGRhc2hib2FyZCA9IG5ldyBjbG91ZHdhdGNoLkRhc2hib2FyZCh0aGlzLCAnTW9uaXRvcmluZ0Rhc2hib2FyZCcsIHtcclxuICAgICAgZGFzaGJvYXJkTmFtZTogYHJlY3J1aXRtZW50LWRhc2hib2FyZC0ke2Vudmlyb25tZW50fWAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgd2lkZ2V0cyB0byBkYXNoYm9hcmRcclxuICAgIHRoaXMuYWRkU3lzdGVtT3ZlcnZpZXdXaWRnZXQoZGFzaGJvYXJkKTtcclxuICAgIHRoaXMuYWRkQXBwbGljYXRpb25NZXRyaWNzV2lkZ2V0KGRhc2hib2FyZCk7XHJcbiAgICB0aGlzLmFkZERhdGFiYXNlTWV0cmljc1dpZGdldChkYXNoYm9hcmQpO1xyXG4gICAgdGhpcy5hZGRMb2FkQmFsYW5jZXJNZXRyaWNzV2lkZ2V0KGRhc2hib2FyZCk7XHJcbiAgICB0aGlzLmFkZEVycm9yUmF0ZVdpZGdldChkYXNoYm9hcmQpO1xyXG4gICAgdGhpcy5hZGRDdXN0b21NZXRyaWNzV2lkZ2V0KGRhc2hib2FyZCk7XHJcblxyXG4gICAgcmV0dXJuIGRhc2hib2FyZDtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYWRkU3lzdGVtT3ZlcnZpZXdXaWRnZXQoZGFzaGJvYXJkOiBjbG91ZHdhdGNoLkRhc2hib2FyZCk6IHZvaWQge1xyXG4gICAgZGFzaGJvYXJkLmFkZFdpZGdldHMoXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ1N5c3RlbSBPdmVydmlldycsXHJcbiAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICAgIGhlaWdodDogNixcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvRUNTJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0NQVVV0aWxpemF0aW9uJyxcclxuICAgICAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9FQ1MnLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnTWVtb3J5VXRpbGl6YXRpb24nLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgcmlnaHQ6IFtcclxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcHBsaWNhdGlvbkVMQicsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdSZXF1ZXN0Q291bnQnLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgfSlcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFkZEFwcGxpY2F0aW9uTWV0cmljc1dpZGdldChkYXNoYm9hcmQ6IGNsb3Vkd2F0Y2guRGFzaGJvYXJkKTogdm9pZCB7XHJcbiAgICBkYXNoYm9hcmQuYWRkV2lkZ2V0cyhcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnQXBwbGljYXRpb24gTWV0cmljcycsXHJcbiAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICAgIGhlaWdodDogNixcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQXBwbGljYXRpb25FTEInLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnVGFyZ2V0UmVzcG9uc2VUaW1lJyxcclxuICAgICAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcHBsaWNhdGlvbkVMQicsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdIVFRQQ29kZV9UYXJnZXRfMlhYX0NvdW50JyxcclxuICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgcmlnaHQ6IFtcclxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcHBsaWNhdGlvbkVMQicsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdIVFRQQ29kZV9UYXJnZXRfNFhYX0NvdW50JyxcclxuICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0FwcGxpY2F0aW9uRUxCJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0hUVFBDb2RlX1RhcmdldF81WFhfQ291bnQnLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgfSlcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFkZERhdGFiYXNlTWV0cmljc1dpZGdldChkYXNoYm9hcmQ6IGNsb3Vkd2F0Y2guRGFzaGJvYXJkKTogdm9pZCB7XHJcbiAgICBkYXNoYm9hcmQuYWRkV2lkZ2V0cyhcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnRGF0YWJhc2UgTWV0cmljcycsXHJcbiAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICAgIGhlaWdodDogNixcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvUkRTJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0NQVVV0aWxpemF0aW9uJyxcclxuICAgICAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9SRFMnLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnRGF0YWJhc2VDb25uZWN0aW9ucycsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICByaWdodDogW1xyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL1JEUycsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdSZWFkTGF0ZW5jeScsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvUkRTJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ1dyaXRlTGF0ZW5jeScsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgfSlcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFkZExvYWRCYWxhbmNlck1ldHJpY3NXaWRnZXQoZGFzaGJvYXJkOiBjbG91ZHdhdGNoLkRhc2hib2FyZCk6IHZvaWQge1xyXG4gICAgZGFzaGJvYXJkLmFkZFdpZGdldHMoXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0xvYWQgQmFsYW5jZXIgTWV0cmljcycsXHJcbiAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICAgIGhlaWdodDogNixcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQXBwbGljYXRpb25FTEInLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnQWN0aXZlQ29ubmVjdGlvbkNvdW50JyxcclxuICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0FwcGxpY2F0aW9uRUxCJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ05ld0Nvbm5lY3Rpb25Db3VudCcsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHJpZ2h0OiBbXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQXBwbGljYXRpb25FTEInLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnSGVhbHRoeUhvc3RDb3VudCcsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQXBwbGljYXRpb25FTEInLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnVW5IZWFsdGh5SG9zdENvdW50JyxcclxuICAgICAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYWRkRXJyb3JSYXRlV2lkZ2V0KGRhc2hib2FyZDogY2xvdWR3YXRjaC5EYXNoYm9hcmQpOiB2b2lkIHtcclxuICAgIGRhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5TaW5nbGVWYWx1ZVdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdFcnJvciBSYXRlJyxcclxuICAgICAgICB3aWR0aDogNixcclxuICAgICAgICBoZWlnaHQ6IDYsXHJcbiAgICAgICAgbWV0cmljczogW1xyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWF0aEV4cHJlc3Npb24oe1xyXG4gICAgICAgICAgICBleHByZXNzaW9uOiAnKG0xIC8gbTIpICogMTAwJyxcclxuICAgICAgICAgICAgdXNpbmdNZXRyaWNzOiB7XHJcbiAgICAgICAgICAgICAgbTE6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQXBwbGljYXRpb25FTEInLFxyXG4gICAgICAgICAgICAgICAgbWV0cmljTmFtZTogJ0hUVFBDb2RlX1RhcmdldF81WFhfQ291bnQnLFxyXG4gICAgICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICBtMjogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcHBsaWNhdGlvbkVMQicsXHJcbiAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnUmVxdWVzdENvdW50JyxcclxuICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGxhYmVsOiAnRXJyb3IgUmF0ZSAlJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhZGRDdXN0b21NZXRyaWNzV2lkZ2V0KGRhc2hib2FyZDogY2xvdWR3YXRjaC5EYXNoYm9hcmQpOiB2b2lkIHtcclxuICAgIGRhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdDdXN0b20gQXBwbGljYXRpb24gTWV0cmljcycsXHJcbiAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICAgIGhlaWdodDogNixcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdSZWNydWl0bWVudFdlYnNpdGUnLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnQXBwbGljYXRpb25TdWJtaXNzaW9ucycsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ1JlY3J1aXRtZW50V2Vic2l0ZScsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdVc2VyUmVnaXN0cmF0aW9ucycsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHJpZ2h0OiBbXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdSZWNydWl0bWVudFdlYnNpdGUnLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnRW1haWxzU2VudCcsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ1JlY3J1aXRtZW50V2Vic2l0ZScsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdMb2dpbkF0dGVtcHRzJyxcclxuICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjcmVhdGVDdXN0b21NZXRyaWNzKGVudmlyb25tZW50OiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIC8vIENyZWF0ZSBjdXN0b20gbWV0cmljcyBmb3IgYnVzaW5lc3MgbG9naWMgbW9uaXRvcmluZ1xyXG4gICAgXHJcbiAgICAvLyBBcHBsaWNhdGlvbiBzdWJtaXNzaW9uIHJhdGUgYWxhcm1cclxuICAgIGNvbnN0IHN1Ym1pc3Npb25SYXRlQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnU3VibWlzc2lvblJhdGVBbGFybScsIHtcclxuICAgICAgbWV0cmljOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgIG5hbWVzcGFjZTogJ1JlY3J1aXRtZW50V2Vic2l0ZScsXHJcbiAgICAgICAgbWV0cmljTmFtZTogJ0FwcGxpY2F0aW9uU3VibWlzc2lvbnMnLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgIH0pLFxyXG4gICAgICB0aHJlc2hvbGQ6IDAsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuTEVTU19USEFOX09SX0VRVUFMX1RPX1RIUkVTSE9MRCxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXHJcbiAgICAgIGFsYXJtTmFtZTogYHJlY3J1aXRtZW50LW5vLXN1Ym1pc3Npb25zLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ05vIGFwcGxpY2F0aW9uIHN1Ym1pc3Npb25zIGluIHRoZSBsYXN0IDIgaG91cnMnLFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuQlJFQUNISU5HLFxyXG4gICAgfSk7XHJcblxyXG4gICAgc3VibWlzc2lvblJhdGVBbGFybS5hZGRBbGFybUFjdGlvbihcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2hBY3Rpb25zLlNuc0FjdGlvbih0aGlzLmFsYXJtVG9waWMpXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEhpZ2ggZXJyb3IgcmF0ZSBhbGFybVxyXG4gICAgY29uc3QgZXJyb3JSYXRlQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnRXJyb3JSYXRlQWxhcm0nLCB7XHJcbiAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWF0aEV4cHJlc3Npb24oe1xyXG4gICAgICAgIGV4cHJlc3Npb246ICcoZXJyb3JzIC8gcmVxdWVzdHMpICogMTAwJyxcclxuICAgICAgICB1c2luZ01ldHJpY3M6IHtcclxuICAgICAgICAgIGVycm9yczogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0FwcGxpY2F0aW9uRUxCJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0hUVFBDb2RlX1RhcmdldF81WFhfQ291bnQnLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICByZXF1ZXN0czogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0FwcGxpY2F0aW9uRUxCJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ1JlcXVlc3RDb3VudCcsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIH0pLFxyXG4gICAgICB0aHJlc2hvbGQ6IDUsIC8vIDUlIGVycm9yIHJhdGVcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXHJcbiAgICAgIGFsYXJtTmFtZTogYHJlY3J1aXRtZW50LWhpZ2gtZXJyb3ItcmF0ZS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdIaWdoIGVycm9yIHJhdGUgZGV0ZWN0ZWQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgZXJyb3JSYXRlQWxhcm0uYWRkQWxhcm1BY3Rpb24oXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoQWN0aW9ucy5TbnNBY3Rpb24odGhpcy5hbGFybVRvcGljKVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgc2V0dXBMb2dBbmFseXNpcyhlbnZpcm9ubWVudDogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAvLyBDcmVhdGUgbG9nIGZpbHRlcnMgZm9yIGVycm9yIGRldGVjdGlvblxyXG4gICAgY29uc3QgZXJyb3JGaWx0ZXIgPSBuZXcgbG9ncy5NZXRyaWNGaWx0ZXIodGhpcywgJ0Vycm9yRmlsdGVyJywge1xyXG4gICAgICBsb2dHcm91cDogdGhpcy5sb2dHcm91cHNbMV0sIC8vIEVycm9yIGxvZyBncm91cFxyXG4gICAgICBtZXRyaWNOYW1lc3BhY2U6ICdSZWNydWl0bWVudFdlYnNpdGUnLFxyXG4gICAgICBtZXRyaWNOYW1lOiAnQXBwbGljYXRpb25FcnJvcnMnLFxyXG4gICAgICBmaWx0ZXJQYXR0ZXJuOiBsb2dzLkZpbHRlclBhdHRlcm4ubGl0ZXJhbCgnW3RpbWVzdGFtcCwgcmVxdWVzdF9pZCwgbGV2ZWw9XCJFUlJPUlwiLCAuLi5dJyksXHJcbiAgICAgIG1ldHJpY1ZhbHVlOiAnMScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgYWxhcm0gZm9yIGVycm9yIGZpbHRlclxyXG4gICAgY29uc3QgZXJyb3JGaWx0ZXJBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdFcnJvckZpbHRlckFsYXJtJywge1xyXG4gICAgICBtZXRyaWM6IGVycm9yRmlsdGVyLm1ldHJpYygpLFxyXG4gICAgICB0aHJlc2hvbGQ6IDUsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAxLFxyXG4gICAgICBhbGFybU5hbWU6IGByZWNydWl0bWVudC1hcHBsaWNhdGlvbi1lcnJvcnMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQXBwbGljYXRpb24gZXJyb3JzIGRldGVjdGVkIGluIGxvZ3MnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgZXJyb3JGaWx0ZXJBbGFybS5hZGRBbGFybUFjdGlvbihcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2hBY3Rpb25zLlNuc0FjdGlvbih0aGlzLmFsYXJtVG9waWMpXHJcbiAgICApO1xyXG5cclxuICAgIC8vIENyZWF0ZSBsb2cgZmlsdGVyIGZvciBzbG93IHF1ZXJpZXNcclxuICAgIGNvbnN0IHNsb3dRdWVyeUZpbHRlciA9IG5ldyBsb2dzLk1ldHJpY0ZpbHRlcih0aGlzLCAnU2xvd1F1ZXJ5RmlsdGVyJywge1xyXG4gICAgICBsb2dHcm91cDogdGhpcy5sb2dHcm91cHNbM10sIC8vIFBlcmZvcm1hbmNlIGxvZyBncm91cFxyXG4gICAgICBtZXRyaWNOYW1lc3BhY2U6ICdSZWNydWl0bWVudFdlYnNpdGUnLFxyXG4gICAgICBtZXRyaWNOYW1lOiAnU2xvd1F1ZXJpZXMnLFxyXG4gICAgICBmaWx0ZXJQYXR0ZXJuOiBsb2dzLkZpbHRlclBhdHRlcm4ubGl0ZXJhbCgnW3RpbWVzdGFtcCwgcmVxdWVzdF9pZCwgbGV2ZWw9XCJXQVJOXCIsIG1lc3NhZ2U9XCJTbG93IHF1ZXJ5IGRldGVjdGVkXCIsIC4uLl0nKSxcclxuICAgICAgbWV0cmljVmFsdWU6ICcxJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBhbGFybSBmb3Igc2xvdyBxdWVyaWVzXHJcbiAgICBjb25zdCBzbG93UXVlcnlBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdTbG93UXVlcnlBbGFybScsIHtcclxuICAgICAgbWV0cmljOiBzbG93UXVlcnlGaWx0ZXIubWV0cmljKCksXHJcbiAgICAgIHRocmVzaG9sZDogMTAsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBhbGFybU5hbWU6IGByZWNydWl0bWVudC1zbG93LXF1ZXJpZXMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnU2xvdyBkYXRhYmFzZSBxdWVyaWVzIGRldGVjdGVkJyxcclxuICAgIH0pO1xyXG5cclxuICAgIHNsb3dRdWVyeUFsYXJtLmFkZEFsYXJtQWN0aW9uKFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaEFjdGlvbnMuU25zQWN0aW9uKHRoaXMuYWxhcm1Ub3BpYylcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNyZWF0ZUV2ZW50QnJpZGdlUnVsZXMoZW52aXJvbm1lbnQ6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgLy8gQ3JlYXRlIEV2ZW50QnJpZGdlIHJ1bGUgZm9yIEVDUyB0YXNrIHN0YXRlIGNoYW5nZXNcclxuICAgIGNvbnN0IGVjc1Rhc2tTdGF0ZVJ1bGUgPSBuZXcgZXZlbnRzLlJ1bGUodGhpcywgJ0Vjc1Rhc2tTdGF0ZVJ1bGUnLCB7XHJcbiAgICAgIHJ1bGVOYW1lOiBgcmVjcnVpdG1lbnQtZWNzLXRhc2stc3RhdGUtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBldmVudFBhdHRlcm46IHtcclxuICAgICAgICBzb3VyY2U6IFsnYXdzLmVjcyddLFxyXG4gICAgICAgIGRldGFpbFR5cGU6IFsnRUNTIFRhc2sgU3RhdGUgQ2hhbmdlJ10sXHJcbiAgICAgICAgZGV0YWlsOiB7XHJcbiAgICAgICAgICBsYXN0U3RhdHVzOiBbJ1NUT1BQRUQnXSxcclxuICAgICAgICAgIHN0b3BwZWRSZWFzb246IFsnRXNzZW50aWFsIGNvbnRhaW5lciBpbiB0YXNrIGV4aXRlZCddLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgTGFtYmRhIGZ1bmN0aW9uIHRvIGhhbmRsZSBFQ1MgdGFzayBmYWlsdXJlc1xyXG4gICAgY29uc3QgZWNzVGFza0ZhaWx1cmVIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnRWNzVGFza0ZhaWx1cmVIYW5kbGVyJywge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMThfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tSW5saW5lKGBcclxuICAgICAgICBjb25zdCBBV1MgPSByZXF1aXJlKCdhd3Mtc2RrJyk7XHJcbiAgICAgICAgY29uc3Qgc25zID0gbmV3IEFXUy5TTlMoKTtcclxuICAgICAgICBcclxuICAgICAgICBleHBvcnRzLmhhbmRsZXIgPSBhc3luYyAoZXZlbnQpID0+IHtcclxuICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSB7XHJcbiAgICAgICAgICAgIFN1YmplY3Q6ICdFQ1MgVGFzayBGYWlsdXJlIEFsZXJ0JyxcclxuICAgICAgICAgICAgTWVzc2FnZTogSlNPTi5zdHJpbmdpZnkoZXZlbnQsIG51bGwsIDIpLFxyXG4gICAgICAgICAgICBUb3BpY0FybjogcHJvY2Vzcy5lbnYuU05TX1RPUElDX0FSTixcclxuICAgICAgICAgIH07XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGF3YWl0IHNucy5wdWJsaXNoKG1lc3NhZ2UpLnByb21pc2UoKTtcclxuICAgICAgICAgIHJldHVybiB7IHN0YXR1c0NvZGU6IDIwMCB9O1xyXG4gICAgICAgIH07XHJcbiAgICAgIGApLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFNOU19UT1BJQ19BUk46IHRoaXMuYWxhcm1Ub3BpYy50b3BpY0FybixcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IHBlcm1pc3Npb24gdG8gcHVibGlzaCB0byBTTlNcclxuICAgIHRoaXMuYWxhcm1Ub3BpYy5ncmFudFB1Ymxpc2goZWNzVGFza0ZhaWx1cmVIYW5kbGVyKTtcclxuXHJcbiAgICAvLyBBZGQgTGFtYmRhIGFzIHRhcmdldFxyXG4gICAgZWNzVGFza1N0YXRlUnVsZS5hZGRUYXJnZXQobmV3IGV2ZW50c1RhcmdldHMuTGFtYmRhRnVuY3Rpb24oZWNzVGFza0ZhaWx1cmVIYW5kbGVyKSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIEV2ZW50QnJpZGdlIHJ1bGUgZm9yIFJEUyBldmVudHNcclxuICAgIGNvbnN0IHJkc0V2ZW50UnVsZSA9IG5ldyBldmVudHMuUnVsZSh0aGlzLCAnUmRzRXZlbnRSdWxlJywge1xyXG4gICAgICBydWxlTmFtZTogYHJlY3J1aXRtZW50LXJkcy1ldmVudHMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBldmVudFBhdHRlcm46IHtcclxuICAgICAgICBzb3VyY2U6IFsnYXdzLnJkcyddLFxyXG4gICAgICAgIGRldGFpbFR5cGU6IFsnUkRTIERCIEluc3RhbmNlIEV2ZW50J10sXHJcbiAgICAgICAgZGV0YWlsOiB7XHJcbiAgICAgICAgICBFdmVudENhdGVnb3JpZXM6IFsnZmFpbHVyZScsICdtYWludGVuYW5jZScsICdub3RpZmljYXRpb24nXSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmRzRXZlbnRSdWxlLmFkZFRhcmdldChuZXcgZXZlbnRzVGFyZ2V0cy5TbnNUb3BpYyh0aGlzLmFsYXJtVG9waWMpKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlT3V0cHV0cygpOiB2b2lkIHtcclxuICAgIC8vIE91dHB1dCBkYXNoYm9hcmQgVVJMXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGFzaGJvYXJkVXJsJywge1xyXG4gICAgICB2YWx1ZTogYGh0dHBzOi8vY29uc29sZS5hd3MuYW1hem9uLmNvbS9jbG91ZHdhdGNoL2hvbWU/cmVnaW9uPSR7Y2RrLlN0YWNrLm9mKHRoaXMpLnJlZ2lvbn0jZGFzaGJvYXJkczpuYW1lPSR7dGhpcy5kYXNoYm9hcmQuZGFzaGJvYXJkTmFtZX1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkV2F0Y2ggZGFzaGJvYXJkIFVSTCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGByZWNydWl0bWVudC1kYXNoYm9hcmQtdXJsLSR7dGhpcy5ub2RlLnNjb3BlfWAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgYWxhcm0gdG9waWMgQVJOXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQWxhcm1Ub3BpY0FybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuYWxhcm1Ub3BpYy50b3BpY0FybixcclxuICAgICAgZGVzY3JpcHRpb246ICdTTlMgdG9waWMgQVJOIGZvciBhbGFybXMnLFxyXG4gICAgICBleHBvcnROYW1lOiBgcmVjcnVpdG1lbnQtYWxhcm0tdG9waWMtJHt0aGlzLm5vZGUuc2NvcGV9YCxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQWRkIGEgY3VzdG9tIG1ldHJpYyBmaWx0ZXIgdG8gYSBsb2cgZ3JvdXBcclxuICAgKi9cclxuICBwdWJsaWMgYWRkTWV0cmljRmlsdGVyKFxyXG4gICAgbG9nR3JvdXA6IGxvZ3MuTG9nR3JvdXAsXHJcbiAgICBuYW1lOiBzdHJpbmcsXHJcbiAgICBmaWx0ZXJQYXR0ZXJuOiBsb2dzLklGaWx0ZXJQYXR0ZXJuLFxyXG4gICAgbWV0cmljTmFtZTogc3RyaW5nLFxyXG4gICAgbmFtZXNwYWNlOiBzdHJpbmcgPSAnUmVjcnVpdG1lbnRXZWJzaXRlJ1xyXG4gICk6IGxvZ3MuTWV0cmljRmlsdGVyIHtcclxuICAgIHJldHVybiBuZXcgbG9ncy5NZXRyaWNGaWx0ZXIodGhpcywgbmFtZSwge1xyXG4gICAgICBsb2dHcm91cCxcclxuICAgICAgbWV0cmljTmFtZXNwYWNlOiBuYW1lc3BhY2UsXHJcbiAgICAgIG1ldHJpY05hbWUsXHJcbiAgICAgIGZpbHRlclBhdHRlcm4sXHJcbiAgICAgIG1ldHJpY1ZhbHVlOiAnMScsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBhIGNvbXBvc2l0ZSBhbGFybSBmcm9tIG11bHRpcGxlIGFsYXJtc1xyXG4gICAqL1xyXG4gIHB1YmxpYyBjcmVhdGVDb21wb3NpdGVBbGFybShcclxuICAgIG5hbWU6IHN0cmluZyxcclxuICAgIGRlc2NyaXB0aW9uOiBzdHJpbmcsXHJcbiAgICBhbGFybXM6IGNsb3Vkd2F0Y2guSUFsYXJtW11cclxuICApOiBjbG91ZHdhdGNoLkNvbXBvc2l0ZUFsYXJtIHtcclxuICAgIHJldHVybiBuZXcgY2xvdWR3YXRjaC5Db21wb3NpdGVBbGFybSh0aGlzLCBuYW1lLCB7XHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246IGRlc2NyaXB0aW9uLFxyXG4gICAgICBhbGFybVJ1bGU6IGNsb3Vkd2F0Y2guQWxhcm1SdWxlLmFueU9mKC4uLmFsYXJtcyksXHJcbiAgICB9KTtcclxuICB9XHJcbn0iXX0=