import { Pool } from 'pg';

const isLocal = process.env.NODE_ENV !== 'production';

const psql_client = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(isLocal ? { ssl: false } : { ssl: { rejectUnauthorized: false } }),
});


psql_client.connect((err) => {
  if (err) {
    console.error('Failed to connect to the database:', err.message);
    throw new Error('Database connection failed. Please ensure the database is running.');
  } else {
    console.log('Database connected successfully.');
  }
});

export default psql_client;
