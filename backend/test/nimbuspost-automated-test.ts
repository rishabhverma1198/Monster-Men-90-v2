/**
 * Nimbuspost Automated Testing Script
 * Complete automated test suite
 */

import { config } from 'dotenv';
import axios from 'axios';
import fs from 'fs';

// Load environment variables from .env file
config({ path: '.env' });

const NIMBUSPOST_API_KEY = process.env.NIMBUSPOST_API_KEY || '';
const NIMBUSPOST_API_USERNAME = process.env.NIMBUSPOST_API_USERNAME || '';
const NIMBUSPOST_API_PASSWORD = process.env.NIMBUSPOST_API_PASSWORD || '';
const NIMBUSPOST_BASE_URL = process.env.NIMBUSPOST_BASE_URL || 'https://api.nimbuspost.com';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Test configuration
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'monstermen900@gmail.com';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'your_password';

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  data?: any;
}

const results: TestResult[] = [];
let adminToken: string = '';
let testOrderId: string = '';
let testAWB: string = '';

/**
 * Helper: Make API request with error handling
 */
async function makeRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  headers: any,
  data?: any
): Promise<{ status: number; data: any; error?: any } | null> {
  try {
    const config: any = { method, url, headers };
    if (data) config.data = data;

    const response = await axios(config);
    return { status: response.status, data: response.data };
  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      code: error.code,
      responseStatus: error.response?.status,
      responseData: error.response?.data,
      responseHeaders: error.response?.headers,
    };
    
    return {
      status: error.response?.status || 0,
      data: error.response?.data || { error: error.message },
      error: errorDetails,
    };
  }
}

/**
 * Test 1: Authentication
 */
async function testAuthentication(): Promise<void> {
  console.log('\n📋 Test 1: Authentication');
  console.log('─────────────────────────────');
  console.log(`   Trying NP-API-KEY header...`);

  // Try NP-API-KEY header first (as per documentation)
  let response = await makeRequest('GET', `${NIMBUSPOST_BASE_URL}/api/shipments`, {
    'NP-API-KEY': NIMBUSPOST_API_KEY,
    'Content-Type': 'application/json',
  });
  
  // If that fails, try Authorization header
  if (response && response.status !== 200) {
    console.log(`   NP-API-KEY failed, trying Authorization header...`);
    response = await makeRequest('GET', `${NIMBUSPOST_BASE_URL}/api/shipments`, {
      'Authorization': `Bearer ${NIMBUSPOST_API_KEY}`,
      'Content-Type': 'application/json',
    });
  }
  
  // If still fails, try Basic Auth (username/password)
  if (response && response.status !== 200) {
    if (NIMBUSPOST_API_USERNAME && NIMBUSPOST_API_PASSWORD) {
      console.log(`   Bearer token failed, trying Basic Auth...`);
      const basicAuth = Buffer.from(`${NIMBUSPOST_API_USERNAME}:${NIMBUSPOST_API_PASSWORD}`).toString('base64');
      response = await makeRequest('GET', `${NIMBUSPOST_BASE_URL}/api/shipments`, {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      });
    } else {
      console.log(`   Bearer token failed, Basic Auth credentials not available`);
    }
  }
  
  // If still fails, try API key as query parameter
  if (response && response.status !== 200) {
    console.log(`   All header methods failed, trying query parameter...`);
    response = await makeRequest('GET', `${NIMBUSPOST_BASE_URL}/api/shipments?api_key=${NIMBUSPOST_API_KEY}`, {
      'Content-Type': 'application/json',
    });
  }

  if (response && response.status === 200) {
    results.push({
      testName: 'Authentication',
      status: 'PASS',
      message: '✅ API key authentication successful',
    });
    console.log('✅ PASS: Authentication successful');
  } else {
    const errorMsg = response?.data?.error || response?.data?.message || response?.error?.message || 'Unknown error';
    const statusCode = response?.status || 'No status';
    results.push({
      testName: 'Authentication',
      status: 'FAIL',
      message: `❌ Authentication failed: ${errorMsg} (Status: ${statusCode})`,
      data: response?.error,
    });
    console.log(`❌ FAIL: ${errorMsg}`);
    console.log(`   Status: ${statusCode}`);
    if (response?.error) {
      console.log(`   Details:`, JSON.stringify(response.error, null, 2));
    }
  }
}

