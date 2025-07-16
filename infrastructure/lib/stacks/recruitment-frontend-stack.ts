import * as cdk from 'aws-cdk-lib';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';
import { FrontendStackProps } from '../config/types';

export class RecruitmentFrontendStack extends cdk.Stack {
  public readonly amplifyApp: amplify.App;
  public readonly frontendUrl: string;
  public readonly mainBranch: amplify.Branch;
  public readonly customDomain?: amplify.Domain;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
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
      const certificate = certificatemanager.Certificate.fromCertificateArn(
        this,
        'Certificate',
        props.config.amplify.certificateArn
      );

      this.customDomain = this.amplifyApp.addDomain(props.config.amplify.customDomain, {
        domainName: props.config.amplify.customDomain,
        enableAutoSubdomain: false,
        autoSubdomainCreationPatterns: [],
      });

      this.customDomain.mapRoot(this.mainBranch);
      this.frontendUrl = `https://${props.config.amplify.customDomain}`;
    } else {
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

  private getStageFromEnvironment(environmentName: string): string {
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

  private getNextAuthUrl(environmentName: string): string {
    if (environmentName === 'prod') {
      return 'https://recruitment.example.com';
    } else if (environmentName === 'staging') {
      return 'https://staging.recruitment.example.com';
    }
    return 'http://localhost:3001';
  }

  private generateNextAuthSecret(): string {
    // In a real deployment, this should be generated securely
    // and stored in AWS Secrets Manager
    return `nextauth-secret-${Math.random().toString(36).substring(2, 15)}`;
  }

  private addEnvironmentBranches(environmentName: string): void {
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

  private addSecurityHeaders(): void {
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

  private addTags(environmentName: string): void {
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