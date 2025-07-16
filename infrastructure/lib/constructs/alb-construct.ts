import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';
import { EcsConfig } from '../config/environment-config';

export interface AlbConstructProps {
  vpc: ec2.IVpc;
  securityGroup: ec2.ISecurityGroup;
  ecsService: ecs.FargateService;
  ecsContainer: ecs.ContainerDefinition;
  ecsConfig: EcsConfig;
  environment: string;
  domainName?: string;
  certificateArn?: string;
}

export class AlbConstruct extends Construct {
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;
  public readonly listener: elbv2.ApplicationListener;
  public readonly targetGroup: elbv2.ApplicationTargetGroup;
  public readonly dnsName: string;

  constructor(scope: Construct, id: string, props: AlbConstructProps) {
    super(scope, id);

    const { 
      vpc, 
      securityGroup, 
      ecsService, 
      ecsContainer, 
      ecsConfig, 
      environment,
      domainName,
      certificateArn
    } = props;

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

  private createLoadBalancer(
    vpc: ec2.IVpc,
    securityGroup: ec2.ISecurityGroup,
    environment: string
  ): elbv2.ApplicationLoadBalancer {
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

  private createTargetGroup(
    vpc: ec2.IVpc,
    ecsConfig: EcsConfig,
    environment: string
  ): elbv2.ApplicationTargetGroup {
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

  private createListener(
    certificateArn: string | undefined,
    environment: string
  ): elbv2.ApplicationListener {
    // Create HTTPS listener if certificate is provided
    if (certificateArn) {
      const certificate = certificatemanager.Certificate.fromCertificateArn(
        this,
        'Certificate',
        certificateArn
      );

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
    } else {
      // Create HTTP listener for development
      return this.loadBalancer.addListener('HttpListener', {
        port: 80,
        protocol: elbv2.ApplicationProtocol.HTTP,
        defaultTargetGroups: [this.targetGroup],
      });
    }
  }

  private attachEcsService(
    ecsService: ecs.FargateService,
    ecsContainer: ecs.ContainerDefinition
  ): void {
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

  private createCloudWatchAlarms(environment: string): void {
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

  private setupCustomDomain(domainName: string, environment: string): void {
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
      target: route53.RecordTarget.fromAlias(
        new route53targets.LoadBalancerTarget(this.loadBalancer)
      ),
      ttl: cdk.Duration.minutes(5),
    });

    // Output the custom domain
    new cdk.CfnOutput(this, 'CustomDomainName', {
      value: fullDomainName,
      description: 'Custom domain name for the API',
      exportName: `recruitment-api-domain-${environment}`,
    });
  }

  private createOutputs(): void {
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
  public addPathRule(
    pathPattern: string,
    targetGroup: elbv2.ApplicationTargetGroup,
    priority: number
  ): void {
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
  public addHostRule(
    hostHeader: string,
    targetGroup: elbv2.ApplicationTargetGroup,
    priority: number
  ): void {
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
  public enableWaf(environment: string): void {
    // This would create a WAF WebACL and associate it with the ALB
    // Implementation depends on specific WAF rules needed
  }
}