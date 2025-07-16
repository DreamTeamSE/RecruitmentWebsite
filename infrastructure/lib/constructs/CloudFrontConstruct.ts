import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

export interface CloudFrontConstructProps {
  environment: string;
  domainName?: string;
  certificateArn?: string;
  albDomainName: string;
  webAcl?: wafv2.CfnWebACL;
  alertsTopic?: sns.Topic;
}

export class CloudFrontConstruct extends Construct {
  public readonly distribution: cloudfront.Distribution;
  public readonly s3Bucket: s3.Bucket;
  public readonly originAccessIdentity: cloudfront.OriginAccessIdentity;
  public readonly certificate?: acm.Certificate;

  constructor(scope: Construct, id: string, props: CloudFrontConstructProps) {
    super(scope, id);

    // Create S3 bucket for static assets
    this.s3Bucket = new s3.Bucket(this, 'StaticAssetsBucket', {
      bucketName: `recruitment-static-assets-${props.environment}-${cdk.Aws.ACCOUNT_ID}`,
      versioned: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          enabled: true,
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Create Origin Access Identity
    this.originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: `OAI for recruitment website ${props.environment}`,
    });

    // Grant CloudFront access to S3 bucket
    this.s3Bucket.grantRead(this.originAccessIdentity);

    // Create SSL certificate for CloudFront if domain is provided
    if (props.domainName && !props.certificateArn) {
      this.certificate = new acm.Certificate(this, 'CloudFrontCertificate', {
        domainName: props.domainName,
        subjectAlternativeNames: [`*.${props.domainName}`],
        validation: acm.CertificateValidation.fromDns(),
        region: 'us-east-1', // CloudFront requires certificates in us-east-1
      });
    }

    // Create cache policies
    const staticAssetsCachePolicy = new cloudfront.CachePolicy(this, 'StaticAssetsCachePolicy', {
      cachePolicyName: `recruitment-static-${props.environment}`,
      defaultTtl: cdk.Duration.days(30),
      maxTtl: cdk.Duration.days(365),
      minTtl: cdk.Duration.seconds(0),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        'CloudFront-Viewer-Country',
        'CloudFront-Is-Mobile-Viewer',
        'CloudFront-Is-Tablet-Viewer',
        'CloudFront-Is-Desktop-Viewer'
      ),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.denyList('utm_source', 'utm_medium', 'utm_campaign'),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
    });

