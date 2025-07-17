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
exports.RecruitmentFrontendStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const amplify = __importStar(require("aws-cdk-lib/aws-amplify"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const certificatemanager = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
class RecruitmentFrontendStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Create GitHub access token secret if using GitHub
        const githubTokenSecret = new secretsmanager.Secret(this, 'GitHubTokenSecret', {
            secretName: `recruitment-${props.config.environmentName}-github-token`,
            description: 'GitHub personal access token for Amplify',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({}),
                generateStringKey: 'token',
            },
        });
        // Create Amplify service role
        const amplifyServiceRole = new iam.Role(this, 'AmplifyServiceRole', {
            assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess-Amplify'),
            ],
        });
        // Create Amplify app
        this.amplifyApp = new amplify.App(this, 'AmplifyApp', {
            appName: `recruitment-${props.config.environmentName}`,
            sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
                owner: 'your-github-username', // Replace with your GitHub username
                repository: 'RecruitmentWebsite',
                oauthToken: cdk.SecretValue.secretsManager(githubTokenSecret.secretArn, {
                    jsonField: 'token',
                }),
            }),
            buildSpec: amplify.BuildSpec.fromObject({
                version: '1.0',
                applications: [
                    {
                        frontend: {
                            phases: {
                                preBuild: {
                                    commands: [
                                        'cd frontend',
                                        'npm ci',
                                    ],
                                },
                                build: {
                                    commands: [
                                        'npm run build',
                                    ],
                                },
                            },
                            artifacts: {
                                baseDirectory: '.next',
                                files: ['**/*'],
                            },
                            cache: {
                                paths: ['node_modules/**/*', '.next/cache/**/*'],
                            },
                        },
                    },
                ],
            }),
            environmentVariables: {
                NEXT_PUBLIC_BACKEND_URL: props.backendUrl,
                NEXT_PUBLIC_ENVIRONMENT: props.config.environmentName,
                NEXT_PUBLIC_API_URL: `${props.backendUrl}/api`,
                NODE_ENV: props.config.environmentName === 'prod' ? 'production' : 'development',
                AMPLIFY_MONOREPO_APP_ROOT: 'frontend',
                AMPLIFY_DIFF_DEPLOY: 'false',
                AMPLIFY_DIFF_DEPLOY_ROOT: 'frontend',
            },
            customRules: [
                {
                    source: '/<*>',
                    target: '/index.html',
                    status: amplify.RedirectStatus.NOT_FOUND_REWRITE,
                },
                {
                    source: '/api/<*>',
                    target: `${props.backendUrl}/api/<*>`,
                    status: amplify.RedirectStatus.TEMPORARY_REDIRECT,
                },
            ],
            role: amplifyServiceRole,
        });
        // Create main branch
        this.mainBranch = this.amplifyApp.addBranch('main', {
            branchName: 'main',
            stage: this.getStageFromEnvironment(props.config.environmentName),
            pullRequestPreview: props.config.environmentName !== 'prod',
            autoBuild: true,
            environmentVariables: {
                NEXTAUTH_URL: this.getNextAuthUrl(props.config.environmentName),
                NEXTAUTH_SECRET: this.generateNextAuthSecret(),
            },
        });
        // Add basic auth for non-production environments
        if (props.config.amplify.basicAuthUsername && props.config.amplify.basicAuthPassword) {
            this.mainBranch.addBasicAuth({
                username: props.config.amplify.basicAuthUsername,
                password: props.config.amplify.basicAuthPassword,
            });
        }
        // Set up custom domain if configured
        if (props.config.amplify.customDomain && props.config.amplify.certificateArn) {
            const certificate = certificatemanager.Certificate.fromCertificateArn(this, 'Certificate', props.config.amplify.certificateArn);
            this.customDomain = this.amplifyApp.addDomain(props.config.amplify.customDomain, {
                domainName: props.config.amplify.customDomain,
                enableAutoSubdomain: false,
                autoSubdomainCreationPatterns: [],
            });
            this.customDomain.mapRoot(this.mainBranch);
            this.frontendUrl = `https://${props.config.amplify.customDomain}`;
        }
        else {
            this.frontendUrl = `https://${this.mainBranch.branchName}.${this.amplifyApp.defaultDomain}`;
        }
        // Add environment-specific branches
        this.addEnvironmentBranches(props.config.environmentName);
        // Enable performance mode if configured
        if (props.config.amplify.enablePerformanceMode) {
            // Performance mode is enabled through console or CLI
            // We can add custom headers for performance optimization
            this.amplifyApp.addCustomRule({
                source: '*.js',
                target: '*.js',
                status: amplify.RedirectStatus.REWRITE,
                headers: [
                    {
                        pattern: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            });
            this.amplifyApp.addCustomRule({
                source: '*.css',
                target: '*.css',
                status: amplify.RedirectStatus.REWRITE,
                headers: [
                    {
                        pattern: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            });
        }
        // Add security headers
        this.addSecurityHeaders();
        // Create CloudFormation outputs
        new cdk.CfnOutput(this, 'AmplifyAppId', {
            value: this.amplifyApp.appId,
            description: 'Amplify app ID',
            exportName: `${props.config.environmentName}-amplify-app-id`,
        });
        new cdk.CfnOutput(this, 'AmplifyAppArn', {
            value: this.amplifyApp.arn,
            description: 'Amplify app ARN',
            exportName: `${props.config.environmentName}-amplify-app-arn`,
        });
        new cdk.CfnOutput(this, 'FrontendUrl', {
            value: this.frontendUrl,
            description: 'Frontend URL',
            exportName: `${props.config.environmentName}-frontend-url`,
        });
        new cdk.CfnOutput(this, 'MainBranchName', {
            value: this.mainBranch.branchName,
            description: 'Main branch name',
            exportName: `${props.config.environmentName}-main-branch-name`,
        });
        if (this.customDomain) {
            new cdk.CfnOutput(this, 'CustomDomainName', {
                value: this.customDomain.domainName,
                description: 'Custom domain name',
                exportName: `${props.config.environmentName}-custom-domain-name`,
            });
        }
        // Add tags
        this.addTags(props.config.environmentName);
    }
    getStageFromEnvironment(environmentName) {
        switch (environmentName) {
            case 'prod':
                return 'PRODUCTION';
            case 'staging':
                return 'BETA';
            case 'dev':
            default:
                return 'DEVELOPMENT';
        }
    }
    getNextAuthUrl(environmentName) {
        if (environmentName === 'prod') {
            return 'https://recruitment.example.com';
        }
        else if (environmentName === 'staging') {
            return 'https://staging.recruitment.example.com';
        }
        return 'http://localhost:3001';
    }
    generateNextAuthSecret() {
        // In a real deployment, this should be generated securely
        // and stored in AWS Secrets Manager
        return `nextauth-secret-${Math.random().toString(36).substring(2, 15)}`;
    }
    addEnvironmentBranches(environmentName) {
        // Add develop branch for staging environment
        if (environmentName === 'staging') {
            this.amplifyApp.addBranch('develop', {
                branchName: 'develop',
                stage: 'DEVELOPMENT',
                pullRequestPreview: true,
                autoBuild: true,
                environmentVariables: {
                    NEXTAUTH_URL: 'https://develop.staging.recruitment.example.com',
                    NEXTAUTH_SECRET: this.generateNextAuthSecret(),
                },
            });
        }
        // Add feature branch pattern for development
        if (environmentName === 'dev') {
            // Feature branches can be manually added through console
            // or you can add specific feature branches here
        }
    }
    addSecurityHeaders() {
        // Add security headers for all files
        this.amplifyApp.addCustomRule({
            source: '/<*>',
            target: '/<*>',
            status: amplify.RedirectStatus.REWRITE,
            headers: [
                {
                    pattern: 'X-Frame-Options',
                    value: 'DENY',
                },
                {
                    pattern: 'X-XSS-Protection',
                    value: '1; mode=block',
                },
                {
                    pattern: 'X-Content-Type-Options',
                    value: 'nosniff',
                },
                {
                    pattern: 'Referrer-Policy',
                    value: 'strict-origin-when-cross-origin',
                },
                {
                    pattern: 'Strict-Transport-Security',
                    value: 'max-age=31536000; includeSubDomains',
                },
                {
                    pattern: 'Content-Security-Policy',
                    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.recruitment.example.com;",
                },
            ],
        });
    }
    addTags(environmentName) {
        const tags = {
            Environment: environmentName,
            Component: 'Frontend',
            ManagedBy: 'CDK',
        };
        Object.entries(tags).forEach(([key, value]) => {
            cdk.Tags.of(this.amplifyApp).add(key, value);
        });
    }
}
exports.RecruitmentFrontendStack = RecruitmentFrontendStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjcnVpdG1lbnQtZnJvbnRlbmQtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZWNydWl0bWVudC1mcm9udGVuZC1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsaUVBQW1EO0FBQ25ELHlEQUEyQztBQUMzQywrRUFBaUU7QUFFakUsdUZBQXlFO0FBSXpFLE1BQWEsd0JBQXlCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFNckQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF5QjtRQUNqRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixvREFBb0Q7UUFDcEQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQzdFLFVBQVUsRUFBRSxlQUFlLEtBQUssQ0FBQyxNQUFNLENBQUMsZUFBZSxlQUFlO1lBQ3RFLFdBQVcsRUFBRSwwQ0FBMEM7WUFDdkQsb0JBQW9CLEVBQUU7Z0JBQ3BCLG9CQUFvQixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUN4QyxpQkFBaUIsRUFBRSxPQUFPO2FBQzNCO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsOEJBQThCO1FBQzlCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUNsRSxTQUFTLEVBQUUsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsdUJBQXVCLENBQUM7WUFDNUQsZUFBZSxFQUFFO2dCQUNmLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsNkJBQTZCLENBQUM7YUFDMUU7U0FDRixDQUFDLENBQUM7UUFFSCxxQkFBcUI7UUFDckIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLE9B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bXBvcnQgKiBhcyBhbXBsaWZ5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hbXBsaWZ5JztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgKiBhcyBzZWNyZXRzbWFuYWdlciBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc2VjcmV0c21hbmFnZXInO1xyXG5pbXBvcnQgKiBhcyByb3V0ZTUzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzJztcclxuaW1wb3J0ICogYXMgY2VydGlmaWNhdGVtYW5hZ2VyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuaW1wb3J0IHsgRnJvbnRlbmRTdGFja1Byb3BzIH0gZnJvbSAnLi4vY29uZmlnL3R5cGVzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBSZWNydWl0bWVudEZyb250ZW5kU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIHB1YmxpYyByZWFkb25seSBhbXBsaWZ5QXBwOiBhbXBsaWZ5LkFwcDtcclxuICBwdWJsaWMgcmVhZG9ubHkgZnJvbnRlbmRVcmw6IHN0cmluZztcclxuICBwdWJsaWMgcmVhZG9ubHkgbWFpbkJyYW5jaDogYW1wbGlmeS5CcmFuY2g7XHJcbiAgcHVibGljIHJlYWRvbmx5IGN1c3RvbURvbWFpbj86IGFtcGxpZnkuRG9tYWluO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogRnJvbnRlbmRTdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgR2l0SHViIGFjY2VzcyB0b2tlbiBzZWNyZXQgaWYgdXNpbmcgR2l0SHViXHJcbiAgICBjb25zdCBnaXRodWJUb2tlblNlY3JldCA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgJ0dpdEh1YlRva2VuU2VjcmV0Jywge1xyXG4gICAgICBzZWNyZXROYW1lOiBgcmVjcnVpdG1lbnQtJHtwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lfS1naXRodWItdG9rZW5gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0dpdEh1YiBwZXJzb25hbCBhY2Nlc3MgdG9rZW4gZm9yIEFtcGxpZnknLFxyXG4gICAgICBnZW5lcmF0ZVNlY3JldFN0cmluZzoge1xyXG4gICAgICAgIHNlY3JldFN0cmluZ1RlbXBsYXRlOiBKU09OLnN0cmluZ2lmeSh7fSksXHJcbiAgICAgICAgZ2VuZXJhdGVTdHJpbmdLZXk6ICd0b2tlbicsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgQW1wbGlmeSBzZXJ2aWNlIHJvbGVcclxuICAgIGNvbnN0IGFtcGxpZnlTZXJ2aWNlUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnQW1wbGlmeVNlcnZpY2VSb2xlJywge1xyXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnYW1wbGlmeS5hbWF6b25hd3MuY29tJyksXHJcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW1xyXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQWRtaW5pc3RyYXRvckFjY2Vzcy1BbXBsaWZ5JyksXHJcbiAgICAgIF0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgQW1wbGlmeSBhcHBcclxuICAgIHRoaXMuYW1wbGlmeUFwcCA9IG5ldyBhbXBsaWZ5LkFwcCh0aGlzLCAnQW1wbGlmeUFwcCcsIHtcclxuICAgICAgYXBwTmFtZTogYHJlY3J1aXRtZW50LSR7cHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZX1gLFxyXG4gICAgICBzb3VyY2VDb2RlUHJvdmlkZXI6IG5ldyBhbXBsaWZ5LkdpdEh1YlNvdXJjZUNvZGVQcm92aWRlcih7XHJcbiAgICAgICAgb3duZXI6ICd5b3VyLWdpdGh1Yi11c2VybmFtZScsIC8vIFJlcGxhY2Ugd2l0aCB5b3VyIEdpdEh1YiB1c2VybmFtZVxyXG4gICAgICAgIHJlcG9zaXRvcnk6ICdSZWNydWl0bWVudFdlYnNpdGUnLFxyXG4gICAgICAgIG9hdXRoVG9rZW46IGNkay5TZWNyZXRWYWx1ZS5zZWNyZXRzTWFuYWdlcihnaXRodWJUb2tlblNlY3JldC5zZWNyZXRBcm4sIHtcclxuICAgICAgICAgIGpzb25GaWVsZDogJ3Rva2VuJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfSksXHJcbiAgICAgIGJ1aWxkU3BlYzogYW1wbGlmeS5CdWlsZFNwZWMuZnJvbU9iamVjdCh7XHJcbiAgICAgICAgdmVyc2lvbjogJzEuMCcsXHJcbiAgICAgICAgYXBwbGljYXRpb25zOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIGZyb250ZW5kOiB7XHJcbiAgICAgICAgICAgICAgcGhhc2VzOiB7XHJcbiAgICAgICAgICAgICAgICBwcmVCdWlsZDoge1xyXG4gICAgICAgICAgICAgICAgICBjb21tYW5kczogW1xyXG4gICAgICAgICAgICAgICAgICAgICdjZCBmcm9udGVuZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgJ25wbSBjaScsXHJcbiAgICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgYnVpbGQ6IHtcclxuICAgICAgICAgICAgICAgICAgY29tbWFuZHM6IFtcclxuICAgICAgICAgICAgICAgICAgICAnbnBtIHJ1biBidWlsZCcsXHJcbiAgICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgYXJ0aWZhY3RzOiB7XHJcbiAgICAgICAgICAgICAgICBiYXNlRGlyZWN0b3J5OiAnLm5leHQnLFxyXG4gICAgICAgICAgICAgICAgZmlsZXM6IFsnKiovKiddLFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgY2FjaGU6IHtcclxuICAgICAgICAgICAgICAgIHBhdGhzOiBbJ25vZGVfbW9kdWxlcy8qKi8qJywgJy5uZXh0L2NhY2hlLyoqLyonXSxcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9KSxcclxuICAgICAgZW52aXJvbm1lbnRWYXJpYWJsZXM6IHtcclxuICAgICAgICBORVhUX1BVQkxJQ19CQUNLRU5EX1VSTDogcHJvcHMuYmFja2VuZFVybCxcclxuICAgICAgICBORVhUX1BVQkxJQ19FTlZJUk9OTUVOVDogcHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZSxcclxuICAgICAgICBORVhUX1BVQkxJQ19BUElfVVJMOiBgJHtwcm9wcy5iYWNrZW5kVXJsfS9hcGlgLFxyXG4gICAgICAgIE5PREVfRU5WOiBwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lID09PSAncHJvZCcgPyAncHJvZHVjdGlvbicgOiAnZGV2ZWxvcG1lbnQnLFxyXG4gICAgICAgIEFNUExJRllfTU9OT1JFUE9fQVBQX1JPT1Q6ICdmcm9udGVuZCcsXHJcbiAgICAgICAgQU1QTElGWV9ESUZGX0RFUExPWTogJ2ZhbHNlJyxcclxuICAgICAgICBBTVBMSUZZX0RJRkZfREVQTE9ZX1JPT1Q6ICdmcm9udGVuZCcsXHJcbiAgICAgIH0sXHJcbiAgICAgIGN1c3RvbVJ1bGVzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgc291cmNlOiAnLzwqPicsXHJcbiAgICAgICAgICB0YXJnZXQ6ICcvaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICBzdGF0dXM6IGFtcGxpZnkuUmVkaXJlY3RTdGF0dXMuTk9UX0ZPVU5EX1JFV1JJVEUsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBzb3VyY2U6ICcvYXBpLzwqPicsXHJcbiAgICAgICAgICB0YXJnZXQ6IGAke3Byb3BzLmJhY2tlbmRVcmx9L2FwaS88Kj5gLFxyXG4gICAgICAgICAgc3RhdHVzOiBhbXBsaWZ5LlJlZGlyZWN0U3RhdHVzLlRFTVBPUkFSWV9SRURJUkVDVCxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgICByb2xlOiBhbXBsaWZ5U2VydmljZVJvbGUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgbWFpbiBicmFuY2hcclxuICAgIHRoaXMubWFpbkJyYW5jaCA9IHRoaXMuYW1wbGlmeUFwcC5hZGRCcmFuY2goJ21haW4nLCB7XHJcbiAgICAgIGJyYW5jaE5hbWU6ICdtYWluJyxcclxuICAgICAgc3RhZ2U6IHRoaXMuZ2V0U3RhZ2VGcm9tRW52aXJvbm1lbnQocHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZSksXHJcbiAgICAgIHB1bGxSZXF1ZXN0UHJldmlldzogcHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZSAhPT0gJ3Byb2QnLFxyXG4gICAgICBhdXRvQnVpbGQ6IHRydWUsXHJcbiAgICAgIGVudmlyb25tZW50VmFyaWFibGVzOiB7XHJcbiAgICAgICAgTkVYVEFVVEhfVVJMOiB0aGlzLmdldE5leHRBdXRoVXJsKHByb3BzLmNvbmZpZy5lbnZpcm9ubWVudE5hbWUpLFxyXG4gICAgICAgIE5FWFRBVVRIX1NFQ1JFVDogdGhpcy5nZW5lcmF0ZU5leHRBdXRoU2VjcmV0KCksXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgYmFzaWMgYXV0aCBmb3Igbm9uLXByb2R1Y3Rpb24gZW52aXJvbm1lbnRzXHJcbiAgICBpZiAocHJvcHMuY29uZmlnLmFtcGxpZnkuYmFzaWNBdXRoVXNlcm5hbWUgJiYgcHJvcHMuY29uZmlnLmFtcGxpZnkuYmFzaWNBdXRoUGFzc3dvcmQpIHtcclxuICAgICAgdGhpcy5tYWluQnJhbmNoLmFkZEJhc2ljQXV0aCh7XHJcbiAgICAgICAgdXNlcm5hbWU6IHByb3BzLmNvbmZpZy5hbXBsaWZ5LmJhc2ljQXV0aFVzZXJuYW1lLFxyXG4gICAgICAgIHBhc3N3b3JkOiBwcm9wcy5jb25maWcuYW1wbGlmeS5iYXNpY0F1dGhQYXNzd29yZCxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU2V0IHVwIGN1c3RvbSBkb21haW4gaWYgY29uZmlndXJlZFxyXG4gICAgaWYgKHByb3BzLmNvbmZpZy5hbXBsaWZ5LmN1c3RvbURvbWFpbiAmJiBwcm9wcy5jb25maWcuYW1wbGlmeS5jZXJ0aWZpY2F0ZUFybikge1xyXG4gICAgICBjb25zdCBjZXJ0aWZpY2F0ZSA9IGNlcnRpZmljYXRlbWFuYWdlci5DZXJ0aWZpY2F0ZS5mcm9tQ2VydGlmaWNhdGVBcm4oXHJcbiAgICAgICAgdGhpcyxcclxuICAgICAgICAnQ2VydGlmaWNhdGUnLFxyXG4gICAgICAgIHByb3BzLmNvbmZpZy5hbXBsaWZ5LmNlcnRpZmljYXRlQXJuXHJcbiAgICAgICk7XHJcblxyXG4gICAgICB0aGlzLmN1c3RvbURvbWFpbiA9IHRoaXMuYW1wbGlmeUFwcC5hZGREb21haW4ocHJvcHMuY29uZmlnLmFtcGxpZnkuY3VzdG9tRG9tYWluLCB7XHJcbiAgICAgICAgZG9tYWluTmFtZTogcHJvcHMuY29uZmlnLmFtcGxpZnkuY3VzdG9tRG9tYWluLFxyXG4gICAgICAgIGVuYWJsZUF1dG9TdWJkb21haW46IGZhbHNlLFxyXG4gICAgICAgIGF1dG9TdWJkb21haW5DcmVhdGlvblBhdHRlcm5zOiBbXSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICB0aGlzLmN1c3RvbURvbWFpbi5tYXBSb290KHRoaXMubWFpbkJyYW5jaCk7XHJcbiAgICAgIHRoaXMuZnJvbnRlbmRVcmwgPSBgaHR0cHM6Ly8ke3Byb3BzLmNvbmZpZy5hbXBsaWZ5LmN1c3RvbURvbWFpbn1gO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5mcm9udGVuZFVybCA9IGBodHRwczovLyR7dGhpcy5tYWluQnJhbmNoLmJyYW5jaE5hbWV9LiR7dGhpcy5hbXBsaWZ5QXBwLmRlZmF1bHREb21haW59YDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBBZGQgZW52aXJvbm1lbnQtc3BlY2lmaWMgYnJhbmNoZXNcclxuICAgIHRoaXMuYWRkRW52aXJvbm1lbnRCcmFuY2hlcyhwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lKTtcclxuXHJcbiAgICAvLyBFbmFibGUgcGVyZm9ybWFuY2UgbW9kZSBpZiBjb25maWd1cmVkXHJcbiAgICBpZiAocHJvcHMuY29uZmlnLmFtcGxpZnkuZW5hYmxlUGVyZm9ybWFuY2VNb2RlKSB7XHJcbiAgICAgIC8vIFBlcmZvcm1hbmNlIG1vZGUgaXMgZW5hYmxlZCB0aHJvdWdoIGNvbnNvbGUgb3IgQ0xJXHJcbiAgICAgIC8vIFdlIGNhbiBhZGQgY3VzdG9tIGhlYWRlcnMgZm9yIHBlcmZvcm1hbmNlIG9wdGltaXphdGlvblxyXG4gICAgICB0aGlzLmFtcGxpZnlBcHAuYWRkQ3VzdG9tUnVsZSh7XHJcbiAgICAgICAgc291cmNlOiAnKi5qcycsXHJcbiAgICAgICAgdGFyZ2V0OiAnKi5qcycsXHJcbiAgICAgICAgc3RhdHVzOiBhbXBsaWZ5LlJlZGlyZWN0U3RhdHVzLlJFV1JJVEUsXHJcbiAgICAgICAgaGVhZGVyczogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBwYXR0ZXJuOiAnQ2FjaGUtQ29udHJvbCcsXHJcbiAgICAgICAgICAgIHZhbHVlOiAncHVibGljLCBtYXgtYWdlPTMxNTM2MDAwLCBpbW11dGFibGUnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHRoaXMuYW1wbGlmeUFwcC5hZGRDdXN0b21SdWxlKHtcclxuICAgICAgICBzb3VyY2U6ICcqLmNzcycsXHJcbiAgICAgICAgdGFyZ2V0OiAnKi5jc3MnLFxyXG4gICAgICAgIHN0YXR1czogYW1wbGlmeS5SZWRpcmVjdFN0YXR1cy5SRVdSSVRFLFxyXG4gICAgICAgIGhlYWRlcnM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgcGF0dGVybjogJ0NhY2hlLUNvbnRyb2wnLFxyXG4gICAgICAgICAgICB2YWx1ZTogJ3B1YmxpYywgbWF4LWFnZT0zMTUzNjAwMCwgaW1tdXRhYmxlJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQWRkIHNlY3VyaXR5IGhlYWRlcnNcclxuICAgIHRoaXMuYWRkU2VjdXJpdHlIZWFkZXJzKCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIENsb3VkRm9ybWF0aW9uIG91dHB1dHNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBbXBsaWZ5QXBwSWQnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmFtcGxpZnlBcHAuYXBwSWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQW1wbGlmeSBhcHAgSUQnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lfS1hbXBsaWZ5LWFwcC1pZGAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQW1wbGlmeUFwcEFybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuYW1wbGlmeUFwcC5hcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQW1wbGlmeSBhcHAgQVJOJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZX0tYW1wbGlmeS1hcHAtYXJuYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdGcm9udGVuZFVybCcsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuZnJvbnRlbmRVcmwsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnRnJvbnRlbmQgVVJMJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZX0tZnJvbnRlbmQtdXJsYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdNYWluQnJhbmNoTmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMubWFpbkJyYW5jaC5icmFuY2hOYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ01haW4gYnJhbmNoIG5hbWUnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lfS1tYWluLWJyYW5jaC1uYW1lYCxcclxuICAgIH0pO1xyXG5cclxuICAgIGlmICh0aGlzLmN1c3RvbURvbWFpbikge1xyXG4gICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ3VzdG9tRG9tYWluTmFtZScsIHtcclxuICAgICAgICB2YWx1ZTogdGhpcy5jdXN0b21Eb21haW4uZG9tYWluTmFtZSxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ0N1c3RvbSBkb21haW4gbmFtZScsXHJcbiAgICAgICAgZXhwb3J0TmFtZTogYCR7cHJvcHMuY29uZmlnLmVudmlyb25tZW50TmFtZX0tY3VzdG9tLWRvbWFpbi1uYW1lYCxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQWRkIHRhZ3NcclxuICAgIHRoaXMuYWRkVGFncyhwcm9wcy5jb25maWcuZW52aXJvbm1lbnROYW1lKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZ2V0U3RhZ2VGcm9tRW52aXJvbm1lbnQoZW52aXJvbm1lbnROYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgc3dpdGNoIChlbnZpcm9ubWVudE5hbWUpIHtcclxuICAgICAgY2FzZSAncHJvZCc6XHJcbiAgICAgICAgcmV0dXJuICdQUk9EVUNUSU9OJztcclxuICAgICAgY2FzZSAnc3RhZ2luZyc6XHJcbiAgICAgICAgcmV0dXJuICdCRVRBJztcclxuICAgICAgY2FzZSAnZGV2JzpcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICByZXR1cm4gJ0RFVkVMT1BNRU5UJztcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgZ2V0TmV4dEF1dGhVcmwoZW52aXJvbm1lbnROYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgaWYgKGVudmlyb25tZW50TmFtZSA9PT0gJ3Byb2QnKSB7XHJcbiAgICAgIHJldHVybiAnaHR0cHM6Ly9yZWNydWl0bWVudC5leGFtcGxlLmNvbSc7XHJcbiAgICB9IGVsc2UgaWYgKGVudmlyb25tZW50TmFtZSA9PT0gJ3N0YWdpbmcnKSB7XHJcbiAgICAgIHJldHVybiAnaHR0cHM6Ly9zdGFnaW5nLnJlY3J1aXRtZW50LmV4YW1wbGUuY29tJztcclxuICAgIH1cclxuICAgIHJldHVybiAnaHR0cDovL2xvY2FsaG9zdDozMDAxJztcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZ2VuZXJhdGVOZXh0QXV0aFNlY3JldCgpOiBzdHJpbmcge1xyXG4gICAgLy8gSW4gYSByZWFsIGRlcGxveW1lbnQsIHRoaXMgc2hvdWxkIGJlIGdlbmVyYXRlZCBzZWN1cmVseVxyXG4gICAgLy8gYW5kIHN0b3JlZCBpbiBBV1MgU2VjcmV0cyBNYW5hZ2VyXHJcbiAgICByZXR1cm4gYG5leHRhdXRoLXNlY3JldC0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZygyLCAxNSl9YDtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYWRkRW52aXJvbm1lbnRCcmFuY2hlcyhlbnZpcm9ubWVudE5hbWU6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgLy8gQWRkIGRldmVsb3AgYnJhbmNoIGZvciBzdGFnaW5nIGVudmlyb25tZW50XHJcbiAgICBpZiAoZW52aXJvbm1lbnROYW1lID09PSAnc3RhZ2luZycpIHtcclxuICAgICAgdGhpcy5hbXBsaWZ5QXBwLmFkZEJyYW5jaCgnZGV2ZWxvcCcsIHtcclxuICAgICAgICBicmFuY2hOYW1lOiAnZGV2ZWxvcCcsXHJcbiAgICAgICAgc3RhZ2U6ICdERVZFTE9QTUVOVCcsXHJcbiAgICAgICAgcHVsbFJlcXVlc3RQcmV2aWV3OiB0cnVlLFxyXG4gICAgICAgIGF1dG9CdWlsZDogdHJ1ZSxcclxuICAgICAgICBlbnZpcm9ubWVudFZhcmlhYmxlczoge1xyXG4gICAgICAgICAgTkVYVEFVVEhfVVJMOiAnaHR0cHM6Ly9kZXZlbG9wLnN0YWdpbmcucmVjcnVpdG1lbnQuZXhhbXBsZS5jb20nLFxyXG4gICAgICAgICAgTkVYVEFVVEhfU0VDUkVUOiB0aGlzLmdlbmVyYXRlTmV4dEF1dGhTZWNyZXQoKSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBBZGQgZmVhdHVyZSBicmFuY2ggcGF0dGVybiBmb3IgZGV2ZWxvcG1lbnRcclxuICAgIGlmIChlbnZpcm9ubWVudE5hbWUgPT09ICdkZXYnKSB7XHJcbiAgICAgIC8vIEZlYXR1cmUgYnJhbmNoZXMgY2FuIGJlIG1hbnVhbGx5IGFkZGVkIHRocm91Z2ggY29uc29sZVxyXG4gICAgICAvLyBvciB5b3UgY2FuIGFkZCBzcGVjaWZpYyBmZWF0dXJlIGJyYW5jaGVzIGhlcmVcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgYWRkU2VjdXJpdHlIZWFkZXJzKCk6IHZvaWQge1xyXG4gICAgLy8gQWRkIHNlY3VyaXR5IGhlYWRlcnMgZm9yIGFsbCBmaWxlc1xyXG4gICAgdGhpcy5hbXBsaWZ5QXBwLmFkZEN1c3RvbVJ1bGUoe1xyXG4gICAgICBzb3VyY2U6ICcvPCo+JyxcclxuICAgICAgdGFyZ2V0OiAnLzwqPicsXHJcbiAgICAgIHN0YXR1czogYW1wbGlmeS5SZWRpcmVjdFN0YXR1cy5SRVdSSVRFLFxyXG4gICAgICBoZWFkZXJzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgcGF0dGVybjogJ1gtRnJhbWUtT3B0aW9ucycsXHJcbiAgICAgICAgICB2YWx1ZTogJ0RFTlknLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgcGF0dGVybjogJ1gtWFNTLVByb3RlY3Rpb24nLFxyXG4gICAgICAgICAgdmFsdWU6ICcxOyBtb2RlPWJsb2NrJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHBhdHRlcm46ICdYLUNvbnRlbnQtVHlwZS1PcHRpb25zJyxcclxuICAgICAgICAgIHZhbHVlOiAnbm9zbmlmZicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBwYXR0ZXJuOiAnUmVmZXJyZXItUG9saWN5JyxcclxuICAgICAgICAgIHZhbHVlOiAnc3RyaWN0LW9yaWdpbi13aGVuLWNyb3NzLW9yaWdpbicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBwYXR0ZXJuOiAnU3RyaWN0LVRyYW5zcG9ydC1TZWN1cml0eScsXHJcbiAgICAgICAgICB2YWx1ZTogJ21heC1hZ2U9MzE1MzYwMDA7IGluY2x1ZGVTdWJEb21haW5zJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHBhdHRlcm46ICdDb250ZW50LVNlY3VyaXR5LVBvbGljeScsXHJcbiAgICAgICAgICB2YWx1ZTogXCJkZWZhdWx0LXNyYyAnc2VsZic7IHNjcmlwdC1zcmMgJ3NlbGYnICd1bnNhZmUtaW5saW5lJyAndW5zYWZlLWV2YWwnOyBzdHlsZS1zcmMgJ3NlbGYnICd1bnNhZmUtaW5saW5lJzsgaW1nLXNyYyAnc2VsZicgZGF0YTogaHR0cHM6OyBmb250LXNyYyAnc2VsZicgZGF0YTo7IGNvbm5lY3Qtc3JjICdzZWxmJyBodHRwczovL2FwaS5yZWNydWl0bWVudC5leGFtcGxlLmNvbTtcIixcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGFkZFRhZ3MoZW52aXJvbm1lbnROYW1lOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIGNvbnN0IHRhZ3MgPSB7XHJcbiAgICAgIEVudmlyb25tZW50OiBlbnZpcm9ubWVudE5hbWUsXHJcbiAgICAgIENvbXBvbmVudDogJ0Zyb250ZW5kJyxcclxuICAgICAgTWFuYWdlZEJ5OiAnQ0RLJyxcclxuICAgIH07XHJcblxyXG4gICAgT2JqZWN0LmVudHJpZXModGFncykuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XHJcbiAgICAgIGNkay5UYWdzLm9mKHRoaXMuYW1wbGlmeUFwcCkuYWRkKGtleSwgdmFsdWUpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG59Il19