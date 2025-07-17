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
export declare class EnvironmentConfig {
    private readonly environment;
    private readonly configs;
    constructor(environment: string);
    get config(): EnvironmentConfiguration;
    get isProd(): boolean;
    get isDev(): boolean;
    get isStaging(): boolean;
}
