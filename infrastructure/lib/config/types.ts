import { Environment } from 'aws-cdk-lib';

export type EnvironmentName = 'dev' | 'staging' | 'prod';

export interface DatabaseConfig {
  instanceClass: string;
  engine: string;
  engineVersion: string;
  allocatedStorage: number;
  maxAllocatedStorage: number;
  backupRetention: number;
  deleteAutomatedBackups: boolean;
  deletionProtection: boolean;
  multiAz: boolean;
  performanceInsights: boolean;
  enableLogging: boolean;
  monitoringInterval: number;
}

export interface RedisConfig {
  nodeType: string;
  numCacheNodes: number;
  engineVersion: string;
  parameterGroupName: string;
  enableBackup: boolean;
  backupRetentionLimit: number;
  preferredBackupWindow: string;
  preferredMaintenanceWindow: string;
  enableTransitEncryption: boolean;
  enableAtRestEncryption: boolean;
}

export interface EcsConfig {
  taskCpu: number;
  taskMemory: number;
  desiredCapacity: number;
  maxCapacity: number;
  minCapacity: number;
  targetCpuUtilization: number;
  targetMemoryUtilization: number;
  healthCheckGracePeriod: number;
  healthCheckPath: string;
  healthCheckInterval: number;
  healthCheckTimeout: number;
  healthyThresholdCount: number;
  unhealthyThresholdCount: number;
  enableXRayTracing: boolean;
  enableExecuteCommand: boolean;
  logRetentionDays: number;
}

export interface AmplifyConfig {
  framework: string;
  nodeVersion: string;
  buildCommand: string;
  outputDirectory: string;
  enableBranchAutoDeletion: boolean;
  enablePerformanceMode: boolean;
  customDomain?: string;
  certificateArn?: string;
  basicAuthUsername?: string;
  basicAuthPassword?: string;
}

export interface NetworkConfig {
  vpcCidr: string;
  maxAzs: number;
  enableNatGateway: boolean;
  natGateways: number;
  enableVpnGateway: boolean;
  enableDnsHostnames: boolean;
  enableDnsSupport: boolean;
  publicSubnetNames: string[];
  privateSubnetNames: string[];
  isolatedSubnetNames: string[];
}

export interface SecurityConfig {
  enableWaf: boolean;
  enableDdosProtection: boolean;
  enableSecurityGroups: boolean;
  enableVpcFlowLogs: boolean;
  enableCloudTrail: boolean;
  enableGuardDuty: boolean;
  enableSecurityHub: boolean;
  enableConfig: boolean;
  enableSecretManager: boolean;
  enableKms: boolean;
  kmsKeyRotation: boolean;
  enableBackupVault: boolean;
  backupRetentionDays: number;
}

export interface MonitoringConfig {
  enableXRay: boolean;
  enableCloudWatchInsights: boolean;
  enableContainerInsights: boolean;
  enableApplicationInsights: boolean;
  enableEnhancedMonitoring: boolean;
  enablePerformanceInsights: boolean;
  logRetentionDays: number;
  enableAlerts: boolean;
  alertEmail: string;
  enableDashboard: boolean;
  enableSynthetics: boolean;
}

export interface CostOptimizationConfig {
  enableSpotInstances: boolean;
  enableAutoScaling: boolean;
  enableScheduledScaling: boolean;
  enableRightSizing: boolean;
  enableStorageOptimization: boolean;
  enableReservedInstances: boolean;
  enableSavingsPlans: boolean;
  enableBudgetAlerts: boolean;
  budgetLimit: number;
  budgetAlertThreshold: number;
}

export interface ComplianceConfig {
  enableEncryption: boolean;
  enableDataResidency: boolean;
  enableAuditLogging: boolean;
  enableComplianceChecks: boolean;
  enableDataClassification: boolean;
  enablePrivacyControls: boolean;
  enableRetentionPolicies: boolean;
  retentionPeriodDays: number;
  enableDataMinimization: boolean;
  enableConsentManagement: boolean;
}

export interface EnvironmentConfig {
  env: Environment;
  environmentName: EnvironmentName;
  network: NetworkConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  ecs: EcsConfig;
  amplify: AmplifyConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  costOptimization: CostOptimizationConfig;
  compliance: ComplianceConfig;
  features: {
    enableCdn: boolean;
    enableCaching: boolean;
    enableElasticsearch: boolean;
    enableEventBridge: boolean;
    enableStepFunctions: boolean;
    enableApiGateway: boolean;
    enableCognito: boolean;
    enableSes: boolean;
    enableS3: boolean;
    enableCloudFront: boolean;
    enableRoute53: boolean;
    enableCertificateManager: boolean;
    enableSecretsManager: boolean;
    enableParameterStore: boolean;
    enableEventSourcing: boolean;
    enableMessageQueuing: boolean;
    enableStreamProcessing: boolean;
    enableMachineLearning: boolean;
    enableAnalytics: boolean;
    enableDataLake: boolean;
  };
  tags: {
    [key: string]: string;
  };
}

export interface StackProps {
  env: Environment;
  config: EnvironmentConfig;
  description?: string;
  tags?: {
    [key: string]: string;
  };
}

export interface DatabaseStackProps extends StackProps {
  vpc: any;
  databaseSecurityGroup: any;
  redisSecurityGroup: any;
}

export interface BackendStackProps extends StackProps {
  vpc: any;
  cluster: any;
  loadBalancer: any;
  backendSecurityGroup: any;
  database: any;
  redis: any;
  assetsBucket: any;
}

export interface FrontendStackProps extends StackProps {
  backendUrl: string;
}

export interface MonitoringStackProps extends StackProps {
  backendService: any;
  database: any;
  redis: any;
  loadBalancer: any;
  frontendApp: any;
}

export interface PipelineStackProps extends StackProps {
  // Pipeline-specific props can be added here
}

export interface NetworkStackProps extends StackProps {
  // Network-specific props can be added here
}