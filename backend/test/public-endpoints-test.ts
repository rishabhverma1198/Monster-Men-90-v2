/**
 * PUBLIC ENDPOINTS TEST
 * Tests endpoints that don't require authentication
 * Can run even if login fails
 */

import { config } from 'dotenv';
import axios from 'axios';

config({ path: '.env' });

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

const testResults: Record<string, { passed: boolean; error?: string }> = {};

function log(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
  };
  const reset = '\x1b[0m';
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  console.log(`${colors[type]}${icon} ${message}${reset}`);
}

function recordTest(testName: string, passed: boolean, error?: string) {
  testResults[testName] = { passed, error };
  if (passed) {
    log(`${testName}: PASSED`, 'success');
  } else {
    log(`${testName}: FAILED - ${error}`, 'error');
  }
}

async function makeRequest(method: 'GET' | 'POST', endpoint: string, data?: any) {
  try {
    const response = await axios({
      method,
      url: `${BACKEND_URL}${endpoint}`,
      headers: { 'Content-Type': 'application/json' },
      data,
      validateStatus: () => true,
    });
    return {
      success: response.status >= 200 && response.status < 300,
      data: response.data,
      status: response.status,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500,
    };
  }
}

async function testHealth() {
  log('\n🏥 TEST: Health Check', 'info');
  const result = await makeRequest('GET', '/health');
  recordTest('Health Check', result.success, JSON.stringify(result.error || result.data));
  return result.success;
}

async function testGetProducts() {
  log('\n📦 TEST: Get Products (Public)', 'info');
  const result = await makeRequest('GET', '/api/products?limit=10&offset=0');
  if (result.success && Array.isArray(result.data?.data?.products)) {
    recordTest('Get Products', true);
    return true;
  } else {
    recordTest('Get Products', false, JSON.stringify(result.error || result.data));
    return false;
  }
}

async function testSearchProducts() {
  log('\n🔍 TEST: Search Products (Public)', 'info');
  const result = await makeRequest('GET', '/api/products/search?q=test&limit=10');
  if (result.success && Array.isArray(result.data?.data?.products)) {
    recordTest('Search Products', true);
    return true;
  } else {
    recordTest('Search Products', false, JSON.stringify(result.error || result.data));
    return false;
  }
}

async function testGetCategories() {
  log('\n📂 TEST: Get Categories (Public)', 'info');
  const result = await makeRequest('GET', '/api/products/categories');
  if (result.success && Array.isArray(result.data?.data)) {
    recordTest('Get Categories', true);
    return true;
  } else {
    recordTest('Get Categories', false, JSON.stringify(result.error || result.data));
    return false;
  }
}

async function testDatabaseConnection() {
  log('\n🗄️ TEST: Database Connection (Public)', 'info');
  const result = await makeRequest('GET', '/api/test-db');
  if (result.success && result.data?.data?.status === 'connected ✅') {
    recordTest('Database Connection', true);
    return true;
  } else {
    recordTest('Database Connection', false, JSON.stringify(result.error || result.data));
    return false;
  }
}

function printSummary() {
  log('\n═══════════════════════════════════════════════════', 'info');
  log('   PUBLIC ENDPOINTS TEST SUMMARY', 'info');
  log('═══════════════════════════════════════════════════', 'info');

  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);

  log(`\nTotal Tests: ${totalTests}`, 'info');
  log(`Passed: ${passedTests}`, 'success');
  log(`Failed: ${failedTests}`, failedTests > 0 ? 'error' : 'success');
  log(`Success Rate: ${successRate}%`, successRate === '100.0' ? 'success' : 'error');

  log('\nDetailed Results:', 'info');
  Object.entries(testResults).forEach(([test, result]) => {
    if (result.passed) {
      log(`  ✅ ${test}`, 'success');
    } else {
      log(`  ❌ ${test}: ${result.error}`, 'error');
    }
  });

  if (successRate === '100.0') {
    log('\n🎉 ALL PUBLIC ENDPOINTS WORKING!', 'success');
  }
}

async function runTests() {
  log('\n═══════════════════════════════════════════════════', 'info');
  log('   PUBLIC ENDPOINTS TEST SUITE', 'info');
  log('═══════════════════════════════════════════════════', 'info');
  log(`Backend URL: ${BACKEND_URL}\n`, 'info');

  await testHealth();
  await testDatabaseConnection();
  await testGetProducts();
  await testSearchProducts();
  await testGetCategories();

  printSummary();
}

runTests().catch(console.error);
