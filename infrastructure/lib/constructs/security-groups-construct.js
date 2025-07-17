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
exports.SecurityGroupsConstruct = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const constructs_1 = require("constructs");
class SecurityGroupsConstruct extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { vpc, environment } = props;
        // Create security groups
        this.albSecurityGroup = this.createAlbSecurityGroup(vpc, environment);
        this.ecsSecurityGroup = this.createEcsSecurityGroup(vpc, environment);
        this.rdsSecurityGroup = this.createRdsSecurityGroup(vpc, environment);
        this.redisSecurityGroup = this.createRedisSecurityGroup(vpc, environment);
        // Configure security group rules
        this.configureSecurityGroupRules();
    }
    createAlbSecurityGroup(vpc, environment) {
        const sg = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
            vpc,
            description: 'Security group for Application Load Balancer',
            securityGroupName: `recruitment-alb-sg-${environment}`,
            allowAllOutbound: true,
        });
        // Allow HTTP and HTTPS traffic from anywhere
        sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic from anywhere');
        sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic from anywhere');
        // For development, also allow direct access to port 3000
        if (environment === 'dev') {
            sg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3000), 'Allow direct access to backend port for development');
        }
        this.addCommonTags(sg, 'ALB', environment);
        return sg;
    }
    createEcsSecurityGroup(vpc, environment) {
        const sg = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
            vpc,
            description: 'Security group for ECS Fargate tasks',
            securityGroupName: `recruitment-ecs-sg-${environment}`,
            allowAllOutbound: true,
        });
        // Allow traffic from ALB on port 3000 (backend port)
        sg.addIngressRule(this.albSecurityGroup, ec2.Port.tcp(3000), 'Allow traffic from ALB to backend');
        // Allow health check traffic
        sg.addIngressRule(this.albSecurityGroup, ec2.Port.tcp(3000), 'Allow health check traffic from ALB');
        this.addCommonTags(sg, 'ECS', environment);
        return sg;
    }
    createRdsSecurityGroup(vpc, environment) {
        const sg = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
            vpc,
            description: 'Security group for RDS PostgreSQL database',
            securityGroupName: `recruitment-rds-sg-${environment}`,
            allowAllOutbound: false,
        });
        // Allow PostgreSQL traffic from ECS tasks
        sg.addIngressRule(this.ecsSecurityGroup, ec2.Port.tcp(5432), 'Allow PostgreSQL traffic from ECS tasks');
        // For development, allow access from VPC CIDR for debugging
        if (environment === 'dev') {
            sg.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(5432), 'Allow PostgreSQL access from VPC for development');
        }
        this.addCommonTags(sg, 'RDS', environment);
        return sg;
    }
    createRedisSecurityGroup(vpc, environment) {
        const sg = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
            vpc,
            description: 'Security group for ElastiCache Redis',
            securityGroupName: `recruitment-redis-sg-${environment}`,
            allowAllOutbound: false,
        });
        // Allow Redis traffic from ECS tasks
        sg.addIngressRule(this.ecsSecurityGroup, ec2.Port.tcp(6379), 'Allow Redis traffic from ECS tasks');
        // For development, allow access from VPC CIDR for debugging
        if (environment === 'dev') {
            sg.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(6379), 'Allow Redis access from VPC for development');
        }
        this.addCommonTags(sg, 'Redis', environment);
        return sg;
    }
    configureSecurityGroupRules() {
        // Additional security group rules can be added here
        // For example, allowing communication between services
        // Allow ECS tasks to connect to RDS
        this.rdsSecurityGroup.connections.allowFrom(this.ecsSecurityGroup, ec2.Port.tcp(5432), 'Allow ECS to connect to RDS');
        // Allow ECS tasks to connect to Redis
        this.redisSecurityGroup.connections.allowFrom(this.ecsSecurityGroup, ec2.Port.tcp(6379), 'Allow ECS to connect to Redis');
    }
    addCommonTags(sg, type, environment) {
        const tags = {
            Name: `recruitment-${type.toLowerCase()}-sg-${environment}`,
            Environment: environment,
            Project: 'RecruitmentWebsite',
            Type: type,
            ManagedBy: 'CDK',
        };
        Object.entries(tags).forEach(([key, value]) => {
            cdk.Tags.of(sg).add(key, value);
        });
    }
    /**
     * Create a security group for bastion host (if needed for debugging)
     */
    createBastionSecurityGroup(vpc, environment) {
        const sg = new ec2.SecurityGroup(this, 'BastionSecurityGroup', {
            vpc,
            description: 'Security group for bastion host',
            securityGroupName: `recruitment-bastion-sg-${environment}`,
            allowAllOutbound: true,
        });
        // Allow SSH access from specific IP ranges (customize as needed)
        sg.addIngressRule(ec2.Peer.ipv4('0.0.0.0/0'), // Replace with your IP range
        ec2.Port.tcp(22), 'Allow SSH access to bastion host');
        this.addCommonTags(sg, 'Bastion', environment);
        return sg;
    }
    /**
     * Add additional ingress rules for development/debugging
     */
    addDevelopmentRules() {
        // Allow all traffic within VPC for development
        this.ecsSecurityGroup.addIngressRule(ec2.Peer.ipv4('10.0.0.0/16'), ec2.Port.allTraffic(), 'Allow all traffic within VPC for development');
    }
    /**
     * Add production-specific security rules
     */
    addProductionRules() {
        // Add stricter rules for production
        // For example, restrict source IP ranges, add WAF integration, etc.
    }
}
exports.SecurityGroupsConstruct = SecurityGroupsConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjdXJpdHktZ3JvdXBzLWNvbnN0cnVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNlY3VyaXR5LWdyb3Vwcy1jb25zdHJ1Y3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHlEQUEyQztBQUMzQywyQ0FBdUM7QUFPdkMsTUFBYSx1QkFBd0IsU0FBUSxzQkFBUztJQU1wRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQW1DO1FBQzNFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFbkMseUJBQXlCO1FBQ3pCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3RFLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3RFLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3RFLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRTFFLGlDQUFpQztRQUNqQyxJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRU8sc0JBQXNCLENBQUMsR0FBYSxFQUFFLFdBQW1CO1FBQy9ELE1BQU0sRUFBRSxHQUFHLElBQUksR0FBRyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDekQsR0FBRztZQUNILFdBQVcsRUFBRSw4Q0FBOEM7WUFDM0QsaUJBQWlCLEVBQUUsc0JBQXNCLFdBQVcs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QU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztJQUVEOztPQUVHO0lBQ0ksbUJBQW1CO1FBQ3hCLCtDQUErQztRQUMvQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUNsQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsRUFDNUIsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFDckIsOENBQThDLENBQy9DLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSSxrQkFBa0I7UUFDdkIsb0NBQW9DO1FBQ3BDLG9FQUFvRTtJQUN0RSxDQUFDO0NBQ0Y7QUFuTkQsMERBbU5DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgU2VjdXJpdHlHcm91cHNDb25zdHJ1Y3RQcm9wcyB7XHJcbiAgdnBjOiBlYzIuSVZwYztcclxuICBlbnZpcm9ubWVudDogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU2VjdXJpdHlHcm91cHNDb25zdHJ1Y3QgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHB1YmxpYyByZWFkb25seSBhbGJTZWN1cml0eUdyb3VwOiBlYzIuU2VjdXJpdHlHcm91cDtcclxuICBwdWJsaWMgcmVhZG9ubHkgZWNzU2VjdXJpdHlHcm91cDogZWMyLlNlY3VyaXR5R3JvdXA7XHJcbiAgcHVibGljIHJlYWRvbmx5IHJkc1NlY3VyaXR5R3JvdXA6IGVjMi5TZWN1cml0eUdyb3VwO1xyXG4gIHB1YmxpYyByZWFkb25seSByZWRpc1NlY3VyaXR5R3JvdXA6IGVjMi5TZWN1cml0eUdyb3VwO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogU2VjdXJpdHlHcm91cHNDb25zdHJ1Y3RQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICBjb25zdCB7IHZwYywgZW52aXJvbm1lbnQgfSA9IHByb3BzO1xyXG5cclxuICAgIC8vIENyZWF0ZSBzZWN1cml0eSBncm91cHNcclxuICAgIHRoaXMuYWxiU2VjdXJpdHlHcm91cCA9IHRoaXMuY3JlYXRlQWxiU2VjdXJpdHlHcm91cCh2cGMsIGVudmlyb25tZW50KTtcclxuICAgIHRoaXMuZWNzU2VjdXJpdHlHcm91cCA9IHRoaXMuY3JlYXRlRWNzU2VjdXJpdHlHcm91cCh2cGMsIGVudmlyb25tZW50KTtcclxuICAgIHRoaXMucmRzU2VjdXJpdHlHcm91cCA9IHRoaXMuY3JlYXRlUmRzU2VjdXJpdHlHcm91cCh2cGMsIGVudmlyb25tZW50KTtcclxuICAgIHRoaXMucmVkaXNTZWN1cml0eUdyb3VwID0gdGhpcy5jcmVhdGVSZWRpc1NlY3VyaXR5R3JvdXAodnBjLCBlbnZpcm9ubWVudCk7XHJcblxyXG4gICAgLy8gQ29uZmlndXJlIHNlY3VyaXR5IGdyb3VwIHJ1bGVzXHJcbiAgICB0aGlzLmNvbmZpZ3VyZVNlY3VyaXR5R3JvdXBSdWxlcygpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjcmVhdGVBbGJTZWN1cml0eUdyb3VwKHZwYzogZWMyLklWcGMsIGVudmlyb25tZW50OiBzdHJpbmcpOiBlYzIuU2VjdXJpdHlHcm91cCB7XHJcbiAgICBjb25zdCBzZyA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnQWxiU2VjdXJpdHlHcm91cCcsIHtcclxuICAgICAgdnBjLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NlY3VyaXR5IGdyb3VwIGZvciBBcHBsaWNhdGlvbiBMb2FkIEJhbGFuY2VyJyxcclxuICAgICAgc2VjdXJpdHlHcm91cE5hbWU6IGByZWNydWl0bWVudC1hbGItc2ctJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBhbGxvd0FsbE91dGJvdW5kOiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWxsb3cgSFRUUCBhbmQgSFRUUFMgdHJhZmZpYyBmcm9tIGFueXdoZXJlXHJcbiAgICBzZy5hZGRJbmdyZXNzUnVsZShcclxuICAgICAgZWMyLlBlZXIuYW55SXB2NCgpLFxyXG4gICAgICBlYzIuUG9ydC50Y3AoODApLFxyXG4gICAgICAnQWxsb3cgSFRUUCB0cmFmZmljIGZyb20gYW55d2hlcmUnXHJcbiAgICApO1xyXG5cclxuICAgIHNnLmFkZEluZ3Jlc3NSdWxlKFxyXG4gICAgICBlYzIuUGVlci5hbnlJcHY0KCksXHJcbiAgICAgIGVjMi5Qb3J0LnRjcCg0NDMpLFxyXG4gICAgICAnQWxsb3cgSFRUUFMgdHJhZmZpYyBmcm9tIGFueXdoZXJlJ1xyXG4gICAgKTtcclxuXHJcbiAgICAvLyBGb3IgZGV2ZWxvcG1lbnQsIGFsc28gYWxsb3cgZGlyZWN0IGFjY2VzcyB0byBwb3J0IDMwMDBcclxuICAgIGlmIChlbnZpcm9ubWVudCA9PT0gJ2RldicpIHtcclxuICAgICAgc2cuYWRkSW5ncmVzc1J1bGUoXHJcbiAgICAgICAgZWMyLlBlZXIuYW55SXB2NCgpLFxyXG4gICAgICAgIGVjMi5Qb3J0LnRjcCgzMDAwKSxcclxuICAgICAgICAnQWxsb3cgZGlyZWN0IGFjY2VzcyB0byBiYWNrZW5kIHBvcnQgZm9yIGRldmVsb3BtZW50J1xyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuYWRkQ29tbW9uVGFncyhzZywgJ0FMQicsIGVudmlyb25tZW50KTtcclxuICAgIHJldHVybiBzZztcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlRWNzU2VjdXJpdHlHcm91cCh2cGM6IGVjMi5JVnBjLCBlbnZpcm9ubWVudDogc3RyaW5nKTogZWMyLlNlY3VyaXR5R3JvdXAge1xyXG4gICAgY29uc3Qgc2cgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ0Vjc1NlY3VyaXR5R3JvdXAnLCB7XHJcbiAgICAgIHZwYyxcclxuICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgRUNTIEZhcmdhdGUgdGFza3MnLFxyXG4gICAgICBzZWN1cml0eUdyb3VwTmFtZTogYHJlY3J1aXRtZW50LWVjcy1zZy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IHRydWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBbGxvdyB0cmFmZmljIGZyb20gQUxCIG9uIHBvcnQgMzAwMCAoYmFja2VuZCBwb3J0KVxyXG4gICAgc2cuYWRkSW5ncmVzc1J1bGUoXHJcbiAgICAgIHRoaXMuYWxiU2VjdXJpdHlHcm91cCxcclxuICAgICAgZWMyLlBvcnQudGNwKDMwMDApLFxyXG4gICAgICAnQWxsb3cgdHJhZmZpYyBmcm9tIEFMQiB0byBiYWNrZW5kJ1xyXG4gICAgKTtcclxuXHJcbiAgICAvLyBBbGxvdyBoZWFsdGggY2hlY2sgdHJhZmZpY1xyXG4gICAgc2cuYWRkSW5ncmVzc1J1bGUoXHJcbiAgICAgIHRoaXMuYWxiU2VjdXJpdHlHcm91cCxcclxuICAgICAgZWMyLlBvcnQudGNwKDMwMDApLFxyXG4gICAgICAnQWxsb3cgaGVhbHRoIGNoZWNrIHRyYWZmaWMgZnJvbSBBTEInXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuYWRkQ29tbW9uVGFncyhzZywgJ0VDUycsIGVudmlyb25tZW50KTtcclxuICAgIHJldHVybiBzZztcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlUmRzU2VjdXJpdHlHcm91cCh2cGM6IGVjMi5JVnBjLCBlbnZpcm9ubWVudDogc3RyaW5nKTogZWMyLlNlY3VyaXR5R3JvdXAge1xyXG4gICAgY29uc3Qgc2cgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ1Jkc1NlY3VyaXR5R3JvdXAnLCB7XHJcbiAgICAgIHZwYyxcclxuICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgUkRTIFBvc3RncmVTUUwgZGF0YWJhc2UnLFxyXG4gICAgICBzZWN1cml0eUdyb3VwTmFtZTogYHJlY3J1aXRtZW50LXJkcy1zZy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IGZhbHNlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWxsb3cgUG9zdGdyZVNRTCB0cmFmZmljIGZyb20gRUNTIHRhc2tzXHJcbiAgICBzZy5hZGRJbmdyZXNzUnVsZShcclxuICAgICAgdGhpcy5lY3NTZWN1cml0eUdyb3VwLFxyXG4gICAgICBlYzIuUG9ydC50Y3AoNTQzMiksXHJcbiAgICAgICdBbGxvdyBQb3N0Z3JlU1FMIHRyYWZmaWMgZnJvbSBFQ1MgdGFza3MnXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEZvciBkZXZlbG9wbWVudCwgYWxsb3cgYWNjZXNzIGZyb20gVlBDIENJRFIgZm9yIGRlYnVnZ2luZ1xyXG4gICAgaWYgKGVudmlyb25tZW50ID09PSAnZGV2Jykge1xyXG4gICAgICBzZy5hZGRJbmdyZXNzUnVsZShcclxuICAgICAgICBlYzIuUGVlci5pcHY0KHZwYy52cGNDaWRyQmxvY2spLFxyXG4gICAgICAgIGVjMi5Qb3J0LnRjcCg1NDMyKSxcclxuICAgICAgICAnQWxsb3cgUG9zdGdyZVNRTCBhY2Nlc3MgZnJvbSBWUEMgZm9yIGRldmVsb3BtZW50J1xyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuYWRkQ29tbW9uVGFncyhzZywgJ1JEUycsIGVudmlyb25tZW50KTtcclxuICAgIHJldHVybiBzZztcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlUmVkaXNTZWN1cml0eUdyb3VwKHZwYzogZWMyLklWcGMsIGVudmlyb25tZW50OiBzdHJpbmcpOiBlYzIuU2VjdXJpdHlHcm91cCB7XHJcbiAgICBjb25zdCBzZyA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnUmVkaXNTZWN1cml0eUdyb3VwJywge1xyXG4gICAgICB2cGMsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2VjdXJpdHkgZ3JvdXAgZm9yIEVsYXN0aUNhY2hlIFJlZGlzJyxcclxuICAgICAgc2VjdXJpdHlHcm91cE5hbWU6IGByZWNydWl0bWVudC1yZWRpcy1zZy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IGZhbHNlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWxsb3cgUmVkaXMgdHJhZmZpYyBmcm9tIEVDUyB0YXNrc1xyXG4gICAgc2cuYWRkSW5ncmVzc1J1bGUoXHJcbiAgICAgIHRoaXMuZWNzU2VjdXJpdHlHcm91cCxcclxuICAgICAgZWMyLlBvcnQudGNwKDYzNzkpLFxyXG4gICAgICAnQWxsb3cgUmVkaXMgdHJhZmZpYyBmcm9tIEVDUyB0YXNrcydcclxuICAgICk7XHJcblxyXG4gICAgLy8gRm9yIGRldmVsb3BtZW50LCBhbGxvdyBhY2Nlc3MgZnJvbSBWUEMgQ0lEUiBmb3IgZGVidWdnaW5nXHJcbiAgICBpZiAoZW52aXJvbm1lbnQgPT09ICdkZXYnKSB7XHJcbiAgICAgIHNnLmFkZEluZ3Jlc3NSdWxlKFxyXG4gICAgICAgIGVjMi5QZWVyLmlwdjQodnBjLnZwY0NpZHJCbG9jayksXHJcbiAgICAgICAgZWMyLlBvcnQudGNwKDYzNzkpLFxyXG4gICAgICAgICdBbGxvdyBSZWRpcyBhY2Nlc3MgZnJvbSBWUEMgZm9yIGRldmVsb3BtZW50J1xyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuYWRkQ29tbW9uVGFncyhzZywgJ1JlZGlzJywgZW52aXJvbm1lbnQpO1xyXG4gICAgcmV0dXJuIHNnO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjb25maWd1cmVTZWN1cml0eUdyb3VwUnVsZXMoKTogdm9pZCB7XHJcbiAgICAvLyBBZGRpdGlvbmFsIHNlY3VyaXR5IGdyb3VwIHJ1bGVzIGNhbiBiZSBhZGRlZCBoZXJlXHJcbiAgICAvLyBGb3IgZXhhbXBsZSwgYWxsb3dpbmcgY29tbXVuaWNhdGlvbiBiZXR3ZWVuIHNlcnZpY2VzXHJcblxyXG4gICAgLy8gQWxsb3cgRUNTIHRhc2tzIHRvIGNvbm5lY3QgdG8gUkRTXHJcbiAgICB0aGlzLnJkc1NlY3VyaXR5R3JvdXAuY29ubmVjdGlvbnMuYWxsb3dGcm9tKFxyXG4gICAgICB0aGlzLmVjc1NlY3VyaXR5R3JvdXAsXHJcbiAgICAgIGVjMi5Qb3J0LnRjcCg1NDMyKSxcclxuICAgICAgJ0FsbG93IEVDUyB0byBjb25uZWN0IHRvIFJEUydcclxuICAgICk7XHJcblxyXG4gICAgLy8gQWxsb3cgRUNTIHRhc2tzIHRvIGNvbm5lY3QgdG8gUmVkaXNcclxuICAgIHRoaXMucmVkaXNTZWN1cml0eUdyb3VwLmNvbm5lY3Rpb25zLmFsbG93RnJvbShcclxuICAgICAgdGhpcy5lY3NTZWN1cml0eUdyb3VwLFxyXG4gICAgICBlYzIuUG9ydC50Y3AoNjM3OSksXHJcbiAgICAgICdBbGxvdyBFQ1MgdG8gY29ubmVjdCB0byBSZWRpcydcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFkZENvbW1vblRhZ3Moc2c6IGVjMi5TZWN1cml0eUdyb3VwLCB0eXBlOiBzdHJpbmcsIGVudmlyb25tZW50OiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIGNvbnN0IHRhZ3MgPSB7XHJcbiAgICAgIE5hbWU6IGByZWNydWl0bWVudC0ke3R5cGUudG9Mb3dlckNhc2UoKX0tc2ctJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBFbnZpcm9ubWVudDogZW52aXJvbm1lbnQsXHJcbiAgICAgIFByb2plY3Q6ICdSZWNydWl0bWVudFdlYnNpdGUnLFxyXG4gICAgICBUeXBlOiB0eXBlLFxyXG4gICAgICBNYW5hZ2VkQnk6ICdDREsnLFxyXG4gICAgfTtcclxuXHJcbiAgICBPYmplY3QuZW50cmllcyh0YWdzKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcclxuICAgICAgY2RrLlRhZ3Mub2Yoc2cpLmFkZChrZXksIHZhbHVlKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIGEgc2VjdXJpdHkgZ3JvdXAgZm9yIGJhc3Rpb24gaG9zdCAoaWYgbmVlZGVkIGZvciBkZWJ1Z2dpbmcpXHJcbiAgICovXHJcbiAgcHVibGljIGNyZWF0ZUJhc3Rpb25TZWN1cml0eUdyb3VwKHZwYzogZWMyLklWcGMsIGVudmlyb25tZW50OiBzdHJpbmcpOiBlYzIuU2VjdXJpdHlHcm91cCB7XHJcbiAgICBjb25zdCBzZyA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnQmFzdGlvblNlY3VyaXR5R3JvdXAnLCB7XHJcbiAgICAgIHZwYyxcclxuICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgYmFzdGlvbiBob3N0JyxcclxuICAgICAgc2VjdXJpdHlHcm91cE5hbWU6IGByZWNydWl0bWVudC1iYXN0aW9uLXNnLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgYWxsb3dBbGxPdXRib3VuZDogdHJ1ZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFsbG93IFNTSCBhY2Nlc3MgZnJvbSBzcGVjaWZpYyBJUCByYW5nZXMgKGN1c3RvbWl6ZSBhcyBuZWVkZWQpXHJcbiAgICBzZy5hZGRJbmdyZXNzUnVsZShcclxuICAgICAgZWMyLlBlZXIuaXB2NCgnMC4wLjAuMC8wJyksIC8vIFJlcGxhY2Ugd2l0aCB5b3VyIElQIHJhbmdlXHJcbiAgICAgIGVjMi5Qb3J0LnRjcCgyMiksXHJcbiAgICAgICdBbGxvdyBTU0ggYWNjZXNzIHRvIGJhc3Rpb24gaG9zdCdcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5hZGRDb21tb25UYWdzKHNnLCAnQmFzdGlvbicsIGVudmlyb25tZW50KTtcclxuICAgIHJldHVybiBzZztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEFkZCBhZGRpdGlvbmFsIGluZ3Jlc3MgcnVsZXMgZm9yIGRldmVsb3BtZW50L2RlYnVnZ2luZ1xyXG4gICAqL1xyXG4gIHB1YmxpYyBhZGREZXZlbG9wbWVudFJ1bGVzKCk6IHZvaWQge1xyXG4gICAgLy8gQWxsb3cgYWxsIHRyYWZmaWMgd2l0aGluIFZQQyBmb3IgZGV2ZWxvcG1lbnRcclxuICAgIHRoaXMuZWNzU2VjdXJpdHlHcm91cC5hZGRJbmdyZXNzUnVsZShcclxuICAgICAgZWMyLlBlZXIuaXB2NCgnMTAuMC4wLjAvMTYnKSxcclxuICAgICAgZWMyLlBvcnQuYWxsVHJhZmZpYygpLFxyXG4gICAgICAnQWxsb3cgYWxsIHRyYWZmaWMgd2l0aGluIFZQQyBmb3IgZGV2ZWxvcG1lbnQnXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQWRkIHByb2R1Y3Rpb24tc3BlY2lmaWMgc2VjdXJpdHkgcnVsZXNcclxuICAgKi9cclxuICBwdWJsaWMgYWRkUHJvZHVjdGlvblJ1bGVzKCk6IHZvaWQge1xyXG4gICAgLy8gQWRkIHN0cmljdGVyIHJ1bGVzIGZvciBwcm9kdWN0aW9uXHJcbiAgICAvLyBGb3IgZXhhbXBsZSwgcmVzdHJpY3Qgc291cmNlIElQIHJhbmdlcywgYWRkIFdBRiBpbnRlZ3JhdGlvbiwgZXRjLlxyXG4gIH1cclxufSJdfQ==