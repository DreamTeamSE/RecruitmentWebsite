import { EnvironmentConfig, EnvironmentName } from './types';

const baseConfig = {
  tags: {
    Project: 'RecruitmentWebsite',
    ManagedBy: 'CDK',
    Repository: 'https://github.com/your-org/RecruitmentWebsite',
    Owner: 'DevOps Team'
  }
};

const developmentConfig: EnvironmentConfig = {
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

const stagingConfig: EnvironmentConfig = {
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

const productionConfig: EnvironmentConfig = {
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

export function getEnvironmentConfig(environment: EnvironmentName): EnvironmentConfig {
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

export function validateEnvironmentConfig(config: EnvironmentConfig): void {
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

export { developmentConfig, stagingConfig, productionConfig };