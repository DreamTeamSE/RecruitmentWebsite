import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';
import { MonitoringConfig } from '../config/environment-config';

export interface MonitoringConstructProps {
  monitoringConfig: MonitoringConfig;
  environment: string;
  notificationEmail?: string;
}

export class MonitoringConstruct extends Construct {
  public readonly dashboard: cloudwatch.Dashboard;
  public readonly alarmTopic: sns.Topic;
  public readonly logGroups: logs.LogGroup[];

  constructor(scope: Construct, id: string, props: MonitoringConstructProps) {
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

  private createAlarmTopic(environment: string, notificationEmail?: string): sns.Topic {
    const topic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `recruitment-alarms-${environment}`,
      displayName: `Recruitment Website Alarms - ${environment}`,
    });

    // Add email subscription if provided
    if (notificationEmail) {
      topic.addSubscription(
        new snsSubscriptions.EmailSubscription(notificationEmail)
      );
    }

    // Add tags
    cdk.Tags.of(topic).add('Environment', environment);
    cdk.Tags.of(topic).add('Project', 'RecruitmentWebsite');

    return topic;
  }

  private createLogGroups(monitoringConfig: MonitoringConfig, environment: string): logs.LogGroup[] {
    const logGroups: logs.LogGroup[] = [];

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

  private createDashboard(environment: string): cloudwatch.Dashboard {
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

  private addSystemOverviewWidget(dashboard: cloudwatch.Dashboard): void {
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
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
      })
    );
  }

  private addApplicationMetricsWidget(dashboard: cloudwatch.Dashboard): void {
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
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
      })
    );
  }

  private addDatabaseMetricsWidget(dashboard: cloudwatch.Dashboard): void {
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
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
      })
    );
  }

  private addLoadBalancerMetricsWidget(dashboard: cloudwatch.Dashboard): void {
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
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
      })
    );
  }

  private addErrorRateWidget(dashboard: cloudwatch.Dashboard): void {
    dashboard.addWidgets(
      new cloudwatch.SingleValueWidget({
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
      })
    );
  }

  private addCustomMetricsWidget(dashboard: cloudwatch.Dashboard): void {
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
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
      })
    );
  }

  private createCustomMetrics(environment: string): void {
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

    submissionRateAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alarmTopic)
    );

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

    errorRateAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alarmTopic)
    );
  }

  private setupLogAnalysis(environment: string): void {
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

    errorFilterAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alarmTopic)
    );

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

    slowQueryAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alarmTopic)
    );
  }

  private createEventBridgeRules(environment: string): void {
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

  private createOutputs(): void {
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
  public addMetricFilter(
    logGroup: logs.LogGroup,
    name: string,
    filterPattern: logs.IFilterPattern,
    metricName: string,
    namespace: string = 'RecruitmentWebsite'
  ): logs.MetricFilter {
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
  public createCompositeAlarm(
    name: string,
    description: string,
    alarms: cloudwatch.IAlarm[]
  ): cloudwatch.CompositeAlarm {
    return new cloudwatch.CompositeAlarm(this, name, {
      alarmDescription: description,
      alarmRule: cloudwatch.AlarmRule.anyOf(...alarms),
    });
  }
}