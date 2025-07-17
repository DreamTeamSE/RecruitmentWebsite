import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { MonitoringConfig } from '../config/environment-config';
export interface MonitoringConstructProps {
    monitoringConfig: MonitoringConfig;
    environment: string;
    notificationEmail?: string;
}
export declare class MonitoringConstruct extends Construct {
    readonly dashboard: cloudwatch.Dashboard;
    readonly alarmTopic: sns.Topic;
    readonly logGroups: logs.LogGroup[];
    constructor(scope: Construct, id: string, props: MonitoringConstructProps);
    private createAlarmTopic;
    private createLogGroups;
    private createDashboard;
    private addSystemOverviewWidget;
    private addApplicationMetricsWidget;
    private addDatabaseMetricsWidget;
    private addLoadBalancerMetricsWidget;
    private addErrorRateWidget;
    private addCustomMetricsWidget;
    private createCustomMetrics;
    private setupLogAnalysis;
    private createEventBridgeRules;
    private createOutputs;
    /**
     * Add a custom metric filter to a log group
     */
    addMetricFilter(logGroup: logs.LogGroup, name: string, filterPattern: logs.IFilterPattern, metricName: string, namespace?: string): logs.MetricFilter;
    /**
     * Create a composite alarm from multiple alarms
     */
    createCompositeAlarm(name: string, description: string, alarms: cloudwatch.IAlarm[]): cloudwatch.CompositeAlarm;
}
