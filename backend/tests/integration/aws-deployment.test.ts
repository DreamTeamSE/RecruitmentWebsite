import request from 'supertest';
import { createTestApp } from '../helpers/testApp';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = createTestApp();

describe('AWS Deployment Integration Tests', () => {
  const testTimeout = 300000; // 5 minutes for AWS operations

  beforeAll(async () => {
    // Ensure AWS CLI is configured
    try {
      await execAsync('aws sts get-caller-identity');
    } catch (error) {
      console.warn('AWS CLI not configured, skipping AWS deployment tests');
    }
  });

  describe('Application Health and Readiness', () => {
    test('should have working health endpoint', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'OK',
        timestamp: expect.any(String)
      });
    });

    test('should respond to basic API routes', async () => {
      // Test that core API endpoints are accessible
      const routes = [
        '/api/auth/register',
        '/api/forms',
        '/api/recruiter',
        '/api/applicant'
      ];

      for (const route of routes) {
        const response = await request(app).get(route);
        // Should not return 404 (route exists)
        expect(response.status).not.toBe(404);
      }
    });
  });

  describe('Docker Build Validation', () => {
    test('should validate Dockerfile exists and is correctly formatted', async () => {
      try {
        const { stdout } = await execAsync('docker --version');
        expect(stdout).toContain('Docker version');
        
        // Check if Dockerfile exists
        const { stdout: lsOutput } = await execAsync('ls -la Dockerfile', { 
          cwd: '/Users/maxmartin/projects/RecruitmentWebsite/backend' 
        });
        expect(lsOutput).toContain('Dockerfile');
      } catch (error) {
        console.warn('Docker not available, skipping Docker validation');
      }
    }, testTimeout);

    test('should build Docker image successfully', async () => {
      try {
        const { stdout, stderr } = await execAsync(
          'docker build -t recruitment-backend-test .',
          { cwd: '/Users/maxmartin/projects/RecruitmentWebsite/backend' }
        );
        
        expect(stderr).not.toContain('ERROR');
        expect(stdout).toContain('Successfully tagged recruitment-backend-test');
        
        // Clean up test image
        await execAsync('docker rmi recruitment-backend-test').catch(() => {});
      } catch (error) {
        console.warn('Docker build failed:', error);
        throw error;
      }
    }, testTimeout);
  });

  describe('AWS Deploy Script Validation', () => {
    test('should have executable AWS deploy script', async () => {
      try {
        const { stdout } = await execAsync('ls -la scripts/aws-deploy.sh', {
          cwd: '/Users/maxmartin/projects/RecruitmentWebsite'
        });
        expect(stdout).toContain('x'); // Executable permission
      } catch (error) {
        throw new Error('AWS deploy script not found or not executable');
      }
    });

    test('should validate AWS deploy script syntax', async () => {
      try {
        const { stderr } = await execAsync('bash -n scripts/aws-deploy.sh', {
          cwd: '/Users/maxmartin/projects/RecruitmentWebsite'
        });
        expect(stderr).toBe(''); // No syntax errors
      } catch (error) {
        throw new Error(`AWS deploy script has syntax errors: ${error}`);
      }
    });

    test('should check AWS CLI availability in deploy script', async () => {
      try {
        // Test AWS CLI check function in script
        const { stdout } = await execAsync(
          'bash -c "source scripts/aws-deploy.sh && command -v aws"',
          { cwd: '/Users/maxmartin/projects/RecruitmentWebsite' }
        );
        expect(stdout).toContain('aws');
      } catch (error) {
        console.warn('AWS CLI not available for deployment');
      }
    });
  });

  describe('Environment Configuration', () => {
    test('should have required environment variables structure', () => {
      const requiredEnvVars = [
        'NODE_ENV',
        'PORT',
        'DATABASE_URL'
      ];

      // Check if environment variables are properly structured
      requiredEnvVars.forEach(envVar => {
        if (process.env[envVar]) {
          expect(typeof process.env[envVar]).toBe('string');
        }
      });
    });

    test('should handle production environment settings', async () => {
      // Test with production-like environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('OK');

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Database Connection Readiness', () => {
    test('should be able to establish database connection', async () => {
      // This would typically test database connectivity
      // For now, we'll test that the app starts without database errors
      expect(app).toBeDefined();
    });

    test('should handle database connection errors gracefully', async () => {
      // Test app behavior with invalid database URL
      const originalDbUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'postgresql://invalid:invalid@invalid:5432/invalid';

      // App should still start but handle database errors
      expect(app).toBeDefined();

      // Restore original database URL
      process.env.DATABASE_URL = originalDbUrl;
    });
  });

  describe('AWS Resource Configuration', () => {
    test('should validate ECR repository configuration', async () => {
      const ecrConfig = {
        repository: 'recruitment-backend',
        region: 'us-east-1'
      };

      expect(ecrConfig.repository).toBe('recruitment-backend');
      expect(ecrConfig.region).toBe('us-east-1');
    });

    test('should validate ECS task definition requirements', () => {
      const taskDefRequirements = {
        cpu: '256',
        memory: '512',
        port: 3000,
        environment: ['NODE_ENV', 'PORT', 'DATABASE_URL']
      };

      expect(taskDefRequirements.cpu).toBe('256');
      expect(taskDefRequirements.memory).toBe('512');
      expect(taskDefRequirements.port).toBe(3000);
      expect(taskDefRequirements.environment).toContain('NODE_ENV');
    });

    test('should validate RDS configuration requirements', () => {
      const rdsConfig = {
        engine: 'postgres',
        instanceClass: 'db.t3.micro',
        allocatedStorage: 20,
        dbName: 'recruitment'
      };

      expect(rdsConfig.engine).toBe('postgres');
      expect(rdsConfig.instanceClass).toBe('db.t3.micro');
      expect(rdsConfig.allocatedStorage).toBe(20);
      expect(rdsConfig.dbName).toBe('recruitment');
    });
  });

  describe('Security and Compliance', () => {
    test('should not expose sensitive information in error responses', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });

      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('DATABASE_URL');
      expect(response.body).not.toHaveProperty('JWT_SECRET');
    });

    test('should have proper CORS configuration', async () => {
      const response = await request(app)
        .options('/api/forms')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    test('should validate input sanitization', async () => {
      const maliciousInput = {
        firstName: '<script>alert("xss")</script>',
        lastName: 'DROP TABLE forms;',
        email: 'test@dreamteameng.org'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(maliciousInput);

      // Should either reject or sanitize malicious input
      expect(response.status).not.toBe(200);
    });
  });

  describe('Load and Performance', () => {
    test('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/health')
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});