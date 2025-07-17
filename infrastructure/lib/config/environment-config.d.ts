import { EnvironmentConfig, EnvironmentName } from './types';
declare const developmentConfig: EnvironmentConfig;
declare const stagingConfig: EnvironmentConfig;
declare const productionConfig: EnvironmentConfig;
export declare function getEnvironmentConfig(environment: EnvironmentName): EnvironmentConfig;
export declare function validateEnvironmentConfig(config: EnvironmentConfig): void;
export { developmentConfig, stagingConfig, productionConfig };
export type { NetworkConfig as VpcConfig, EcsConfig, DatabaseConfig as RdsConfig, MonitoringConfig } from './types';
export type { EnvironmentConfig, EnvironmentName, DatabaseConfig, RedisConfig, NetworkConfig } from './types';
