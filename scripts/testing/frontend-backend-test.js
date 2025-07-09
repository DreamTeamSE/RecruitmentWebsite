// Test script to verify frontend can connect to HTTPS backend
// Run this in the browser console on localhost:3001

async function testBackendConnection() {
  console.log('🧪 Testing Frontend → HTTPS Backend Connection');
  
  // Get the backend URL that the frontend is using
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  console.log('Backend URL:', backendUrl);
  
  try {
    // Test 1: Health Check
    console.log('\n1. Testing Health Endpoint...');
    const healthResponse = await fetch(`${backendUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health Check:', healthData);
    
    // Test 2: API Forms Feed
    console.log('\n2. Testing Forms API...');
    const formsResponse = await fetch(`${backendUrl}/api/forms/feed`);
    const formsData = await formsResponse.json();
    console.log('✅ Forms Feed:', formsData);
    
    // Test 3: CORS Headers
    console.log('\n3. Checking CORS Headers...');
    console.log('✅ Access-Control-Allow-Origin:', formsResponse.headers.get('access-control-allow-origin'));
    console.log('✅ Access-Control-Allow-Credentials:', formsResponse.headers.get('access-control-allow-credentials'));
    
    console.log('\n🎉 All tests passed! Frontend can successfully communicate with HTTPS backend.');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
testBackendConnection();
