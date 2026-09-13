/**
 * FIX PASSWORD FOR TEST USER
 * Updates password in Supabase Auth to match test credentials
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TEST_EMAIL = process.env.TEST_EMAIL || 'monstermen900@gmail.com';
// Password must have: lowercase, uppercase, number, special char
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Monster@900';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixPassword() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   FIX TEST USER PASSWORD');
  console.log('═══════════════════════════════════════════════════\n');
  console.log(`Email: ${TEST_EMAIL}`);
  console.log(`Setting Password to: ${TEST_PASSWORD}\n`);

  try {
    // Get user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      return false;
    }

    const user = users?.users?.find(u => u.email === TEST_EMAIL);

    if (!user) {
      console.error('❌ User not found:', TEST_EMAIL);
      console.log('\n💡 Creating new user...');
      
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
      });

      if (createError || !newUser.user) {
        console.error('❌ Failed to create user:', createError?.message);
        return false;
      }

      console.log('✅ User created');
      console.log(`   User ID: ${newUser.user.id}`);

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: newUser.user.id,
          email: TEST_EMAIL,
          full_name: 'Admin User',
          role: 'admin',
          is_active: true,
        });

      if (profileError) {
        console.error('❌ Failed to create profile:', profileError.message);
        return false;
      }

      console.log('✅ Profile created');
      console.log('\n✅ User setup complete!');
      return true;
    }

    console.log(`✅ User found: ${user.id}`);
    console.log('🔄 Updating password...');

    // Update password
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { 
        password: TEST_PASSWORD,
        email_confirm: true, // Ensure email is confirmed
      }
    );

    if (updateError) {
      console.error('❌ Failed to update password:', updateError.message);
      console.log('\n💡 Try manual reset in Supabase Dashboard:');
      console.log('   1. Go to Authentication → Users');
      console.log(`   2. Find: ${TEST_EMAIL}`);
      console.log(`   3. Click "Reset Password"`);
      console.log(`   4. Set password to: ${TEST_PASSWORD}`);
      return false;
    }

    console.log('✅ Password updated successfully!');

    // Verify profile exists and is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      console.log('⚠️ Profile not found. Creating...');
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: TEST_EMAIL,
          full_name: 'Admin User',
          role: 'admin',
          is_active: true,
        });

      if (profileError) {
        console.error('❌ Failed to create profile:', profileError.message);
        return false;
      }
      console.log('✅ Profile created');
    } else {
      // Ensure admin role and active
      if (profile.role !== 'admin' || !profile.is_active) {
        await supabase
          .from('profiles')
          .update({ role: 'admin', is_active: true })
          .eq('id', user.id);
        console.log('✅ Profile updated to admin and active');
      } else {
        console.log('✅ Profile is already admin and active');
      }
    }

    // Test login
    console.log('\n🔐 Testing login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    if (loginError || !loginData.user) {
      console.error('❌ Login test failed:', loginError?.message);
      console.log('\n⚠️ Password might need manual reset in Supabase Dashboard');
      return false;
    }

    console.log('✅ Login test successful!');
    console.log(`   User ID: ${loginData.user.id}`);
    console.log('\n🎉 Password fixed! You can now run tests.');
    return true;

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

fixPassword().catch(console.error);
