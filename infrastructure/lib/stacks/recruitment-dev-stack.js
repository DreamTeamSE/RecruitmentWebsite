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
exports.RecruitmentDevStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const recruitment_network_stack_1 = require("./recruitment-network-stack");
const recruitment_data_stack_1 = require("./recruitment-data-stack");
const recruitment_backend_stack_1 = require("./recruitment-backend-stack");
const recruitment_frontend_stack_1 = require("./recruitment-frontend-stack");
class RecruitmentDevStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Create Network Stack
        const networkStack = new recruitment_network_stack_1.RecruitmentNetworkStack(this, 'NetworkStack', {
            env: props.config.env,
            config: props.config,
        });
        // Create Data Stack
        const dataStack = new recruitment_data_stack_1.RecruitmentDataStack(this, 'DataStack', {
            env: props.config.env,
            config: props.config,
            vpc: networkStack.vpc,
            databaseSecurityGroup: networkStack.databaseSecurityGroup,
            redisSecurityGroup: networkStack.redisSecurityGroup,
        });
        // Create Backend Stack
        const backendStack = new recruitment_backend_stack_1.RecruitmentBackendStack(this, 'BackendStack', {
            env: props.config.env,
            config: props.config,
            vpc: networkStack.vpc,
            cluster: networkStack.cluster,
            loadBalancer: networkStack.loadBalancer,
            backendSecurityGroup: networkStack.backendSecurityGroup,
            database: dataStack.databaseConstruct,
            redis: dataStack.redis,
            assetsBucket: dataStack.assetsBucket,
        });
        // Create Frontend Stack
        const frontendStack = new recruitment_frontend_stack_1.RecruitmentFrontendStack(this, 'FrontendStack', {
            env: props.config.env,
            config: props.config,
            backendUrl: backendStack.backendUrl,
        });
        // Add dependencies
        dataStack.addDependency(networkStack);
        backendStack.addDependency(dataStack);
        frontendStack.addDependency(backendStack);
        // Add tags to all resources
        cdk.Tags.of(this).add('Environment', props.config.environmentName);
        cdk.Tags.of(this).add('Project', 'RecruitmentWebsite');
        cdk.Tags.of(this).add('ManagedBy', 'CDK');
    }
}
exports.RecruitmentDevStack = RecruitmentDevStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjcnVpdG1lbnQtZGV2LXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicmVjcnVpdG1lbnQtZGV2LXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUVuQywyRUFBc0U7QUFDdEUscUVBQWdFO0FBQ2hFLDJFQUFzRTtBQUN0RSw2RUFBd0U7QUFPeEUsTUFBYSxtQkFBb0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUNoRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQStCO1FBQ3ZFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLHVCQUF1QjtRQUN2QixNQUFNLFlBQVksR0FBRyxJQUFJLG1EQUF1QixDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDckUsR0FBRyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRztZQUNyQixNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU07U0FDckIsQ0FBQyxDQUFDO1FBRUgsb0JBQW9CO1FBQ3BCLE1BQU0sU0FBUyxHQUFHLElBQUksNkNBQW9CLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRTtZQUM1RCxHQUFHLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHO1lBQ3JCLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtZQUNwQixHQUFHLEVBQUUsWUFBWSxDQUFDLEdBQUc7WUFDckIscUJBQXFCLEVBQUUsWUFBWSxDQUFDLHFCQUFxQjtZQUN6RCxrQkFBa0IsRUFBRSxZQUFZLENBQUMsa0JBQWtCO1NBQ3BELENBQUMsQ0FBQztRQUVILHVCQUF1QjtRQUN2QixNQUFNLFlBQVksR0FBRyxJQUFJLG1EQUF1QixDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDckUsR0FBRyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRztZQUNyQixNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU07WUFDcEIsR0FBRyxFQUFFLFlBQVksQ0FBQyxHQUFHO1lBQ3JCLE9BQU8sRUFBRSxZQUFZLENBQUMsT0FBTztZQUM3QixZQUFZLEVBQUUsWUFBWSxDQUFDLFlBQVk7WUFDdkMsb0JBQW9CLEVBQUUsWUFBWSxDQUFDLG9CQUFvQjtZQUN2RCxRQUFRLEVBQUUsU0FBUyxDQUFDLGlCQUFpQjtZQUNyQyxLQUFLLEVBQUUsU0FBUyxDQUFDLEtBQUs7WUFDdEIsWUFBWSxFQUFFLFNBQVMsQ0FBQyxZQUFZO1NBQ3JDLENBQUMsQ0FBQztRQUVILHdCQUF3QjtRQUN4QixNQUFNLGFBQWEsR0FBRyxJQUFJLHFEQUF3QixDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDeEUsR0FBRyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRztZQUNyQixNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU07WUFDcEIsVUFBVSxFQUFFLFlBQVksQ0FBQyxVQUFVO1NBQ3BDLENBQUMsQ0FBQztRQUVILG1CQUFtQjtRQUNuQixTQUFTLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3RDLFlBQVksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdEMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUUxQyw0QkFBNEI7UUFDNUIsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ25FLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUN2RCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzVDLENBQUM7Q0FDRjtBQWpERCxrREFpREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuaW1wb3J0IHsgUmVjcnVpdG1lbnROZXR3b3JrU3RhY2sgfSBmcm9tICcuL3JlY3J1aXRtZW50LW5ldHdvcmstc3RhY2snO1xyXG5pbXBvcnQgeyBSZWNydWl0bWVudERhdGFTdGFjayB9IGZyb20gJy4vcmVjcnVpdG1lbnQtZGF0YS1zdGFjayc7XHJcbmltcG9ydCB7IFJlY3J1aXRtZW50QmFja2VuZFN0YWNrIH0gZnJvbSAnLi9yZWNydWl0bWVudC1iYWNrZW5kLXN0YWNrJztcclxuaW1wb3J0IHsgUmVjcnVpdG1lbnRGcm9udGVuZFN0YWNrIH0gZnJvbSAnLi9yZWNydWl0bWVudC1mcm9udGVuZC1zdGFjayc7XHJcbmltcG9ydCB7IEVudmlyb25tZW50Q29uZmlnIH0gZnJvbSAnLi4vY29uZmlnL3R5cGVzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVjcnVpdG1lbnREZXZTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xyXG4gIGNvbmZpZzogRW52aXJvbm1lbnRDb25maWc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBSZWNydWl0bWVudERldlN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogUmVjcnVpdG1lbnREZXZTdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgTmV0d29yayBTdGFja1xyXG4gICAgY29uc3QgbmV0d29ya1N0YWNrID0gbmV3IFJlY3J1aXRtZW50TmV0d29ya1N0YWNrKHRoaXMsICdOZXR3b3JrU3RhY2snLCB7XHJcbiAgICAgIGVudjogcHJvcHMuY29uZmlnLmVudixcclxuICAgICAgY29uZmlnOiBwcm9wcy5jb25maWcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgRGF0YSBTdGFja1xyXG4gICAgY29uc3QgZGF0YVN0YWNrID0gbmV3IFJlY3J1aXRtZW50RGF0YVN0YWNrKHRoaXMsICdEYXRhU3RhY2snLCB7XHJcbiAgICAgIGVudjogcHJvcHMuY29uZmlnLmVudixcclxuICAgICAgY29uZmlnOiBwcm9wcy5jb25maWcsXHJcbiAgICAgIHZwYzogbmV0d29ya1N0YWNrLnZwYyxcclxuICAgICAgZGF0YWJhc2VTZWN1cml0eUdyb3VwOiBuZXR3b3JrU3RhY2suZGF0YWJhc2VTZWN1cml0eUdyb3VwLFxyXG4gICAgICByZWRpc1NlY3VyaXR5R3JvdXA6IG5ldHdvcmtTdGFjay5yZWRpc1NlY3VyaXR5R3JvdXAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgQmFja2VuZCBTdGFja1xyXG4gICAgY29uc3QgYmFja2VuZFN0YWNrID0gbmV3IFJlY3J1aXRtZW50QmFja2VuZFN0YWNrKHRoaXMsICdCYWNrZW5kU3RhY2snLCB7XHJcbiAgICAgIGVudjogcHJvcHMuY29uZmlnLmVudixcclxuICAgICAgY29uZmlnOiBwcm9wcy5jb25maWcsXHJcbiAgICAgIHZwYzogbmV0d29ya1N0YWNrLnZwYyxcclxuICAgICAgY2x1c3RlcjogbmV0d29ya1N0YWNrLmNsdXN0ZXIsXHJcbiAgICAgIGxvYWRCYWxhbmNlcjogbmV0d29ya1N0YWNrLmxvYWRCYWxhbmNlcixcclxuICAgICAgYmFja2VuZFNlY3VyaXR5R3JvdXA6IG5ldHdvcmtTdGFjay5iYWNrZW5kU2VjdXJpdHlHcm91cCxcclxuICAgICAgZGF0YWJhc2U6IGRhdGFTdGFjay5kYXRhYmFzZUNvbnN0cnVjdCxcclxuICAgICAgcmVkaXM6IGRhdGFTdGFjay5yZWRpcyxcclxuICAgICAgYXNzZXRzQnVja2V0OiBkYXRhU3RhY2suYXNzZXRzQnVja2V0LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIEZyb250ZW5kIFN0YWNrXHJcbiAgICBjb25zdCBmcm9udGVuZFN0YWNrID0gbmV3IFJlY3J1aXRtZW50RnJvbnRlbmRTdGFjayh0aGlzLCAnRnJvbnRlbmRTdGFjaycsIHtcclxuICAgICAgZW52OiBwcm9wcy5jb25maWcuZW52LFxyXG4gICAgICBjb25maWc6IHByb3BzLmNvbmZpZyxcclxuICAgICAgYmFja2VuZFVybDogYmFja2VuZFN0YWNrLmJhY2tlbmRVcmwsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgZGVwZW5kZW5jaWVzXHJcbiAgICBkYXRhU3RhY2suYWRkRGVwZW5kZW5jeShuZXR3b3JrU3RhY2spO1xyXG4gICAgYmFja2VuZFN0YWNrLmFkZERlcGVuZGVuY3koZGF0YVN0YWNrKTtcclxuICAgIGZyb250ZW5kU3RhY2suYWRkRGVwZW5kZW5jeShiYWNrZW5kU3RhY2spO1xyXG5cclxuICAgIC8vIEFkZCB0YWdzIHRvIGFsbCByZXNvdXJjZXNcclxuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnRW52aXJvbm1lbnQnLCBwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnUHJvamVjdCcsICdSZWNydWl0bWVudFdlYnNpdGUnKTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnTWFuYWdlZEJ5JywgJ0NESycpO1xyXG4gIH1cclxufSJdfQ==