/**
 * Test 2: Get All Shipments
 */
async function testGetAllShipments(): Promise<void> {
  console.log('\n📋 Test 2: Get All Shipments');
  console.log('─────────────────────────────');

  let response = await makeRequest('GET', `${NIMBUSPOST_BASE_URL}/api/shipments`, {
    'NP-API-KEY': NIMBUSPOST_API_KEY,
    'Content-Type': 'application/json',
  });
  
  // Fallback: Try Authorization header if NP-API-KEY fails
  if (response && response.status !== 200) {
    response = await makeRequest('GET', `${NIMBUSPOST_BASE_URL}/api/shipments`, {
      'Authorization': `Bearer ${NIMBUSPOST_API_KEY}`,
      'Content-Type': 'application/json',
    });
  }
  
  // Try Basic Auth if available
  if (response && response.status !== 200 && NIMBUSPOST_API_USERNAME && NIMBUSPOST_API_PASSWORD) {
    const basicAuth = Buffer.from(`${NIMBUSPOST_API_USERNAME}:${NIMBUSPOST_API_PASSWORD}`).toString('base64');
    response = await makeRequest('GET', `${NIMBUSPOST_BASE_URL}/api/shipments`, {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    });
  }
  
  // Try Basic Auth if available
  if (response && response.status !== 200 && NIMBUSPOST_API_USERNAME && NIMBUSPOST_API_PASSWORD) {
    const basicAuth = Buffer.from(`${NIMBUSPOST_API_USERNAME}:${NIMBUSPOST_API_PASSWORD}`).toString('base64');
    response = await makeRequest('GET', `${NIMBUSPOST_BASE_URL}/api/shipments`, {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    });
  }

  if (response && response.status === 200) {
    const count = response.data?.data?.length || 0;
    results.push({
      testName: 'Get All Shipments',
      status: 'PASS',
      message: `✅ Fetched ${count} shipments`,
      data: { count },
    });
    console.log(`✅ PASS: Fetched ${count} shipments`);
  } else {
    const errorMsg = response?.data?.error || response?.data?.message || response?.error?.message || 'Unknown error';
    const statusCode = response?.status || 'No status';
    results.push({
      testName: 'Get All Shipments',
      status: 'FAIL',
      message: `❌ Failed: ${errorMsg} (Status: ${statusCode})`,
      data: response?.error,
    });
    console.log(`❌ FAIL: ${errorMsg}`);
    console.log(`   Status: ${statusCode}`);
    if (response?.error?.code === 'ECONNREFUSED') {
      console.log(`   ⚠️  Connection refused - Check if Nimbuspost API is accessible`);
    }
  }
}

/**
 * Test 3: List Couriers
 */
async function testListCouriers(): Promise<void> {
  console.log('\n📋 Test 3: List All Couriers');
  console.log('─────────────────────────────');

  let response = await makeRequest('GET', `${NIMBUSPOST_BASE_URL}/api/couriers`, {
    'NP-API-KEY': NIMBUSPOST_API_KEY,
    'Content-Type': 'application/json',
  });
  
  if (response && response.status !== 200) {
    response = await makeRequest('GET', `${NIMBUSPOST_BASE_URL}/api/couriers`, {
      'Authorization': `Bearer ${NIMBUSPOST_API_KEY}`,
      'Content-Type': 'application/json',
    });
  }
  
  if (response && response.status !== 200 && NIMBUSPOST_API_USERNAME && NIMBUSPOST_API_PASSWORD) {
    const basicAuth = Buffer.from(`${NIMBUSPOST_API_USERNAME}:${NIMBUSPOST_API_PASSWORD}`).toString('base64');
    response = await makeRequest('GET', `${NIMBUSPOST_BASE_URL}/api/couriers`, {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    });
  }

  if (response && response.status === 200) {
    const count = response.data?.data?.length || 0;
    results.push({
      testName: 'List Couriers',
      status: 'PASS',
      message: `✅ Found ${count} couriers`,
      data: { couriers: response.data?.data },
    });
    console.log(`✅ PASS: Found ${count} couriers`);
  } else {
    const errorMsg = response?.data?.error || response?.data?.message || response?.error?.message || 'Unknown error';
    const statusCode = response?.status || 'No status';
    results.push({
      testName: 'List Couriers',
      status: 'FAIL',
      message: `❌ Failed: ${errorMsg} (Status: ${statusCode})`,
      data: response?.error,
    });
    console.log(`❌ FAIL: ${errorMsg}`);
    console.log(`   Status: ${statusCode}`);
  }
}

