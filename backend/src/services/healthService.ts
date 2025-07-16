import { Pool } from 'pg';
import pool from '../config/postgresClient';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  database: {
    connected: boolean;
    responseTime?: number;
    error?: string;
  };
  application: {
    version: string;
    uptime: number;
    environment: string;
  };
}

export class HealthService {
  private static startTime = Date.now();

  public static async checkHealth(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    
    // Get version from package.json
    const version = this.getApplicationVersion();
    
    // Check database connectivity
    const databaseStatus = await this.checkDatabaseConnection();
    
    // Determine overall health status
    const status = databaseStatus.connected ? 'healthy' : 'unhealthy';
    
    return {
      status,
      timestamp,
      database: databaseStatus,
      application: {
        version,
        uptime,
        environment: process.env.NODE_ENV || 'development'
      }
    };
  }

  private static async checkDatabaseConnection(): Promise<{
    connected: boolean;
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      await pool.query('SELECT 1');
      const responseTime = Date.now() - startTime;
      
      return {
        connected: true,
        responseTime
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  private static getApplicationVersion(): string {
    try {
      const packageJsonPath = join(__dirname, '../../package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      return packageJson.version || 'unknown';
    } catch (error) {
      console.error('Failed to read application version:', error);
      return 'unknown';
    }
  }

  public static getStatusCode(healthStatus: HealthStatus): number {
    return healthStatus.status === 'healthy' ? 200 : 503;
  }
}