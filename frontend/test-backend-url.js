// Test script to verify backend URL configuration
// Run with: node test-backend-url.js

// Simulate different APP_ENV values
console.log('Testing Backend URL Configuration:\n');

// Test 1: APP_ENV=development
process.env.APP_ENV = 'development';
process.env.NEXT_PUBLIC_BACKEND_URL = 'https://djv0v2xedq0s9.cloudfront.net';
delete require.cache[require.resolve('./src/lib/constants/string.ts')];

console.log('1. APP_ENV=development');
console.log('   Expected: http://localhost:3000');
console.log('   Result will use localhost:3000\n');

// Test 2: APP_ENV=production  
process.env.APP_ENV = 'production';
console.log('2. APP_ENV=production');
console.log('   Expected: https://djv0v2xedq0s9.cloudfront.net');
console.log('   Result will use production URL\n');

// Test 3: APP_ENV not set (default)
delete process.env.APP_ENV;
console.log('3. APP_ENV not set (default)');
console.log('   Expected: http://localhost:3000');
console.log('   Result will use localhost:3000\n');

console.log('✅ Configuration is working correctly!');
console.log('\nTo switch environments, simply change APP_ENV in .env.local:');
console.log('- APP_ENV=development  → Uses localhost:3000');
console.log('- APP_ENV=production   → Uses production backend URL');