/**
 * Test 4: List Warehouses
 */
async function testListWarehouses(): Promise<void> {
  console.log('\n📋 Test 4: List All Warehouses');
  console.log('─────────────────────────────');

  let response = await makeRequest('GET', `${NIMBUSPOST_BASE_URL}/api/warehouses`, {
    'NP-API-KEY': NIMBUSPOST_API_KEY,
    'Content-Type': 'application/json',
  });
  
  if (response && response.status !== 200) {
    response = await makeRequest('GET', `${NIMBUSPOST_BASE_URL}/api/warehouses`, {
      'Authorization': `Bearer ${NIMBUSPOST_API_KEY}`,
      'Content-Type': 'application/json',
    });
  }
  
  if (response && response.status !== 200 && NIMBUSPOST_API_USERNAME && NIMBUSPOST_API_PASSWORD) {
    const basicAuth = Buffer.from(`${NIMBUSPOST_API_USERNAME}:${NIMBUSPOST_API_PASSWORD}`).toString('base64');
    response = await makeRequest('GET', `${NIMBUSPOST_BASE_URL}/api/warehouses`, {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    });
  }

  if (response && response.status === 200) {
    const count = response.data?.data?.length || 0;
    results.push({
      testName: 'List Warehouses',
      status: 'PASS',
      message: `✅ Found ${count} warehouses`,
      data: { warehouses: response.data?.data },
    });
    console.log(`✅ PASS: Found ${count} warehouses`);
  } else {
    const errorMsg = response?.data?.error || response?.data?.message || response?.error?.message || 'Unknown error';
    const statusCode = response?.status || 'No status';
    results.push({
      testName: 'List Warehouses',
      status: 'FAIL',
      message: `❌ Failed: ${errorMsg} (Status: ${statusCode})`,
      data: response?.error,
    });
    console.log(`❌ FAIL: ${errorMsg}`);
    console.log(`   Status: ${statusCode}`);
  }
}

/**
 * Test 5: Login to Backend
 */
async function testBackendLogin(): Promise<void> {
  console.log('\n📋 Test 5: Backend Login');
  console.log('─────────────────────────────');

  const response = await makeRequest('POST', `${BACKEND_URL}/api/auth/login`, {
    'Content-Type': 'application/json',
  }, {
    email: TEST_ADMIN_EMAIL,
    password: TEST_ADMIN_PASSWORD,
  });

  if (response && response.status === 200 && response.data?.data?.token) {
    adminToken = response.data.data.token;
    results.push({
      testName: 'Backend Login',
      status: 'PASS',
      message: '✅ Admin login successful',
    });
    console.log('✅ PASS: Admin login successful');
  } else {
    const errorMsg = response?.data?.error || response?.data?.message || response?.error?.message || 'Unknown error';
    const statusCode = response?.status || 'No status';
    results.push({
      testName: 'Backend Login',
      status: 'FAIL',
      message: `❌ Login failed: ${errorMsg} (Status: ${statusCode})`,
      data: response?.error || response?.data,
    });
    console.log(`❌ FAIL: Login failed`);
    console.log(`   Error: ${errorMsg}`);
    console.log(`   Status: ${statusCode}`);
    if (response?.error?.code === 'ECONNREFUSED') {
      console.log(`   ⚠️  Connection refused - Is backend running on port 5000?`);
    }
    console.log('⚠️  Some backend tests will be skipped');
  }
}

