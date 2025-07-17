"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productionConfig = exports.stagingConfig = exports.developmentConfig = void 0;
exports.getEnvironmentConfig = getEnvironmentConfig;
exports.validateEnvironmentConfig = validateEnvironmentConfig;
const baseConfig = {
    tags: {
        Project: 'RecruitmentWebsite',
        ManagedBy: 'CDK',
        Repository: 'https://github.com/your-org/RecruitmentWebsite',
        Owner: 'DevOps Team'
    }
};
const developmentConfig = {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-2'
    },
    environmentName: 'dev',
    network: {
        vpcCidr: '10.0.0.0/16',
        maxAzs: 2,
        enableNatGateway: true,
        natGateways: 1, // Single NAT for cost optimization in dev
        enableVpnGateway: false,
        enableDnsHostnames: true,
        enableDnsSupport: true,
        publicSubnetNames: ['PublicSubnet'],
        privateSubnetNames: ['PrivateSubnet'],
        isolatedSubnetNames: ['DatabaseSubnet']
    },
    database: {
        instanceClass: 'db.t3.micro',
        engine: 'postgres',
        engineVersion: '15.4',
        allocatedStorage: 20,
        maxAllocatedStorage: 100,
        backupRetention: 7,
        deleteAutomatedBackups: true,
        deletionProtection: false,
        multiAz: false,
        performanceInsights: false,
        enableLogging: true,
        monitoringInterval: 0
    },
    redis: {
        nodeType: 'cache.t3.micro',
        numCacheNodes: 1,
        engineVersion: '7.0',
        parameterGroupName: 'default.redis7',
        enableBackup: false,
        backupRetentionLimit: 1,
        preferredBackupWindow: '03:00-05:00',
        preferredMaintenanceWindow: 'sun:05:00-sun:06:00',
        enableTransitEncryption: false,
        enableAtRestEncryption: false
    },
    ecs: {
        taskCpu: 256,
        taskMemory: 512,
        desiredCapacity: 1,
        maxCapacity: 3,
        minCapacity: 1,
        targetCpuUtilization: 70,
        targetMemoryUtilization: 80,
        healthCheckGracePeriod: 300,
        healthCheckPath: '/health',
        healthCheckInterval: 30,
        healthCheckTimeout: 5,
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
        enableXRayTracing: false,
        enableExecuteCommand: true,
        logRetentionDays: 14
    },
    amplify: {
        framework: 'Next.js - SSR',
        nodeVersion: '18',
        buildCommand: 'npm run build',
        outputDirectory: '.next',
        enableBranchAutoDeletion: true,
        enablePerformanceMode: false,
        basicAuthUsername: 'dev',
        basicAuthPassword: 'dev-password-123'
    },
    security: {
        enableWaf: false,
        enableDdosProtection: false,
        enableSecurityGroups: true,
        enableVpcFlowLogs: false,
        enableCloudTrail: false,
        enableGuardDuty: false,
        enableSecurityHub: false,
        enableConfig: false,
        enableSecretManager: true,
        enableKms: false,
        kmsKeyRotation: false,
        enableBackupVault: false,
        backupRetentionDays: 7
    },
    monitoring: {
        enableXRay: false,
        enableCloudWatchInsights: false,
        enableContainerInsights: false,
        enableApplicationInsights: false,
        enableEnhancedMonitoring: false,
        enablePerformanceInsights: false,
        logRetentionDays: 14,
        enableAlerts: false,
        alertEmail: 'dev-team@example.com',
        enableDashboard: false,
        enableSynthetics: false
    },
    costOptimization: {
        enableSpotInstances: false,
        enableAutoScaling: true,
        enableScheduledScaling: false,
        enableRightSizing: false,
        enableStorageOptimization: false,
        enableReservedInstances: false,
        enableSavingsPlans: false,
        enableBudgetAlerts: false,
        budgetLimit: 100,
        budgetAlertThreshold: 80
    },
    compliance: {
        enableEncryption: false,
        enableDataResidency: false,
        enableAuditLogging: false,
        enableComplianceChecks: false,
        enableDataClassification: false,
        enablePrivacyControls: false,
        enableRetentionPolicies: false,
        retentionPeriodDays: 30,
        enableDataMinimization: false,
        enableConsentManagement: false
    },
    features: {
        enableCdn: false,
        enableCaching: true,
        enableElasticsearch: false,
        enableEventBridge: false,
        enableStepFunctions: false,
        enableApiGateway: false,
        enableCognito: false,
        enableSes: false,
        enableS3: true,
        enableCloudFront: false,
        enableRoute53: false,
        enableCertificateManager: false,
        enableSecretsManager: true,
        enableParameterStore: true,
        enableEventSourcing: false,
        enableMessageQueuing: false,
        enableStreamProcessing: false,
        enableMachineLearning: false,
        enableAnalytics: false,
        enableDataLake: false
    },
    ...baseConfig
};
exports.developmentConfig = developmentConfig;
const stagingConfig = {
    ...developmentConfig,
    environmentName: 'staging',
    network: {
        ...developmentConfig.network,
        natGateways: 2 // Multiple NATs for higher availability
    },
    database: {
        ...developmentConfig.database,
        instanceClass: 'db.t3.small',
        allocatedStorage: 50,
        maxAllocatedStorage: 200,
        backupRetention: 14,
        multiAz: true,
        performanceInsights: true,
        monitoringInterval: 60
    },
    redis: {
        ...developmentConfig.redis,
        nodeType: 'cache.t3.small',
        numCacheNodes: 2,
        enableBackup: true,
        backupRetentionLimit: 5,
        enableTransitEncryption: true,
        enableAtRestEncryption: true
    },
    ecs: {
        ...developmentConfig.ecs,
        taskCpu: 512,
        taskMemory: 1024,
        desiredCapacity: 2,
        maxCapacity: 6,
        minCapacity: 2,
        enableXRayTracing: true,
        logRetentionDays: 30
    },
    amplify: {
        ...developmentConfig.amplify,
        enablePerformanceMode: true,
        basicAuthUsername: 'staging',
        basicAuthPassword: 'staging-password-456'
    },
    security: {
        ...developmentConfig.security,
        enableWaf: true,
        enableVpcFlowLogs: true,
        enableCloudTrail: true,
        enableKms: true,
        kmsKeyRotation: true,
        enableBackupVault: true,
        backupRetentionDays: 14
    },
    monitoring: {
        ...developmentConfig.monitoring,
        enableXRay: true,
        enableCloudWatchInsights: true,
        enableContainerInsights: true,
        enableEnhancedMonitoring: true,
        enablePerformanceInsights: true,
        logRetentionDays: 30,
        enableAlerts: true,
        alertEmail: 'staging-alerts@example.com',
        enableDashboard: true,
        enableSynthetics: true
    },
    costOptimization: {
        ...developmentConfig.costOptimization,
        enableBudgetAlerts: true,
        budgetLimit: 500,
        budgetAlertThreshold: 80
    },
    compliance: {
        ...developmentConfig.compliance,
        enableEncryption: true,
        enableAuditLogging: true,
        enableRetentionPolicies: true,
        retentionPeriodDays: 90
    },
    features: {
        ...developmentConfig.features,
        enableCdn: true,
        enableCloudFront: true,
        enableRoute53: true,
        enableCertificateManager: true,
        enableSes: true
    }
};
exports.stagingConfig = stagingConfig;
const productionConfig = {
    ...stagingConfig,
    environmentName: 'prod',
    network: {
        ...stagingConfig.network,
        maxAzs: 3,
        natGateways: 3 // NAT per AZ for maximum availability
    },
    database: {
        ...stagingConfig.database,
        instanceClass: 'db.r5.large',
        allocatedStorage: 100,
        maxAllocatedStorage: 1000,
        backupRetention: 30,
        deleteAutomatedBackups: false,
        deletionProtection: true,
        multiAz: true,
        performanceInsights: true,
        monitoringInterval: 60
    },
    redis: {
        ...stagingConfig.redis,
        nodeType: 'cache.r5.large',
        numCacheNodes: 3,
        enableBackup: true,
        backupRetentionLimit: 14,
        enableTransitEncryption: true,
        enableAtRestEncryption: true
    },
    ecs: {
        ...stagingConfig.ecs,
        taskCpu: 1024,
        taskMemory: 2048,
        desiredCapacity: 3,
        maxCapacity: 12,
        minCapacity: 3,
        targetCpuUtilization: 50,
        targetMemoryUtilization: 60,
        healthCheckGracePeriod: 600,
        logRetentionDays: 90
    },
    amplify: {
        ...stagingConfig.amplify,
        enablePerformanceMode: true,
        customDomain: 'recruitment.example.com',
        // Remove basic auth for production
        basicAuthUsername: undefined,
        basicAuthPassword: undefined
    },
    security: {
        ...stagingConfig.security,
        enableWaf: true,
        enableDdosProtection: true,
        enableVpcFlowLogs: true,
        enableCloudTrail: true,
        enableGuardDuty: true,
        enableSecurityHub: true,
        enableConfig: true,
        enableKms: true,
        kmsKeyRotation: true,
        enableBackupVault: true,
        backupRetentionDays: 30
    },
    monitoring: {
        ...stagingConfig.monitoring,
        enableXRay: true,
        enableCloudWatchInsights: true,
        enableContainerInsights: true,
        enableApplicationInsights: true,
        enableEnhancedMonitoring: true,
        enablePerformanceInsights: true,
        logRetentionDays: 90,
        enableAlerts: true,
        alertEmail: 'prod-alerts@example.com',
        enableDashboard: true,
        enableSynthetics: true
    },
    costOptimization: {
        ...stagingConfig.costOptimization,
        enableSpotInstances: false, // Disable spot instances for production
        enableAutoScaling: true,
        enableScheduledScaling: true,
        enableRightSizing: true,
        enableStorageOptimization: true,
        enableReservedInstances: true,
        enableSavingsPlans: true,
        enableBudgetAlerts: true,
        budgetLimit: 2000,
        budgetAlertThreshold: 80
    },
    compliance: {
        ...stagingConfig.compliance,
        enableEncryption: true,
        enableDataResidency: true,
        enableAuditLogging: true,
        enableComplianceChecks: true,
        enableDataClassification: true,
        enablePrivacyControls: true,
        enableRetentionPolicies: true,
        retentionPeriodDays: 365,
        enableDataMinimization: true,
        enableConsentManagement: true
    },
    features: {
        ...stagingConfig.features,
        enableCdn: true,
        enableElasticsearch: true,
        enableEventBridge: true,
        enableStepFunctions: true,
        enableApiGateway: true,
        enableCognito: true,
        enableSes: true,
        enableAnalytics: true
    }
};
exports.productionConfig = productionConfig;
function getEnvironmentConfig(environment) {
    switch (environment) {
        case 'dev':
            return developmentConfig;
        case 'staging':
            return stagingConfig;
        case 'prod':
            return productionConfig;
        default:
            throw new Error(`Unknown environment: ${environment}`);
    }
}
function validateEnvironmentConfig(config) {
    if (!config.env.account) {
        throw new Error('AWS account ID is required');
    }
    if (!config.env.region) {
        throw new Error('AWS region is required');
    }
    if (!config.network.vpcCidr) {
        throw new Error('VPC CIDR is required');
    }
    if (config.network.maxAzs < 2) {
        throw new Error('At least 2 availability zones are required');
    }
    if (config.database.allocatedStorage < 20) {
        throw new Error('Database allocated storage must be at least 20 GB');
    }
    if (config.ecs.desiredCapacity < 1) {
        throw new Error('ECS desired capacity must be at least 1');
    }
    if (config.ecs.minCapacity > config.ecs.maxCapacity) {
        throw new Error('ECS min capacity cannot be greater than max capacity');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQtY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZW52aXJvbm1lbnQtY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQTRXQSxvREFXQztBQUVELDhEQXNCQztBQTdZRCxNQUFNLFVBQVUsR0FBRztJQUNqQixJQUFJLEVBQUU7UUFDSixPQUFPLEVBQUUsb0JBQW9CO1FBQzdCLFNBQVMsRUFBRSxLQUFLO1FBQ2hCLFVBQVUsRUFBRSxnREFBZ0Q7UUFDNUQsS0FBSyxFQUFFLGFBQWE7S0FDckI7Q0FDRixDQUFDO0FBRUYsTUFBTSxpQkFBaUIsR0FBc0I7SUFDM0MsR0FBRyxFQUFFO1FBQ0gsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CO1FBQ3hDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixJQUFJLFdBQVc7S0FDdEQ7SUFDRCxlQUFlLEVBQUUsS0FBSztJQUN0QixPQUFPLEVBQUU7UUFDUCxPQUFPLEVBQUUsYUFBYTtRQUN0QixNQUFNLEVBQUUsQ0FBQztRQUNULGdCQUFnQixFQUFFLElBQUk7UUFDdEIsV0FBVyxFQUFFLENBQUMsRUFBRSwwQ0FBMEM7UUFDMUQsZ0JBQWdCLEVBQUUsS0FBSztRQUN2QixrQkFBa0IsRUFBRSxJQUFJO1FBQ3hCLGdCQUFnQixFQUFFLElBQUk7UUFDdEIsaUJBQWlCLEVBQUUsQ0FBQyxjQUFjLENBQUM7UUFDbkMsa0JBQWtCLEVBQUUsQ0FBQyxlQUFlLENBQUM7UUFDckMsbUJBQW1CLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztLQUN4QztJQUNELFFBQVEsRUFBRTtRQUNSLGFBQWEsRUFBRSxhQUFhO1FBQzVCLE1BQU0sRUFBRSxVQUFVO1FBQ2xCLGFBQWEsRUFBRSxNQUFNO1FBQ3JCLGdCQUFnQixFQUFFLEVBQUU7UUFDcEIsbUJBQW1CLEVBQUUsR0FBRztRQUN4QixlQUFlLEVBQUUsQ0FBQztRQUNsQixzQkFBc0IsRUFBRSxJQUFJ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c0JBQXNCLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBQ0QsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUM5QixNQUFNLElBQUksS0FBSyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUNELElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsR0FBRyxFQUFFLEVBQUUsQ0FBQztRQUMxQyxNQUFNLElBQUksS0FBSyxDQUFDLG1EQUFtRCxDQUFDLENBQUM7SUFDdkUsQ0FBQztJQUNELElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDbkMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFDRCxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDcEQsTUFBTSxJQUFJLEtBQUssQ0FBQyxzREFBc0QsQ0FBQyxDQUFDO0lBQzFFLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRW52aXJvbm1lbnRDb25maWcsIEVudmlyb25tZW50TmFtZSB9IGZyb20gJy4vdHlwZXMnO1xyXG5cclxuY29uc3QgYmFzZUNvbmZpZyA9IHtcclxuICB0YWdzOiB7XHJcbiAgICBQcm9qZWN0OiAnUmVjcnVpdG1lbnRXZWJzaXRlJyxcclxuICAgIE1hbmFnZWRCeTogJ0NESycsXHJcbiAgICBSZXBvc2l0b3J5OiAnaHR0cHM6Ly9naXRodWIuY29tL3lvdXItb3JnL1JlY3J1aXRtZW50V2Vic2l0ZScsXHJcbiAgICBPd25lcjogJ0Rldk9wcyBUZWFtJ1xyXG4gIH1cclxufTtcclxuXHJcbmNvbnN0IGRldmVsb3BtZW50Q29uZmlnOiBFbnZpcm9ubWVudENvbmZpZyA9IHtcclxuICBlbnY6IHtcclxuICAgIGFjY291bnQ6IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlQsXHJcbiAgICByZWdpb246IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX1JFR0lPTiB8fCAndXMtZWFzdC0yJ1xyXG4gIH0sXHJcbiAgZW52aXJvbm1lbnROYW1lOiAnZGV2JyxcclxuICBuZXR3b3JrOiB7XHJcbiAgICB2cGNDaWRyOiAnMTAuMC4wLjAvMTYnLFxyXG4gICAgbWF4QXpzOiAyLFxyXG4gICAgZW5hYmxlTmF0R2F0ZXdheTogdHJ1ZSxcclxuICAgIG5hdEdhdGV3YXlzOiAxLCAvLyBTaW5nbGUgTkFUIGZvciBjb3N0IG9wdGltaXphdGlvbiBpbiBkZXZcclxuICAgIGVuYWJsZVZwbkdhdGV3YXk6IGZhbHNlLFxyXG4gICAgZW5hYmxlRG5zSG9zdG5hbWVzOiB0cnVlLFxyXG4gICAgZW5hYmxlRG5zU3VwcG9ydDogdHJ1ZSxcclxuICAgIHB1YmxpY1N1Ym5ldE5hbWVzOiBbJ1B1YmxpY1N1Ym5ldCddLFxyXG4gICAgcHJpdmF0ZVN1Ym5ldE5hbWVzOiBbJ1ByaXZhdGVTdWJuZXQnXSxcclxuICAgIGlzb2xhdGVkU3VibmV0TmFtZXM6IFsnRGF0YWJhc2VTdWJuZXQnXVxyXG4gIH0sXHJcbiAgZGF0YWJhc2U6IHtcclxuICAgIGluc3RhbmNlQ2xhc3M6ICdkYi50My5taWNybycsXHJcbiAgICBlbmdpbmU6ICdwb3N0Z3JlcycsXHJcbiAgICBlbmdpbmVWZXJzaW9uOiAnMTUuNCcsXHJcbiAgICBhbGxvY2F0ZWRTdG9yYWdlOiAyMCxcclxuICAgIG1heEFsbG9jYXRlZFN0b3JhZ2U6IDEwMCxcclxuICAgIGJhY2t1cFJldGVudGlvbjogNyxcclxuICAgIGRlbGV0ZUF1dG9tYXRlZEJhY2t1cHM6IHRydWUsXHJcbiAgICBkZWxldGlvblByb3RlY3Rpb246IGZhbHNlLFxyXG4gICAgbXVsdGlBejogZmFsc2UsXHJcbiAgICBwZXJmb3JtYW5jZUluc2lnaHRzOiBmYWxzZSxcclxuICAgIGVuYWJsZUxvZ2dpbmc6IHRydWUsXHJcbiAgICBtb25pdG9yaW5nSW50ZXJ2YWw6IDBcclxuICB9LFxyXG4gIHJlZGlzOiB7XHJcbiAgICBub2RlVHlwZTogJ2NhY2hlLnQzLm1pY3JvJyxcclxuICAgIG51bUNhY2hlTm9kZXM6IDEsXHJcbiAgICBlbmdpbmVWZXJzaW9uOiAnNy4wJyxcclxuICAgIHBhcmFtZXRlckdyb3VwTmFtZTogJ2RlZmF1bHQucmVkaXM3JyxcclxuICAgIGVuYWJsZUJhY2t1cDogZmFsc2UsXHJcbiAgICBiYWNrdXBSZXRlbnRpb25MaW1pdDogMSxcclxuICAgIHByZWZlcnJlZEJhY2t1cFdpbmRvdzogJzAzOjAwLTA1OjAwJyxcclxuICAgIHByZWZlcnJlZE1haW50ZW5hbmNlV2luZG93OiAnc3VuOjA1OjAwLXN1bjowNjowMCcsXHJcbiAgICBlbmFibGVUcmFuc2l0RW5jcnlwdGlvbjogZmFsc2UsXHJcbiAgICBlbmFibGVBdFJlc3RFbmNyeXB0aW9uOiBmYWxzZVxyXG4gIH0sXHJcbiAgZWNzOiB7XHJcbiAgICB0YXNrQ3B1OiAyNTYsXHJcbiAgICB0YXNrTWVtb3J5OiA1MTIsXHJcbiAgICBkZXNpcmVkQ2FwYWNpdHk6IDEsXHJcbiAgICBtYXhDYXBhY2l0eTogMyxcclxuICAgIG1pbkNhcGFjaXR5OiAxLFxyXG4gICAgdGFyZ2V0Q3B1VXRpbGl6YXRpb246IDcwLFxyXG4gICAgdGFyZ2V0TWVtb3J5VXRpbGl6YXRpb246IDgwLFxyXG4gICAgaGVhbHRoQ2hlY2tHcmFjZVBlcmlvZDogMzAwLFxyXG4gICAgaGVhbHRoQ2hlY2tQYXRoOiAnL2hlYWx0aCcsXHJcbiAgICBoZWFsdGhDaGVja0ludGVydmFsOiAzMCxcclxuICAgIGhlYWx0aENoZWNrVGltZW91dDogNSxcclxuICAgIGhlYWx0aHlUaHJlc2hvbGRDb3VudDogMixcclxuICAgIHVuaGVhbHRoeVRocmVzaG9sZENvdW50OiA1LFxyXG4gICAgZW5hYmxlWFJheVRyYWNpbmc6IGZhbHNlLFxyXG4gICAgZW5hYmxlRXhlY3V0ZUNvbW1hbmQ6IHRydWUsXHJcbiAgICBsb2dSZXRlbnRpb25EYXlzOiAxNFxyXG4gIH0sXHJcbiAgYW1wbGlmeToge1xyXG4gICAgZnJhbWV3b3JrOiAnTmV4dC5qcyAtIFNTUicsXHJcbiAgICBub2RlVmVyc2lvbjogJzE4JyxcclxuICAgIGJ1aWxkQ29tbWFuZDogJ25wbSBydW4gYnVpbGQnLFxyXG4gICAgb3V0cHV0RGlyZWN0b3J5OiAnLm5leHQnLFxyXG4gICAgZW5hYmxlQnJhbmNoQXV0b0RlbGV0aW9uOiB0cnVlLFxyXG4gICAgZW5hYmxlUGVyZm9ybWFuY2VNb2RlOiBmYWxzZSxcclxuICAgIGJhc2ljQXV0aFVzZXJuYW1lOiAnZGV2JyxcclxuICAgIGJhc2ljQXV0aFBhc3N3b3JkOiAnZGV2LXBhc3N3b3JkLTEyMydcclxuICB9LFxyXG4gIHNlY3VyaXR5OiB7XHJcbiAgICBlbmFibGVXYWY6IGZhbHNlLFxyXG4gICAgZW5hYmxlRGRvc1Byb3RlY3Rpb246IGZhbHNlLFxyXG4gICAgZW5hYmxlU2VjdXJpdHlHcm91cHM6IHRydWUsXHJcbiAgICBlbmFibGVWcGNGbG93TG9nczogZmFsc2UsXHJcbiAgICBlbmFibGVDbG91ZFRyYWlsOiBmYWxzZSxcclxuICAgIGVuYWJsZUd1YXJkRHV0eTogZmFsc2UsXHJcbiAgICBlbmFibGVTZWN1cml0eUh1YjogZmFsc2UsXHJcbiAgICBlbmFibGVDb25maWc6IGZhbHNlLFxyXG4gICAgZW5hYmxlU2VjcmV0TWFuYWdlcjogdHJ1ZSxcclxuICAgIGVuYWJsZUttczogZmFsc2UsXHJcbiAgICBrbXNLZXlSb3RhdGlvbjogZmFsc2UsXHJcbiAgICBlbmFibGVCYWNrdXBWYXVsdDogZmFsc2UsXHJcbiAgICBiYWNrdXBSZXRlbnRpb25EYXlzOiA3XHJcbiAgfSxcclxuICBtb25pdG9yaW5nOiB7XHJcbiAgICBlbmFibGVYUmF5OiBmYWxzZSxcclxuICAgIGVuYWJsZUNsb3VkV2F0Y2hJbnNpZ2h0czogZmFsc2UsXHJcbiAgICBlbmFibGVDb250YWluZXJJbnNpZ2h0czogZmFsc2UsXHJcbiAgICBlbmFibGVBcHBsaWNhdGlvbkluc2lnaHRzOiBmYWxzZSxcclxuICAgIGVuYWJsZUVuaGFuY2VkTW9uaXRvcmluZzogZmFsc2UsXHJcbiAgICBlbmFibGVQZXJmb3JtYW5jZUluc2lnaHRzOiBmYWxzZSxcclxuICAgIGxvZ1JldGVudGlvbkRheXM6IDE0LFxyXG4gICAgZW5hYmxlQWxlcnRzOiBmYWxzZSxcclxuICAgIGFsZXJ0RW1haWw6ICdkZXYtdGVhbUBleGFtcGxlLmNvbScsXHJcbiAgICBlbmFibGVEYXNoYm9hcmQ6IGZhbHNlLFxyXG4gICAgZW5hYmxlU3ludGhldGljczogZmFsc2VcclxuICB9LFxyXG4gIGNvc3RPcHRpbWl6YXRpb246IHtcclxuICAgIGVuYWJsZVNwb3RJbnN0YW5jZXM6IGZhbHNlLFxyXG4gICAgZW5hYmxlQXV0b1NjYWxpbmc6IHRydWUsXHJcbiAgICBlbmFibGVTY2hlZHVsZWRTY2FsaW5nOiBmYWxzZSxcclxuICAgIGVuYWJsZVJpZ2h0U2l6aW5nOiBmYWxzZSxcclxuICAgIGVuYWJsZVN0b3JhZ2VPcHRpbWl6YXRpb246IGZhbHNlLFxyXG4gICAgZW5hYmxlUmVzZXJ2ZWRJbnN0YW5jZXM6IGZhbHNlLFxyXG4gICAgZW5hYmxlU2F2aW5nc1BsYW5zOiBmYWxzZSxcclxuICAgIGVuYWJsZUJ1ZGdldEFsZXJ0czogZmFsc2UsXHJcbiAgICBidWRnZXRMaW1pdDogMTAwLFxyXG4gICAgYnVkZ2V0QWxlcnRUaHJlc2hvbGQ6IDgwXHJcbiAgfSxcclxuICBjb21wbGlhbmNlOiB7XHJcbiAgICBlbmFibGVFbmNyeXB0aW9uOiBmYWxzZSxcclxuICAgIGVuYWJsZURhdGFSZXNpZGVuY3k6IGZhbHNlLFxyXG4gICAgZW5hYmxlQXVkaXRMb2dnaW5nOiBmYWxzZSxcclxuICAgIGVuYWJsZUNvbXBsaWFuY2VDaGVja3M6IGZhbHNlLFxyXG4gICAgZW5hYmxlRGF0YUNsYXNzaWZpY2F0aW9uOiBmYWxzZSxcclxuICAgIGVuYWJsZVByaXZhY3lDb250cm9sczogZmFsc2UsXHJcbiAgICBlbmFibGVSZXRlbnRpb25Qb2xpY2llczogZmFsc2UsXHJcbiAgICByZXRlbnRpb25QZXJpb2REYXlzOiAzMCxcclxuICAgIGVuYWJsZURhdGFNaW5pbWl6YXRpb246IGZhbHNlLFxyXG4gICAgZW5hYmxlQ29uc2VudE1hbmFnZW1lbnQ6IGZhbHNlXHJcbiAgfSxcclxuICBmZWF0dXJlczoge1xyXG4gICAgZW5hYmxlQ2RuOiBmYWxzZSxcclxuICAgIGVuYWJsZUNhY2hpbmc6IHRydWUsXHJcbiAgICBlbmFibGVFbGFzdGljc2VhcmNoOiBmYWxzZSxcclxuICAgIGVuYWJsZUV2ZW50QnJpZGdlOiBmYWxzZSxcclxuICAgIGVuYWJsZVN0ZXBGdW5jdGlvbnM6IGZhbHNlLFxyXG4gICAgZW5hYmxlQXBpR2F0ZXdheTogZmFsc2UsXHJcbiAgICBlbmFibGVDb2duaXRvOiBmYWxzZSxcclxuICAgIGVuYWJsZVNlczogZmFsc2UsXHJcbiAgICBlbmFibGVTMzogdHJ1ZSxcclxuICAgIGVuYWJsZUNsb3VkRnJvbnQ6IGZhbHNlLFxyXG4gICAgZW5hYmxlUm91dGU1MzogZmFsc2UsXHJcbiAgICBlbmFibGVDZXJ0aWZpY2F0ZU1hbmFnZXI6IGZhbHNlLFxyXG4gICAgZW5hYmxlU2VjcmV0c01hbmFnZXI6IHRydWUsXHJcbiAgICBlbmFibGVQYXJhbWV0ZXJTdG9yZTogdHJ1ZSxcclxuICAgIGVuYWJsZUV2ZW50U291cmNpbmc6IGZhbHNlLFxyXG4gICAgZW5hYmxlTWVzc2FnZVF1ZXVpbmc6IGZhbHNlLFxyXG4gICAgZW5hYmxlU3RyZWFtUHJvY2Vzc2luZzogZmFsc2UsXHJcbiAgICBlbmFibGVNYWNoaW5lTGVhcm5pbmc6IGZhbHNlLFxyXG4gICAgZW5hYmxlQW5hbHl0aWNzOiBmYWxzZSxcclxuICAgIGVuYWJsZURhdGFMYWtlOiBmYWxzZVxyXG4gIH0sXHJcbiAgLi4uYmFzZUNvbmZpZ1xyXG59O1xyXG5cclxuY29uc3Qgc3RhZ2luZ0NvbmZpZzogRW52aXJvbm1lbnRDb25maWcgPSB7XHJcbiAgLi4uZGV2ZWxvcG1lbnRDb25maWcsXHJcbiAgZW52aXJvbm1lbnROYW1lOiAnc3RhZ2luZycsXHJcbiAgbmV0d29yazoge1xyXG4gICAgLi4uZGV2ZWxvcG1lbnRDb25maWcubmV0d29yayxcclxuICAgIG5hdEdhdGV3YXlzOiAyIC8vIE11bHRpcGxlIE5BVHMgZm9yIGhpZ2hlciBhdmFpbGFiaWxpdHlcclxuICB9LFxyXG4gIGRhdGFiYXNlOiB7XHJcbiAgICAuLi5kZXZlbG9wbWVudENvbmZpZy5kYXRhYmFzZSxcclxuICAgIGluc3RhbmNlQ2xhc3M6ICdkYi50My5zbWFsbCcsXHJcbiAgICBhbGxvY2F0ZWRTdG9yYWdlOiA1MCxcclxuICAgIG1heEFsbG9jYXRlZFN0b3JhZ2U6IDIwMCxcclxuICAgIGJhY2t1cFJldGVudGlvbjogMTQsXHJcbiAgICBtdWx0aUF6OiB0cnVlLFxyXG4gICAgcGVyZm9ybWFuY2VJbnNpZ2h0czogdHJ1ZSxcclxuICAgIG1vbml0b3JpbmdJbnRlcnZhbDogNjBcclxuICB9LFxyXG4gIHJlZGlzOiB7XHJcbiAgICAuLi5kZXZlbG9wbWVudENvbmZpZy5yZWRpcyxcclxuICAgIG5vZGVUeXBlOiAnY2FjaGUudDMuc21hbGwnLFxyXG4gICAgbnVtQ2FjaGVOb2RlczogMixcclxuICAgIGVuYWJsZUJhY2t1cDogdHJ1ZSxcclxuICAgIGJhY2t1cFJldGVudGlvbkxpbWl0OiA1LFxyXG4gICAgZW5hYmxlVHJhbnNpdEVuY3J5cHRpb246IHRydWUsXHJcbiAgICBlbmFibGVBdFJlc3RFbmNyeXB0aW9uOiB0cnVlXHJcbiAgfSxcclxuICBlY3M6IHtcclxuICAgIC4uLmRldmVsb3BtZW50Q29uZmlnLmVjcyxcclxuICAgIHRhc2tDcHU6IDUxMixcclxuICAgIHRhc2tNZW1vcnk6IDEwMjQsXHJcbiAgICBkZXNpcmVkQ2FwYWNpdHk6IDIsXHJcbiAgICBtYXhDYXBhY2l0eTogNixcclxuICAgIG1pbkNhcGFjaXR5OiAyLFxyXG4gICAgZW5hYmxlWFJheVRyYWNpbmc6IHRydWUsXHJcbiAgICBsb2dSZXRlbnRpb25EYXlzOiAzMFxyXG4gIH0sXHJcbiAgYW1wbGlmeToge1xyXG4gICAgLi4uZGV2ZWxvcG1lbnRDb25maWcuYW1wbGlmeSxcclxuICAgIGVuYWJsZVBlcmZvcm1hbmNlTW9kZTogdHJ1ZSxcclxuICAgIGJhc2ljQXV0aFVzZXJuYW1lOiAnc3RhZ2luZycsXHJcbiAgICBiYXNpY0F1dGhQYXNzd29yZDogJ3N0YWdpbmctcGFzc3dvcmQtNDU2J1xyXG4gIH0sXHJcbiAgc2VjdXJpdHk6IHtcclxuICAgIC4uLmRldmVsb3BtZW50Q29uZmlnLnNlY3VyaXR5LFxyXG4gICAgZW5hYmxlV2FmOiB0cnVlLFxyXG4gICAgZW5hYmxlVnBjRmxvd0xvZ3M6IHRydWUsXHJcbiAgICBlbmFibGVDbG91ZFRyYWlsOiB0cnVlLFxyXG4gICAgZW5hYmxlS21zOiB0cnVlLFxyXG4gICAga21zS2V5Um90YXRpb246IHRydWUsXHJcbiAgICBlbmFibGVCYWNrdXBWYXVsdDogdHJ1ZSxcclxuICAgIGJhY2t1cFJldGVudGlvbkRheXM6IDE0XHJcbiAgfSxcclxuICBtb25pdG9yaW5nOiB7XHJcbiAgICAuLi5kZXZlbG9wbWVudENvbmZpZy5tb25pdG9yaW5nLFxyXG4gICAgZW5hYmxlWFJheTogdHJ1ZSxcclxuICAgIGVuYWJsZUNsb3VkV2F0Y2hJbnNpZ2h0czogdHJ1ZSxcclxuICAgIGVuYWJsZUNvbnRhaW5lckluc2lnaHRzOiB0cnVlLFxyXG4gICAgZW5hYmxlRW5oYW5jZWRNb25pdG9yaW5nOiB0cnVlLFxyXG4gICAgZW5hYmxlUGVyZm9ybWFuY2VJbnNpZ2h0czogdHJ1ZSxcclxuICAgIGxvZ1JldGVudGlvbkRheXM6IDMwLFxyXG4gICAgZW5hYmxlQWxlcnRzOiB0cnVlLFxyXG4gICAgYWxlcnRFbWFpbDogJ3N0YWdpbmctYWxlcnRzQGV4YW1wbGUuY29tJyxcclxuICAgIGVuYWJsZURhc2hib2FyZDogdHJ1ZSxcclxuICAgIGVuYWJsZVN5bnRoZXRpY3M6IHRydWVcclxuICB9LFxyXG4gIGNvc3RPcHRpbWl6YXRpb246IHtcclxuICAgIC4uLmRldmVsb3BtZW50Q29uZmlnLmNvc3RPcHRpbWl6YXRpb24sXHJcbiAgICBlbmFibGVCdWRnZXRBbGVydHM6IHRydWUsXHJcbiAgICBidWRnZXRMaW1pdDogNTAwLFxyXG4gICAgYnVkZ2V0QWxlcnRUaHJlc2hvbGQ6IDgwXHJcbiAgfSxcclxuICBjb21wbGlhbmNlOiB7XHJcbiAgICAuLi5kZXZlbG9wbWVudENvbmZpZy5jb21wbGlhbmNlLFxyXG4gICAgZW5hYmxlRW5jcnlwdGlvbjogdHJ1ZSxcclxuICAgIGVuYWJsZUF1ZGl0TG9nZ2luZzogdHJ1ZSxcclxuICAgIGVuYWJsZVJldGVudGlvblBvbGljaWVzOiB0cnVlLFxyXG4gICAgcmV0ZW50aW9uUGVyaW9kRGF5czogOTBcclxuICB9LFxyXG4gIGZlYXR1cmVzOiB7XHJcbiAgICAuLi5kZXZlbG9wbWVudENvbmZpZy5mZWF0dXJlcyxcclxuICAgIGVuYWJsZUNkbjogdHJ1ZSxcclxuICAgIGVuYWJsZUNsb3VkRnJvbnQ6IHRydWUsXHJcbiAgICBlbmFibGVSb3V0ZTUzOiB0cnVlLFxyXG4gICAgZW5hYmxlQ2VydGlmaWNhdGVNYW5hZ2VyOiB0cnVlLFxyXG4gICAgZW5hYmxlU2VzOiB0cnVlXHJcbiAgfVxyXG59O1xyXG5cclxuY29uc3QgcHJvZHVjdGlvbkNvbmZpZzogRW52aXJvbm1lbnRDb25maWcgPSB7XHJcbiAgLi4uc3RhZ2luZ0NvbmZpZyxcclxuICBlbnZpcm9ubWVudE5hbWU6ICdwcm9kJyxcclxuICBuZXR3b3JrOiB7XHJcbiAgICAuLi5zdGFnaW5nQ29uZmlnLm5ldHdvcmssXHJcbiAgICBtYXhBenM6IDMsXHJcbiAgICBuYXRHYXRld2F5czogMyAvLyBOQVQgcGVyIEFaIGZvciBtYXhpbXVtIGF2YWlsYWJpbGl0eVxyXG4gIH0sXHJcbiAgZGF0YWJhc2U6IHtcclxuICAgIC4uLnN0YWdpbmdDb25maWcuZGF0YWJhc2UsXHJcbiAgICBpbnN0YW5jZUNsYXNzOiAnZGIucjUubGFyZ2UnLFxyXG4gICAgYWxsb2NhdGVkU3RvcmFnZTogMTAwLFxyXG4gICAgbWF4QWxsb2NhdGVkU3RvcmFnZTogMTAwMCxcclxuICAgIGJhY2t1cFJldGVudGlvbjogMzAsXHJcbiAgICBkZWxldGVBdXRvbWF0ZWRCYWNrdXBzOiBmYWxzZSxcclxuICAgIGRlbGV0aW9uUHJvdGVjdGlvbjogdHJ1ZSxcclxuICAgIG11bHRpQXo6IHRydWUsXHJcbiAgICBwZXJmb3JtYW5jZUluc2lnaHRzOiB0cnVlLFxyXG4gICAgbW9uaXRvcmluZ0ludGVydmFsOiA2MFxyXG4gIH0sXHJcbiAgcmVkaXM6IHtcclxuICAgIC4uLnN0YWdpbmdDb25maWcucmVkaXMsXHJcbiAgICBub2RlVHlwZTogJ2NhY2hlLnI1LmxhcmdlJyxcclxuICAgIG51bUNhY2hlTm9kZXM6IDMsXHJcbiAgICBlbmFibGVCYWNrdXA6IHRydWUsXHJcbiAgICBiYWNrdXBSZXRlbnRpb25MaW1pdDogMTQsXHJcbiAgICBlbmFibGVUcmFuc2l0RW5jcnlwdGlvbjogdHJ1ZSxcclxuICAgIGVuYWJsZUF0UmVzdEVuY3J5cHRpb246IHRydWVcclxuICB9LFxyXG4gIGVjczoge1xyXG4gICAgLi4uc3RhZ2luZ0NvbmZpZy5lY3MsXHJcbiAgICB0YXNrQ3B1OiAxMDI0LFxyXG4gICAgdGFza01lbW9yeTogMjA0OCxcclxuICAgIGRlc2lyZWRDYXBhY2l0eTogMyxcclxuICAgIG1heENhcGFjaXR5OiAxMixcclxuICAgIG1pbkNhcGFjaXR5OiAzLFxyXG4gICAgdGFyZ2V0Q3B1VXRpbGl6YXRpb246IDUwLFxyXG4gICAgdGFyZ2V0TWVtb3J5VXRpbGl6YXRpb246IDYwLFxyXG4gICAgaGVhbHRoQ2hlY2tHcmFjZVBlcmlvZDogNjAwLFxyXG4gICAgbG9nUmV0ZW50aW9uRGF5czogOTBcclxuICB9LFxyXG4gIGFtcGxpZnk6IHtcclxuICAgIC4uLnN0YWdpbmdDb25maWcuYW1wbGlmeSxcclxuICAgIGVuYWJsZVBlcmZvcm1hbmNlTW9kZTogdHJ1ZSxcclxuICAgIGN1c3RvbURvbWFpbjogJ3JlY3J1aXRtZW50LmV4YW1wbGUuY29tJyxcclxuICAgIC8vIFJlbW92ZSBiYXNpYyBhdXRoIGZvciBwcm9kdWN0aW9uXHJcbiAgICBiYXNpY0F1dGhVc2VybmFtZTogdW5kZWZpbmVkLFxyXG4gICAgYmFzaWNBdXRoUGFzc3dvcmQ6IHVuZGVmaW5lZFxyXG4gIH0sXHJcbiAgc2VjdXJpdHk6IHtcclxuICAgIC4uLnN0YWdpbmdDb25maWcuc2VjdXJpdHksXHJcbiAgICBlbmFibGVXYWY6IHRydWUsXHJcbiAgICBlbmFibGVEZG9zUHJvdGVjdGlvbjogdHJ1ZSxcclxuICAgIGVuYWJsZVZwY0Zsb3dMb2dzOiB0cnVlLFxyXG4gICAgZW5hYmxlQ2xvdWRUcmFpbDogdHJ1ZSxcclxuICAgIGVuYWJsZUd1YXJkRHV0eTogdHJ1ZSxcclxuICAgIGVuYWJsZVNlY3VyaXR5SHViOiB0cnVlLFxyXG4gICAgZW5hYmxlQ29uZmlnOiB0cnVlLFxyXG4gICAgZW5hYmxlS21zOiB0cnVlLFxyXG4gICAga21zS2V5Um90YXRpb246IHRydWUsXHJcbiAgICBlbmFibGVCYWNrdXBWYXVsdDogdHJ1ZSxcclxuICAgIGJhY2t1cFJldGVudGlvbkRheXM6IDMwXHJcbiAgfSxcclxuICBtb25pdG9yaW5nOiB7XHJcbiAgICAuLi5zdGFnaW5nQ29uZmlnLm1vbml0b3JpbmcsXHJcbiAgICBlbmFibGVYUmF5OiB0cnVlLFxyXG4gICAgZW5hYmxlQ2xvdWRXYXRjaEluc2lnaHRzOiB0cnVlLFxyXG4gICAgZW5hYmxlQ29udGFpbmVySW5zaWdodHM6IHRydWUsXHJcbiAgICBlbmFibGVBcHBsaWNhdGlvbkluc2lnaHRzOiB0cnVlLFxyXG4gICAgZW5hYmxlRW5oYW5jZWRNb25pdG9yaW5nOiB0cnVlLFxyXG4gICAgZW5hYmxlUGVyZm9ybWFuY2VJbnNpZ2h0czogdHJ1ZSxcclxuICAgIGxvZ1JldGVudGlvbkRheXM6IDkwLFxyXG4gICAgZW5hYmxlQWxlcnRzOiB0cnVlLFxyXG4gICAgYWxlcnRFbWFpbDogJ3Byb2QtYWxlcnRzQGV4YW1wbGUuY29tJyxcclxuICAgIGVuYWJsZURhc2hib2FyZDogdHJ1ZSxcclxuICAgIGVuYWJsZVN5bnRoZXRpY3M6IHRydWVcclxuICB9LFxyXG4gIGNvc3RPcHRpbWl6YXRpb246IHtcclxuICAgIC4uLnN0YWdpbmdDb25maWcuY29zdE9wdGltaXphdGlvbixcclxuICAgIGVuYWJsZVNwb3RJbnN0YW5jZXM6IGZhbHNlLCAvLyBEaXNhYmxlIHNwb3QgaW5zdGFuY2VzIGZvciBwcm9kdWN0aW9uXHJcbiAgICBlbmFibGVBdXRvU2NhbGluZzogdHJ1ZSxcclxuICAgIGVuYWJsZVNjaGVkdWxlZFNjYWxpbmc6IHRydWUsXHJcbiAgICBlbmFibGVSaWdodFNpemluZzogdHJ1ZSxcclxuICAgIGVuYWJsZVN0b3JhZ2VPcHRpbWl6YXRpb246IHRydWUsXHJcbiAgICBlbmFibGVSZXNlcnZlZEluc3RhbmNlczogdHJ1ZSxcclxuICAgIGVuYWJsZVNhdmluZ3NQbGFuczogdHJ1ZSxcclxuICAgIGVuYWJsZUJ1ZGdldEFsZXJ0czogdHJ1ZSxcclxuICAgIGJ1ZGdldExpbWl0OiAyMDAwLFxyXG4gICAgYnVkZ2V0QWxlcnRUaHJlc2hvbGQ6IDgwXHJcbiAgfSxcclxuICBjb21wbGlhbmNlOiB7XHJcbiAgICAuLi5zdGFnaW5nQ29uZmlnLmNvbXBsaWFuY2UsXHJcbiAgICBlbmFibGVFbmNyeXB0aW9uOiB0cnVlLFxyXG4gICAgZW5hYmxlRGF0YVJlc2lkZW5jeTogdHJ1ZSxcclxuICAgIGVuYWJsZUF1ZGl0TG9nZ2luZzogdHJ1ZSxcclxuICAgIGVuYWJsZUNvbXBsaWFuY2VDaGVja3M6IHRydWUsXHJcbiAgICBlbmFibGVEYXRhQ2xhc3NpZmljYXRpb246IHRydWUsXHJcbiAgICBlbmFibGVQcml2YWN5Q29udHJvbHM6IHRydWUsXHJcbiAgICBlbmFibGVSZXRlbnRpb25Qb2xpY2llczogdHJ1ZSxcclxuICAgIHJldGVudGlvblBlcmlvZERheXM6IDM2NSxcclxuICAgIGVuYWJsZURhdGFNaW5pbWl6YXRpb246IHRydWUsXHJcbiAgICBlbmFibGVDb25zZW50TWFuYWdlbWVudDogdHJ1ZVxyXG4gIH0sXHJcbiAgZmVhdHVyZXM6IHtcclxuICAgIC4uLnN0YWdpbmdDb25maWcuZmVhdHVyZXMsXHJcbiAgICBlbmFibGVDZG46IHRydWUsXHJcbiAgICBlbmFibGVFbGFzdGljc2VhcmNoOiB0cnVlLFxyXG4gICAgZW5hYmxlRXZlbnRCcmlkZ2U6IHRydWUsXHJcbiAgICBlbmFibGVTdGVwRnVuY3Rpb25zOiB0cnVlLFxyXG4gICAgZW5hYmxlQXBpR2F0ZXdheTogdHJ1ZSxcclxuICAgIGVuYWJsZUNvZ25pdG86IHRydWUsXHJcbiAgICBlbmFibGVTZXM6IHRydWUsXHJcbiAgICBlbmFibGVBbmFseXRpY3M6IHRydWVcclxuICB9XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0RW52aXJvbm1lbnRDb25maWcoZW52aXJvbm1lbnQ6IEVudmlyb25tZW50TmFtZSk6IEVudmlyb25tZW50Q29uZmlnIHtcclxuICBzd2l0Y2ggKGVudmlyb25tZW50KSB7XHJcbiAgICBjYXNlICdkZXYnOlxyXG4gICAgICByZXR1cm4gZGV2ZWxvcG1lbnRDb25maWc7XHJcbiAgICBjYXNlICdzdGFnaW5nJzpcclxuICAgICAgcmV0dXJuIHN0YWdpbmdDb25maWc7XHJcbiAgICBjYXNlICdwcm9kJzpcclxuICAgICAgcmV0dXJuIHByb2R1Y3Rpb25Db25maWc7XHJcbiAgICBkZWZhdWx0OlxyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gZW52aXJvbm1lbnQ6ICR7ZW52aXJvbm1lbnR9YCk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVFbnZpcm9ubWVudENvbmZpZyhjb25maWc6IEVudmlyb25tZW50Q29uZmlnKTogdm9pZCB7XHJcbiAgaWYgKCFjb25maWcuZW52LmFjY291bnQpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcignQVdTIGFjY291bnQgSUQgaXMgcmVxdWlyZWQnKTtcclxuICB9XHJcbiAgaWYgKCFjb25maWcuZW52LnJlZ2lvbikge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdBV1MgcmVnaW9uIGlzIHJlcXVpcmVkJyk7XHJcbiAgfVxyXG4gIGlmICghY29uZmlnLm5ldHdvcmsudnBjQ2lkcikge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdWUEMgQ0lEUiBpcyByZXF1aXJlZCcpO1xyXG4gIH1cclxuICBpZiAoY29uZmlnLm5ldHdvcmsubWF4QXpzIDwgMikge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdBdCBsZWFzdCAyIGF2YWlsYWJpbGl0eSB6b25lcyBhcmUgcmVxdWlyZWQnKTtcclxuICB9XHJcbiAgaWYgKGNvbmZpZy5kYXRhYmFzZS5hbGxvY2F0ZWRTdG9yYWdlIDwgMjApIHtcclxuICAgIHRocm93IG5ldyBFcnJvcignRGF0YWJhc2UgYWxsb2NhdGVkIHN0b3JhZ2UgbXVzdCBiZSBhdCBsZWFzdCAyMCBHQicpO1xyXG4gIH1cclxuICBpZiAoY29uZmlnLmVjcy5kZXNpcmVkQ2FwYWNpdHkgPCAxKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0VDUyBkZXNpcmVkIGNhcGFjaXR5IG11c3QgYmUgYXQgbGVhc3QgMScpO1xyXG4gIH1cclxuICBpZiAoY29uZmlnLmVjcy5taW5DYXBhY2l0eSA+IGNvbmZpZy5lY3MubWF4Q2FwYWNpdHkpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcignRUNTIG1pbiBjYXBhY2l0eSBjYW5ub3QgYmUgZ3JlYXRlciB0aGFuIG1heCBjYXBhY2l0eScpO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IHsgZGV2ZWxvcG1lbnRDb25maWcsIHN0YWdpbmdDb25maWcsIHByb2R1Y3Rpb25Db25maWcgfTtcclxuXHJcbi8vIEV4cG9ydCBzcGVjaWZpYyBjb25maWcgdHlwZXMgZm9yIGluZGl2aWR1YWwgY29uc3RydWN0c1xyXG5leHBvcnQgdHlwZSB7IE5ldHdvcmtDb25maWcgYXMgVnBjQ29uZmlnLCBFY3NDb25maWcsIERhdGFiYXNlQ29uZmlnIGFzIFJkc0NvbmZpZywgTW9uaXRvcmluZ0NvbmZpZyB9IGZyb20gJy4vdHlwZXMnO1xyXG5cclxuLy8gUmUtZXhwb3J0IGNvbW1vbmx5IHVzZWQgdHlwZXNcclxuZXhwb3J0IHR5cGUgeyBFbnZpcm9ubWVudENvbmZpZywgRW52aXJvbm1lbnROYW1lLCBEYXRhYmFzZUNvbmZpZywgUmVkaXNDb25maWcsIE5ldHdvcmtDb25maWcgfSBmcm9tICcuL3R5cGVzJzsiXX0=