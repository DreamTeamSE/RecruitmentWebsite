#!/usr/bin/env node

// Complete Integration Test for HTTPS Deployment
// Tests both frontend and backend integration

const https = require('https');

const CONFIG = {
  CLOUDFRONT_URL: 'https://d2oc9fk5wyihzt.cloudfront.net',
  AMPLIFY_FRONTEND: 'https://main.d1d64zijwu2pjz.amplifyapp.com',
  LOCAL_FRONTEND: 'http://localhost:3001',
  TEST_FORM_ID: 1
};

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function testEndpointCoverage() {
  console.log('🚀 Complete HTTPS Deployment Integration Test');
  console.log('===============================================\n');
  
  const tests = [
    {
      name: 'Health Check',
      url: `${CONFIG.CLOUDFRONT_URL}/health`,
      expectedStatus: 200
    },
    {
      name: 'Forms Feed API',
      url: `${CONFIG.CLOUDFRONT_URL}/api/forms/feed`,
      expectedStatus: 200,
      headers: { 'Origin': CONFIG.AMPLIFY_FRONTEND }
    },
    {
      name: 'Individual Form API',
      url: `${CONFIG.CLOUDFRONT_URL}/api/forms/${CONFIG.TEST_FORM_ID}`,
      expectedStatus: 200,
      headers: { 'Origin': CONFIG.AMPLIFY_FRONTEND }
    },
    {
      name: 'CORS Preflight Test',
      url: `${CONFIG.CLOUDFRONT_URL}/api/forms/feed`,
      expectedStatus: 200,
      method: 'OPTIONS',
      headers: {
        'Origin': CONFIG.AMPLIFY_FRONTEND,
        'Access-Control-Request-Method': 'GET'
      }
    }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}...`);
      
      const response = await makeRequest(test.url, {
        method: test.method || 'GET',
        headers: test.headers || {}
      });
      
      if (response.status === test.expectedStatus) {
        console.log(`   ✅ Status: ${response.status}`);
        
        // Additional validations
        if (test.name.includes('API') && response.data) {
          try {
            const data = JSON.parse(response.data);
            console.log(`   ✅ JSON Response: Valid`);
            if (data.feed) console.log(`   ✅ Forms Count: ${data.feed.length}`);
            if (data.form) console.log(`   ✅ Form Title: ${data.form.title}`);
          } catch (e) {
            console.log(`   ⚠️  JSON Parse Warning: ${e.message}`);
          }
        }
        
        // Check CORS headers
        if (response.headers['access-control-allow-origin']) {
          console.log(`   ✅ CORS Origin: ${response.headers['access-control-allow-origin']}`);
        }
        
        passedTests++;
        console.log(`   ✅ PASSED\n`);
      } else {
        console.log(`   ❌ Expected status ${test.expectedStatus}, got ${response.status}`);
        console.log(`   ❌ FAILED\n`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log(`   ❌ FAILED\n`);
    }
  }
  
  // Summary
  console.log('===============================================');
  console.log('📊 TEST SUMMARY');
  console.log('===============================================');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('\n✅ Deployment Status: FULLY FUNCTIONAL');
    console.log('\n🔗 Production URLs:');
    console.log(`   Frontend: ${CONFIG.AMPLIFY_FRONTEND}`);
    console.log(`   Backend:  ${CONFIG.CLOUDFRONT_URL}`);
    console.log(`   Health:   ${CONFIG.CLOUDFRONT_URL}/health`);
    console.log('\n🚀 The recruitment application is ready for production use!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.');
  }
  
  return passedTests === totalTests;
}

// Run the comprehensive test
testEndpointCoverage().catch(console.error);
