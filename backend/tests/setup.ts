import { config } from 'dotenv';

// Load environment variables for testing
config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
  // Any global setup logic here
});

afterAll(async () => {
  // Close database connections with timeout
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}, 10000);
