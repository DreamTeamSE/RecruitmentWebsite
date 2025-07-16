import { config } from 'dotenv';

// Load environment variables for testing
config({ path: '.env.test' });

// Global setup that runs once
console.log('🚀 Test environment configured');

// Set process timeout for cleanup
process.on('exit', () => {
  console.log('✅ Test suite completed');
});
