import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const isLocal = process.env.NODE_ENV !== 'production';

const psql_client = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(isLocal && { ssl: false }),
});

export default psql_client;
