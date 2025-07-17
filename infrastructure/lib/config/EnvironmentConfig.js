"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentConfig = void 0;
class EnvironmentConfig {
    constructor(environment) {
        this.environment = environment;
        this.configs = {
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
    }
    get config() {
        const config = this.configs[this.environment];
        if (!config) {
            throw new Error(`No configuration found for environment: ${this.environment}`);
        }
        return config;
    }
    get isProd() {
        return this.environment === 'prod';
    }
    get isDev() {
        return this.environment === 'dev';
    }
    get isStaging() {
        return this.environment === 'staging';
    }
}
exports.EnvironmentConfig = EnvironmentConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRW52aXJvbm1lbnRDb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJFbnZpcm9ubWVudENvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFxREEsTUFBYSxpQkFBaUI7SUE4SDVCLFlBQTZCLFdBQW1CO1FBQW5CLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBN0gvQixZQUFPLEdBQTZDO1lBQ25FLEdBQUcsRUFBRTtnQkFDSCxRQUFRLEVBQUU7b0JBQ1IsYUFBYSxFQUFFLGFBQWE7b0JBQzVCLGdCQUFnQixFQUFFLEVBQUU7b0JBQ3BCLG1CQUFtQixFQUFFLEdBQUc7b0JBQ3hCLE9BQU8sRUFBRSxLQUFLO29CQUNkLG1CQUFtQixFQUFFLENBQUM7b0JBQ3RCLGtCQUFrQixFQUFFLEtBQUs7b0JBQ3pCLG1CQUFtQixFQUFFLEtBQUs7b0JBQzFCLDJCQUEyQixFQUFFLENBQUMsWUFBWSxDQUFDO2lCQUM1QztnQkFDRCxHQUFHLEVBQUU7b0JBQ0gsR0FBRyxFQUFFLEdBQUc7b0JBQ1IsTUFBTSxFQUFFLElBQUk7b0JBQ1osV0FBVyxFQUFFLENBQUM7b0JBQ2QsV0FBVyxFQUFFLENBQUM7b0JBQ2Qsb0JBQW9CLEVBQUUsRUFBRTtvQkFDeEIsdUJBQXVCLEVBQUUsRUFBRTtvQkFDM0IsWUFBWSxFQUFFLENBQUM7aUJBQ2hCO2dCQUNELEtBQUssRUFBRTtvQkFDTCxRQUFRLEVBQUUsZ0JBQWdCO29CQUMxQixhQUFhLEVBQUUsQ0FBQztvQkFDaEIsaUJBQWlCLEVBQUUsS0FBSztvQkFDeEIsY0FBYyxFQUFFLEtBQUs7b0JBQ3JCLHdCQUF3QixFQUFFLElBQUk7b0JBQzlCLHVCQUF1QixFQUFFLElBQUk7aUJBQzlCO2dCQUNELFVBQVUsRUFBRTtvQkFDVix3QkFBd0IsRUFBRSxJQUFJO29CQUM5QixnQkFBZ0IsRUFBRSxDQUFDO29CQUNuQixVQUFVLEVBQUUsd0JBQXdCO29CQUNwQyxVQUFVLEVBQUUsSUFBSTtpQkFDakI7Z0JBQ0QsUUFB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O1FBQzlDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsMkNBQTJDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ2pGLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBRUQsSUFBVyxNQUFNO1FBQ2YsT0FBTyxJQUFJLENBQUMsV0FBVyxLQUFLLE1BQU0sQ0FBQztJQUNyQyxDQUFDO0lBRUQsSUFBVyxLQUFLO1FBQ2QsT0FBTyxJQUFJLENBQUMsV0FBVyxLQUFLLEtBQUssQ0FBQztJQUNwQyxDQUFDO0lBRUQsSUFBVyxTQUFTO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLFdBQVcsS0FBSyxTQUFTLENBQUM7SUFDeEMsQ0FBQztDQUNGO0FBbkpELDhDQW1KQyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBpbnRlcmZhY2UgRGF0YWJhc2VDb25maWcge1xyXG4gIGluc3RhbmNlQ2xhc3M6IHN0cmluZztcclxuICBhbGxvY2F0ZWRTdG9yYWdlOiBudW1iZXI7XHJcbiAgbWF4QWxsb2NhdGVkU3RvcmFnZTogbnVtYmVyO1xyXG4gIG11bHRpQXo6IGJvb2xlYW47XHJcbiAgYmFja3VwUmV0ZW50aW9uRGF5czogbnVtYmVyO1xyXG4gIGRlbGV0aW9uUHJvdGVjdGlvbjogYm9vbGVhbjtcclxuICBwZXJmb3JtYW5jZUluc2lnaHRzOiBib29sZWFuO1xyXG4gIGVuYWJsZUNsb3Vkd2F0Y2hMb2dzRXhwb3J0czogc3RyaW5nW107XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRWNzQ29uZmlnIHtcclxuICBjcHU6IG51bWJlcjtcclxuICBtZW1vcnk6IG51bWJlcjtcclxuICBtaW5DYXBhY2l0eTogbnVtYmVyO1xyXG4gIG1heENhcGFjaXR5OiBudW1iZXI7XHJcbiAgdGFyZ2V0Q3B1VXRpbGl6YXRpb246IG51bWJlcjtcclxuICB0YXJnZXRNZW1vcnlVdGlsaXphdGlvbjogbnVtYmVyO1xyXG4gIGRlc2lyZWRDb3VudDogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJlZGlzQ29uZmlnIHtcclxuICBub2RlVHlwZTogc3RyaW5nO1xyXG4gIG51bUNhY2hlTm9kZXM6IG51bWJlcjtcclxuICBhdXRvbWF0aWNGYWlsb3ZlcjogYm9vbGVhbjtcclxuICBtdWx0aUF6RW5hYmxlZDogYm9vbGVhbjtcclxuICB0cmFuc2l0RW5jcnlwdGlvbkVuYWJsZWQ6IGJvb2xlYW47XHJcbiAgYXRSZXN0RW5jcnlwdGlvbkVuYWJsZWQ6IGJvb2xlYW47XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTW9uaXRvcmluZ0NvbmZpZyB7XHJcbiAgZW5hYmxlRGV0YWlsZWRNb25pdG9yaW5nOiBib29sZWFuO1xyXG4gIGxvZ1JldGVudGlvbkRheXM6IG51bWJlcjtcclxuICBhbGFybUVtYWlsOiBzdHJpbmc7XHJcbiAgZW5hYmxlWFJheTogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBTZWN1cml0eUNvbmZpZyB7XHJcbiAgZW5hYmxlV2FmOiBib29sZWFuO1xyXG4gIGVuYWJsZUNsb3VkVHJhaWw6IGJvb2xlYW47XHJcbiAgZW5hYmxlR3VhcmREdXR5OiBib29sZWFuO1xyXG4gIHNzbENlcnRpZmljYXRlQXJuPzogc3RyaW5nO1xyXG4gIGRvbWFpbk5hbWU/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRW52aXJvbm1lbnRDb25maWd1cmF0aW9uIHtcclxuICBkYXRhYmFzZTogRGF0YWJhc2VDb25maWc7XHJcbiAgZWNzOiBFY3NDb25maWc7XHJcbiAgcmVkaXM6IFJlZGlzQ29uZmlnO1xyXG4gIG1vbml0b3Jpbmc6IE1vbml0b3JpbmdDb25maWc7XHJcbiAgc2VjdXJpdHk6IFNlY3VyaXR5Q29uZmlnO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRW52aXJvbm1lbnRDb25maWcge1xyXG4gIHByaXZhdGUgcmVhZG9ubHkgY29uZmlnczogUmVjb3JkPHN0cmluZywgRW52aXJvbm1lbnRDb25maWd1cmF0aW9uPiA9IHtcclxuICAgIGRldjoge1xyXG4gICAgICBkYXRhYmFzZToge1xyXG4gICAgICAgIGluc3RhbmNlQ2xhc3M6ICdkYi50My5taWNybycsXHJcbiAgICAgICAgYWxsb2NhdGVkU3RvcmFnZTogMjAsXHJcbiAgICAgICAgbWF4QWxsb2NhdGVkU3RvcmFnZTogMTAwLFxyXG4gICAgICAgIG11bHRpQXo6IGZhbHNlLFxyXG4gICAgICAgIGJhY2t1cFJldGVudGlvbkRheXM6IDcsXHJcbiAgICAgICAgZGVsZXRpb25Qcm90ZWN0aW9uOiBmYWxzZSxcclxuICAgICAgICBwZXJmb3JtYW5jZUluc2lnaHRzOiBmYWxzZSxcclxuICAgICAgICBlbmFibGVDbG91ZHdhdGNoTG9nc0V4cG9ydHM6IFsncG9zdGdyZXNxbCddLFxyXG4gICAgICB9LFxyXG4gICAgICBlY3M6IHtcclxuICAgICAgICBjcHU6IDUxMixcclxuICAgICAgICBtZW1vcnk6IDEwMjQsXHJcbiAgICAgICAgbWluQ2FwYWNpdHk6IDEsXHJcbiAgICAgICAgbWF4Q2FwYWNpdHk6IDMsXHJcbiAgICAgICAgdGFyZ2V0Q3B1VXRpbGl6YXRpb246IDcwLFxyXG4gICAgICAgIHRhcmdldE1lbW9yeVV0aWxpemF0aW9uOiA4MCxcclxuICAgICAgICBkZXNpcmVkQ291bnQ6IDEsXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlZGlzOiB7XHJcbiAgICAgICAgbm9kZVR5cGU6ICdjYWNoZS50My5taWNybycsXHJcbiAgICAgICAgbnVtQ2FjaGVOb2RlczogMSxcclxuICAgICAgICBhdXRvbWF0aWNGYWlsb3ZlcjogZmFsc2UsXHJcbiAgICAgICAgbXVsdGlBekVuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgIHRyYW5zaXRFbmNyeXB0aW9uRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICBhdFJlc3RFbmNyeXB0aW9uRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgICAgbW9uaXRvcmluZzoge1xyXG4gICAgICAgIGVuYWJsZURldGFpbGVkTW9uaXRvcmluZzogdHJ1ZSxcclxuICAgICAgICBsb2dSZXRlbnRpb25EYXlzOiA3LFxyXG4gICAgICAgIGFsYXJtRW1haWw6ICdkZXYtYWxlcnRzQGNvbXBhbnkuY29tJyxcclxuICAgICAgICBlbmFibGVYUmF5OiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgICBzZWN1cml0eToge1xyXG4gICAgICAgIGVuYWJsZVdhZjogdHJ1ZSxcclxuICAgICAgICBlbmFibGVDbG91ZFRyYWlsOiBmYWxzZSxcclxuICAgICAgICBlbmFibGVHdWFyZER1dHk6IGZhbHNlLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICAgIHN0YWdpbmc6IHtcclxuICAgICAgZGF0YWJhc2U6IHtcclxuICAgICAgICBpbnN0YW5jZUNsYXNzOiAnZGIudDMuc21hbGwnLFxyXG4gICAgICAgIGFsbG9jYXRlZFN0b3JhZ2U6IDUwLFxyXG4gICAgICAgIG1heEFsbG9jYXRlZFN0b3JhZ2U6IDIwMCxcclxuICAgICAgICBtdWx0aUF6OiB0cnVlLFxyXG4gICAgICAgIGJhY2t1cFJldGVudGlvbkRheXM6IDE0LFxyXG4gICAgICAgIGRlbGV0aW9uUHJvdGVjdGlvbjogdHJ1ZSxcclxuICAgICAgICBwZXJmb3JtYW5jZUluc2lnaHRzOiB0cnVlLFxyXG4gICAgICAgIGVuYWJsZUNsb3Vkd2F0Y2hMb2dzRXhwb3J0czogWydwb3N0Z3Jlc3FsJ10sXHJcbiAgICAgIH0sXHJcbiAgICAgIGVjczoge1xyXG4gICAgICAgIGNwdTogMTAyNCxcclxuICAgICAgICBtZW1vcnk6IDIwNDgsXHJcbiAgICAgICAgbWluQ2FwYWNpdHk6IDIsXHJcbiAgICAgICAgbWF4Q2FwYWNpdHk6IDYsXHJcbiAgICAgICAgdGFyZ2V0Q3B1VXRpbGl6YXRpb246IDcwLFxyXG4gICAgICAgIHRhcmdldE1lbW9yeVV0aWxpemF0aW9uOiA4MCxcclxuICAgICAgICBkZXNpcmVkQ291bnQ6IDIsXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlZGlzOiB7XHJcbiAgICAgICAgbm9kZVR5cGU6ICdjYWNoZS50My5zbWFsbCcsXHJcbiAgICAgICAgbnVtQ2FjaGVOb2RlczogMixcclxuICAgICAgICBhdXRvbWF0aWNGYWlsb3ZlcjogdHJ1ZSxcclxuICAgICAgICBtdWx0aUF6RW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICB0cmFuc2l0RW5jcnlwdGlvbkVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgYXRSZXN0RW5jcnlwdGlvbkVuYWJsZWQ6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIG1vbml0b3Jpbmc6IHtcclxuICAgICAgICBlbmFibGVEZXRhaWxlZE1vbml0b3Jpbmc6IHRydWUsXHJcbiAgICAgICAgbG9nUmV0ZW50aW9uRGF5czogMTQsXHJcbiAgICAgICAgYWxhcm1FbWFpbDogJ3N0YWdpbmctYWxlcnRzQGNvbXBhbnkuY29tJyxcclxuICAgICAgICBlbmFibGVYUmF5OiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgICBzZWN1cml0eToge1xyXG4gICAgICAgIGVuYWJsZVdhZjogdHJ1ZSxcclxuICAgICAgICBlbmFibGVDbG91ZFRyYWlsOiB0cnVlLFxyXG4gICAgICAgIGVuYWJsZUd1YXJkRHV0eTogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICBwcm9kOiB7XHJcbiAgICAgIGRhdGFiYXNlOiB7XHJcbiAgICAgICAgaW5zdGFuY2VDbGFzczogJ2RiLnI1LmxhcmdlJyxcclxuICAgICAgICBhbGxvY2F0ZWRTdG9yYWdlOiAxMDAsXHJcbiAgICAgICAgbWF4QWxsb2NhdGVkU3RvcmFnZTogMTAwMCxcclxuICAgICAgICBtdWx0aUF6OiB0cnVlLFxyXG4gICAgICAgIGJhY2t1cFJldGVudGlvbkRheXM6IDMwLFxyXG4gICAgICAgIGRlbGV0aW9uUHJvdGVjdGlvbjogdHJ1ZSxcclxuICAgICAgICBwZXJmb3JtYW5jZUluc2lnaHRzOiB0cnVlLFxyXG4gICAgICAgIGVuYWJsZUNsb3Vkd2F0Y2hMb2dzRXhwb3J0czogWydwb3N0Z3Jlc3FsJ10sXHJcbiAgICAgIH0sXHJcbiAgICAgIGVjczoge1xyXG4gICAgICAgIGNwdTogMjA0OCxcclxuICAgICAgICBtZW1vcnk6IDQwOTYsXHJcbiAgICAgICAgbWluQ2FwYWNpdHk6IDMsXHJcbiAgICAgICAgbWF4Q2FwYWNpdHk6IDIwLFxyXG4gICAgICAgIHRhcmdldENwdVV0aWxpemF0aW9uOiA2MCxcclxuICAgICAgICB0YXJnZXRNZW1vcnlVdGlsaXphdGlvbjogNzAsXHJcbiAgICAgICAgZGVzaXJlZENvdW50OiAzLFxyXG4gICAgICB9LFxyXG4gICAgICByZWRpczoge1xyXG4gICAgICAgIG5vZGVUeXBlOiAnY2FjaGUucjUubGFyZ2UnLFxyXG4gICAgICAgIG51bUNhY2hlTm9kZXM6IDMsXHJcbiAgICAgICAgYXV0b21hdGljRmFpbG92ZXI6IHRydWUsXHJcbiAgICAgICAgbXVsdGlBekVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgdHJhbnNpdEVuY3J5cHRpb25FbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIGF0UmVzdEVuY3J5cHRpb25FbmFibGVkOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgICBtb25pdG9yaW5nOiB7XHJcbiAgICAgICAgZW5hYmxlRGV0YWlsZWRNb25pdG9yaW5nOiB0cnVlLFxyXG4gICAgICAgIGxvZ1JldGVudGlvbkRheXM6IDMwLFxyXG4gICAgICAgIGFsYXJtRW1haWw6ICdwcm9kLWFsZXJ0c0Bjb21wYW55LmNvbScsXHJcbiAgICAgICAgZW5hYmxlWFJheTogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgICAgc2VjdXJpdHk6IHtcclxuICAgICAgICBlbmFibGVXYWY6IHRydWUsXHJcbiAgICAgICAgZW5hYmxlQ2xvdWRUcmFpbDogdHJ1ZSxcclxuICAgICAgICBlbmFibGVHdWFyZER1dHk6IHRydWUsXHJcbiAgICAgICAgc3NsQ2VydGlmaWNhdGVBcm46ICdhcm46YXdzOmFjbTp1cy1lYXN0LTE6QUNDT1VOVDpjZXJ0aWZpY2F0ZS9DRVJULUlEJyxcclxuICAgICAgICBkb21haW5OYW1lOiAnYXBpLnJlY3J1aXRtZW50d2Vic2l0ZS5jb20nLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9O1xyXG5cclxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGVudmlyb25tZW50OiBzdHJpbmcpIHt9XHJcblxyXG4gIHB1YmxpYyBnZXQgY29uZmlnKCk6IEVudmlyb25tZW50Q29uZmlndXJhdGlvbiB7XHJcbiAgICBjb25zdCBjb25maWcgPSB0aGlzLmNvbmZpZ3NbdGhpcy5lbnZpcm9ubWVudF07XHJcbiAgICBpZiAoIWNvbmZpZykge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIGNvbmZpZ3VyYXRpb24gZm91bmQgZm9yIGVudmlyb25tZW50OiAke3RoaXMuZW52aXJvbm1lbnR9YCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gY29uZmlnO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGdldCBpc1Byb2QoKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gdGhpcy5lbnZpcm9ubWVudCA9PT0gJ3Byb2QnO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGdldCBpc0RldigpOiBib29sZWFuIHtcclxuICAgIHJldHVybiB0aGlzLmVudmlyb25tZW50ID09PSAnZGV2JztcclxuICB9XHJcblxyXG4gIHB1YmxpYyBnZXQgaXNTdGFnaW5nKCk6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIHRoaXMuZW52aXJvbm1lbnQgPT09ICdzdGFnaW5nJztcclxuICB9XHJcbn0iXX0=