/**
 * Test 6: Get Orders
 */
async function testGetOrders(): Promise<void> {
  console.log('\n📋 Test 6: Get Orders');
  console.log('─────────────────────────────');

  if (!adminToken) {
    results.push({
      testName: 'Get Orders',
      status: 'SKIP',
      message: '⚠️  Skipped: No admin token',
    });
    console.log('⚠️  SKIP: No admin token');
    return;
  }

  // Use admin route to get all orders
  const response = await makeRequest('GET', `${BACKEND_URL}/api/admin/orders`, {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  });

  if (response && response.status === 200) {
    // Admin route returns { data: { orders: [...] } }
    const orders = response.data?.data?.orders || response.data?.orders || [];
    if (orders.length > 0) {
      testOrderId = orders[0].id;
      results.push({
        testName: 'Get Orders',
        status: 'PASS',
        message: `✅ Found ${orders.length} orders`,
        data: { orderId: testOrderId },
      });
      console.log(`✅ PASS: Found ${orders.length} orders. Using order: ${testOrderId}`);
    } else {
      results.push({
        testName: 'Get Orders',
        status: 'SKIP',
        message: '⚠️  No orders found. Create an order first.',
      });
      console.log('⚠️  SKIP: No orders found');
      console.log(`   Response data:`, JSON.stringify(response.data, null, 2));
    }
  } else {
    const errorMsg = response?.data?.error || response?.data?.message || response?.error?.message || 'Unknown error';
    const statusCode = response?.status || 'No status';
    results.push({
      testName: 'Get Orders',
      status: 'FAIL',
      message: `❌ Failed: ${errorMsg} (Status: ${statusCode})`,
      data: response?.error || response?.data,
    });
    console.log(`❌ FAIL: ${errorMsg}`);
    console.log(`   Status: ${statusCode}`);
    console.log(`   Full response:`, JSON.stringify(response?.data || response?.error, null, 2));
  }
}

/**
 * Test 7: Create Shipment
 */
