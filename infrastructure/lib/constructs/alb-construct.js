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
exports.AlbConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const elbv2 = __importStar(require("aws-cdk-lib/aws-elasticloadbalancingv2"));
const certificatemanager = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
const route53 = __importStar(require("aws-cdk-lib/aws-route53"));
const route53targets = __importStar(require("aws-cdk-lib/aws-route53-targets"));
const constructs_1 = require("constructs");
class AlbConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { vpc, securityGroup, ecsService, ecsContainer, ecsConfig, environment, domainName, certificateArn } = props;
        // Create Application Load Balancer
        this.loadBalancer = this.createLoadBalancer(vpc, securityGroup, environment);
        this.dnsName = this.loadBalancer.loadBalancerDnsName;
        // Create target group
        this.targetGroup = this.createTargetGroup(vpc, ecsConfig, environment);
        // Create listener
        this.listener = this.createListener(certificateArn, environment);
        // Attach ECS service to target group
        this.attachEcsService(ecsService, ecsContainer);
        // Create CloudWatch alarms
        this.createCloudWatchAlarms(environment);
        // Set up custom domain if provided
        if (domainName) {
            this.setupCustomDomain(domainName, environment);
        }
        // Create outputs
        this.createOutputs();
    }
    createLoadBalancer(vpc, securityGroup, environment) {
        const alb = new elbv2.ApplicationLoadBalancer(this, 'ApplicationLoadBalancer', {
            loadBalancerName: `recruitment-alb-${environment}`,
            vpc,
            internetFacing: true,
            securityGroup,
            // Use public subnets for internet-facing load balancer
            vpcSubnets: {
                subnetType: ec2.SubnetType.PUBLIC,
            },
            // Enable deletion protection for production
            deletionProtection: environment === 'prod',
            // Enable access logs for monitoring
            ...(environment !== 'dev' && {
                accessLogs: {
                    bucket: new cdk.aws_s3.Bucket(this, 'AlbAccessLogsBucket', {
                        bucketName: `recruitment-alb-logs-${environment}-${cdk.Stack.of(this).account}`,
                        removalPolicy: cdk.RemovalPolicy.DESTROY,
                        autoDeleteObjects: true,
                    }),
                    prefix: 'alb-access-logs',
                },
            }),
            // HTTP/2 support
            http2Enabled: true,
            // Idle timeout
            idleTimeout: cdk.Duration.seconds(60),
        });
        // Add tags
        cdk.Tags.of(alb).add('Name', `recruitment-alb-${environment}`);
        cdk.Tags.of(alb).add('Environment', environment);
        cdk.Tags.of(alb).add('Project', 'RecruitmentWebsite');
        return alb;
    }
    createTargetGroup(vpc, ecsConfig, environment) {
        return new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
            targetGroupName: `recruitment-tg-${environment}`,
            vpc,
            port: 3000,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targetType: elbv2.TargetType.IP,
            // Health check configuration
            healthCheck: {
                enabled: true,
                path: ecsConfig.healthCheck.path,
                protocol: elbv2.Protocol.HTTP,
                port: '3000',
                healthyHttpCodes: ecsConfig.healthCheck.healthyHttpCodes,
                interval: cdk.Duration.seconds(ecsConfig.healthCheck.interval),
                timeout: cdk.Duration.seconds(ecsConfig.healthCheck.timeout),
                healthyThresholdCount: 2,
                unhealthyThresholdCount: ecsConfig.healthCheck.retries,
            },
            // Deregistration delay
            deregistrationDelay: cdk.Duration.seconds(30),
            // Slow start
            slowStart: cdk.Duration.seconds(0),
            // Stickiness (disabled for stateless applications)
            stickinessCookieDuration: cdk.Duration.seconds(0),
            // Target group attributes
            targetGroupAttributes: {
                'deregistration_delay.timeout_seconds': '30',
                'slow_start.duration_seconds': '0',
                'stickiness.enabled': 'false',
                'load_balancing.algorithm.type': 'round_robin',
            },
        });
    }
    createListener(certificateArn, environment) {
        // Create HTTPS listener if certificate is provided
        if (certificateArn) {
            const certificate = certificatemanager.Certificate.fromCertificateArn(this, 'Certificate', certificateArn);
            const httpsListener = this.loadBalancer.addListener('HttpsListener', {
                port: 443,
                protocol: elbv2.ApplicationProtocol.HTTPS,
                certificates: [certificate],
                defaultTargetGroups: [this.targetGroup],
                // SSL policy
                sslPolicy: elbv2.SslPolicy.TLS12_EXT,
            });
            // Redirect HTTP to HTTPS
            this.loadBalancer.addListener('HttpListener', {
                port: 80,
                protocol: elbv2.ApplicationProtocol.HTTP,
                defaultAction: elbv2.ListenerAction.redirect({
                    protocol: 'HTTPS',
                    port: '443',
                    permanent: true,
                }),
            });
            return httpsListener;
        }
        else {
            // Create HTTP listener for development
            return this.loadBalancer.addListener('HttpListener', {
                port: 80,
                protocol: elbv2.ApplicationProtocol.HTTP,
                defaultTargetGroups: [this.targetGroup],
            });
        }
    }
    attachEcsService(ecsService, ecsContainer) {
        // Attach ECS service to target group
        ecsService.attachToApplicationTargetGroup(this.targetGroup);
        // Alternative method using service registrations
        // ecsService.registerLoadBalancerTargets({
        //   containerName: ecsContainer.containerName,
        //   containerPort: 3000,
        //   newTargetGroupId: 'ECS',
        //   listener: elbv2.ApplicationListener.fromApplicationListenerAttributes(this, 'Listener', {
        //     listenerArn: this.listener.listenerArn,
        //     securityGroup: this.loadBalancer.connections.securityGroups[0],
        //   }),
        // });
    }
    createCloudWatchAlarms(environment) {
        // Create CloudWatch alarms for ALB monitoring
        // Response time alarm
        new cdk.aws_cloudwatch.Alarm(this, 'AlbResponseTimeAlarm', {
            metric: this.loadBalancer.metricTargetResponseTime(),
            threshold: 1, // 1 second
            evaluationPeriods: 2,
            alarmName: `recruitment-alb-response-time-${environment}`,
            alarmDescription: 'ALB response time is high',
        });
        // HTTP 5xx errors alarm
        new cdk.aws_cloudwatch.Alarm(this, 'AlbHttp5xxAlarm', {
            metric: this.loadBalancer.metricHttpCodeTarget(elbv2.HttpCodeTarget.TARGET_5XX_COUNT),
            threshold: 5,
            evaluationPeriods: 2,
            alarmName: `recruitment-alb-5xx-errors-${environment}`,
            alarmDescription: 'ALB is receiving 5xx errors',
        });
        // HTTP 4xx errors alarm
        new cdk.aws_cloudwatch.Alarm(this, 'AlbHttp4xxAlarm', {
            metric: this.loadBalancer.metricHttpCodeTarget(elbv2.HttpCodeTarget.TARGET_4XX_COUNT),
            threshold: 20,
            evaluationPeriods: 2,
            alarmName: `recruitment-alb-4xx-errors-${environment}`,
            alarmDescription: 'ALB is receiving 4xx errors',
        });
        // Request count alarm (for DDoS detection)
        new cdk.aws_cloudwatch.Alarm(this, 'AlbRequestCountAlarm', {
            metric: this.loadBalancer.metricRequestCount(),
            threshold: environment === 'dev' ? 1000 : 5000,
            evaluationPeriods: 2,
            alarmName: `recruitment-alb-request-count-${environment}`,
            alarmDescription: 'ALB request count is unusually high',
        });
        // Healthy target count alarm
        new cdk.aws_cloudwatch.Alarm(this, 'AlbHealthyTargetCountAlarm', {
            metric: this.targetGroup.metricHealthyTargetCount(),
            threshold: 1,
            comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
            evaluationPeriods: 2,
            alarmName: `recruitment-alb-healthy-targets-${environment}`,
            alarmDescription: 'ALB has no healthy targets',
        });
        // Unhealthy target count alarm
        new cdk.aws_cloudwatch.Alarm(this, 'AlbUnhealthyTargetCountAlarm', {
            metric: this.targetGroup.metricUnhealthyTargetCount(),
            threshold: 0,
            comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            evaluationPeriods: 2,
            alarmName: `recruitment-alb-unhealthy-targets-${environment}`,
            alarmDescription: 'ALB has unhealthy targets',
        });
    }
    setupCustomDomain(domainName, environment) {
        // Look up hosted zone
        const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
            domainName: domainName,
        });
        // Create subdomain for environment
        const subdomain = environment === 'prod' ? 'api' : `api-${environment}`;
        const fullDomainName = `${subdomain}.${domainName}`;
        // Create Route 53 record
        new route53.ARecord(this, 'AliasRecord', {
            zone: hostedZone,
            recordName: subdomain,
            target: route53.RecordTarget.fromAlias(new route53targets.LoadBalancerTarget(this.loadBalancer)),
            ttl: cdk.Duration.minutes(5),
        });
        // Output the custom domain
        new cdk.CfnOutput(this, 'CustomDomainName', {
            value: fullDomainName,
            description: 'Custom domain name for the API',
            exportName: `recruitment-api-domain-${environment}`,
        });
    }
    createOutputs() {
        // Output load balancer DNS name
        new cdk.CfnOutput(this, 'LoadBalancerDnsName', {
            value: this.dnsName,
            description: 'Load balancer DNS name',
            exportName: `recruitment-alb-dns-${this.node.scope}`,
        });
        // Output load balancer ARN
        new cdk.CfnOutput(this, 'LoadBalancerArn', {
            value: this.loadBalancer.loadBalancerArn,
            description: 'Load balancer ARN',
            exportName: `recruitment-alb-arn-${this.node.scope}`,
        });
        // Output target group ARN
        new cdk.CfnOutput(this, 'TargetGroupArn', {
            value: this.targetGroup.targetGroupArn,
            description: 'Target group ARN',
            exportName: `recruitment-tg-arn-${this.node.scope}`,
        });
        // Output listener ARN
        new cdk.CfnOutput(this, 'ListenerArn', {
            value: this.listener.listenerArn,
            description: 'Listener ARN',
            exportName: `recruitment-listener-arn-${this.node.scope}`,
        });
    }
    /**
     * Add additional listener rules for path-based routing
     */
    addPathRule(pathPattern, targetGroup, priority) {
        this.listener.addTargetGroups('PathRule', {
            targetGroups: [targetGroup],
            priority,
            conditions: [
                elbv2.ListenerCondition.pathPatterns([pathPattern]),
            ],
        });
    }
    /**
     * Add additional listener rules for host-based routing
     */
    addHostRule(hostHeader, targetGroup, priority) {
        this.listener.addTargetGroups('HostRule', {
            targetGroups: [targetGroup],
            priority,
            conditions: [
                elbv2.ListenerCondition.hostHeaders([hostHeader]),
            ],
        });
    }
    /**
     * Enable WAF for additional security
     */
    enableWaf(environment) {
        // This would create a WAF WebACL and associate it with the ALB
        // Implementation depends on specific WAF rules needed
    }
}
exports.AlbConstruct = AlbConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxiLWNvbnN0cnVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFsYi1jb25zdHJ1Y3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHlEQUEyQztBQUMzQyw4RUFBZ0U7QUFFaEUsdUZBQXlFO0FBQ3pFLGlFQUFtRDtBQUNuRCxnRkFBa0U7QUFDbEUsMkNBQXVDO0FBY3ZDLE1BQWEsWUFBYSxTQUFRLHNCQUFTO0lBTXpDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBd0I7UUFDaEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLEVBQ0osR0FBRyxFQUNILGFBQWEsRUFDYixVQUFVLEVBQ1YsWUFBWSxFQUNaLFNBQVMsRUFDVCxXQUFXLEVBQ1gsVUFBVSxFQUNWLGNBQWMsRUFDZixHQUFHLEtBQUssQ0FBQztRQUVWLG1DQUFtQztRQUNuQyxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQzdFLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQztRQUVyRCxzQkFBc0I7UUFDdEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUV2RSxrQkFBa0I7UUFDbEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUVqRSxxQ0FBcUM7UUFDckMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUVoRCwyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFdBQVcsQ0FB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QyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2FBQ2xEO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOztPQUVHO0lBQ0ksU0FBUyxDQUFDLFdBQW1CO1FBQ2xDLCtEQUErRDtRQUMvRCxzREFBc0Q7SUFDeEQsQ0FBQztDQUNGO0FBcldELG9DQXFXQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcclxuaW1wb3J0ICogYXMgZWxidjIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVsYXN0aWNsb2FkYmFsYW5jaW5ndjInO1xyXG5pbXBvcnQgKiBhcyBlY3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjcyc7XHJcbmltcG9ydCAqIGFzIGNlcnRpZmljYXRlbWFuYWdlciBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2VydGlmaWNhdGVtYW5hZ2VyJztcclxuaW1wb3J0ICogYXMgcm91dGU1MyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1Myc7XHJcbmltcG9ydCAqIGFzIHJvdXRlNTN0YXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzLXRhcmdldHMnO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuaW1wb3J0IHsgRWNzQ29uZmlnIH0gZnJvbSAnLi4vY29uZmlnL2Vudmlyb25tZW50LWNvbmZpZyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEFsYkNvbnN0cnVjdFByb3BzIHtcclxuICB2cGM6IGVjMi5JVnBjO1xyXG4gIHNlY3VyaXR5R3JvdXA6IGVjMi5JU2VjdXJpdHlHcm91cDtcclxuICBlY3NTZXJ2aWNlOiBlY3MuRmFyZ2F0ZVNlcnZpY2U7XHJcbiAgZWNzQ29udGFpbmVyOiBlY3MuQ29udGFpbmVyRGVmaW5pdGlvbjtcclxuICBlY3NDb25maWc6IEVjc0NvbmZpZztcclxuICBlbnZpcm9ubWVudDogc3RyaW5nO1xyXG4gIGRvbWFpbk5hbWU/OiBzdHJpbmc7XHJcbiAgY2VydGlmaWNhdGVBcm4/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBBbGJDb25zdHJ1Y3QgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHB1YmxpYyByZWFkb25seSBsb2FkQmFsYW5jZXI6IGVsYnYyLkFwcGxpY2F0aW9uTG9hZEJhbGFuY2VyO1xyXG4gIHB1YmxpYyByZWFkb25seSBsaXN0ZW5lcjogZWxidjIuQXBwbGljYXRpb25MaXN0ZW5lcjtcclxuICBwdWJsaWMgcmVhZG9ubHkgdGFyZ2V0R3JvdXA6IGVsYnYyLkFwcGxpY2F0aW9uVGFyZ2V0R3JvdXA7XHJcbiAgcHVibGljIHJlYWRvbmx5IGRuc05hbWU6IHN0cmluZztcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEFsYkNvbnN0cnVjdFByb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIGNvbnN0IHsgXHJcbiAgICAgIHZwYywgXHJcbiAgICAgIHNlY3VyaXR5R3JvdXAsIFxyXG4gICAgICBlY3NTZXJ2aWNlLCBcclxuICAgICAgZWNzQ29udGFpbmVyLCBcclxuICAgICAgZWNzQ29uZmlnLCBcclxuICAgICAgZW52aXJvbm1lbnQsXHJcbiAgICAgIGRvbWFpbk5hbWUsXHJcbiAgICAgIGNlcnRpZmljYXRlQXJuXHJcbiAgICB9ID0gcHJvcHM7XHJcblxyXG4gICAgLy8gQ3JlYXRlIEFwcGxpY2F0aW9uIExvYWQgQmFsYW5jZXJcclxuICAgIHRoaXMubG9hZEJhbGFuY2VyID0gdGhpcy5jcmVhdGVMb2FkQmFsYW5jZXIodnBjLCBzZWN1cml0eUdyb3VwLCBlbnZpcm9ubWVudCk7XHJcbiAgICB0aGlzLmRuc05hbWUgPSB0aGlzLmxvYWRCYWxhbmNlci5sb2FkQmFsYW5jZXJEbnNOYW1lO1xyXG5cclxuICAgIC8vIENyZWF0ZSB0YXJnZXQgZ3JvdXBcclxuICAgIHRoaXMudGFyZ2V0R3JvdXAgPSB0aGlzLmNyZWF0ZVRhcmdldEdyb3VwKHZwYywgZWNzQ29uZmlnLCBlbnZpcm9ubWVudCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGxpc3RlbmVyXHJcbiAgICB0aGlzLmxpc3RlbmVyID0gdGhpcy5jcmVhdGVMaXN0ZW5lcihjZXJ0aWZpY2F0ZUFybiwgZW52aXJvbm1lbnQpO1xyXG5cclxuICAgIC8vIEF0dGFjaCBFQ1Mgc2VydmljZSB0byB0YXJnZXQgZ3JvdXBcclxuICAgIHRoaXMuYXR0YWNoRWNzU2VydmljZShlY3NTZXJ2aWNlLCBlY3NDb250YWluZXIpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBDbG91ZFdhdGNoIGFsYXJtc1xyXG4gICAgdGhpcy5jcmVhdGVDbG91ZFdhdGNoQWxhcm1zKGVudmlyb25tZW50KTtcclxuXHJcbiAgICAvLyBTZXQgdXAgY3VzdG9tIGRvbWFpbiBpZiBwcm92aWRlZFxyXG4gICAgaWYgKGRvbWFpbk5hbWUpIHtcclxuICAgICAgdGhpcy5zZXR1cEN1c3RvbURvbWFpbihkb21haW5OYW1lLCBlbnZpcm9ubWVudCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ3JlYXRlIG91dHB1dHNcclxuICAgIHRoaXMuY3JlYXRlT3V0cHV0cygpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjcmVhdGVMb2FkQmFsYW5jZXIoXHJcbiAgICB2cGM6IGVjMi5JVnBjLFxyXG4gICAgc2VjdXJpdHlHcm91cDogZWMyLklTZWN1cml0eUdyb3VwLFxyXG4gICAgZW52aXJvbm1lbnQ6IHN0cmluZ1xyXG4gICk6IGVsYnYyLkFwcGxpY2F0aW9uTG9hZEJhbGFuY2VyIHtcclxuICAgIGNvbnN0IGFsYiA9IG5ldyBlbGJ2Mi5BcHBsaWNhdGlvbkxvYWRCYWxhbmNlcih0aGlzLCAnQXBwbGljYXRpb25Mb2FkQmFsYW5jZXInLCB7XHJcbiAgICAgIGxvYWRCYWxhbmNlck5hbWU6IGByZWNydWl0bWVudC1hbGItJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICB2cGMsXHJcbiAgICAgIGludGVybmV0RmFjaW5nOiB0cnVlLFxyXG4gICAgICBzZWN1cml0eUdyb3VwLFxyXG4gICAgICBcclxuICAgICAgLy8gVXNlIHB1YmxpYyBzdWJuZXRzIGZvciBpbnRlcm5ldC1mYWNpbmcgbG9hZCBiYWxhbmNlclxyXG4gICAgICB2cGNTdWJuZXRzOiB7XHJcbiAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFVCTElDLFxyXG4gICAgICB9LFxyXG4gICAgICBcclxuICAgICAgLy8gRW5hYmxlIGRlbGV0aW9uIHByb3RlY3Rpb24gZm9yIHByb2R1Y3Rpb25cclxuICAgICAgZGVsZXRpb25Qcm90ZWN0aW9uOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnLFxyXG4gICAgICBcclxuICAgICAgLy8gRW5hYmxlIGFjY2VzcyBsb2dzIGZvciBtb25pdG9yaW5nXHJcbiAgICAgIC4uLihlbnZpcm9ubWVudCAhPT0gJ2RldicgJiYge1xyXG4gICAgICAgIGFjY2Vzc0xvZ3M6IHtcclxuICAgICAgICAgIGJ1Y2tldDogbmV3IGNkay5hd3NfczMuQnVja2V0KHRoaXMsICdBbGJBY2Nlc3NMb2dzQnVja2V0Jywge1xyXG4gICAgICAgICAgICBidWNrZXROYW1lOiBgcmVjcnVpdG1lbnQtYWxiLWxvZ3MtJHtlbnZpcm9ubWVudH0tJHtjZGsuU3RhY2sub2YodGhpcykuYWNjb3VudH1gLFxyXG4gICAgICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICAgICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgcHJlZml4OiAnYWxiLWFjY2Vzcy1sb2dzJyxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSxcclxuICAgICAgXHJcbiAgICAgIC8vIEhUVFAvMiBzdXBwb3J0XHJcbiAgICAgIGh0dHAyRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgXHJcbiAgICAgIC8vIElkbGUgdGltZW91dFxyXG4gICAgICBpZGxlVGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIHRhZ3NcclxuICAgIGNkay5UYWdzLm9mKGFsYikuYWRkKCdOYW1lJywgYHJlY3J1aXRtZW50LWFsYi0ke2Vudmlyb25tZW50fWApO1xyXG4gICAgY2RrLlRhZ3Mub2YoYWxiKS5hZGQoJ0Vudmlyb25tZW50JywgZW52aXJvbm1lbnQpO1xyXG4gICAgY2RrLlRhZ3Mub2YoYWxiKS5hZGQoJ1Byb2plY3QnLCAnUmVjcnVpdG1lbnRXZWJzaXRlJyk7XHJcblxyXG4gICAgcmV0dXJuIGFsYjtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlVGFyZ2V0R3JvdXAoXHJcbiAgICB2cGM6IGVjMi5JVnBjLFxyXG4gICAgZWNzQ29uZmlnOiBFY3NDb25maWcsXHJcbiAgICBlbnZpcm9ubWVudDogc3RyaW5nXHJcbiAgKTogZWxidjIuQXBwbGljYXRpb25UYXJnZXRHcm91cCB7XHJcbiAgICByZXR1cm4gbmV3IGVsYnYyLkFwcGxpY2F0aW9uVGFyZ2V0R3JvdXAodGhpcywgJ1RhcmdldEdyb3VwJywge1xyXG4gICAgICB0YXJnZXRHcm91cE5hbWU6IGByZWNydWl0bWVudC10Zy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHZwYyxcclxuICAgICAgcG9ydDogMzAwMCxcclxuICAgICAgcHJvdG9jb2w6IGVsYnYyLkFwcGxpY2F0aW9uUHJvdG9jb2wuSFRUUCxcclxuICAgICAgdGFyZ2V0VHlwZTogZWxidjIuVGFyZ2V0VHlwZS5JUCxcclxuICAgICAgXHJcbiAgICAgIC8vIEhlYWx0aCBjaGVjayBjb25maWd1cmF0aW9uXHJcbiAgICAgIGhlYWx0aENoZWNrOiB7XHJcbiAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICBwYXRoOiBlY3NDb25maWcuaGVhbHRoQ2hlY2sucGF0aCxcclxuICAgICAgICBwcm90b2NvbDogZWxidjIuUHJvdG9jb2wuSFRUUCxcclxuICAgICAgICBwb3J0OiAnMzAwMCcsXHJcbiAgICAgICAgaGVhbHRoeUh0dHBDb2RlczogZWNzQ29uZmlnLmhlYWx0aENoZWNrLmhlYWx0aHlIdHRwQ29kZXMsXHJcbiAgICAgICAgaW50ZXJ2YWw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKGVjc0NvbmZpZy5oZWFsdGhDaGVjay5pbnRlcnZhbCksXHJcbiAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoZWNzQ29uZmlnLmhlYWx0aENoZWNrLnRpbWVvdXQpLFxyXG4gICAgICAgIGhlYWx0aHlUaHJlc2hvbGRDb3VudDogMixcclxuICAgICAgICB1bmhlYWx0aHlUaHJlc2hvbGRDb3VudDogZWNzQ29uZmlnLmhlYWx0aENoZWNrLnJldHJpZXMsXHJcbiAgICAgIH0sXHJcbiAgICAgIFxyXG4gICAgICAvLyBEZXJlZ2lzdHJhdGlvbiBkZWxheVxyXG4gICAgICBkZXJlZ2lzdHJhdGlvbkRlbGF5OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIFxyXG4gICAgICAvLyBTbG93IHN0YXJ0XHJcbiAgICAgIHNsb3dTdGFydDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMCksXHJcbiAgICAgIFxyXG4gICAgICAvLyBTdGlja2luZXNzIChkaXNhYmxlZCBmb3Igc3RhdGVsZXNzIGFwcGxpY2F0aW9ucylcclxuICAgICAgc3RpY2tpbmVzc0Nvb2tpZUR1cmF0aW9uOiBjZGsuRHVyYXRpb24uc2Vjb25kcygwKSxcclxuICAgICAgXHJcbiAgICAgIC8vIFRhcmdldCBncm91cCBhdHRyaWJ1dGVzXHJcbiAgICAgIHRhcmdldEdyb3VwQXR0cmlidXRlczoge1xyXG4gICAgICAgICdkZXJlZ2lzdHJhdGlvbl9kZWxheS50aW1lb3V0X3NlY29uZHMnOiAnMzAnLFxyXG4gICAgICAgICdzbG93X3N0YXJ0LmR1cmF0aW9uX3NlY29uZHMnOiAnMCcsXHJcbiAgICAgICAgJ3N0aWNraW5lc3MuZW5hYmxlZCc6ICdmYWxzZScsXHJcbiAgICAgICAgJ2xvYWRfYmFsYW5jaW5nLmFsZ29yaXRobS50eXBlJzogJ3JvdW5kX3JvYmluJyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjcmVhdGVMaXN0ZW5lcihcclxuICAgIGNlcnRpZmljYXRlQXJuOiBzdHJpbmcgfCB1bmRlZmluZWQsXHJcbiAgICBlbnZpcm9ubWVudDogc3RyaW5nXHJcbiAgKTogZWxidjIuQXBwbGljYXRpb25MaXN0ZW5lciB7XHJcbiAgICAvLyBDcmVhdGUgSFRUUFMgbGlzdGVuZXIgaWYgY2VydGlmaWNhdGUgaXMgcHJvdmlkZWRcclxuICAgIGlmIChjZXJ0aWZpY2F0ZUFybikge1xyXG4gICAgICBjb25zdCBjZXJ0aWZpY2F0ZSA9IGNlcnRpZmljYXRlbWFuYWdlci5DZXJ0aWZpY2F0ZS5mcm9tQ2VydGlmaWNhdGVBcm4oXHJcbiAgICAgICAgdGhpcyxcclxuICAgICAgICAnQ2VydGlmaWNhdGUnLFxyXG4gICAgICAgIGNlcnRpZmljYXRlQXJuXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBjb25zdCBodHRwc0xpc3RlbmVyID0gdGhpcy5sb2FkQmFsYW5jZXIuYWRkTGlzdGVuZXIoJ0h0dHBzTGlzdGVuZXInLCB7XHJcbiAgICAgICAgcG9ydDogNDQzLFxyXG4gICAgICAgIHByb3RvY29sOiBlbGJ2Mi5BcHBsaWNhdGlvblByb3RvY29sLkhUVFBTLFxyXG4gICAgICAgIGNlcnRpZmljYXRlczogW2NlcnRpZmljYXRlXSxcclxuICAgICAgICBkZWZhdWx0VGFyZ2V0R3JvdXBzOiBbdGhpcy50YXJnZXRHcm91cF0sXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gU1NMIHBvbGljeVxyXG4gICAgICAgIHNzbFBvbGljeTogZWxidjIuU3NsUG9saWN5LlRMUzEyX0VYVCxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBSZWRpcmVjdCBIVFRQIHRvIEhUVFBTXHJcbiAgICAgIHRoaXMubG9hZEJhbGFuY2VyLmFkZExpc3RlbmVyKCdIdHRwTGlzdGVuZXInLCB7XHJcbiAgICAgICAgcG9ydDogODAsXHJcbiAgICAgICAgcHJvdG9jb2w6IGVsYnYyLkFwcGxpY2F0aW9uUHJvdG9jb2wuSFRUUCxcclxuICAgICAgICBkZWZhdWx0QWN0aW9uOiBlbGJ2Mi5MaXN0ZW5lckFjdGlvbi5yZWRpcmVjdCh7XHJcbiAgICAgICAgICBwcm90b2NvbDogJ0hUVFBTJyxcclxuICAgICAgICAgIHBvcnQ6ICc0NDMnLFxyXG4gICAgICAgICAgcGVybWFuZW50OiB0cnVlLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHJldHVybiBodHRwc0xpc3RlbmVyO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gQ3JlYXRlIEhUVFAgbGlzdGVuZXIgZm9yIGRldmVsb3BtZW50XHJcbiAgICAgIHJldHVybiB0aGlzLmxvYWRCYWxhbmNlci5hZGRMaXN0ZW5lcignSHR0cExpc3RlbmVyJywge1xyXG4gICAgICAgIHBvcnQ6IDgwLFxyXG4gICAgICAgIHByb3RvY29sOiBlbGJ2Mi5BcHBsaWNhdGlvblByb3RvY29sLkhUVFAsXHJcbiAgICAgICAgZGVmYXVsdFRhcmdldEdyb3VwczogW3RoaXMudGFyZ2V0R3JvdXBdLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXR0YWNoRWNzU2VydmljZShcclxuICAgIGVjc1NlcnZpY2U6IGVjcy5GYXJnYXRlU2VydmljZSxcclxuICAgIGVjc0NvbnRhaW5lcjogZWNzLkNvbnRhaW5lckRlZmluaXRpb25cclxuICApOiB2b2lkIHtcclxuICAgIC8vIEF0dGFjaCBFQ1Mgc2VydmljZSB0byB0YXJnZXQgZ3JvdXBcclxuICAgIGVjc1NlcnZpY2UuYXR0YWNoVG9BcHBsaWNhdGlvblRhcmdldEdyb3VwKHRoaXMudGFyZ2V0R3JvdXApO1xyXG4gICAgXHJcbiAgICAvLyBBbHRlcm5hdGl2ZSBtZXRob2QgdXNpbmcgc2VydmljZSByZWdpc3RyYXRpb25zXHJcbiAgICAvLyBlY3NTZXJ2aWNlLnJlZ2lzdGVyTG9hZEJhbGFuY2VyVGFyZ2V0cyh7XHJcbiAgICAvLyAgIGNvbnRhaW5lck5hbWU6IGVjc0NvbnRhaW5lci5jb250YWluZXJOYW1lLFxyXG4gICAgLy8gICBjb250YWluZXJQb3J0OiAzMDAwLFxyXG4gICAgLy8gICBuZXdUYXJnZXRHcm91cElkOiAnRUNTJyxcclxuICAgIC8vICAgbGlzdGVuZXI6IGVsYnYyLkFwcGxpY2F0aW9uTGlzdGVuZXIuZnJvbUFwcGxpY2F0aW9uTGlzdGVuZXJBdHRyaWJ1dGVzKHRoaXMsICdMaXN0ZW5lcicsIHtcclxuICAgIC8vICAgICBsaXN0ZW5lckFybjogdGhpcy5saXN0ZW5lci5saXN0ZW5lckFybixcclxuICAgIC8vICAgICBzZWN1cml0eUdyb3VwOiB0aGlzLmxvYWRCYWxhbmNlci5jb25uZWN0aW9ucy5zZWN1cml0eUdyb3Vwc1swXSxcclxuICAgIC8vICAgfSksXHJcbiAgICAvLyB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlQ2xvdWRXYXRjaEFsYXJtcyhlbnZpcm9ubWVudDogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAvLyBDcmVhdGUgQ2xvdWRXYXRjaCBhbGFybXMgZm9yIEFMQiBtb25pdG9yaW5nXHJcbiAgICBcclxuICAgIC8vIFJlc3BvbnNlIHRpbWUgYWxhcm1cclxuICAgIG5ldyBjZGsuYXdzX2Nsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0FsYlJlc3BvbnNlVGltZUFsYXJtJywge1xyXG4gICAgICBtZXRyaWM6IHRoaXMubG9hZEJhbGFuY2VyLm1ldHJpY1RhcmdldFJlc3BvbnNlVGltZSgpLFxyXG4gICAgICB0aHJlc2hvbGQ6IDEsIC8vIDEgc2Vjb25kXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBhbGFybU5hbWU6IGByZWNydWl0bWVudC1hbGItcmVzcG9uc2UtdGltZS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBTEIgcmVzcG9uc2UgdGltZSBpcyBoaWdoJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEhUVFAgNXh4IGVycm9ycyBhbGFybVxyXG4gICAgbmV3IGNkay5hd3NfY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnQWxiSHR0cDV4eEFsYXJtJywge1xyXG4gICAgICBtZXRyaWM6IHRoaXMubG9hZEJhbGFuY2VyLm1ldHJpY0h0dHBDb2RlVGFyZ2V0KGVsYnYyLkh0dHBDb2RlVGFyZ2V0LlRBUkdFVF81WFhfQ09VTlQpLFxyXG4gICAgICB0aHJlc2hvbGQ6IDUsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBhbGFybU5hbWU6IGByZWNydWl0bWVudC1hbGItNXh4LWVycm9ycy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBTEIgaXMgcmVjZWl2aW5nIDV4eCBlcnJvcnMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gSFRUUCA0eHggZXJyb3JzIGFsYXJtXHJcbiAgICBuZXcgY2RrLmF3c19jbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdBbGJIdHRwNHh4QWxhcm0nLCB7XHJcbiAgICAgIG1ldHJpYzogdGhpcy5sb2FkQmFsYW5jZXIubWV0cmljSHR0cENvZGVUYXJnZXQoZWxidjIuSHR0cENvZGVUYXJnZXQuVEFSR0VUXzRYWF9DT1VOVCksXHJcbiAgICAgIHRocmVzaG9sZDogMjAsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBhbGFybU5hbWU6IGByZWNydWl0bWVudC1hbGItNHh4LWVycm9ycy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBTEIgaXMgcmVjZWl2aW5nIDR4eCBlcnJvcnMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUmVxdWVzdCBjb3VudCBhbGFybSAoZm9yIEREb1MgZGV0ZWN0aW9uKVxyXG4gICAgbmV3IGNkay5hd3NfY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnQWxiUmVxdWVzdENvdW50QWxhcm0nLCB7XHJcbiAgICAgIG1ldHJpYzogdGhpcy5sb2FkQmFsYW5jZXIubWV0cmljUmVxdWVzdENvdW50KCksXHJcbiAgICAgIHRocmVzaG9sZDogZW52aXJvbm1lbnQgPT09ICdkZXYnID8gMTAwMCA6IDUwMDAsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBhbGFybU5hbWU6IGByZWNydWl0bWVudC1hbGItcmVxdWVzdC1jb3VudC0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBTEIgcmVxdWVzdCBjb3VudCBpcyB1bnVzdWFsbHkgaGlnaCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBIZWFsdGh5IHRhcmdldCBjb3VudCBhbGFybVxyXG4gICAgbmV3IGNkay5hd3NfY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnQWxiSGVhbHRoeVRhcmdldENvdW50QWxhcm0nLCB7XHJcbiAgICAgIG1ldHJpYzogdGhpcy50YXJnZXRHcm91cC5tZXRyaWNIZWFsdGh5VGFyZ2V0Q291bnQoKSxcclxuICAgICAgdGhyZXNob2xkOiAxLFxyXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNkay5hd3NfY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuTEVTU19USEFOX1RIUkVTSE9MRCxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXHJcbiAgICAgIGFsYXJtTmFtZTogYHJlY3J1aXRtZW50LWFsYi1oZWFsdGh5LXRhcmdldHMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQUxCIGhhcyBubyBoZWFsdGh5IHRhcmdldHMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gVW5oZWFsdGh5IHRhcmdldCBjb3VudCBhbGFybVxyXG4gICAgbmV3IGNkay5hd3NfY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnQWxiVW5oZWFsdGh5VGFyZ2V0Q291bnRBbGFybScsIHtcclxuICAgICAgbWV0cmljOiB0aGlzLnRhcmdldEdyb3VwLm1ldHJpY1VuaGVhbHRoeVRhcmdldENvdW50KCksXHJcbiAgICAgIHRocmVzaG9sZDogMCxcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjZGsuYXdzX2Nsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBhbGFybU5hbWU6IGByZWNydWl0bWVudC1hbGItdW5oZWFsdGh5LXRhcmdldHMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQUxCIGhhcyB1bmhlYWx0aHkgdGFyZ2V0cycsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgc2V0dXBDdXN0b21Eb21haW4oZG9tYWluTmFtZTogc3RyaW5nLCBlbnZpcm9ubWVudDogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAvLyBMb29rIHVwIGhvc3RlZCB6b25lXHJcbiAgICBjb25zdCBob3N0ZWRab25lID0gcm91dGU1My5Ib3N0ZWRab25lLmZyb21Mb29rdXAodGhpcywgJ0hvc3RlZFpvbmUnLCB7XHJcbiAgICAgIGRvbWFpbk5hbWU6IGRvbWFpbk5hbWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgc3ViZG9tYWluIGZvciBlbnZpcm9ubWVudFxyXG4gICAgY29uc3Qgc3ViZG9tYWluID0gZW52aXJvbm1lbnQgPT09ICdwcm9kJyA/ICdhcGknIDogYGFwaS0ke2Vudmlyb25tZW50fWA7XHJcbiAgICBjb25zdCBmdWxsRG9tYWluTmFtZSA9IGAke3N1YmRvbWFpbn0uJHtkb21haW5OYW1lfWA7XHJcblxyXG4gICAgLy8gQ3JlYXRlIFJvdXRlIDUzIHJlY29yZFxyXG4gICAgbmV3IHJvdXRlNTMuQVJlY29yZCh0aGlzLCAnQWxpYXNSZWNvcmQnLCB7XHJcbiAgICAgIHpvbmU6IGhvc3RlZFpvbmUsXHJcbiAgICAgIHJlY29yZE5hbWU6IHN1YmRvbWFpbixcclxuICAgICAgdGFyZ2V0OiByb3V0ZTUzLlJlY29yZFRhcmdldC5mcm9tQWxpYXMoXHJcbiAgICAgICAgbmV3IHJvdXRlNTN0YXJnZXRzLkxvYWRCYWxhbmNlclRhcmdldCh0aGlzLmxvYWRCYWxhbmNlcilcclxuICAgICAgKSxcclxuICAgICAgdHRsOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE91dHB1dCB0aGUgY3VzdG9tIGRvbWFpblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0N1c3RvbURvbWFpbk5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBmdWxsRG9tYWluTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdDdXN0b20gZG9tYWluIG5hbWUgZm9yIHRoZSBBUEknLFxyXG4gICAgICBleHBvcnROYW1lOiBgcmVjcnVpdG1lbnQtYXBpLWRvbWFpbi0ke2Vudmlyb25tZW50fWAsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlT3V0cHV0cygpOiB2b2lkIHtcclxuICAgIC8vIE91dHB1dCBsb2FkIGJhbGFuY2VyIEROUyBuYW1lXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTG9hZEJhbGFuY2VyRG5zTmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuZG5zTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdMb2FkIGJhbGFuY2VyIEROUyBuYW1lJyxcclxuICAgICAgZXhwb3J0TmFtZTogYHJlY3J1aXRtZW50LWFsYi1kbnMtJHt0aGlzLm5vZGUuc2NvcGV9YCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE91dHB1dCBsb2FkIGJhbGFuY2VyIEFSTlxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xvYWRCYWxhbmNlckFybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMubG9hZEJhbGFuY2VyLmxvYWRCYWxhbmNlckFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdMb2FkIGJhbGFuY2VyIEFSTicsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGByZWNydWl0bWVudC1hbGItYXJuLSR7dGhpcy5ub2RlLnNjb3BlfWAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgdGFyZ2V0IGdyb3VwIEFSTlxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1RhcmdldEdyb3VwQXJuJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy50YXJnZXRHcm91cC50YXJnZXRHcm91cEFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdUYXJnZXQgZ3JvdXAgQVJOJyxcclxuICAgICAgZXhwb3J0TmFtZTogYHJlY3J1aXRtZW50LXRnLWFybi0ke3RoaXMubm9kZS5zY29wZX1gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IGxpc3RlbmVyIEFSTlxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xpc3RlbmVyQXJuJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5saXN0ZW5lci5saXN0ZW5lckFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdMaXN0ZW5lciBBUk4nLFxyXG4gICAgICBleHBvcnROYW1lOiBgcmVjcnVpdG1lbnQtbGlzdGVuZXItYXJuLSR7dGhpcy5ub2RlLnNjb3BlfWAsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEFkZCBhZGRpdGlvbmFsIGxpc3RlbmVyIHJ1bGVzIGZvciBwYXRoLWJhc2VkIHJvdXRpbmdcclxuICAgKi9cclxuICBwdWJsaWMgYWRkUGF0aFJ1bGUoXHJcbiAgICBwYXRoUGF0dGVybjogc3RyaW5nLFxyXG4gICAgdGFyZ2V0R3JvdXA6IGVsYnYyLkFwcGxpY2F0aW9uVGFyZ2V0R3JvdXAsXHJcbiAgICBwcmlvcml0eTogbnVtYmVyXHJcbiAgKTogdm9pZCB7XHJcbiAgICB0aGlzLmxpc3RlbmVyLmFkZFRhcmdldEdyb3VwcygnUGF0aFJ1bGUnLCB7XHJcbiAgICAgIHRhcmdldEdyb3VwczogW3RhcmdldEdyb3VwXSxcclxuICAgICAgcHJpb3JpdHksXHJcbiAgICAgIGNvbmRpdGlvbnM6IFtcclxuICAgICAgICBlbGJ2Mi5MaXN0ZW5lckNvbmRpdGlvbi5wYXRoUGF0dGVybnMoW3BhdGhQYXR0ZXJuXSksXHJcbiAgICAgIF0sXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEFkZCBhZGRpdGlvbmFsIGxpc3RlbmVyIHJ1bGVzIGZvciBob3N0LWJhc2VkIHJvdXRpbmdcclxuICAgKi9cclxuICBwdWJsaWMgYWRkSG9zdFJ1bGUoXHJcbiAgICBob3N0SGVhZGVyOiBzdHJpbmcsXHJcbiAgICB0YXJnZXRHcm91cDogZWxidjIuQXBwbGljYXRpb25UYXJnZXRHcm91cCxcclxuICAgIHByaW9yaXR5OiBudW1iZXJcclxuICApOiB2b2lkIHtcclxuICAgIHRoaXMubGlzdGVuZXIuYWRkVGFyZ2V0R3JvdXBzKCdIb3N0UnVsZScsIHtcclxuICAgICAgdGFyZ2V0R3JvdXBzOiBbdGFyZ2V0R3JvdXBdLFxyXG4gICAgICBwcmlvcml0eSxcclxuICAgICAgY29uZGl0aW9uczogW1xyXG4gICAgICAgIGVsYnYyLkxpc3RlbmVyQ29uZGl0aW9uLmhvc3RIZWFkZXJzKFtob3N0SGVhZGVyXSksXHJcbiAgICAgIF0sXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEVuYWJsZSBXQUYgZm9yIGFkZGl0aW9uYWwgc2VjdXJpdHlcclxuICAgKi9cclxuICBwdWJsaWMgZW5hYmxlV2FmKGVudmlyb25tZW50OiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIC8vIFRoaXMgd291bGQgY3JlYXRlIGEgV0FGIFdlYkFDTCBhbmQgYXNzb2NpYXRlIGl0IHdpdGggdGhlIEFMQlxyXG4gICAgLy8gSW1wbGVtZW50YXRpb24gZGVwZW5kcyBvbiBzcGVjaWZpYyBXQUYgcnVsZXMgbmVlZGVkXHJcbiAgfVxyXG59Il19