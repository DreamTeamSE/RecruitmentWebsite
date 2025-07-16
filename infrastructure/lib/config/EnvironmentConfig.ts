export interface DatabaseConfig {
  instanceClass: string;
  allocatedStorage: number;
  maxAllocatedStorage: number;
  multiAz: boolean;
  backupRetentionDays: number;
  deletionProtection: boolean;
  performanceInsights: boolean;
  enableCloudwatchLogsExports: string[];
}

export interface EcsConfig {
  cpu: number;
  memory: number;
  minCapacity: number;
  maxCapacity: number;
  targetCpuUtilization: number;
  targetMemoryUtilization: number;
  desiredCount: number;
}

export interface RedisConfig {
  nodeType: string;
  numCacheNodes: number;
  automaticFailover: boolean;
  multiAzEnabled: boolean;
  transitEncryptionEnabled: boolean;
  atRestEncryptionEnabled: boolean;
}

export interface MonitoringConfig {
  enableDetailedMonitoring: boolean;
  logRetentionDays: number;
  alarmEmail: string;
  enableXRay: boolean;
}

export interface SecurityConfig {
  enableWaf: boolean;
  enableCloudTrail: boolean;
  enableGuardDuty: boolean;
  sslCertificateArn?: string;
  domainName?: string;
}

export interface EnvironmentConfiguration {
  database: DatabaseConfig;
  ecs: EcsConfig;
  redis: RedisConfig;
  monitoring: MonitoringConfig;
  security: SecurityConfig;
}

export class EnvironmentConfig {
  private readonly configs: Record<string, EnvironmentConfiguration> = {
    dev: {
      database: {
        instanceClass: 'db.t3.micro',
        allocatedStorage: 20,
        maxAllocatedStorage: 100,
        multiAz: false,
        backupRetentionDays: 7,
        deletionProtection: false,
        performanceInsights: false,
        enableCloudwatchLogsExports: ['postgresql'],
      },
      ecs: {
        cpu: 512,
        memory: 1024,
        minCapacity: 1,
        maxCapacity: 3,
        targetCpuUtilization: 70,
        targetMemoryUtilization: 80,
        desiredCount: 1,
      },
      redis: {
        nodeType: 'cache.t3.micro',
        numCacheNodes: 1,
        automaticFailover: false,
        multiAzEnabled: false,
        transitEncryptionEnabled: true,
        atRestEncryptionEnabled: true,
      },
      monitoring: {
        enableDetailedMonitoring: true,
        logRetentionDays: 7,
        alarmEmail: 'dev-alerts@company.com',
        enableXRay: true,
      },
      security: {
        enableWaf: true,
        enableCloudTrail: false,
        enableGuardDuty: false,
      },
    },
    staging: {
      database: {
        instanceClass: 'db.t3.small',
        allocatedStorage: 50,
        maxAllocatedStorage: 200,
        multiAz: true,
        backupRetentionDays: 14,
        deletionProtection: true,
        performanceInsights: true,
        enableCloudwatchLogsExports: ['postgresql'],
      },
      ecs: {
        cpu: 1024,
        memory: 2048,
        minCapacity: 2,
        maxCapacity: 6,
        targetCpuUtilization: 70,
        targetMemoryUtilization: 80,
        desiredCount: 2,
      },
      redis: {
        nodeType: 'cache.t3.small',
        numCacheNodes: 2,
        automaticFailover: true,
        multiAzEnabled: true,
        transitEncryptionEnabled: true,
        atRestEncryptionEnabled: true,
      },
      monitoring: {
        enableDetailedMonitoring: true,
        logRetentionDays: 14,
        alarmEmail: 'staging-alerts@company.com',
        enableXRay: true,
      },
      security: {
        enableWaf: true,
        enableCloudTrail: true,
        enableGuardDuty: true,
      },
    },
    prod: {
      database: {
        instanceClass: 'db.r5.large',
        allocatedStorage: 100,
        maxAllocatedStorage: 1000,
        multiAz: true,
        backupRetentionDays: 30,
        deletionProtection: true,
        performanceInsights: true,
        enableCloudwatchLogsExports: ['postgresql'],
      },
      ecs: {
        cpu: 2048,
        memory: 4096,
        minCapacity: 3,
        maxCapacity: 20,
        targetCpuUtilization: 60,
        targetMemoryUtilization: 70,
        desiredCount: 3,
      },
      redis: {
        nodeType: 'cache.r5.large',
        numCacheNodes: 3,
        automaticFailover: true,
        multiAzEnabled: true,
        transitEncryptionEnabled: true,
        atRestEncryptionEnabled: true,
      },
      monitoring: {
        enableDetailedMonitoring: true,
        logRetentionDays: 30,
        alarmEmail: 'prod-alerts@company.com',
        enableXRay: true,
      },
      security: {
        enableWaf: true,
        enableCloudTrail: true,
        enableGuardDuty: true,
        sslCertificateArn: 'arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID',
        domainName: 'api.recruitmentwebsite.com',
      },
    },
  };

  constructor(private readonly environment: string) {}

  public get config(): EnvironmentConfiguration {
    const config = this.configs[this.environment];
    if (!config) {
      throw new Error(`No configuration found for environment: ${this.environment}`);
    }
    return config;
  }

  public get isProd(): boolean {
    return this.environment === 'prod';
  }

  public get isDev(): boolean {
    return this.environment === 'dev';
  }

  public get isStaging(): boolean {
    return this.environment === 'staging';
  }
}