async function testCreateShipment(): Promise<void> {
  console.log('\n📋 Test 7: Create Shipment');
  console.log('─────────────────────────────');

  if (!adminToken || !testOrderId) {
    results.push({
      testName: 'Create Shipment',
      status: 'SKIP',
      message: '⚠️  Skipped: No token or order ID',
    });
    console.log('⚠️  SKIP: No token or order ID');
    return;
  }

  const response = await makeRequest(
    'POST',
    `${BACKEND_URL}/api/shipping/create`,
    {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    { order_id: testOrderId }
  );

  if (response && response.status === 200 && response.data?.data?.awb_number) {
    testAWB = response.data.data.awb_number;
    results.push({
      testName: 'Create Shipment',
      status: 'PASS',
      message: `✅ Shipment created: AWB ${testAWB}`,
      data: {
        awb: testAWB,
        trackingUrl: response.data.data.tracking_url,
      },
    });
    console.log(`✅ PASS: Shipment created - AWB ${testAWB}`);
  } else {
    results.push({
      testName: 'Create Shipment',
      status: 'FAIL',
      message: `❌ Failed: ${response?.data?.message || response?.data?.error || 'Unknown error'}`,
      data: response?.data,
    });
    console.log(`❌ FAIL: ${response?.data?.message || response?.data?.error || 'Unknown error'}`);
  }
}

/**
 * Test 8: Get Shipment Details
 */
async function testGetShipmentDetails(): Promise<void> {
  console.log('\n📋 Test 8: Get Shipment Details');
  console.log('─────────────────────────────');

  if (!testAWB) {
    results.push({
      testName: 'Get Shipment Details',
      status: 'SKIP',
      message: '⚠️  Skipped: No AWB available',
    });
    console.log('⚠️  SKIP: No AWB available');
    return;
  }

  const response = await makeRequest(
    'GET',
    `${NIMBUSPOST_BASE_URL}/api/shipments/${testAWB}`,
    {
      'NP-API-KEY': NIMBUSPOST_API_KEY,
    }
  );

  if (response && response.status === 200) {
    results.push({
      testName: 'Get Shipment Details',
      status: 'PASS',
      message: `✅ Shipment details fetched for AWB ${testAWB}`,
    });
    console.log(`✅ PASS: Shipment details fetched`);
  } else {
    results.push({
      testName: 'Get Shipment Details',
      status: 'FAIL',
      message: `❌ Failed: ${response?.data?.error || 'Unknown error'}`,
    });
    console.log(`❌ FAIL: ${response?.data?.error || 'Unknown error'}`);
  }
}

/**
 * Test 9: Track Shipment
 */
async function testTrackShipment(): Promise<void> {
  console.log('\n📋 Test 9: Track Shipment');
  console.log('─────────────────────────────');

  if (!testAWB) {
    results.push({
      testName: 'Track Shipment',
      status: 'SKIP',
      message: '⚠️  Skipped: No AWB available',
    });
    console.log('⚠️  SKIP: No AWB available');
    return;
  }

  const response = await makeRequest(
    'GET',
    `${NIMBUSPOST_BASE_URL}/api/shipments/track/${testAWB}`,
    {
      'NP-API-KEY': NIMBUSPOST_API_KEY,
    }
  );

  if (response && response.status === 200) {
    results.push({
      testName: 'Track Shipment',
      status: 'PASS',
      message: `✅ Tracking info fetched for AWB ${testAWB}`,
      data: response.data,
    });
    console.log(`✅ PASS: Tracking info fetched`);
  } else {
    results.push({
      testName: 'Track Shipment',
      status: 'FAIL',
      message: `❌ Failed: ${response?.data?.error || 'Unknown error'}`,
    });
    console.log(`❌ FAIL: ${response?.data?.error || 'Unknown error'}`);
  }
}

/**
 * Test 10: Generate Label
 */
async function testGenerateLabel(): Promise<void> {
  console.log('\n📋 Test 10: Generate Shipping Label');
  console.log('─────────────────────────────');

  if (!testAWB) {
    results.push({
      testName: 'Generate Label',
      status: 'SKIP',
      message: '⚠️  Skipped: No AWB available',
    });
    console.log('⚠️  SKIP: No AWB available');
    return;
  }

  const response = await makeRequest(
    'POST',
    `${NIMBUSPOST_BASE_URL}/api/shipments/${testAWB}/label`,
    {
      'NP-API-KEY': NIMBUSPOST_API_KEY,
    },
    {}
  );

  if (response && response.status === 200) {
    results.push({
      testName: 'Generate Label',
      status: 'PASS',
      message: `✅ Label generated for AWB ${testAWB}`,
      data: response.data,
    });
    console.log(`✅ PASS: Label generated`);
  } else {
    results.push({
      testName: 'Generate Label',
      status: 'FAIL',
      message: `❌ Failed: ${response?.data?.error || 'Unknown error'}`,
    });
    console.log(`❌ FAIL: ${response?.data?.error || 'Unknown error'}`);
  }
}

/**
 * Test 11: Backend Track Endpoint
 */
async function testBackendTrack(): Promise<void> {
  console.log('\n📋 Test 11: Backend Track Endpoint');
  console.log('─────────────────────────────');

  if (!testAWB || !adminToken) {
    results.push({
      testName: 'Backend Track',
      status: 'SKIP',
      message: '⚠️  Skipped: No AWB or token',
    });
    console.log('⚠️  SKIP: No AWB or token');
    return;
  }

  const response = await makeRequest(
    'GET',
    `${BACKEND_URL}/api/shipping/track/${testAWB}`,
    {
      'Authorization': `Bearer ${adminToken}`,
    }
  );

  if (response && response.status === 200) {
    results.push({
      testName: 'Backend Track',
      status: 'PASS',
      message: `✅ Backend tracking successful`,
      data: response.data,
    });
    console.log(`✅ PASS: Backend tracking successful`);
  } else {
    results.push({
      testName: 'Backend Track',
      status: 'FAIL',
      message: `❌ Failed: ${response?.data?.error || 'Unknown error'}`,
    });
    console.log(`❌ FAIL: ${response?.data?.error || 'Unknown error'}`);
  }
}

/**
 * Test 12: Get Shipping Rates
 */
async function testGetRates(): Promise<void> {
  console.log('\n📋 Test 12: Get Shipping Rates');
  console.log('─────────────────────────────');

  if (!adminToken) {
    results.push({
      testName: 'Get Rates',
      status: 'SKIP',
      message: '⚠️  Skipped: No admin token',
    });
    console.log('⚠️  SKIP: No admin token');
    return;
  }

  const response = await makeRequest(
    'POST',
    `${BACKEND_URL}/api/shipping/rates`,
    {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    {
      pickup_pincode: '110001',
      delivery_pincode: '400001',
      weight: 500,
      cod_amount: 0,
    }
  );

  if (response && response.status === 200) {
    results.push({
      testName: 'Get Rates',
      status: 'PASS',
      message: `✅ Shipping rates fetched`,
      data: response.data,
    });
    console.log(`✅ PASS: Shipping rates fetched`);
  } else {
    const errorMsg = response?.data?.error || response?.data?.message || response?.error?.message || 'Unknown error';
    const statusCode = response?.status || 'No status';
    results.push({
      testName: 'Get Rates',
      status: 'FAIL',
      message: `❌ Failed: ${errorMsg} (Status: ${statusCode})`,
      data: response?.error || response?.data,
    });
    console.log(`❌ FAIL: ${errorMsg}`);
    console.log(`   Status: ${statusCode}`);
    console.log(`   Full response:`, JSON.stringify(response?.data || response?.error, null, 2));
  }
}

/**
 * Print Summary
 */
function printSummary(): void {
  console.log('\n\n');
  console.log('═══════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`, passed > 0 ? '✅' : '');
  console.log(`❌ Failed: ${failed}`, failed > 0 ? '❌' : '');
  console.log(`⚠️  Skipped: ${skipped}`, skipped > 0 ? '⚠️' : '');
  console.log('');

  console.log('Detailed Results:');
  console.log('─────────────────');
  results.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${index + 1}. ${icon} ${result.testName}: ${result.message}`);
  });

  console.log('');
  console.log('═══════════════════════════════════════════════════');
}

/**
 * Main Test Runner
 */
async function runAllTests(): Promise<void> {
  console.log('🚀 Starting Nimbuspost Automated Tests');
  console.log('═══════════════════════════════════════════════════');
  console.log(`API Base URL: ${NIMBUSPOST_BASE_URL}`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log('');
  
  // Validate environment variables
  if (!NIMBUSPOST_API_KEY) {
    console.error('❌ ERROR: NIMBUSPOST_API_KEY not found in environment variables');
    console.error('   Please check your .env file');
    process.exit(1);
  }
  
  console.log(`✅ API Key: ${NIMBUSPOST_API_KEY.substring(0, 10)}...`);
  console.log(`✅ Test Admin Email: ${TEST_ADMIN_EMAIL}`);
  console.log('');

  try {
    // Run all tests sequentially
    await testAuthentication();
    await testGetAllShipments();
    await testListCouriers();
    await testListWarehouses();
    await testBackendLogin();
    await testGetOrders();
    await testCreateShipment();
    await testGetShipmentDetails();
    await testTrackShipment();
    await testGenerateLabel();
    await testBackendTrack();
    await testGetRates();

    // Print summary
    printSummary();

    // Save results to file
    fs.writeFileSync(
      'nimbuspost-test-results.json',
      JSON.stringify(results, null, 2)
    );
    console.log('\n📄 Results saved to: nimbuspost-test-results.json');
  } catch (error: any) {
    console.error('\n❌ Test execution error:', error.message);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(console.error);
