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
exports.RecruitmentProdStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const recruitment_network_stack_1 = require("./recruitment-network-stack");
const recruitment_data_stack_1 = require("./recruitment-data-stack");
const recruitment_backend_stack_1 = require("./recruitment-backend-stack");
const recruitment_frontend_stack_1 = require("./recruitment-frontend-stack");
class RecruitmentProdStack extends cdk.Stack {
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
exports.RecruitmentProdStack = RecruitmentProdStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjcnVpdG1lbnQtcHJvZC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJlY3J1aXRtZW50LXByb2Qtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBRW5DLDJFQUFzRTtBQUN0RSxxRUFBZ0U7QUFDaEUsMkVBQXNFO0FBQ3RFLDZFQUF3RTtBQU94RSxNQUFhLG9CQUFxQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ2pELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBZ0M7UUFDeEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsdUJBQXVCO1FBQ3ZCLE1BQU0sWUFBWSxHQUFHLElBQUksbURBQXVCLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUNyRSxHQUFHLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHO1lBQ3JCLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtTQUNyQixDQUFDLENBQUM7UUFFSCxvQkFBb0I7UUFDcEIsTUFBTSxTQUFTLEdBQUcsSUFBSSw2Q0FBb0IsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFO1lBQzVELEdBQUcsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUc7WUFDckIsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO1lBQ3BCLEdBQUcsRUFBRSxZQUFZLENBQUMsR0FBRztZQUNyQixxQkFBcUIsRUFBRSxZQUFZLENBQUMscUJBQXFCO1lBQ3pELGtCQUFrQixFQUFFLFlBQVksQ0FBQyxrQkFBa0I7U0FDcEQsQ0FBQyxDQUFDO1FBRUgsdUJBQXVCO1FBQ3ZCLE1BQU0sWUFBWSxHQUFHLElBQUksbURBQXVCLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUNyRSxHQUFHLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHO1lBQ3JCLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtZQUNwQixHQUFHLEVBQUUsWUFBWSxDQUFDLEdBQUc7WUFDckIsT0FBTyxFQUFFLFlBQVksQ0FBQyxPQUFPO1lBQzdCLFlBQVksRUFBRSxZQUFZLENBQUMsWUFBWTtZQUN2QyxvQkFBb0IsRUFBRSxZQUFZLENBQUMsb0JBQW9CO1lBQ3ZELFFBQVEsRUFBRSxTQUFTLENBQUMsaUJBQWlCO1lBQ3JDLEtBQUssRUFBRSxTQUFTLENBQUMsS0FBSztZQUN0QixZQUFZLEVBQUUsU0FBUyxDQUFDLFlBQVk7U0FDckMsQ0FBQyxDQUFDO1FBRUgsd0JBQXdCO1FBQ3hCLE1BQU0sYUFBYSxHQUFHLElBQUkscURBQXdCLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN4RSxHQUFHLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHO1lBQ3JCLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtZQUNwQixVQUFVLEVBQUUsWUFBWSxDQUFDLFVBQVU7U0FDcEMsQ0FBQyxDQUFDO1FBRUgsbUJBQW1CO1FBQ25CLFNBQVMsQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDdEMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN0QyxhQUFhLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRTFDLDRCQUE0QjtRQUM1QixHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDbkUsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3ZELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDNUMsQ0FBQztDQUNGO0FBakRELG9EQWlEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5pbXBvcnQgeyBSZWNydWl0bWVudE5ldHdvcmtTdGFjayB9IGZyb20gJy4vcmVjcnVpdG1lbnQtbmV0d29yay1zdGFjayc7XHJcbmltcG9ydCB7IFJlY3J1aXRtZW50RGF0YVN0YWNrIH0gZnJvbSAnLi9yZWNydWl0bWVudC1kYXRhLXN0YWNrJztcclxuaW1wb3J0IHsgUmVjcnVpdG1lbnRCYWNrZW5kU3RhY2sgfSBmcm9tICcuL3JlY3J1aXRtZW50LWJhY2tlbmQtc3RhY2snO1xyXG5pbXBvcnQgeyBSZWNydWl0bWVudEZyb250ZW5kU3RhY2sgfSBmcm9tICcuL3JlY3J1aXRtZW50LWZyb250ZW5kLXN0YWNrJztcclxuaW1wb3J0IHsgRW52aXJvbm1lbnRDb25maWcgfSBmcm9tICcuLi9jb25maWcvdHlwZXMnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSZWNydWl0bWVudFByb2RTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xyXG4gIGNvbmZpZzogRW52aXJvbm1lbnRDb25maWc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBSZWNydWl0bWVudFByb2RTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFJlY3J1aXRtZW50UHJvZFN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBOZXR3b3JrIFN0YWNrXHJcbiAgICBjb25zdCBuZXR3b3JrU3RhY2sgPSBuZXcgUmVjcnVpdG1lbnROZXR3b3JrU3RhY2sodGhpcywgJ05ldHdvcmtTdGFjaycsIHtcclxuICAgICAgZW52OiBwcm9wcy5jb25maWcuZW52LFxyXG4gICAgICBjb25maWc6IHByb3BzLmNvbmZpZyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBEYXRhIFN0YWNrXHJcbiAgICBjb25zdCBkYXRhU3RhY2sgPSBuZXcgUmVjcnVpdG1lbnREYXRhU3RhY2sodGhpcywgJ0RhdGFTdGFjaycsIHtcclxuICAgICAgZW52OiBwcm9wcy5jb25maWcuZW52LFxyXG4gICAgICBjb25maWc6IHByb3BzLmNvbmZpZyxcclxuICAgICAgdnBjOiBuZXR3b3JrU3RhY2sudnBjLFxyXG4gICAgICBkYXRhYmFzZVNlY3VyaXR5R3JvdXA6IG5ldHdvcmtTdGFjay5kYXRhYmFzZVNlY3VyaXR5R3JvdXAsXHJcbiAgICAgIHJlZGlzU2VjdXJpdHlHcm91cDogbmV0d29ya1N0YWNrLnJlZGlzU2VjdXJpdHlHcm91cCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBCYWNrZW5kIFN0YWNrXHJcbiAgICBjb25zdCBiYWNrZW5kU3RhY2sgPSBuZXcgUmVjcnVpdG1lbnRCYWNrZW5kU3RhY2sodGhpcywgJ0JhY2tlbmRTdGFjaycsIHtcclxuICAgICAgZW52OiBwcm9wcy5jb25maWcuZW52LFxyXG4gICAgICBjb25maWc6IHByb3BzLmNvbmZpZyxcclxuICAgICAgdnBjOiBuZXR3b3JrU3RhY2sudnBjLFxyXG4gICAgICBjbHVzdGVyOiBuZXR3b3JrU3RhY2suY2x1c3RlcixcclxuICAgICAgbG9hZEJhbGFuY2VyOiBuZXR3b3JrU3RhY2subG9hZEJhbGFuY2VyLFxyXG4gICAgICBiYWNrZW5kU2VjdXJpdHlHcm91cDogbmV0d29ya1N0YWNrLmJhY2tlbmRTZWN1cml0eUdyb3VwLFxyXG4gICAgICBkYXRhYmFzZTogZGF0YVN0YWNrLmRhdGFiYXNlQ29uc3RydWN0LFxyXG4gICAgICByZWRpczogZGF0YVN0YWNrLnJlZGlzLFxyXG4gICAgICBhc3NldHNCdWNrZXQ6IGRhdGFTdGFjay5hc3NldHNCdWNrZXQsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgRnJvbnRlbmQgU3RhY2tcclxuICAgIGNvbnN0IGZyb250ZW5kU3RhY2sgPSBuZXcgUmVjcnVpdG1lbnRGcm9udGVuZFN0YWNrKHRoaXMsICdGcm9udGVuZFN0YWNrJywge1xyXG4gICAgICBlbnY6IHByb3BzLmNvbmZpZy5lbnYsXHJcbiAgICAgIGNvbmZpZzogcHJvcHMuY29uZmlnLFxyXG4gICAgICBiYWNrZW5kVXJsOiBiYWNrZW5kU3RhY2suYmFja2VuZFVybCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBkZXBlbmRlbmNpZXNcclxuICAgIGRhdGFTdGFjay5hZGREZXBlbmRlbmN5KG5ldHdvcmtTdGFjayk7XHJcbiAgICBiYWNrZW5kU3RhY2suYWRkRGVwZW5kZW5jeShkYXRhU3RhY2spO1xyXG4gICAgZnJvbnRlbmRTdGFjay5hZGREZXBlbmRlbmN5KGJhY2tlbmRTdGFjayk7XHJcblxyXG4gICAgLy8gQWRkIHRhZ3MgdG8gYWxsIHJlc291cmNlc1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdFbnZpcm9ubWVudCcsIHByb3BzLmNvbmZpZy5lbnZpcm9ubWVudE5hbWUpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdQcm9qZWN0JywgJ1JlY3J1aXRtZW50V2Vic2l0ZScpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdNYW5hZ2VkQnknLCAnQ0RLJyk7XHJcbiAgfVxyXG59Il19