    const apiCachePolicy = new cloudfront.CachePolicy(this, 'ApiCachePolicy', {
      cachePolicyName: `recruitment-api-${props.environment}`,
      defaultTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.days(1),
      minTtl: cdk.Duration.seconds(0),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        'Authorization',
        'Content-Type',
        'Accept',
        'User-Agent',
        'Referer',
        'CloudFront-Viewer-Country'
      ),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      cookieBehavior: cloudfront.CacheCookieBehavior.all(),
      enableAcceptEncodingBrotli: true,
      enableAcceptEncodingGzip: true,
    });

    // Create origin request policy
    const originRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'OriginRequestPolicy', {
      originRequestPolicyName: `recruitment-origin-${props.environment}`,
      headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
        'Authorization',
        'Content-Type',
        'Accept',
        'User-Agent',
        'Referer',
        'X-Forwarded-For',
        'X-Forwarded-Proto',
        'X-Forwarded-Port'
      ),
      queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
      cookieBehavior: cloudfront.OriginRequestCookieBehavior.all(),
    });

    // Create response headers policy
    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'ResponseHeadersPolicy', {
      responseHeadersPolicyName: `recruitment-security-${props.environment}`,
      securityHeadersBehavior: {
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.seconds(31536000),
          includeSubdomains: true,
          preload: true,
          override: true,
        },
      },
      customHeadersBehavior: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      },
    });

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `Recruitment Website Distribution - ${props.environment}`,
      domainNames: props.domainName ? [props.domainName, `www.${props.domainName}`] : undefined,
      certificate: props.certificateArn 
        ? acm.Certificate.fromCertificateArn(this, 'ImportedCertificate', props.certificateArn)
        : this.certificate,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      sslSupportMethod: cloudfront.SSLMethod.SNI,
      httpVersion: cloudfront.HttpVersion.HTTP2,
      enabled: true,
      enableIpv6: true,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      geoRestriction: cloudfront.GeoRestriction.denylist('CN', 'RU'), // Block certain countries
      webAclId: props.webAcl?.attrArn,
      
      // Default behavior for API endpoints
      defaultBehavior: {
        origin: new origins.HttpOrigin(props.albDomainName, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          httpsPort: 443,
          originSslProtocols: [cloudfront.OriginSslPolicy.TLS_V1_2],
          readTimeout: cdk.Duration.seconds(30),
          keepAliveTimeout: cdk.Duration.seconds(5),
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: apiCachePolicy,
        originRequestPolicy: originRequestPolicy,
        responseHeadersPolicy: responseHeadersPolicy,
        compress: true,
        smoothStreaming: false,
      },

      // Additional behaviors
      additionalBehaviors: {
        // Static assets from S3
        '/static/*': {
          origin: new origins.S3Origin(this.s3Bucket, {
            originAccessIdentity: this.originAccessIdentity,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          cachePolicy: staticAssetsCachePolicy,
          responseHeadersPolicy: responseHeadersPolicy,
          compress: true,
        },
        
        // Assets from S3
        '/assets/*': {
          origin: new origins.S3Origin(this.s3Bucket, {
            originAccessIdentity: this.originAccessIdentity,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          cachePolicy: staticAssetsCachePolicy,
          responseHeadersPolicy: responseHeadersPolicy,
          compress: true,
        },

        // API routes with no caching
        '/api/*': {
          origin: new origins.HttpOrigin(props.albDomainName, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
            httpsPort: 443,
            originSslProtocols: [cloudfront.OriginSslPolicy.TLS_V1_2],
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: originRequestPolicy,
          responseHeadersPolicy: responseHeadersPolicy,
          compress: true,
        },

        // Health check
        '/health': {
          origin: new origins.HttpOrigin(props.albDomainName, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
            httpsPort: 443,
            originSslProtocols: [cloudfront.OriginSslPolicy.TLS_V1_2],
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: originRequestPolicy,
          responseHeadersPolicy: responseHeadersPolicy,
          compress: false,
        },
      },

      // Error responses
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 500,
          responseHttpStatus: 500,
          responsePagePath: '/500.html',
          ttl: cdk.Duration.minutes(1),
        },
        {
          httpStatus: 502,
          responseHttpStatus: 502,
          responsePagePath: '/502.html',
          ttl: cdk.Duration.minutes(1),
        },
        {
          httpStatus: 503,
          responseHttpStatus: 503,
          responsePagePath: '/503.html',
          ttl: cdk.Duration.minutes(1),
        },
      ],

      // Logging
      enableLogging: true,
      logBucket: this.createLogBucket(),
      logFilePrefix: 'cloudfront-logs/',
      logIncludesCookies: false,
    });

    // Create DNS records if domain is provided
    if (props.domainName) {
      this.createDnsRecords(props.domainName);
    }

    // Create CloudWatch alarms
    this.createCloudWatchAlarms(props.alertsTopic);

    // Add tags
    cdk.Tags.of(this.distribution).add('Component', 'CloudFront');
    cdk.Tags.of(this.s3Bucket).add('Component', 'StaticAssets');
  }

  private createLogBucket(): s3.Bucket {
    return new s3.Bucket(this, 'CloudFrontLogsBucket', {
      bucketName: `recruitment-cloudfront-logs-${this.node.tryGetContext('environment')}-${cdk.Aws.ACCOUNT_ID}`,
      versioned: false,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
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
  }

  private createDnsRecords(domainName: string): void {
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: domainName,
    });

    // Create A record for the domain
    new route53.ARecord(this, 'ARecord', {
      zone: hostedZone,
      recordName: domainName,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(this.distribution)
      ),
      ttl: cdk.Duration.minutes(5),
    });

    // Create AAAA record for IPv6
    new route53.AaaaRecord(this, 'AaaaRecord', {
      zone: hostedZone,
      recordName: domainName,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(this.distribution)
      ),
      ttl: cdk.Duration.minutes(5),
    });

    // Create A record for www subdomain
    new route53.ARecord(this, 'WwwARecord', {
      zone: hostedZone,
      recordName: `www.${domainName}`,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(this.distribution)
      ),
      ttl: cdk.Duration.minutes(5),
    });
  }

  private createCloudWatchAlarms(alertsTopic?: sns.Topic): void {
    if (!alertsTopic) return;

    // Origin latency alarm
    const originLatencyAlarm = new cloudwatch.Alarm(this, 'OriginLatencyAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/CloudFront',
        metricName: 'OriginLatency',
        dimensionsMap: {
          DistributionId: this.distribution.distributionId,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5000, // 5 seconds
      evaluationPeriods: 2,
      alarmDescription: 'CloudFront origin latency is too high',
    });
    originLatencyAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));

    // Cache hit rate alarm
    const cacheHitRateAlarm = new cloudwatch.Alarm(this, 'CacheHitRateAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/CloudFront',
        metricName: 'CacheHitRate',
        dimensionsMap: {
          DistributionId: this.distribution.distributionId,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 60, // 60%
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      alarmDescription: 'CloudFront cache hit rate is too low',
    });
    cacheHitRateAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));

    // 4xx error rate alarm
    const error4xxAlarm = new cloudwatch.Alarm(this, 'Error4xxAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/CloudFront',
        metricName: '4xxErrorRate',
        dimensionsMap: {
          DistributionId: this.distribution.distributionId,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10, // 10%
      evaluationPeriods: 2,
      alarmDescription: 'CloudFront 4xx error rate is too high',
    });
    error4xxAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));

    // 5xx error rate alarm
    const error5xxAlarm = new cloudwatch.Alarm(this, 'Error5xxAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/CloudFront',
        metricName: '5xxErrorRate',
        dimensionsMap: {
          DistributionId: this.distribution.distributionId,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5, // 5%
      evaluationPeriods: 2,
      alarmDescription: 'CloudFront 5xx error rate is too high',
    });
    error5xxAlarm.addAlarmAction(new cloudwatch.SnsAction(alertsTopic));
  }

  /**
   * Get the CloudFront distribution domain name
   */
  public getDomainName(): string {
    return this.distribution.distributionDomainName;
  }

  /**
   * Get the CloudFront distribution ID
   */
  public getDistributionId(): string {
    return this.distribution.distributionId;
  }

  /**
   * Get the S3 bucket for static assets
   */
  public getStaticAssetsBucket(): s3.Bucket {
    return this.s3Bucket;
  }
}