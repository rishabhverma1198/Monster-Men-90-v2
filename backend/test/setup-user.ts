/**
 * SETUP TEST USER
 * Creates a test user for API testing
 * 
 * Usage: tsx test/setup-user.ts
 */

import { config } from 'dotenv';
import axios from 'axios';

config({ path: '.env' });

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Use a real-looking email domain to avoid Supabase email validation issues
const TEST_USER = {
  email: process.env.TEST_EMAIL || 'testuser123@gmail.com',
  password: process.env.TEST_PASSWORD || 'Test@1234',
  full_name: 'Test User',
};

async function createTestUser() {
  console.log('📝 Creating test user...\n');
  console.log(`Email: ${TEST_USER.email}`);
  console.log(`Password: ${TEST_USER.password}\n`);

  try {
    const response = await axios.post(`${BACKEND_URL}/api/auth/signup`, {
      email: TEST_USER.email,
      password: TEST_USER.password,
      confirmPassword: TEST_USER.password,
      full_name: TEST_USER.full_name,
    });

    if (response.data.success) {
      console.log('✅ Test user created successfully!');
      console.log(`   User ID: ${response.data.data.user?.id}`);
      console.log(`   Token: ${response.data.data.token?.substring(0, 20)}...`);
      console.log('\n💡 You can now run: npm run test:api');
    }
  } catch (error: any) {
    if (error.response?.status === 409) {
      console.log('ℹ️  User already exists. You can use these credentials to login.');
      console.log('   Try: npm run test:api');
    } else {
      console.error('❌ Failed to create user:', error.response?.data || error.message);
      console.error('\nError details:', JSON.stringify(error.response?.data, null, 2));
    }
  }
}

createTestUser();
