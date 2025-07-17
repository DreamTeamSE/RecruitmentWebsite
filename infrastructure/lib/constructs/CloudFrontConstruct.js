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
exports.CloudFrontConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const acm = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
const route53 = __importStar(require("aws-cdk-lib/aws-route53"));
const targets = __importStar(require("aws-cdk-lib/aws-route53-targets"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const constructs_1 = require("constructs");
class CloudFrontConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
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
            headerBehavior: cloudfront.CacheHeaderBehavior.allowList('CloudFront-Viewer-Country', 'CloudFront-Is-Mobile-Viewer', 'CloudFront-Is-Tablet-Viewer', 'CloudFront-Is-Desktop-Viewer'),
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
            headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Authorization', 'Content-Type', 'Accept', 'User-Agent', 'Referer', 'CloudFront-Viewer-Country'),
            queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
            cookieBehavior: cloudfront.CacheCookieBehavior.all(),
            enableAcceptEncodingBrotli: true,
            enableAcceptEncodingGzip: true,
        });
        // Create origin request policy
        const originRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'OriginRequestPolicy', {
            originRequestPolicyName: `recruitment-origin-${props.environment}`,
            headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList('Authorization', 'Content-Type', 'Accept', 'User-Agent', 'Referer', 'X-Forwarded-For', 'X-Forwarded-Proto', 'X-Forwarded-Port'),
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
    createLogBucket() {
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
    createDnsRecords(domainName) {
        const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
            domainName: domainName,
        });
        // Create A record for the domain
        new route53.ARecord(this, 'ARecord', {
            zone: hostedZone,
            recordName: domainName,
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
            ttl: cdk.Duration.minutes(5),
        });
        // Create AAAA record for IPv6
        new route53.AaaaRecord(this, 'AaaaRecord', {
            zone: hostedZone,
            recordName: domainName,
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
            ttl: cdk.Duration.minutes(5),
        });
        // Create A record for www subdomain
        new route53.ARecord(this, 'WwwARecord', {
            zone: hostedZone,
            recordName: `www.${domainName}`,
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
            ttl: cdk.Duration.minutes(5),
        });
    }
    createCloudWatchAlarms(alertsTopic) {
        if (!alertsTopic)
            return;
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
    getDomainName() {
        return this.distribution.distributionDomainName;
    }
    /**
     * Get the CloudFront distribution ID
     */
    getDistributionId() {
        return this.distribution.distributionId;
    }
    /**
     * Get the S3 bucket for static assets
     */
    getStaticAssetsBucket() {
        return this.s3Bucket;
    }
}
exports.CloudFrontConstruct = CloudFrontConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2xvdWRGcm9udENvbnN0cnVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkNsb3VkRnJvbnRDb25zdHJ1Y3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHVFQUF5RDtBQUN6RCw0RUFBOEQ7QUFDOUQsdURBQXlDO0FBRXpDLHdFQUEwRDtBQUMxRCxpRUFBbUQ7QUFDbkQseUVBQTJEO0FBRzNELHVFQUF5RDtBQUN6RCwyQ0FBdUM7QUFXdkMsTUFBYSxtQkFBb0IsU0FBUSxzQkFBUztJQU1oRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQStCO1FBQ3ZFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIscUNBQXFDO1FBQ3JDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUN4RCxVQUFVLEVBQUUsNkJBQTZCLEtBQUssQ0FBQyxXQUFXLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUU7WUFDbEYsU0FBUyxFQUFFLElBQUk7WUFDZixnQkFBZ0IsRUFBRSxLQUFLO1lBQ3ZCLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELFVBQVUsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVTtZQUMxQyxJQUFJLEVBQUU7Z0JBQ0o7b0JBQ0UsY0FBYyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7b0JBQ3pELGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQztvQkFDckIsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDO29CQUNyQixjQUFjLEVBQUUsQ0FBQyxNQUFNLENBQUM7b0JBQ3hCLE1BQU0sRUFBRSxJQUFJO2lCQUNiO2FB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QUMxQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDdkIsQ0FBQztDQUNGO0FBdGFELGtEQXNhQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGNsb3VkZnJvbnQgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xyXG5pbXBvcnQgKiBhcyBvcmlnaW5zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xyXG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCAqIGFzIGFjbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2VydGlmaWNhdGVtYW5hZ2VyJztcclxuaW1wb3J0ICogYXMgcm91dGU1MyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1Myc7XHJcbmltcG9ydCAqIGFzIHRhcmdldHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMtdGFyZ2V0cyc7XHJcbmltcG9ydCAqIGFzIHdhZnYyIGZyb20gJ2F3cy1jZGstbGliL2F3cy13YWZ2Mic7XHJcbmltcG9ydCAqIGFzIHNucyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc25zJztcclxuaW1wb3J0ICogYXMgY2xvdWR3YXRjaCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWR3YXRjaCc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDbG91ZEZyb250Q29uc3RydWN0UHJvcHMge1xyXG4gIGVudmlyb25tZW50OiBzdHJpbmc7XHJcbiAgZG9tYWluTmFtZT86IHN0cmluZztcclxuICBjZXJ0aWZpY2F0ZUFybj86IHN0cmluZztcclxuICBhbGJEb21haW5OYW1lOiBzdHJpbmc7XHJcbiAgd2ViQWNsPzogd2FmdjIuQ2ZuV2ViQUNMO1xyXG4gIGFsZXJ0c1RvcGljPzogc25zLlRvcGljO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQ2xvdWRGcm9udENvbnN0cnVjdCBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgcHVibGljIHJlYWRvbmx5IGRpc3RyaWJ1dGlvbjogY2xvdWRmcm9udC5EaXN0cmlidXRpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IHMzQnVja2V0OiBzMy5CdWNrZXQ7XHJcbiAgcHVibGljIHJlYWRvbmx5IG9yaWdpbkFjY2Vzc0lkZW50aXR5OiBjbG91ZGZyb250Lk9yaWdpbkFjY2Vzc0lkZW50aXR5O1xyXG4gIHB1YmxpYyByZWFkb25seSBjZXJ0aWZpY2F0ZT86IGFjbS5DZXJ0aWZpY2F0ZTtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IENsb3VkRnJvbnRDb25zdHJ1Y3RQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgUzMgYnVja2V0IGZvciBzdGF0aWMgYXNzZXRzXHJcbiAgICB0aGlzLnMzQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnU3RhdGljQXNzZXRzQnVja2V0Jywge1xyXG4gICAgICBidWNrZXROYW1lOiBgcmVjcnVpdG1lbnQtc3RhdGljLWFzc2V0cy0ke3Byb3BzLmVudmlyb25tZW50fS0ke2Nkay5Bd3MuQUNDT1VOVF9JRH1gLFxyXG4gICAgICB2ZXJzaW9uZWQ6IHRydWUsXHJcbiAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IGZhbHNlLFxyXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxyXG4gICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXHJcbiAgICAgIGNvcnM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBhbGxvd2VkTWV0aG9kczogW3MzLkh0dHBNZXRob2RzLkdFVCwgczMuSHR0cE1ldGhvZHMuSEVBRF0sXHJcbiAgICAgICAgICBhbGxvd2VkT3JpZ2luczogWycqJ10sXHJcbiAgICAgICAgICBhbGxvd2VkSGVhZGVyczogWycqJ10sXHJcbiAgICAgICAgICBleHBvc2VkSGVhZGVyczogWydFVGFnJ10sXHJcbiAgICAgICAgICBtYXhBZ2U6IDMwMDAsXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgICAgbGlmZWN5Y2xlUnVsZXM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogJ0RlbGV0ZU9sZFZlcnNpb25zJyxcclxuICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICBub25jdXJyZW50VmVyc2lvbkV4cGlyYXRpb246IGNkay5EdXJhdGlvbi5kYXlzKDMwKSxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBPcmlnaW4gQWNjZXNzIElkZW50aXR5XHJcbiAgICB0aGlzLm9yaWdpbkFjY2Vzc0lkZW50aXR5ID0gbmV3IGNsb3VkZnJvbnQuT3JpZ2luQWNjZXNzSWRlbnRpdHkodGhpcywgJ09BSScsIHtcclxuICAgICAgY29tbWVudDogYE9BSSBmb3IgcmVjcnVpdG1lbnQgd2Vic2l0ZSAke3Byb3BzLmVudmlyb25tZW50fWAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBDbG91ZEZyb250IGFjY2VzcyB0byBTMyBidWNrZXRcclxuICAgIHRoaXMuczNCdWNrZXQuZ3JhbnRSZWFkKHRoaXMub3JpZ2luQWNjZXNzSWRlbnRpdHkpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBTU0wgY2VydGlmaWNhdGUgZm9yIENsb3VkRnJvbnQgaWYgZG9tYWluIGlzIHByb3ZpZGVkXHJcbiAgICBpZiAocHJvcHMuZG9tYWluTmFtZSAmJiAhcHJvcHMuY2VydGlmaWNhdGVBcm4pIHtcclxuICAgICAgdGhpcy5jZXJ0aWZpY2F0ZSA9IG5ldyBhY20uQ2VydGlmaWNhdGUodGhpcywgJ0Nsb3VkRnJvbnRDZXJ0aWZpY2F0ZScsIHtcclxuICAgICAgICBkb21haW5OYW1lOiBwcm9wcy5kb21haW5OYW1lLFxyXG4gICAgICAgIHN1YmplY3RBbHRlcm5hdGl2ZU5hbWVzOiBbYCouJHtwcm9wcy5kb21haW5OYW1lfWBdLFxyXG4gICAgICAgIHZhbGlkYXRpb246IGFjbS5DZXJ0aWZpY2F0ZVZhbGlkYXRpb24uZnJvbURucygpLFxyXG4gICAgICAgIHJlZ2lvbjogJ3VzLWVhc3QtMScsIC8vIENsb3VkRnJvbnQgcmVxdWlyZXMgY2VydGlmaWNhdGVzIGluIHVzLWVhc3QtMVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDcmVhdGUgY2FjaGUgcG9saWNpZXNcclxuICAgIGNvbnN0IHN0YXRpY0Fzc2V0c0NhY2hlUG9saWN5ID0gbmV3IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kodGhpcywgJ1N0YXRpY0Fzc2V0c0NhY2hlUG9saWN5Jywge1xyXG4gICAgICBjYWNoZVBvbGljeU5hbWU6IGByZWNydWl0bWVudC1zdGF0aWMtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxyXG4gICAgICBkZWZhdWx0VHRsOiBjZGsuRHVyYXRpb24uZGF5cygzMCksXHJcbiAgICAgIG1heFR0bDogY2RrLkR1cmF0aW9uLmRheXMoMzY1KSxcclxuICAgICAgbWluVHRsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygwKSxcclxuICAgICAgaGVhZGVyQmVoYXZpb3I6IGNsb3VkZnJvbnQuQ2FjaGVIZWFkZXJCZWhhdmlvci5hbGxvd0xpc3QoXHJcbiAgICAgICAgJ0Nsb3VkRnJvbnQtVmlld2VyLUNvdW50cnknLFxyXG4gICAgICAgICdDbG91ZEZyb250LUlzLU1vYmlsZS1WaWV3ZXInLFxyXG4gICAgICAgICdDbG91ZEZyb250LUlzLVRhYmxldC1WaWV3ZXInLFxyXG4gICAgICAgICdDbG91ZEZyb250LUlzLURlc2t0b3AtVmlld2VyJ1xyXG4gICAgICApLFxyXG4gICAgICBxdWVyeVN0cmluZ0JlaGF2aW9yOiBjbG91ZGZyb250LkNhY2hlUXVlcnlTdHJpbmdCZWhhdmlvci5kZW55TGlzdCgndXRtX3NvdXJjZScsICd1dG1fbWVkaXVtJywgJ3V0bV9jYW1wYWlnbicpLFxyXG4gICAgICBjb29raWVCZWhhdmlvcjogY2xvdWRmcm9udC5DYWNoZUNvb2tpZUJlaGF2aW9yLm5vbmUoKSxcclxuICAgICAgZW5hYmxlQWNjZXB0RW5jb2RpbmdCcm90bGk6IHRydWUsXHJcbiAgICAgIGVuYWJsZUFjY2VwdEVuY29kaW5nR3ppcDogdHJ1ZSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGFwaUNhY2hlUG9saWN5ID0gbmV3IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kodGhpcywgJ0FwaUNhY2hlUG9saWN5Jywge1xyXG4gICAgICBjYWNoZVBvbGljeU5hbWU6IGByZWNydWl0bWVudC1hcGktJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxyXG4gICAgICBkZWZhdWx0VHRsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygwKSxcclxuICAgICAgbWF4VHRsOiBjZGsuRHVyYXRpb24uZGF5cygxKSxcclxuICAgICAgbWluVHRsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygwKSxcclxuICAgICAgaGVhZGVyQmVoYXZpb3I6IGNsb3VkZnJvbnQuQ2FjaGVIZWFkZXJCZWhhdmlvci5hbGxvd0xpc3QoXHJcbiAgICAgICAgJ0F1dGhvcml6YXRpb24nLFxyXG4gICAgICAgICdDb250ZW50LVR5cGUnLFxyXG4gICAgICAgICdBY2NlcHQnLFxyXG4gICAgICAgICdVc2VyLUFnZW50JyxcclxuICAgICAgICAnUmVmZXJlcicsXHJcbiAgICAgICAgJ0Nsb3VkRnJvbnQtVmlld2VyLUNvdW50cnknXHJcbiAgICAgICksXHJcbiAgICAgIHF1ZXJ5U3RyaW5nQmVoYXZpb3I6IGNsb3VkZnJvbnQuQ2FjaGVRdWVyeVN0cmluZ0JlaGF2aW9yLmFsbCgpLFxyXG4gICAgICBjb29raWVCZWhhdmlvcjogY2xvdWRmcm9udC5DYWNoZUNvb2tpZUJlaGF2aW9yLmFsbCgpLFxyXG4gICAgICBlbmFibGVBY2NlcHRFbmNvZGluZ0Jyb3RsaTogdHJ1ZSxcclxuICAgICAgZW5hYmxlQWNjZXB0RW5jb2RpbmdHemlwOiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIG9yaWdpbiByZXF1ZXN0IHBvbGljeVxyXG4gICAgY29uc3Qgb3JpZ2luUmVxdWVzdFBvbGljeSA9IG5ldyBjbG91ZGZyb250Lk9yaWdpblJlcXVlc3RQb2xpY3kodGhpcywgJ09yaWdpblJlcXVlc3RQb2xpY3knLCB7XHJcbiAgICAgIG9yaWdpblJlcXVlc3RQb2xpY3lOYW1lOiBgcmVjcnVpdG1lbnQtb3JpZ2luLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcclxuICAgICAgaGVhZGVyQmVoYXZpb3I6IGNsb3VkZnJvbnQuT3JpZ2luUmVxdWVzdEhlYWRlckJlaGF2aW9yLmFsbG93TGlzdChcclxuICAgICAgICAnQXV0aG9yaXphdGlvbicsXHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZScsXHJcbiAgICAgICAgJ0FjY2VwdCcsXHJcbiAgICAgICAgJ1VzZXItQWdlbnQnLFxyXG4gICAgICAgICdSZWZlcmVyJyxcclxuICAgICAgICAnWC1Gb3J3YXJkZWQtRm9yJyxcclxuICAgICAgICAnWC1Gb3J3YXJkZWQtUHJvdG8nLFxyXG4gICAgICAgICdYLUZvcndhcmRlZC1Qb3J0J1xyXG4gICAgICApLFxyXG4gICAgICBxdWVyeVN0cmluZ0JlaGF2aW9yOiBjbG91ZGZyb250Lk9yaWdpblJlcXVlc3RRdWVyeVN0cmluZ0JlaGF2aW9yLmFsbCgpLFxyXG4gICAgICBjb29raWVCZWhhdmlvcjogY2xvdWRmcm9udC5PcmlnaW5SZXF1ZXN0Q29va2llQmVoYXZpb3IuYWxsKCksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgcmVzcG9uc2UgaGVhZGVycyBwb2xpY3lcclxuICAgIGNvbnN0IHJlc3BvbnNlSGVhZGVyc1BvbGljeSA9IG5ldyBjbG91ZGZyb250LlJlc3BvbnNlSGVhZGVyc1BvbGljeSh0aGlzLCAnUmVzcG9uc2VIZWFkZXJzUG9saWN5Jywge1xyXG4gICAgICByZXNwb25zZUhlYWRlcnNQb2xpY3lOYW1lOiBgcmVjcnVpdG1lbnQtc2VjdXJpdHktJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxyXG4gICAgICBzZWN1cml0eUhlYWRlcnNCZWhhdmlvcjoge1xyXG4gICAgICAgIGNvbnRlbnRUeXBlT3B0aW9uczogeyBvdmVycmlkZTogdHJ1ZSB9LFxyXG4gICAgICAgIGZyYW1lT3B0aW9uczogeyBmcmFtZU9wdGlvbjogY2xvdWRmcm9udC5IZWFkZXJzRnJhbWVPcHRpb24uREVOWSwgb3ZlcnJpZGU6IHRydWUgfSxcclxuICAgICAgICByZWZlcnJlclBvbGljeTogeyByZWZlcnJlclBvbGljeTogY2xvdWRmcm9udC5IZWFkZXJzUmVmZXJyZXJQb2xpY3kuU1RSSUNUX09SSUdJTl9XSEVOX0NST1NTX09SSUdJTiwgb3ZlcnJpZGU6IHRydWUgfSxcclxuICAgICAgICBzdHJpY3RUcmFuc3BvcnRTZWN1cml0eToge1xyXG4gICAgICAgICAgYWNjZXNzQ29udHJvbE1heEFnZTogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzE1MzYwMDApLFxyXG4gICAgICAgICAgaW5jbHVkZVN1YmRvbWFpbnM6IHRydWUsXHJcbiAgICAgICAgICBwcmVsb2FkOiB0cnVlLFxyXG4gICAgICAgICAgb3ZlcnJpZGU6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgICAgY3VzdG9tSGVhZGVyc0JlaGF2aW9yOiB7XHJcbiAgICAgICAgJ1gtQ29udGVudC1UeXBlLU9wdGlvbnMnOiAnbm9zbmlmZicsXHJcbiAgICAgICAgJ1gtRnJhbWUtT3B0aW9ucyc6ICdERU5ZJyxcclxuICAgICAgICAnWC1YU1MtUHJvdGVjdGlvbic6ICcxOyBtb2RlPWJsb2NrJyxcclxuICAgICAgICAnUGVybWlzc2lvbnMtUG9saWN5JzogJ2dlb2xvY2F0aW9uPSgpLCBtaWNyb3Bob25lPSgpLCBjYW1lcmE9KCknLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIENsb3VkRnJvbnQgZGlzdHJpYnV0aW9uXHJcbiAgICB0aGlzLmRpc3RyaWJ1dGlvbiA9IG5ldyBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbih0aGlzLCAnRGlzdHJpYnV0aW9uJywge1xyXG4gICAgICBjb21tZW50OiBgUmVjcnVpdG1lbnQgV2Vic2l0ZSBEaXN0cmlidXRpb24gLSAke3Byb3BzLmVudmlyb25tZW50fWAsXHJcbiAgICAgIGRvbWFpbk5hbWVzOiBwcm9wcy5kb21haW5OYW1lID8gW3Byb3BzLmRvbWFpbk5hbWUsIGB3d3cuJHtwcm9wcy5kb21haW5OYW1lfWBdIDogdW5kZWZpbmVkLFxyXG4gICAgICBjZXJ0aWZpY2F0ZTogcHJvcHMuY2VydGlmaWNhdGVBcm4gXHJcbiAgICAgICAgPyBhY20uQ2VydGlmaWNhdGUuZnJvbUNlcnRpZmljYXRlQXJuKHRoaXMsICdJbXBvcnRlZENlcnRpZmljYXRlJywgcHJvcHMuY2VydGlmaWNhdGVBcm4pXHJcbiAgICAgICAgOiB0aGlzLmNlcnRpZmljYXRlLFxyXG4gICAgICBtaW5pbXVtUHJvdG9jb2xWZXJzaW9uOiBjbG91ZGZyb250LlNlY3VyaXR5UG9saWN5UHJvdG9jb2wuVExTX1YxXzJfMjAyMSxcclxuICAgICAgc3NsU3VwcG9ydE1ldGhvZDogY2xvdWRmcm9udC5TU0xNZXRob2QuU05JLFxyXG4gICAgICBodHRwVmVyc2lvbjogY2xvdWRmcm9udC5IdHRwVmVyc2lvbi5IVFRQMixcclxuICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgZW5hYmxlSXB2NjogdHJ1ZSxcclxuICAgICAgcHJpY2VDbGFzczogY2xvdWRmcm9udC5QcmljZUNsYXNzLlBSSUNFX0NMQVNTXzEwMCxcclxuICAgICAgZ2VvUmVzdHJpY3Rpb246IGNsb3VkZnJvbnQuR2VvUmVzdHJpY3Rpb24uZGVueWxpc3QoJ0NOJywgJ1JVJyksIC8vIEJsb2NrIGNlcnRhaW4gY291bnRyaWVzXHJcbiAgICAgIHdlYkFjbElkOiBwcm9wcy53ZWJBY2w/LmF0dHJBcm4sXHJcbiAgICAgIFxyXG4gICAgICAvLyBEZWZhdWx0IGJlaGF2aW9yIGZvciBBUEkgZW5kcG9pbnRzXHJcbiAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xyXG4gICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuSHR0cE9yaWdpbihwcm9wcy5hbGJEb21haW5OYW1lLCB7XHJcbiAgICAgICAgICBwcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5PcmlnaW5Qcm90b2NvbFBvbGljeS5IVFRQU19PTkxZLFxyXG4gICAgICAgICAgaHR0cHNQb3J0OiA0NDMsXHJcbiAgICAgICAgICBvcmlnaW5Tc2xQcm90b2NvbHM6IFtjbG91ZGZyb250Lk9yaWdpblNzbFBvbGljeS5UTFNfVjFfMl0sXHJcbiAgICAgICAgICByZWFkVGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICAgICAga2VlcEFsaXZlVGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNSksXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXHJcbiAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfQUxMLFxyXG4gICAgICAgIGNhY2hlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQ2FjaGVkTWV0aG9kcy5DQUNIRV9HRVRfSEVBRF9PUFRJT05TLFxyXG4gICAgICAgIGNhY2hlUG9saWN5OiBhcGlDYWNoZVBvbGljeSxcclxuICAgICAgICBvcmlnaW5SZXF1ZXN0UG9saWN5OiBvcmlnaW5SZXF1ZXN0UG9saWN5LFxyXG4gICAgICAgIHJlc3BvbnNlSGVhZGVyc1BvbGljeTogcmVzcG9uc2VIZWFkZXJzUG9saWN5LFxyXG4gICAgICAgIGNvbXByZXNzOiB0cnVlLFxyXG4gICAgICAgIHNtb290aFN0cmVhbWluZzogZmFsc2UsXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBBZGRpdGlvbmFsIGJlaGF2aW9yc1xyXG4gICAgICBhZGRpdGlvbmFsQmVoYXZpb3JzOiB7XHJcbiAgICAgICAgLy8gU3RhdGljIGFzc2V0cyBmcm9tIFMzXHJcbiAgICAgICAgJy9zdGF0aWMvKic6IHtcclxuICAgICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4odGhpcy5zM0J1Y2tldCwge1xyXG4gICAgICAgICAgICBvcmlnaW5BY2Nlc3NJZGVudGl0eTogdGhpcy5vcmlnaW5BY2Nlc3NJZGVudGl0eSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXHJcbiAgICAgICAgICBhbGxvd2VkTWV0aG9kczogY2xvdWRmcm9udC5BbGxvd2VkTWV0aG9kcy5BTExPV19HRVRfSEVBRF9PUFRJT05TLFxyXG4gICAgICAgICAgY2FjaGVkTWV0aG9kczogY2xvdWRmcm9udC5DYWNoZWRNZXRob2RzLkNBQ0hFX0dFVF9IRUFEX09QVElPTlMsXHJcbiAgICAgICAgICBjYWNoZVBvbGljeTogc3RhdGljQXNzZXRzQ2FjaGVQb2xpY3ksXHJcbiAgICAgICAgICByZXNwb25zZUhlYWRlcnNQb2xpY3k6IHJlc3BvbnNlSGVhZGVyc1BvbGljeSxcclxuICAgICAgICAgIGNvbXByZXNzOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQXNzZXRzIGZyb20gUzNcclxuICAgICAgICAnL2Fzc2V0cy8qJzoge1xyXG4gICAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbih0aGlzLnMzQnVja2V0LCB7XHJcbiAgICAgICAgICAgIG9yaWdpbkFjY2Vzc0lkZW50aXR5OiB0aGlzLm9yaWdpbkFjY2Vzc0lkZW50aXR5LFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcclxuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBjbG91ZGZyb250LkFsbG93ZWRNZXRob2RzLkFMTE9XX0dFVF9IRUFEX09QVElPTlMsXHJcbiAgICAgICAgICBjYWNoZWRNZXRob2RzOiBjbG91ZGZyb250LkNhY2hlZE1ldGhvZHMuQ0FDSEVfR0VUX0hFQURfT1BUSU9OUyxcclxuICAgICAgICAgIGNhY2hlUG9saWN5OiBzdGF0aWNBc3NldHNDYWNoZVBvbGljeSxcclxuICAgICAgICAgIHJlc3BvbnNlSGVhZGVyc1BvbGljeTogcmVzcG9uc2VIZWFkZXJzUG9saWN5LFxyXG4gICAgICAgICAgY29tcHJlc3M6IHRydWUsXHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLy8gQVBJIHJvdXRlcyB3aXRoIG5vIGNhY2hpbmdcclxuICAgICAgICAnL2FwaS8qJzoge1xyXG4gICAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5IdHRwT3JpZ2luKHByb3BzLmFsYkRvbWFpbk5hbWUsIHtcclxuICAgICAgICAgICAgcHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuT3JpZ2luUHJvdG9jb2xQb2xpY3kuSFRUUFNfT05MWSxcclxuICAgICAgICAgICAgaHR0cHNQb3J0OiA0NDMsXHJcbiAgICAgICAgICAgIG9yaWdpblNzbFByb3RvY29sczogW2Nsb3VkZnJvbnQuT3JpZ2luU3NsUG9saWN5LlRMU19WMV8yXSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXHJcbiAgICAgICAgICBhbGxvd2VkTWV0aG9kczogY2xvdWRmcm9udC5BbGxvd2VkTWV0aG9kcy5BTExPV19BTEwsXHJcbiAgICAgICAgICBjYWNoZWRNZXRob2RzOiBjbG91ZGZyb250LkNhY2hlZE1ldGhvZHMuQ0FDSEVfR0VUX0hFQURfT1BUSU9OUyxcclxuICAgICAgICAgIGNhY2hlUG9saWN5OiBjbG91ZGZyb250LkNhY2hlUG9saWN5LkNBQ0hJTkdfRElTQUJMRUQsXHJcbiAgICAgICAgICBvcmlnaW5SZXF1ZXN0UG9saWN5OiBvcmlnaW5SZXF1ZXN0UG9saWN5LFxyXG4gICAgICAgICAgcmVzcG9uc2VIZWFkZXJzUG9saWN5OiByZXNwb25zZUhlYWRlcnNQb2xpY3ksXHJcbiAgICAgICAgICBjb21wcmVzczogdHJ1ZSxcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvLyBIZWFsdGggY2hlY2tcclxuICAgICAgICAnL2hlYWx0aCc6IHtcclxuICAgICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuSHR0cE9yaWdpbihwcm9wcy5hbGJEb21haW5OYW1lLCB7XHJcbiAgICAgICAgICAgIHByb3RvY29sUG9saWN5OiBjbG91ZGZyb250Lk9yaWdpblByb3RvY29sUG9saWN5LkhUVFBTX09OTFksXHJcbiAgICAgICAgICAgIGh0dHBzUG9ydDogNDQzLFxyXG4gICAgICAgICAgICBvcmlnaW5Tc2xQcm90b2NvbHM6IFtjbG91ZGZyb250Lk9yaWdpblNzbFBvbGljeS5UTFNfVjFfMl0sXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxyXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfR0VUX0hFQUQsXHJcbiAgICAgICAgICBjYWNoZWRNZXRob2RzOiBjbG91ZGZyb250LkNhY2hlZE1ldGhvZHMuQ0FDSEVfR0VUX0hFQUQsXHJcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX0RJU0FCTEVELFxyXG4gICAgICAgICAgb3JpZ2luUmVxdWVzdFBvbGljeTogb3JpZ2luUmVxdWVzdFBvbGljeSxcclxuICAgICAgICAgIHJlc3BvbnNlSGVhZGVyc1BvbGljeTogcmVzcG9uc2VIZWFkZXJzUG9saWN5LFxyXG4gICAgICAgICAgY29tcHJlc3M6IGZhbHNlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBFcnJvciByZXNwb25zZXNcclxuICAgICAgZXJyb3JSZXNwb25zZXM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBodHRwU3RhdHVzOiA0MDQsXHJcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDQwNCxcclxuICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvNDA0Lmh0bWwnLFxyXG4gICAgICAgICAgdHRsOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGh0dHBTdGF0dXM6IDUwMCxcclxuICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogNTAwLFxyXG4gICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy81MDAuaHRtbCcsXHJcbiAgICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5taW51dGVzKDEpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaHR0cFN0YXR1czogNTAyLFxyXG4gICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiA1MDIsXHJcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnLzUwMi5odG1sJyxcclxuICAgICAgICAgIHR0bDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMSksXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBodHRwU3RhdHVzOiA1MDMsXHJcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDUwMyxcclxuICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvNTAzLmh0bWwnLFxyXG4gICAgICAgICAgdHRsOiBjZGsuRHVyYXRpb24ubWludXRlcygxKSxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG5cclxuICAgICAgLy8gTG9nZ2luZ1xyXG4gICAgICBlbmFibGVMb2dnaW5nOiB0cnVlLFxyXG4gICAgICBsb2dCdWNrZXQ6IHRoaXMuY3JlYXRlTG9nQnVja2V0KCksXHJcbiAgICAgIGxvZ0ZpbGVQcmVmaXg6ICdjbG91ZGZyb250LWxvZ3MvJyxcclxuICAgICAgbG9nSW5jbHVkZXNDb29raWVzOiBmYWxzZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBETlMgcmVjb3JkcyBpZiBkb21haW4gaXMgcHJvdmlkZWRcclxuICAgIGlmIChwcm9wcy5kb21haW5OYW1lKSB7XHJcbiAgICAgIHRoaXMuY3JlYXRlRG5zUmVjb3Jkcyhwcm9wcy5kb21haW5OYW1lKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDcmVhdGUgQ2xvdWRXYXRjaCBhbGFybXNcclxuICAgIHRoaXMuY3JlYXRlQ2xvdWRXYXRjaEFsYXJtcyhwcm9wcy5hbGVydHNUb3BpYyk7XHJcblxyXG4gICAgLy8gQWRkIHRhZ3NcclxuICAgIGNkay5UYWdzLm9mKHRoaXMuZGlzdHJpYnV0aW9uKS5hZGQoJ0NvbXBvbmVudCcsICdDbG91ZEZyb250Jyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLnMzQnVja2V0KS5hZGQoJ0NvbXBvbmVudCcsICdTdGF0aWNBc3NldHMnKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlTG9nQnVja2V0KCk6IHMzLkJ1Y2tldCB7XHJcbiAgICByZXR1cm4gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnQ2xvdWRGcm9udExvZ3NCdWNrZXQnLCB7XHJcbiAgICAgIGJ1Y2tldE5hbWU6IGByZWNydWl0bWVudC1jbG91ZGZyb250LWxvZ3MtJHt0aGlzLm5vZGUudHJ5R2V0Q29udGV4dCgnZW52aXJvbm1lbnQnKX0tJHtjZGsuQXdzLkFDQ09VTlRfSUR9YCxcclxuICAgICAgdmVyc2lvbmVkOiBmYWxzZSxcclxuICAgICAgcHVibGljUmVhZEFjY2VzczogZmFsc2UsXHJcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcclxuICAgICAgbGlmZWN5Y2xlUnVsZXM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogJ0RlbGV0ZU9sZExvZ3MnLFxyXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgIGV4cGlyYXRpb246IGNkay5EdXJhdGlvbi5kYXlzKDkwKSxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjcmVhdGVEbnNSZWNvcmRzKGRvbWFpbk5hbWU6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgY29uc3QgaG9zdGVkWm9uZSA9IHJvdXRlNTMuSG9zdGVkWm9uZS5mcm9tTG9va3VwKHRoaXMsICdIb3N0ZWRab25lJywge1xyXG4gICAgICBkb21haW5OYW1lOiBkb21haW5OYW1lLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIEEgcmVjb3JkIGZvciB0aGUgZG9tYWluXHJcbiAgICBuZXcgcm91dGU1My5BUmVjb3JkKHRoaXMsICdBUmVjb3JkJywge1xyXG4gICAgICB6b25lOiBob3N0ZWRab25lLFxyXG4gICAgICByZWNvcmROYW1lOiBkb21haW5OYW1lLFxyXG4gICAgICB0YXJnZXQ6IHJvdXRlNTMuUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhcclxuICAgICAgICBuZXcgdGFyZ2V0cy5DbG91ZEZyb250VGFyZ2V0KHRoaXMuZGlzdHJpYnV0aW9uKVxyXG4gICAgICApLFxyXG4gICAgICB0dGw6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIEFBQUEgcmVjb3JkIGZvciBJUHY2XHJcbiAgICBuZXcgcm91dGU1My5BYWFhUmVjb3JkKHRoaXMsICdBYWFhUmVjb3JkJywge1xyXG4gICAgICB6b25lOiBob3N0ZWRab25lLFxyXG4gICAgICByZWNvcmROYW1lOiBkb21haW5OYW1lLFxyXG4gICAgICB0YXJnZXQ6IHJvdXRlNTMuUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhcclxuICAgICAgICBuZXcgdGFyZ2V0cy5DbG91ZEZyb250VGFyZ2V0KHRoaXMuZGlzdHJpYnV0aW9uKVxyXG4gICAgICApLFxyXG4gICAgICB0dGw6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIEEgcmVjb3JkIGZvciB3d3cgc3ViZG9tYWluXHJcbiAgICBuZXcgcm91dGU1My5BUmVjb3JkKHRoaXMsICdXd3dBUmVjb3JkJywge1xyXG4gICAgICB6b25lOiBob3N0ZWRab25lLFxyXG4gICAgICByZWNvcmROYW1lOiBgd3d3LiR7ZG9tYWluTmFtZX1gLFxyXG4gICAgICB0YXJnZXQ6IHJvdXRlNTMuUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhcclxuICAgICAgICBuZXcgdGFyZ2V0cy5DbG91ZEZyb250VGFyZ2V0KHRoaXMuZGlzdHJpYnV0aW9uKVxyXG4gICAgICApLFxyXG4gICAgICB0dGw6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNyZWF0ZUNsb3VkV2F0Y2hBbGFybXMoYWxlcnRzVG9waWM/OiBzbnMuVG9waWMpOiB2b2lkIHtcclxuICAgIGlmICghYWxlcnRzVG9waWMpIHJldHVybjtcclxuXHJcbiAgICAvLyBPcmlnaW4gbGF0ZW5jeSBhbGFybVxyXG4gICAgY29uc3Qgb3JpZ2luTGF0ZW5jeUFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ09yaWdpbkxhdGVuY3lBbGFybScsIHtcclxuICAgICAgbWV0cmljOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgIG5hbWVzcGFjZTogJ0FXUy9DbG91ZEZyb250JyxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnT3JpZ2luTGF0ZW5jeScsXHJcbiAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgRGlzdHJpYnV0aW9uSWQ6IHRoaXMuZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXHJcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgfSksXHJcbiAgICAgIHRocmVzaG9sZDogNTAwMCwgLy8gNSBzZWNvbmRzXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQ2xvdWRGcm9udCBvcmlnaW4gbGF0ZW5jeSBpcyB0b28gaGlnaCcsXHJcbiAgICB9KTtcclxuICAgIG9yaWdpbkxhdGVuY3lBbGFybS5hZGRBbGFybUFjdGlvbihuZXcgY2xvdWR3YXRjaC5TbnNBY3Rpb24oYWxlcnRzVG9waWMpKTtcclxuXHJcbiAgICAvLyBDYWNoZSBoaXQgcmF0ZSBhbGFybVxyXG4gICAgY29uc3QgY2FjaGVIaXRSYXRlQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnQ2FjaGVIaXRSYXRlQWxhcm0nLCB7XHJcbiAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQ2xvdWRGcm9udCcsXHJcbiAgICAgICAgbWV0cmljTmFtZTogJ0NhY2hlSGl0UmF0ZScsXHJcbiAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgRGlzdHJpYnV0aW9uSWQ6IHRoaXMuZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXHJcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgfSksXHJcbiAgICAgIHRocmVzaG9sZDogNjAsIC8vIDYwJVxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMyxcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5MRVNTX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQ2xvdWRGcm9udCBjYWNoZSBoaXQgcmF0ZSBpcyB0b28gbG93JyxcclxuICAgIH0pO1xyXG4gICAgY2FjaGVIaXRSYXRlQWxhcm0uYWRkQWxhcm1BY3Rpb24obmV3IGNsb3Vkd2F0Y2guU25zQWN0aW9uKGFsZXJ0c1RvcGljKSk7XHJcblxyXG4gICAgLy8gNHh4IGVycm9yIHJhdGUgYWxhcm1cclxuICAgIGNvbnN0IGVycm9yNHh4QWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnRXJyb3I0eHhBbGFybScsIHtcclxuICAgICAgbWV0cmljOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgIG5hbWVzcGFjZTogJ0FXUy9DbG91ZEZyb250JyxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnNHh4RXJyb3JSYXRlJyxcclxuICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICBEaXN0cmlidXRpb25JZDogdGhpcy5kaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uSWQsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcclxuICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICB9KSxcclxuICAgICAgdGhyZXNob2xkOiAxMCwgLy8gMTAlXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQ2xvdWRGcm9udCA0eHggZXJyb3IgcmF0ZSBpcyB0b28gaGlnaCcsXHJcbiAgICB9KTtcclxuICAgIGVycm9yNHh4QWxhcm0uYWRkQWxhcm1BY3Rpb24obmV3IGNsb3Vkd2F0Y2guU25zQWN0aW9uKGFsZXJ0c1RvcGljKSk7XHJcblxyXG4gICAgLy8gNXh4IGVycm9yIHJhdGUgYWxhcm1cclxuICAgIGNvbnN0IGVycm9yNXh4QWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnRXJyb3I1eHhBbGFybScsIHtcclxuICAgICAgbWV0cmljOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgIG5hbWVzcGFjZTogJ0FXUy9DbG91ZEZyb250JyxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnNXh4RXJyb3JSYXRlJyxcclxuICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICBEaXN0cmlidXRpb25JZDogdGhpcy5kaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uSWQsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcclxuICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICB9KSxcclxuICAgICAgdGhyZXNob2xkOiA1LCAvLyA1JVxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgNXh4IGVycm9yIHJhdGUgaXMgdG9vIGhpZ2gnLFxyXG4gICAgfSk7XHJcbiAgICBlcnJvcjV4eEFsYXJtLmFkZEFsYXJtQWN0aW9uKG5ldyBjbG91ZHdhdGNoLlNuc0FjdGlvbihhbGVydHNUb3BpYykpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IHRoZSBDbG91ZEZyb250IGRpc3RyaWJ1dGlvbiBkb21haW4gbmFtZVxyXG4gICAqL1xyXG4gIHB1YmxpYyBnZXREb21haW5OYW1lKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdGhpcy5kaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCB0aGUgQ2xvdWRGcm9udCBkaXN0cmlidXRpb24gSURcclxuICAgKi9cclxuICBwdWJsaWMgZ2V0RGlzdHJpYnV0aW9uSWQoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiB0aGlzLmRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25JZDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCB0aGUgUzMgYnVja2V0IGZvciBzdGF0aWMgYXNzZXRzXHJcbiAgICovXHJcbiAgcHVibGljIGdldFN0YXRpY0Fzc2V0c0J1Y2tldCgpOiBzMy5CdWNrZXQge1xyXG4gICAgcmV0dXJuIHRoaXMuczNCdWNrZXQ7XHJcbiAgfVxyXG59Il19