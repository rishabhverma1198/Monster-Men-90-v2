/**
 * AUTOMATED API TEST SCRIPT
 * Tests all critical flows: Product → Cart → Checkout → Inventory
 * 
 * USAGE:
 * 1. Set environment variables (see .env.example)
 * 2. Run: npx tsx backend/test/api-test.ts
 * 
 * This will test:
 * - Product creation
 * - Add to cart
 * - Checkout
 * - Inventory reservation
 * - Order cancellation → inventory release
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { TEST_CONFIG } from './config.test.js';

// Load environment variables
config({ path: '.env' });

const BACKEND_URL = TEST_CONFIG.backendUrl;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

import { TEST_CONFIG } from './config.test.js';

// Use existing admin user from Supabase
const TEST_USER = TEST_CONFIG;

let authToken: string = '';
let testUserId: string = '';
let createdProductId: string = '';
let createdOrderId: string = '';

// =========================================================
// HELPER FUNCTIONS
// =========================================================

function log(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
  };
  const reset = '\x1b[0m';
  console.log(`${colors[type]}${message}${reset}`);
}

async function makeRequest(method: 'GET' | 'POST' | 'PUT' | 'DELETE', endpoint: string, data?: any, token?: string) {
  try {
    const response = await axios({
      method,
      url: `${BACKEND_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      data,
    });
    return { success: true, data: response.data, status: response.status };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500,
    };
  }
}

// =========================================================
// TEST SUITE
// =========================================================

async function testAuth() {
  log('\n🔐 TEST 1: Authentication', 'info');
  
  const result = await makeRequest('POST', '/api/auth/login', {
    email: TEST_USER.email,
    password: TEST_USER.password,
  });

  if (result.success && result.data?.data?.token) {
    authToken = result.data.data.token;
    testUserId = result.data.data.user?.id || '';
    log('✅ Login successful', 'success');
    return true;
  } else {
    log(`❌ Login failed: ${JSON.stringify(result.error)}`, 'error');
    log(`\n💡 TIP: Create test user first by running:`, 'info');
    log(`   npm run test:setup`, 'info');
    log(`\n   Or set environment variables:`, 'info');
    log(`   TEST_EMAIL=your@email.com TEST_PASSWORD=Your@Pass123 npm run test:api`, 'info');
    return false;
  }
}

async function testProductCreation() {
  log('\n📦 TEST 2: Product Creation', 'info');

  const productData = {
    name: `Test Product ${Date.now()}`,
    description: 'Automated test product',
    price: 1000,
    wholesalePrice: 800,
    moq: 10,
    category: 'TEST',
    stock: 100,
  };

  const result = await makeRequest('POST', '/api/products', productData, authToken);

  if (result.success && result.data?.data?.id) {
    createdProductId = result.data.data.id;
    log(`✅ Product created: ${createdProductId}`, 'success');
    
    // Verify product in database
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', createdProductId)
      .single();
    
    if (product) {
      log(`   - Title: ${product.title}`, 'info');
      log(`   - Slug: ${product.slug}`, 'info');
      log(`   - Stock: ${product.stock}`, 'info');
    }

    // Verify inventory row created
    const { data: inventory } = await supabase
      .from('inventory')
      .select('*')
      .eq('product_id', createdProductId)
      .is('variant_id', null)
      .single();
    
    if (inventory) {
      log(`   - Inventory stock: ${inventory.stock}`, 'info');
      log(`   - Inventory reserved: ${inventory.reserved}`, 'info');
    } else {
      log(`   ⚠️ WARNING: Inventory row not found!`, 'error');
    }

    return true;
  } else {
    log(`❌ Product creation failed: ${JSON.stringify(result.error)}`, 'error');
    return false;
  }
}

async function testAddToCart() {
  log('\n🛒 TEST 3: Add to Cart', 'info');

  const result = await makeRequest(
    'POST',
    '/api/cart',
    { product_id: createdProductId, quantity: 5 },
    authToken
  );

  if (result.success) {
    log('✅ Item added to cart', 'success');
    return true;
  } else {
    log(`❌ Add to cart failed: ${JSON.stringify(result.error)}`, 'error');
    return false;
  }
}

async function testGetCart() {
  log('\n🛒 TEST 4: Get Cart', 'info');

  const result = await makeRequest('GET', '/api/cart', undefined, authToken);

  if (result.success) {
    log('✅ Cart fetched successfully', 'success');
    if (result.data?.data) {
      log(`   - Items in cart: ${Array.isArray(result.data.data) ? result.data.data.length : 0}`, 'info');
    }
    return true;
  } else {
    log(`❌ Get cart failed: ${JSON.stringify(result.error)}`, 'error');
    return false;
  }
}

async function testCheckout() {
  log('\n💰 TEST 5: Checkout', 'info');

  // Get inventory before checkout
  const { data: invBefore } = await supabase
    .from('inventory')
    .select('stock, reserved')
    .eq('product_id', createdProductId)
    .is('variant_id', null)
    .single();

  log(`   - Inventory before: stock=${invBefore?.stock}, reserved=${invBefore?.reserved}`, 'info');

  const result = await makeRequest('POST', '/api/orders', {}, authToken);

  if (result.success && result.data?.data?.id) {
    createdOrderId = result.data.data.id;
    log(`✅ Order created: ${createdOrderId}`, 'success');
    log(`   - Order number: ${result.data.data.order_number}`, 'info');
    log(`   - Total amount: ${result.data.data.total_amount}`, 'info');

    // Check inventory after checkout
    const { data: invAfter } = await supabase
      .from('inventory')
      .select('stock, reserved')
      .eq('product_id', createdProductId)
      .is('variant_id', null)
      .single();

    log(`   - Inventory after: stock=${invAfter?.stock}, reserved=${invAfter?.reserved}`, 'info');
    
    if (invAfter) {
      const reservedIncreased = (invAfter.reserved || 0) > (invBefore?.reserved || 0);
      const stockUnchanged = invAfter.stock === invBefore?.stock;

      if (reservedIncreased && stockUnchanged) {
        log('   ✅ Inventory correctly reserved (reserved increased, stock unchanged)', 'success');
      } else {
        log(`   ⚠️ WARNING: Inventory reservation may be incorrect!`, 'error');
        log(`      Expected: reserved to increase, stock to stay same`, 'error');
      }
    }

    return true;
  } else {
    log(`❌ Checkout failed: ${JSON.stringify(result.error)}`, 'error');
    return false;
  }
}

async function testOrderCancellation() {
  log('\n🚫 TEST 6: Order Cancellation → Inventory Release', 'info');

  if (!createdOrderId) {
    log('   ⚠️ Skipped: No order to cancel', 'info');
    return false;
  }

  // Get inventory before cancellation
  const { data: invBefore } = await supabase
    .from('inventory')
    .select('stock, reserved')
    .eq('product_id', createdProductId)
    .is('variant_id', null)
    .single();

  log(`   - Inventory before cancel: stock=${invBefore?.stock}, reserved=${invBefore?.reserved}`, 'info');

  // Cancel order (update status in database)
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', createdOrderId);

  if (updateError) {
    log(`❌ Failed to cancel order: ${updateError.message}`, 'error');
    return false;
  }

  // Wait a bit for trigger to execute
  await new Promise(resolve => setTimeout(resolve, 500));

  // Check inventory after cancellation
  const { data: invAfter } = await supabase
    .from('inventory')
    .select('stock, reserved')
    .eq('product_id', createdProductId)
    .is('variant_id', null)
    .single();

  log(`   - Inventory after cancel: stock=${invAfter?.stock}, reserved=${invAfter?.reserved}`, 'info');

  if (invAfter) {
    const reservedDecreased = (invAfter.reserved || 0) < (invBefore?.reserved || 0);

    if (reservedDecreased) {
      log('   ✅ Inventory correctly released (reserved decreased)', 'success');
      return true;
    } else {
      log(`   ⚠️ WARNING: Inventory release may not have worked!`, 'error');
      return false;
    }
  }

  return false;
}

async function cleanup() {
  log('\n🧹 CLEANUP: Removing test data...', 'info');

  if (createdOrderId) {
    await supabase.from('orders').delete().eq('id', createdOrderId);
  }
  if (createdProductId) {
    await supabase.from('products').delete().eq('id', createdProductId);
  }

  log('✅ Cleanup complete', 'success');
}

// =========================================================
// MAIN TEST RUNNER
// =========================================================

async function runTests() {
  log('═══════════════════════════════════════════════════', 'info');
  log('   AUTOMATED API TEST SUITE', 'info');
  log('═══════════════════════════════════════════════════', 'info');

  const results = {
    auth: false,
    productCreation: false,
    addToCart: false,
    getCart: false,
    checkout: false,
    cancellation: false,
  };

  try {
    // Run tests in sequence
    results.auth = await testAuth();
    if (!results.auth) {
      log('\n❌ Authentication failed. Cannot continue tests.', 'error');
      return;
    }

    results.productCreation = await testProductCreation();
    if (!results.productCreation) {
      log('\n❌ Product creation failed. Cannot continue tests.', 'error');
      return;
    }

    results.addToCart = await testAddToCart();
    results.getCart = await testGetCart();
    results.checkout = await testCheckout();
    results.cancellation = await testOrderCancellation();

    // Summary
    log('\n═══════════════════════════════════════════════════', 'info');
    log('   TEST SUMMARY', 'info');
    log('═══════════════════════════════════════════════════', 'info');
    
    Object.entries(results).forEach(([test, passed]) => {
      log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`, passed ? 'success' : 'error');
    });

    const allPassed = Object.values(results).every(r => r);
    if (allPassed) {
      log('\n🎉 ALL TESTS PASSED!', 'success');
    } else {
      log('\n⚠️ SOME TESTS FAILED - Review errors above', 'error');
    }

  } catch (error: any) {
    log(`\n❌ Unexpected error: ${error.message}`, 'error');
    console.error(error);
  } finally {
    // Ask before cleanup
    // await cleanup(); // Uncomment to auto-cleanup
  }
}

// Run tests
runTests().catch(console.error);
