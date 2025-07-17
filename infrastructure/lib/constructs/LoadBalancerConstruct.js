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
exports.LoadBalancerConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const elbv2 = __importStar(require("aws-cdk-lib/aws-elasticloadbalancingv2"));
const acm = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
const route53 = __importStar(require("aws-cdk-lib/aws-route53"));
const targets = __importStar(require("aws-cdk-lib/aws-route53-targets"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const wafv2 = __importStar(require("aws-cdk-lib/aws-wafv2"));
const constructs_1 = require("constructs");
class LoadBalancerConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // Create Application Load Balancer
        this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'LoadBalancer', {
            loadBalancerName: `recruitment-alb-${props.environment}`,
            vpc: props.vpc,
            internetFacing: true,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PUBLIC,
            },
            securityGroup: props.securityGroup,
            deletionProtection: props.environment === 'prod',
            idleTimeout: cdk.Duration.seconds(60),
            http2Enabled: true,
            ipAddressType: elbv2.IpAddressType.IPV4,
        });
        // Create SSL certificate if domain is provided
        if (props.domainName && !props.certificateArn) {
            this.certificate = new acm.Certificate(this, 'Certificate', {
                domainName: props.domainName,
                subjectAlternativeNames: [`*.${props.domainName}`],
                validation: acm.CertificateValidation.fromDns(),
            });
        }
        // Create target group
        this.targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
            targetGroupName: `recruitment-tg-${props.environment}`,
            port: 3000,
            protocol: elbv2.ApplicationProtocol.HTTP,
            vpc: props.vpc,
            targetType: elbv2.TargetType.IP,
            healthCheck: {
                enabled: true,
                protocol: elbv2.Protocol.HTTP,
                port: '3000',
                path: '/health',
                interval: cdk.Duration.seconds(30),
                timeout: cdk.Duration.seconds(5),
                healthyThresholdCount: 2,
                unhealthyThresholdCount: 3,
                healthyHttpCodes: '200',
            },
            deregistrationDelay: cdk.Duration.seconds(30),
            stickinessCookieDuration: cdk.Duration.hours(1),
            targetGroupAttributes: {
                'deregistration_delay.timeout_seconds': '30',
                'stickiness.enabled': 'true',
                'stickiness.type': 'lb_cookie',
                'stickiness.lb_cookie.duration_seconds': '3600',
                'load_balancing.algorithm.type': 'round_robin',
            },
        });
        // Create HTTP listener (redirect to HTTPS)
        this.httpListener = this.loadBalancer.addListener('HttpListener', {
            port: 80,
            protocol: elbv2.ApplicationProtocol.HTTP,
            defaultAction: elbv2.ListenerAction.redirect({
                protocol: 'HTTPS',
                port: '443',
                permanent: true,
            }),
        });
        // Create HTTPS listener
        const certificateArn = props.certificateArn || this.certificate?.certificateArn;
        this.httpsListener = this.loadBalancer.addListener('HttpsListener', {
            port: 443,
            protocol: elbv2.ApplicationProtocol.HTTPS,
            certificates: certificateArn ? [
                elbv2.ListenerCertificate.fromArn(certificateArn)
            ] : undefined,
            sslPolicy: elbv2.SslPolicy.TLS12_EXT,
            defaultAction: elbv2.ListenerAction.forward([this.targetGroup]),
        });
        // Add listener rules for different paths
        this.addListenerRules();
        // Associate WAF with ALB if provided
        if (props.webAcl) {
            new wafv2.CfnWebACLAssociation(this, 'WebACLAssociation', {
                resourceArn: this.loadBalancer.loadBalancerArn,
                webAclArn: props.webAcl.attrArn,
            });
        }
        // Create DNS record if domain is provided
        if (props.domainName) {
            this.createDnsRecord(props.domainName);
        }
        // Create CloudWatch alarms
        this.createCloudWatchAlarms(props.alertsTopic);
        // Enable access logs
        this.enableAccessLogs();
        // Add tags
        cdk.Tags.of(this.loadBalancer).add('Component', 'LoadBalancer');
        cdk.Tags.of(this.targetGroup).add('Component', 'TargetGroup');
    }
    addListenerRules() {
        // Health check rule
        this.httpsListener.addAction('HealthCheck', {
            priority: 100,
            conditions: [
                elbv2.ListenerCondition.pathPatterns(['/health', '/health/*']),
            ],
            action: elbv2.ListenerAction.forward([this.targetGroup]),
        });
        // API routes
        this.httpsListener.addAction('ApiRoutes', {
            priority: 200,
            conditions: [
                elbv2.ListenerCondition.pathPatterns(['/api/*']),
            ],
            action: elbv2.ListenerAction.forward([this.targetGroup]),
        });
        // Static assets with caching headers
        this.httpsListener.addAction('StaticAssets', {
            priority: 300,
            conditions: [
                elbv2.ListenerCondition.pathPatterns(['/static/*', '/assets/*', '*.js', '*.css', '*.png', '*.jpg', '*.svg']),
            ],
            action: elbv2.ListenerAction.forward([this.targetGroup]),
        });
        // Default rule for all other traffic
        this.httpsListener.addAction('DefaultRule', {
            priority: 1000,
            conditions: [
                elbv2.ListenerCondition.pathPatterns(['/*']),
            ],
            action: elbv2.ListenerAction.forward([this.targetGroup]),
        });
    }
    createDnsRecord(domainName) {
        // Look up hosted zone
        const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
            domainName: domainName,
        });
        // Create A record for the domain
        new route53.ARecord(this, 'AliasRecord', {
            zone: hostedZone,
            recordName: `api.${domainName}`,
            target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(this.loadBalancer)),
            ttl: cdk.Duration.minutes(5),
        });
        // Create AAAA record for IPv6
        new route53.AaaaRecord(this, 'AaaaRecord', {
            zone: hostedZone,
            recordName: `api.${domainName}`,
            target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(this.loadBalancer)),
            ttl: cdk.Duration.minutes(5),
        });
    }
    createCloudWatchAlarms(alertsTopic) {
        if (!alertsTopic)
            return;
        // Target response time alarm
        const responseTimeAlarm = new cloudwatch.Alarm(this, 'ResponseTimeAlarm', {
            metric: this.targetGroup.metricTargetResponseTime(),
            threshold: 1, // 1 second
            evaluationPeriods: 2,
            alarmDescription: 'Target response time is too high',
        });
        responseTimeAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));
        // HTTP 5xx error rate alarm
        const http5xxAlarm = new cloudwatch.Alarm(this, 'Http5xxAlarm', {
            metric: this.loadBalancer.metricHttpCodeElb(elbv2.HttpCodeElb.ELB_5XX_COUNT, { period: cdk.Duration.minutes(5) }),
            threshold: 10,
            evaluationPeriods: 2,
            alarmDescription: 'Too many 5xx errors from ALB',
        });
        http5xxAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));
        // HTTP 4xx error rate alarm
        const http4xxAlarm = new cloudwatch.Alarm(this, 'Http4xxAlarm', {
            metric: this.loadBalancer.metricHttpCodeElb(elbv2.HttpCodeElb.ELB_4XX_COUNT, { period: cdk.Duration.minutes(5) }),
            threshold: 50,
            evaluationPeriods: 2,
            alarmDescription: 'Too many 4xx errors from ALB',
        });
        http4xxAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));
        // Unhealthy host count alarm
        const unhealthyHostsAlarm = new cloudwatch.Alarm(this, 'UnhealthyHostsAlarm', {
            metric: this.targetGroup.metricUnhealthyHostCount(),
            threshold: 1,
            evaluationPeriods: 2,
            alarmDescription: 'Unhealthy hosts detected',
        });
        unhealthyHostsAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));
        // Request count alarm (for DDoS detection)
        const requestCountAlarm = new cloudwatch.Alarm(this, 'RequestCountAlarm', {
            metric: this.loadBalancer.metricRequestCount({
                period: cdk.Duration.minutes(1),
            }),
            threshold: 10000, // 10k requests per minute
            evaluationPeriods: 2,
            alarmDescription: 'Unusually high request count detected',
        });
        requestCountAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));
        // Active connection count alarm
        const activeConnectionsAlarm = new cloudwatch.Alarm(this, 'ActiveConnectionsAlarm', {
            metric: this.loadBalancer.metricActiveConnectionCount(),
            threshold: 1000,
            evaluationPeriods: 2,
            alarmDescription: 'Too many active connections',
        });
        activeConnectionsAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));
        // New connection count alarm
        const newConnectionsAlarm = new cloudwatch.Alarm(this, 'NewConnectionsAlarm', {
            metric: this.loadBalancer.metricNewConnectionCount({
                period: cdk.Duration.minutes(1),
            }),
            threshold: 5000, // 5k new connections per minute
            evaluationPeriods: 2,
            alarmDescription: 'Too many new connections',
        });
        newConnectionsAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));
    }
    enableAccessLogs() {
        // Enable access logs to S3
        const accessLogsBucket = new cdk.aws_s3.Bucket(this, 'AccessLogsBucket', {
            bucketName: `recruitment-alb-logs-${this.node.tryGetContext('environment')}-${cdk.Aws.ACCOUNT_ID}`,
            versioned: false,
            publicReadAccess: false,
            blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
            encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
            lifecycleRules: [
                {
                    id: 'DeleteOldLogs',
                    enabled: true,
                    expiration: cdk.Duration.days(30),
                },
            ],
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Grant ALB service permission to write to S3
        accessLogsBucket.addToResourcePolicy(new cdk.aws_iam.PolicyStatement({
            effect: cdk.aws_iam.Effect.ALLOW,
            principals: [
                new cdk.aws_iam.ServicePrincipal('elasticloadbalancing.amazonaws.com'),
            ],
            actions: ['s3:PutObject'],
            resources: [accessLogsBucket.arnForObjects('*')],
        }));
        // Enable access logs
        this.loadBalancer.logAccessLogs(accessLogsBucket, 'alb-access-logs');
    }
    /**
     * Add custom listener rule
     */
    addListenerRule(id, priority, conditions, action) {
        this.httpsListener.addAction(id, {
            priority,
            conditions,
            action,
        });
    }
    /**
     * Get the load balancer DNS name
     */
    getDnsName() {
        return this.loadBalancer.loadBalancerDnsName;
    }
    /**
     * Get the load balancer ARN
     */
    getArn() {
        return this.loadBalancer.loadBalancerArn;
    }
}
exports.LoadBalancerConstruct = LoadBalancerConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9hZEJhbGFuY2VyQ29uc3RydWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiTG9hZEJhbGFuY2VyQ29uc3RydWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx5REFBMkM7QUFDM0MsOEVBQWdFO0FBQ2hFLHdFQUEwRDtBQUMxRCxpRUFBbUQ7QUFDbkQseUVBQTJEO0FBRTNELHVFQUF5RDtBQUN6RCw2REFBK0M7QUFDL0MsMkNBQXVDO0FBWXZDLE1BQWEscUJBQXNCLFNBQVEsc0JBQVM7SUFPbEQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFpQztRQUN6RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLG1DQUFtQztRQUNuQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksS0FBSyxDQUFDLHVCQUF1QixDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDMUUsZ0JBQWdCLEVBQUUsbUJBQW1CLEtBQUssQ0FBQyxXQUFXLEVBQUU7WUFDeEQsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHO1lBQ2QsY0FBYyxFQUFFLElBQUk7WUFDcEIsVUFBVSxFQUFFO2dCQUNWLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLE1BQU07YUFDbEM7WUFDRCxhQUFhLEVBQUUsS0FBSyxDQUFDLGFBQWE7WUFDbEMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLFdBQVcsS0FBSyxNQUFNO1lBQ2hELFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDckMsWUFBWSxFQUFFLElBQUk7WUFDbEIsYUFBYSxFQUFFLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSTtTQUN4QyxDQUFDLENBQUM7UUFFSCwrQ0FBK0M7UUFDL0MsSUFBSSxLQUFLLENBQUMsVUFBVSxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMs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QUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztpQkFDbEM7YUFDRjtZQUNELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87U0FDekMsQ0FBQyxDQUFDO1FBRUgsOENBQThDO1FBQzlDLGdCQUFnQixDQUFDLG1CQUFtQixDQUNsQyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUFDO1lBQzlCLE1BQU0sRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ2hDLFVBQVUsRUFBRTtnQkFDVixJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsb0NBQW9DLENBQUM7YUFDdkU7WUFDRCxPQUFPLEVBQUUsQ0FBQyxjQUFjLENBQUM7WUFDekIsU0FBUyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ2pELENBQUMsQ0FDSCxDQUFDO1FBRUYscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLGdCQUFnQixFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDdkUsQ0FBQztJQUVEOztPQUVHO0lBQ0ksZUFBZSxDQUNwQixFQUFVLEVBQ1YsUUFBZ0IsRUFDaEIsVUFBcUMsRUFDckMsTUFBNEI7UUFFNUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFO1lBQy9CLFFBQVE7WUFDUixVQUFVO1lBQ1YsTUFBTTtTQUNQLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRDs7T0FFRztJQUNJLFVBQVU7UUFDZixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUM7SUFDL0MsQ0FBQztJQUVEOztPQUVHO0lBQ0ksTUFBTTtRQUNYLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUM7SUFDM0MsQ0FBQztDQUNGO0FBL1RELHNEQStUQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcclxuaW1wb3J0ICogYXMgZWxidjIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVsYXN0aWNsb2FkYmFsYW5jaW5ndjInO1xyXG5pbXBvcnQgKiBhcyBhY20gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNlcnRpZmljYXRlbWFuYWdlcic7XHJcbmltcG9ydCAqIGFzIHJvdXRlNTMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMnO1xyXG5pbXBvcnQgKiBhcyB0YXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzLXRhcmdldHMnO1xyXG5pbXBvcnQgKiBhcyBzbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucyc7XHJcbmltcG9ydCAqIGFzIGNsb3Vkd2F0Y2ggZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3Vkd2F0Y2gnO1xyXG5pbXBvcnQgKiBhcyB3YWZ2MiBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtd2FmdjInO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTG9hZEJhbGFuY2VyQ29uc3RydWN0UHJvcHMge1xyXG4gIHZwYzogZWMyLlZwYztcclxuICBzZWN1cml0eUdyb3VwOiBlYzIuU2VjdXJpdHlHcm91cDtcclxuICBlbnZpcm9ubWVudDogc3RyaW5nO1xyXG4gIGRvbWFpbk5hbWU/OiBzdHJpbmc7XHJcbiAgY2VydGlmaWNhdGVBcm4/OiBzdHJpbmc7XHJcbiAgYWxlcnRzVG9waWM/OiBzbnMuVG9waWM7XHJcbiAgd2ViQWNsPzogd2FmdjIuQ2ZuV2ViQUNMO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTG9hZEJhbGFuY2VyQ29uc3RydWN0IGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgbG9hZEJhbGFuY2VyOiBlbGJ2Mi5BcHBsaWNhdGlvbkxvYWRCYWxhbmNlcjtcclxuICBwdWJsaWMgcmVhZG9ubHkgdGFyZ2V0R3JvdXA6IGVsYnYyLkFwcGxpY2F0aW9uVGFyZ2V0R3JvdXA7XHJcbiAgcHVibGljIHJlYWRvbmx5IGh0dHBzTGlzdGVuZXI6IGVsYnYyLkFwcGxpY2F0aW9uTGlzdGVuZXI7XHJcbiAgcHVibGljIHJlYWRvbmx5IGh0dHBMaXN0ZW5lcjogZWxidjIuQXBwbGljYXRpb25MaXN0ZW5lcjtcclxuICBwdWJsaWMgcmVhZG9ubHkgY2VydGlmaWNhdGU/OiBhY20uQ2VydGlmaWNhdGU7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBMb2FkQmFsYW5jZXJDb25zdHJ1Y3RQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgQXBwbGljYXRpb24gTG9hZCBCYWxhbmNlclxyXG4gICAgdGhpcy5sb2FkQmFsYW5jZXIgPSBuZXcgZWxidjIuQXBwbGljYXRpb25Mb2FkQmFsYW5jZXIodGhpcywgJ0xvYWRCYWxhbmNlcicsIHtcclxuICAgICAgbG9hZEJhbGFuY2VyTmFtZTogYHJlY3J1aXRtZW50LWFsYi0ke3Byb3BzLmVudmlyb25tZW50fWAsXHJcbiAgICAgIHZwYzogcHJvcHMudnBjLFxyXG4gICAgICBpbnRlcm5ldEZhY2luZzogdHJ1ZSxcclxuICAgICAgdnBjU3VibmV0czoge1xyXG4gICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBVQkxJQyxcclxuICAgICAgfSxcclxuICAgICAgc2VjdXJpdHlHcm91cDogcHJvcHMuc2VjdXJpdHlHcm91cCxcclxuICAgICAgZGVsZXRpb25Qcm90ZWN0aW9uOiBwcm9wcy5lbnZpcm9ubWVudCA9PT0gJ3Byb2QnLFxyXG4gICAgICBpZGxlVGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLFxyXG4gICAgICBodHRwMkVuYWJsZWQ6IHRydWUsXHJcbiAgICAgIGlwQWRkcmVzc1R5cGU6IGVsYnYyLklwQWRkcmVzc1R5cGUuSVBWNCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBTU0wgY2VydGlmaWNhdGUgaWYgZG9tYWluIGlzIHByb3ZpZGVkXHJcbiAgICBpZiAocHJvcHMuZG9tYWluTmFtZSAmJiAhcHJvcHMuY2VydGlmaWNhdGVBcm4pIHtcclxuICAgICAgdGhpcy5jZXJ0aWZpY2F0ZSA9IG5ldyBhY20uQ2VydGlmaWNhdGUodGhpcywgJ0NlcnRpZmljYXRlJywge1xyXG4gICAgICAgIGRvbWFpbk5hbWU6IHByb3BzLmRvbWFpbk5hbWUsXHJcbiAgICAgICAgc3ViamVjdEFsdGVybmF0aXZlTmFtZXM6IFtgKi4ke3Byb3BzLmRvbWFpbk5hbWV9YF0sXHJcbiAgICAgICAgdmFsaWRhdGlvbjogYWNtLkNlcnRpZmljYXRlVmFsaWRhdGlvbi5mcm9tRG5zKCksXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSB0YXJnZXQgZ3JvdXBcclxuICAgIHRoaXMudGFyZ2V0R3JvdXAgPSBuZXcgZWxidjIuQXBwbGljYXRpb25UYXJnZXRHcm91cCh0aGlzLCAnVGFyZ2V0R3JvdXAnLCB7XHJcbiAgICAgIHRhcmdldEdyb3VwTmFtZTogYHJlY3J1aXRtZW50LXRnLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcclxuICAgICAgcG9ydDogMzAwMCxcclxuICAgICAgcHJvdG9jb2w6IGVsYnYyLkFwcGxpY2F0aW9uUHJvdG9jb2wuSFRUUCxcclxuICAgICAgdnBjOiBwcm9wcy52cGMsXHJcbiAgICAgIHRhcmdldFR5cGU6IGVsYnYyLlRhcmdldFR5cGUuSVAsXHJcbiAgICAgIGhlYWx0aENoZWNrOiB7XHJcbiAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICBwcm90b2NvbDogZWxidjIuUHJvdG9jb2wuSFRUUCxcclxuICAgICAgICBwb3J0OiAnMzAwMCcsXHJcbiAgICAgICAgcGF0aDogJy9oZWFsdGgnLFxyXG4gICAgICAgIGludGVydmFsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNSksXHJcbiAgICAgICAgaGVhbHRoeVRocmVzaG9sZENvdW50OiAyLFxyXG4gICAgICAgIHVuaGVhbHRoeVRocmVzaG9sZENvdW50OiAzLFxyXG4gICAgICAgIGhlYWx0aHlIdHRwQ29kZXM6ICcyMDAnLFxyXG4gICAgICB9LFxyXG4gICAgICBkZXJlZ2lzdHJhdGlvbkRlbGF5OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHN0aWNraW5lc3NDb29raWVEdXJhdGlvbjogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxyXG4gICAgICB0YXJnZXRHcm91cEF0dHJpYnV0ZXM6IHtcclxuICAgICAgICAnZGVyZWdpc3RyYXRpb25fZGVsYXkudGltZW91dF9zZWNvbmRzJzogJzMwJyxcclxuICAgICAgICAnc3RpY2tpbmVzcy5lbmFibGVkJzogJ3RydWUnLFxyXG4gICAgICAgICdzdGlja2luZXNzLnR5cGUnOiAnbGJfY29va2llJyxcclxuICAgICAgICAnc3RpY2tpbmVzcy5sYl9jb29raWUuZHVyYXRpb25fc2Vjb25kcyc6ICczNjAwJyxcclxuICAgICAgICAnbG9hZF9iYWxhbmNpbmcuYWxnb3JpdGhtLnR5cGUnOiAncm91bmRfcm9iaW4nLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIEhUVFAgbGlzdGVuZXIgKHJlZGlyZWN0IHRvIEhUVFBTKVxyXG4gICAgdGhpcy5odHRwTGlzdGVuZXIgPSB0aGlzLmxvYWRCYWxhbmNlci5hZGRMaXN0ZW5lcignSHR0cExpc3RlbmVyJywge1xyXG4gICAgICBwb3J0OiA4MCxcclxuICAgICAgcHJvdG9jb2w6IGVsYnYyLkFwcGxpY2F0aW9uUHJvdG9jb2wuSFRUUCxcclxuICAgICAgZGVmYXVsdEFjdGlvbjogZWxidjIuTGlzdGVuZXJBY3Rpb24ucmVkaXJlY3Qoe1xyXG4gICAgICAgIHByb3RvY29sOiAnSFRUUFMnLFxyXG4gICAgICAgIHBvcnQ6ICc0NDMnLFxyXG4gICAgICAgIHBlcm1hbmVudDogdHJ1ZSxcclxuICAgICAgfSksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgSFRUUFMgbGlzdGVuZXJcclxuICAgIGNvbnN0IGNlcnRpZmljYXRlQXJuID0gcHJvcHMuY2VydGlmaWNhdGVBcm4gfHwgdGhpcy5jZXJ0aWZpY2F0ZT8uY2VydGlmaWNhdGVBcm47XHJcbiAgICBcclxuICAgIHRoaXMuaHR0cHNMaXN0ZW5lciA9IHRoaXMubG9hZEJhbGFuY2VyLmFkZExpc3RlbmVyKCdIdHRwc0xpc3RlbmVyJywge1xyXG4gICAgICBwb3J0OiA0NDMsXHJcbiAgICAgIHByb3RvY29sOiBlbGJ2Mi5BcHBsaWNhdGlvblByb3RvY29sLkhUVFBTLFxyXG4gICAgICBjZXJ0aWZpY2F0ZXM6IGNlcnRpZmljYXRlQXJuID8gW1xyXG4gICAgICAgIGVsYnYyLkxpc3RlbmVyQ2VydGlmaWNhdGUuZnJvbUFybihjZXJ0aWZpY2F0ZUFybilcclxuICAgICAgXSA6IHVuZGVmaW5lZCxcclxuICAgICAgc3NsUG9saWN5OiBlbGJ2Mi5Tc2xQb2xpY3kuVExTMTJfRVhULFxyXG4gICAgICBkZWZhdWx0QWN0aW9uOiBlbGJ2Mi5MaXN0ZW5lckFjdGlvbi5mb3J3YXJkKFt0aGlzLnRhcmdldEdyb3VwXSksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgbGlzdGVuZXIgcnVsZXMgZm9yIGRpZmZlcmVudCBwYXRoc1xyXG4gICAgdGhpcy5hZGRMaXN0ZW5lclJ1bGVzKCk7XHJcblxyXG4gICAgLy8gQXNzb2NpYXRlIFdBRiB3aXRoIEFMQiBpZiBwcm92aWRlZFxyXG4gICAgaWYgKHByb3BzLndlYkFjbCkge1xyXG4gICAgICBuZXcgd2FmdjIuQ2ZuV2ViQUNMQXNzb2NpYXRpb24odGhpcywgJ1dlYkFDTEFzc29jaWF0aW9uJywge1xyXG4gICAgICAgIHJlc291cmNlQXJuOiB0aGlzLmxvYWRCYWxhbmNlci5sb2FkQmFsYW5jZXJBcm4sXHJcbiAgICAgICAgd2ViQWNsQXJuOiBwcm9wcy53ZWJBY2wuYXR0ckFybixcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ3JlYXRlIEROUyByZWNvcmQgaWYgZG9tYWluIGlzIHByb3ZpZGVkXHJcbiAgICBpZiAocHJvcHMuZG9tYWluTmFtZSkge1xyXG4gICAgICB0aGlzLmNyZWF0ZURuc1JlY29yZChwcm9wcy5kb21haW5OYW1lKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDcmVhdGUgQ2xvdWRXYXRjaCBhbGFybXNcclxuICAgIHRoaXMuY3JlYXRlQ2xvdWRXYXRjaEFsYXJtcyhwcm9wcy5hbGVydHNUb3BpYyk7XHJcblxyXG4gICAgLy8gRW5hYmxlIGFjY2VzcyBsb2dzXHJcbiAgICB0aGlzLmVuYWJsZUFjY2Vzc0xvZ3MoKTtcclxuXHJcbiAgICAvLyBBZGQgdGFnc1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy5sb2FkQmFsYW5jZXIpLmFkZCgnQ29tcG9uZW50JywgJ0xvYWRCYWxhbmNlcicpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcy50YXJnZXRHcm91cCkuYWRkKCdDb21wb25lbnQnLCAnVGFyZ2V0R3JvdXAnKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYWRkTGlzdGVuZXJSdWxlcygpOiB2b2lkIHtcclxuICAgIC8vIEhlYWx0aCBjaGVjayBydWxlXHJcbiAgICB0aGlzLmh0dHBzTGlzdGVuZXIuYWRkQWN0aW9uKCdIZWFsdGhDaGVjaycsIHtcclxuICAgICAgcHJpb3JpdHk6IDEwMCxcclxuICAgICAgY29uZGl0aW9uczogW1xyXG4gICAgICAgIGVsYnYyLkxpc3RlbmVyQ29uZGl0aW9uLnBhdGhQYXR0ZXJucyhbJy9oZWFsdGgnLCAnL2hlYWx0aC8qJ10pLFxyXG4gICAgICBdLFxyXG4gICAgICBhY3Rpb246IGVsYnYyLkxpc3RlbmVyQWN0aW9uLmZvcndhcmQoW3RoaXMudGFyZ2V0R3JvdXBdKSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFQSSByb3V0ZXNcclxuICAgIHRoaXMuaHR0cHNMaXN0ZW5lci5hZGRBY3Rpb24oJ0FwaVJvdXRlcycsIHtcclxuICAgICAgcHJpb3JpdHk6IDIwMCxcclxuICAgICAgY29uZGl0aW9uczogW1xyXG4gICAgICAgIGVsYnYyLkxpc3RlbmVyQ29uZGl0aW9uLnBhdGhQYXR0ZXJucyhbJy9hcGkvKiddKSxcclxuICAgICAgXSxcclxuICAgICAgYWN0aW9uOiBlbGJ2Mi5MaXN0ZW5lckFjdGlvbi5mb3J3YXJkKFt0aGlzLnRhcmdldEdyb3VwXSksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTdGF0aWMgYXNzZXRzIHdpdGggY2FjaGluZyBoZWFkZXJzXHJcbiAgICB0aGlzLmh0dHBzTGlzdGVuZXIuYWRkQWN0aW9uKCdTdGF0aWNBc3NldHMnLCB7XHJcbiAgICAgIHByaW9yaXR5OiAzMDAsXHJcbiAgICAgIGNvbmRpdGlvbnM6IFtcclxuICAgICAgICBlbGJ2Mi5MaXN0ZW5lckNvbmRpdGlvbi5wYXRoUGF0dGVybnMoWycvc3RhdGljLyonLCAnL2Fzc2V0cy8qJywgJyouanMnLCAnKi5jc3MnLCAnKi5wbmcnLCAnKi5qcGcnLCAnKi5zdmcnXSksXHJcbiAgICAgIF0sXHJcbiAgICAgIGFjdGlvbjogZWxidjIuTGlzdGVuZXJBY3Rpb24uZm9yd2FyZChbdGhpcy50YXJnZXRHcm91cF0pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRGVmYXVsdCBydWxlIGZvciBhbGwgb3RoZXIgdHJhZmZpY1xyXG4gICAgdGhpcy5odHRwc0xpc3RlbmVyLmFkZEFjdGlvbignRGVmYXVsdFJ1bGUnLCB7XHJcbiAgICAgIHByaW9yaXR5OiAxMDAwLFxyXG4gICAgICBjb25kaXRpb25zOiBbXHJcbiAgICAgICAgZWxidjIuTGlzdGVuZXJDb25kaXRpb24ucGF0aFBhdHRlcm5zKFsnLyonXSksXHJcbiAgICAgIF0sXHJcbiAgICAgIGFjdGlvbjogZWxidjIuTGlzdGVuZXJBY3Rpb24uZm9yd2FyZChbdGhpcy50YXJnZXRHcm91cF0pLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNyZWF0ZURuc1JlY29yZChkb21haW5OYW1lOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIC8vIExvb2sgdXAgaG9zdGVkIHpvbmVcclxuICAgIGNvbnN0IGhvc3RlZFpvbmUgPSByb3V0ZTUzLkhvc3RlZFpvbmUuZnJvbUxvb2t1cCh0aGlzLCAnSG9zdGVkWm9uZScsIHtcclxuICAgICAgZG9tYWluTmFtZTogZG9tYWluTmFtZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBBIHJlY29yZCBmb3IgdGhlIGRvbWFpblxyXG4gICAgbmV3IHJvdXRlNTMuQVJlY29yZCh0aGlzLCAnQWxpYXNSZWNvcmQnLCB7XHJcbiAgICAgIHpvbmU6IGhvc3RlZFpvbmUsXHJcbiAgICAgIHJlY29yZE5hbWU6IGBhcGkuJHtkb21haW5OYW1lfWAsXHJcbiAgICAgIHRhcmdldDogcm91dGU1My5SZWNvcmRUYXJnZXQuZnJvbUFsaWFzKFxyXG4gICAgICAgIG5ldyB0YXJnZXRzLkxvYWRCYWxhbmNlclRhcmdldCh0aGlzLmxvYWRCYWxhbmNlcilcclxuICAgICAgKSxcclxuICAgICAgdHRsOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBBQUFBIHJlY29yZCBmb3IgSVB2NlxyXG4gICAgbmV3IHJvdXRlNTMuQWFhYVJlY29yZCh0aGlzLCAnQWFhYVJlY29yZCcsIHtcclxuICAgICAgem9uZTogaG9zdGVkWm9uZSxcclxuICAgICAgcmVjb3JkTmFtZTogYGFwaS4ke2RvbWFpbk5hbWV9YCxcclxuICAgICAgdGFyZ2V0OiByb3V0ZTUzLlJlY29yZFRhcmdldC5mcm9tQWxpYXMoXHJcbiAgICAgICAgbmV3IHRhcmdldHMuTG9hZEJhbGFuY2VyVGFyZ2V0KHRoaXMubG9hZEJhbGFuY2VyKVxyXG4gICAgICApLFxyXG4gICAgICB0dGw6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNyZWF0ZUNsb3VkV2F0Y2hBbGFybXMoYWxlcnRzVG9waWM/OiBzbnMuVG9waWMpOiB2b2lkIHtcclxuICAgIGlmICghYWxlcnRzVG9waWMpIHJldHVybjtcclxuXHJcbiAgICAvLyBUYXJnZXQgcmVzcG9uc2UgdGltZSBhbGFybVxyXG4gICAgY29uc3QgcmVzcG9uc2VUaW1lQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnUmVzcG9uc2VUaW1lQWxhcm0nLCB7XHJcbiAgICAgIG1ldHJpYzogdGhpcy50YXJnZXRHcm91cC5tZXRyaWNUYXJnZXRSZXNwb25zZVRpbWUoKSxcclxuICAgICAgdGhyZXNob2xkOiAxLCAvLyAxIHNlY29uZFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ1RhcmdldCByZXNwb25zZSB0aW1lIGlzIHRvbyBoaWdoJyxcclxuICAgIH0pO1xyXG4gICAgcmVzcG9uc2VUaW1lQWxhcm0uYWRkQWxhcm1BY3Rpb24obmV3IGNsb3Vkd2F0Y2guU25zQWN0aW9uKGFsZXJ0c1RvcGljKSk7XHJcblxyXG4gICAgLy8gSFRUUCA1eHggZXJyb3IgcmF0ZSBhbGFybVxyXG4gICAgY29uc3QgaHR0cDV4eEFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0h0dHA1eHhBbGFybScsIHtcclxuICAgICAgbWV0cmljOiB0aGlzLmxvYWRCYWxhbmNlci5tZXRyaWNIdHRwQ29kZUVsYihcclxuICAgICAgICBlbGJ2Mi5IdHRwQ29kZUVsYi5FTEJfNVhYX0NPVU5ULFxyXG4gICAgICAgIHsgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSB9XHJcbiAgICAgICksXHJcbiAgICAgIHRocmVzaG9sZDogMTAsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnVG9vIG1hbnkgNXh4IGVycm9ycyBmcm9tIEFMQicsXHJcbiAgICB9KTtcclxuICAgIGh0dHA1eHhBbGFybS5hZGRBbGFybUFjdGlvbihuZXcgY2xvdWR3YXRjaC5TbnNBY3Rpb24oYWxlcnRzVG9waWMpKTtcclxuXHJcbiAgICAvLyBIVFRQIDR4eCBlcnJvciByYXRlIGFsYXJtXHJcbiAgICBjb25zdCBodHRwNHh4QWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnSHR0cDR4eEFsYXJtJywge1xyXG4gICAgICBtZXRyaWM6IHRoaXMubG9hZEJhbGFuY2VyLm1ldHJpY0h0dHBDb2RlRWxiKFxyXG4gICAgICAgIGVsYnYyLkh0dHBDb2RlRWxiLkVMQl80WFhfQ09VTlQsXHJcbiAgICAgICAgeyBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpIH1cclxuICAgICAgKSxcclxuICAgICAgdGhyZXNob2xkOiA1MCxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdUb28gbWFueSA0eHggZXJyb3JzIGZyb20gQUxCJyxcclxuICAgIH0pO1xyXG4gICAgaHR0cDR4eEFsYXJtLmFkZEFsYXJtQWN0aW9uKG5ldyBjbG91ZHdhdGNoLlNuc0FjdGlvbihhbGVydHNUb3BpYykpO1xyXG5cclxuICAgIC8vIFVuaGVhbHRoeSBob3N0IGNvdW50IGFsYXJtXHJcbiAgICBjb25zdCB1bmhlYWx0aHlIb3N0c0FsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ1VuaGVhbHRoeUhvc3RzQWxhcm0nLCB7XHJcbiAgICAgIG1ldHJpYzogdGhpcy50YXJnZXRHcm91cC5tZXRyaWNVbmhlYWx0aHlIb3N0Q291bnQoKSxcclxuICAgICAgdGhyZXNob2xkOiAxLFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ1VuaGVhbHRoeSBob3N0cyBkZXRlY3RlZCcsXHJcbiAgICB9KTtcclxuICAgIHVuaGVhbHRoeUhvc3RzQWxhcm0uYWRkQWxhcm1BY3Rpb24obmV3IGNsb3Vkd2F0Y2guU25zQWN0aW9uKGFsZXJ0c1RvcGljKSk7XHJcblxyXG4gICAgLy8gUmVxdWVzdCBjb3VudCBhbGFybSAoZm9yIEREb1MgZGV0ZWN0aW9uKVxyXG4gICAgY29uc3QgcmVxdWVzdENvdW50QWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnUmVxdWVzdENvdW50QWxhcm0nLCB7XHJcbiAgICAgIG1ldHJpYzogdGhpcy5sb2FkQmFsYW5jZXIubWV0cmljUmVxdWVzdENvdW50KHtcclxuICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDEpLFxyXG4gICAgICB9KSxcclxuICAgICAgdGhyZXNob2xkOiAxMDAwMCwgLy8gMTBrIHJlcXVlc3RzIHBlciBtaW51dGVcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdVbnVzdWFsbHkgaGlnaCByZXF1ZXN0IGNvdW50IGRldGVjdGVkJyxcclxuICAgIH0pO1xyXG4gICAgcmVxdWVzdENvdW50QWxhcm0uYWRkQWxhcm1BY3Rpb24obmV3IGNsb3Vkd2F0Y2guU25zQWN0aW9uKGFsZXJ0c1RvcGljKSk7XHJcblxyXG4gICAgLy8gQWN0aXZlIGNvbm5lY3Rpb24gY291bnQgYWxhcm1cclxuICAgIGNvbnN0IGFjdGl2ZUNvbm5lY3Rpb25zQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnQWN0aXZlQ29ubmVjdGlvbnNBbGFybScsIHtcclxuICAgICAgbWV0cmljOiB0aGlzLmxvYWRCYWxhbmNlci5tZXRyaWNBY3RpdmVDb25uZWN0aW9uQ291bnQoKSxcclxuICAgICAgdGhyZXNob2xkOiAxMDAwLFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ1RvbyBtYW55IGFjdGl2ZSBjb25uZWN0aW9ucycsXHJcbiAgICB9KTtcclxuICAgIGFjdGl2ZUNvbm5lY3Rpb25zQWxhcm0uYWRkQWxhcm1BY3Rpb24obmV3IGNsb3Vkd2F0Y2guU25zQWN0aW9uKGFsZXJ0c1RvcGljKSk7XHJcblxyXG4gICAgLy8gTmV3IGNvbm5lY3Rpb24gY291bnQgYWxhcm1cclxuICAgIGNvbnN0IG5ld0Nvbm5lY3Rpb25zQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnTmV3Q29ubmVjdGlvbnNBbGFybScsIHtcclxuICAgICAgbWV0cmljOiB0aGlzLmxvYWRCYWxhbmNlci5tZXRyaWNOZXdDb25uZWN0aW9uQ291bnQoe1xyXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMSksXHJcbiAgICAgIH0pLFxyXG4gICAgICB0aHJlc2hvbGQ6IDUwMDAsIC8vIDVrIG5ldyBjb25uZWN0aW9ucyBwZXIgbWludXRlXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnVG9vIG1hbnkgbmV3IGNvbm5lY3Rpb25zJyxcclxuICAgIH0pO1xyXG4gICAgbmV3Q29ubmVjdGlvbnNBbGFybS5hZGRBbGFybUFjdGlvbihuZXcgY2xvdWR3YXRjaC5TbnNBY3Rpb24oYWxlcnRzVG9waWMpKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZW5hYmxlQWNjZXNzTG9ncygpOiB2b2lkIHtcclxuICAgIC8vIEVuYWJsZSBhY2Nlc3MgbG9ncyB0byBTM1xyXG4gICAgY29uc3QgYWNjZXNzTG9nc0J1Y2tldCA9IG5ldyBjZGsuYXdzX3MzLkJ1Y2tldCh0aGlzLCAnQWNjZXNzTG9nc0J1Y2tldCcsIHtcclxuICAgICAgYnVja2V0TmFtZTogYHJlY3J1aXRtZW50LWFsYi1sb2dzLSR7dGhpcy5ub2RlLnRyeUdldENvbnRleHQoJ2Vudmlyb25tZW50Jyl9LSR7Y2RrLkF3cy5BQ0NPVU5UX0lEfWAsXHJcbiAgICAgIHZlcnNpb25lZDogZmFsc2UsXHJcbiAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IGZhbHNlLFxyXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogY2RrLmF3c19zMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICAgIGVuY3J5cHRpb246IGNkay5hd3NfczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxyXG4gICAgICBsaWZlY3ljbGVSdWxlczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiAnRGVsZXRlT2xkTG9ncycsXHJcbiAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgZXhwaXJhdGlvbjogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBBTEIgc2VydmljZSBwZXJtaXNzaW9uIHRvIHdyaXRlIHRvIFMzXHJcbiAgICBhY2Nlc3NMb2dzQnVja2V0LmFkZFRvUmVzb3VyY2VQb2xpY3koXHJcbiAgICAgIG5ldyBjZGsuYXdzX2lhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgIGVmZmVjdDogY2RrLmF3c19pYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgIHByaW5jaXBhbHM6IFtcclxuICAgICAgICAgIG5ldyBjZGsuYXdzX2lhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlbGFzdGljbG9hZGJhbGFuY2luZy5hbWF6b25hd3MuY29tJyksXHJcbiAgICAgICAgXSxcclxuICAgICAgICBhY3Rpb25zOiBbJ3MzOlB1dE9iamVjdCddLFxyXG4gICAgICAgIHJlc291cmNlczogW2FjY2Vzc0xvZ3NCdWNrZXQuYXJuRm9yT2JqZWN0cygnKicpXSxcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgLy8gRW5hYmxlIGFjY2VzcyBsb2dzXHJcbiAgICB0aGlzLmxvYWRCYWxhbmNlci5sb2dBY2Nlc3NMb2dzKGFjY2Vzc0xvZ3NCdWNrZXQsICdhbGItYWNjZXNzLWxvZ3MnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEFkZCBjdXN0b20gbGlzdGVuZXIgcnVsZVxyXG4gICAqL1xyXG4gIHB1YmxpYyBhZGRMaXN0ZW5lclJ1bGUoXHJcbiAgICBpZDogc3RyaW5nLFxyXG4gICAgcHJpb3JpdHk6IG51bWJlcixcclxuICAgIGNvbmRpdGlvbnM6IGVsYnYyLkxpc3RlbmVyQ29uZGl0aW9uW10sXHJcbiAgICBhY3Rpb246IGVsYnYyLkxpc3RlbmVyQWN0aW9uXHJcbiAgKTogdm9pZCB7XHJcbiAgICB0aGlzLmh0dHBzTGlzdGVuZXIuYWRkQWN0aW9uKGlkLCB7XHJcbiAgICAgIHByaW9yaXR5LFxyXG4gICAgICBjb25kaXRpb25zLFxyXG4gICAgICBhY3Rpb24sXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCB0aGUgbG9hZCBiYWxhbmNlciBETlMgbmFtZVxyXG4gICAqL1xyXG4gIHB1YmxpYyBnZXREbnNOYW1lKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdGhpcy5sb2FkQmFsYW5jZXIubG9hZEJhbGFuY2VyRG5zTmFtZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCB0aGUgbG9hZCBiYWxhbmNlciBBUk5cclxuICAgKi9cclxuICBwdWJsaWMgZ2V0QXJuKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdGhpcy5sb2FkQmFsYW5jZXIubG9hZEJhbGFuY2VyQXJuO1xyXG4gIH1cclxufSJdfQ==