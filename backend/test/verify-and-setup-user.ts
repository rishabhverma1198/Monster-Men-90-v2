/**
 * Verify Test User Exists or Create It
 * Ensures test user is available before running tests
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

const TEST_EMAIL = process.env.TEST_EMAIL || 'monstermen900@gmail.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'monster@900';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyOrCreateUser() {
  console.log('\n🔍 Verifying test user...');
  console.log(`Email: ${TEST_EMAIL}`);

  try {
    // Try to login first
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (!authError && authData.user) {
      console.log('✅ Test user exists and credentials are correct');
      
      // Verify profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profile) {
        console.log(`✅ Profile exists - Role: ${profile.role}, Active: ${profile.is_active}`);
        if (!profile.is_active) {
          console.log('⚠️ User is inactive. Activating...');
          await supabase
            .from('profiles')
            .update({ is_active: true })
            .eq('id', authData.user.id);
          console.log('✅ User activated');
        }
        return true;
      } else {
        console.log('⚠️ Profile not found. Creating...');
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: TEST_EMAIL,
            full_name: 'Test Admin User',
            role: 'admin',
            is_active: true,
          });
        
        if (profileError) {
          console.error('❌ Failed to create profile:', profileError.message);
          return false;
        }
        console.log('✅ Profile created');
        return true;
      }
    } else {
      console.log('⚠️ User not found or credentials incorrect');
      console.log('💡 Please verify the user exists in Supabase Auth dashboard');
      console.log('   Or create it manually with:');
      console.log(`   Email: ${TEST_EMAIL}`);
      console.log(`   Password: ${TEST_PASSWORD}`);
      return false;
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testLogin() {
  console.log('\n🔐 Testing login via backend API...');
  try {
    const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (response.data?.data?.token) {
      console.log('✅ Login successful via backend API');
      console.log(`   Token: ${response.data.data.token.substring(0, 20)}...`);
      return true;
    } else {
      console.log('❌ Login failed - No token received');
      return false;
    }
  } catch (error: any) {
    console.log('❌ Login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   TEST USER VERIFICATION');
  console.log('═══════════════════════════════════════════════════');

  const userExists = await verifyOrCreateUser();
  
  if (userExists) {
    await testLogin();
  } else {
    console.log('\n❌ Cannot proceed. Please fix user setup first.');
    process.exit(1);
  }
}

main().catch(console.error);
