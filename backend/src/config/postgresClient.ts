import { Pool, PoolConfig } from 'pg';

class DatabaseManager {
  private static instance: DatabaseManager;
  private pool: Pool;

  private constructor() {
    const config: PoolConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.pool = new Pool(config);
    this.setupEventHandlers();
    this.testConnection();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  private setupEventHandlers(): void {
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });

    this.pool.on('connect', () => {
      console.log('📊 New database connection established');
    });
  }

  private async testConnection(): Promise<void> {
    try {
      await this.pool.query('SELECT NOW()');
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      throw new Error('Database connection failed. Please ensure the database is running.');
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
    console.log('Database pool closed');
  }
}

const dbManager = DatabaseManager.getInstance();
export default dbManager.getPool();
