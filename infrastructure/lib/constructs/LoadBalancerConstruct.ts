import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export interface LoadBalancerConstructProps {
  vpc: ec2.Vpc;
  securityGroup: ec2.SecurityGroup;
  environment: string;
  domainName?: string;
  certificateArn?: string;
  alertsTopic?: sns.Topic;
  webAcl?: wafv2.CfnWebACL;
}

export class LoadBalancerConstruct extends Construct {
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;
  public readonly targetGroup: elbv2.ApplicationTargetGroup;
  public readonly httpsListener: elbv2.ApplicationListener;
  public readonly httpListener: elbv2.ApplicationListener;
  public readonly certificate?: acm.Certificate;

  constructor(scope: Construct, id: string, props: LoadBalancerConstructProps) {
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

  private addListenerRules(): void {
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

  private createDnsRecord(domainName: string): void {
    // Look up hosted zone
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: domainName,
    });

    // Create A record for the domain
    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      recordName: `api.${domainName}`,
      target: route53.RecordTarget.fromAlias(
        new targets.LoadBalancerTarget(this.loadBalancer)
      ),
      ttl: cdk.Duration.minutes(5),
    });

    // Create AAAA record for IPv6
    new route53.AaaaRecord(this, 'AaaaRecord', {
      zone: hostedZone,
      recordName: `api.${domainName}`,
      target: route53.RecordTarget.fromAlias(
        new targets.LoadBalancerTarget(this.loadBalancer)
      ),
      ttl: cdk.Duration.minutes(5),
    });
  }

  private createCloudWatchAlarms(alertsTopic?: sns.Topic): void {
    if (!alertsTopic) return;

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
      metric: this.loadBalancer.metricHttpCodeElb(
        elbv2.HttpCodeElb.ELB_5XX_COUNT,
        { period: cdk.Duration.minutes(5) }
      ),
      threshold: 10,
      evaluationPeriods: 2,
      alarmDescription: 'Too many 5xx errors from ALB',
    });
    http5xxAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));

    // HTTP 4xx error rate alarm
    const http4xxAlarm = new cloudwatch.Alarm(this, 'Http4xxAlarm', {
      metric: this.loadBalancer.metricHttpCodeElb(
        elbv2.HttpCodeElb.ELB_4XX_COUNT,
        { period: cdk.Duration.minutes(5) }
      ),
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

  private enableAccessLogs(): void {
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
    accessLogsBucket.addToResourcePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        principals: [
          new cdk.aws_iam.ServicePrincipal('elasticloadbalancing.amazonaws.com'),
        ],
        actions: ['s3:PutObject'],
        resources: [accessLogsBucket.arnForObjects('*')],
      })
    );

    // Enable access logs
    this.loadBalancer.logAccessLogs(accessLogsBucket, 'alb-access-logs');
  }

  /**
   * Add custom listener rule
   */
  public addListenerRule(
    id: string,
    priority: number,
    conditions: elbv2.ListenerCondition[],
    action: elbv2.ListenerAction
  ): void {
    this.httpsListener.addAction(id, {
      priority,
      conditions,
      action,
    });
  }

  /**
   * Get the load balancer DNS name
   */
  public getDnsName(): string {
    return this.loadBalancer.loadBalancerDnsName;
  }

  /**
   * Get the load balancer ARN
   */
  public getArn(): string {
    return this.loadBalancer.loadBalancerArn;
  }
}