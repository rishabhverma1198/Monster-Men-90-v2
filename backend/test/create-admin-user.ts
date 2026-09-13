/**
 * CREATE ADMIN USER FOR TESTING
 * Creates admin user in Supabase Auth if it doesn't exist
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TEST_EMAIL = process.env.TEST_EMAIL || 'monstermen900@gmail.com';
// Password must meet Supabase requirements: lowercase, uppercase, number, special char
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Monster@900';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createAdminUser() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   CREATE ADMIN USER FOR TESTING');
  console.log('═══════════════════════════════════════════════════\n');
  console.log(`Email: ${TEST_EMAIL}`);
  console.log(`Password: ${TEST_PASSWORD}\n`);

  try {
    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === TEST_EMAIL);

    if (existingUser) {
      console.log('ℹ️  User already exists in Supabase Auth');
      console.log(`   User ID: ${existingUser.id}`);
      
      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', existingUser.id)
        .single();

      if (profile) {
        console.log('✅ Profile exists');
        console.log(`   Role: ${profile.role}`);
        console.log(`   Active: ${profile.is_active}`);
        
        // Update to admin if not already
        if (profile.role !== 'admin') {
          await supabase
            .from('profiles')
            .update({ role: 'admin', is_active: true })
            .eq('id', existingUser.id);
          console.log('✅ Updated role to admin');
        }
        
        // Ensure active
        if (!profile.is_active) {
          await supabase
            .from('profiles')
            .update({ is_active: true })
            .eq('id', existingUser.id);
          console.log('✅ Activated user');
        }
      } else {
        // Create profile
        console.log('⚠️  Profile not found. Creating...');
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: existingUser.id,
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
      }

      // Reset password to ensure it's correct
      console.log('\n🔄 Resetting password to ensure it matches...');
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password: TEST_PASSWORD }
      );

      if (updateError) {
        console.log('⚠️  Could not update password:', updateError.message);
        console.log('   Password might already be correct or need manual reset');
      } else {
        console.log('✅ Password updated');
      }
      
      return true;
    } else {
      // Create new user
      console.log('📝 Creating new admin user...');
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true, // Auto-confirm email
      });

      if (createError || !newUser.user) {
        console.error('❌ Failed to create user:', createError?.message);
        return false;
      }

      console.log('✅ User created in Supabase Auth');
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
      console.log('\n✅ Admin user setup complete!');
      console.log('   You can now run: npm run test:comprehensive');
      return true;
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Alternative: Create user manually in Supabase Dashboard:');
    console.log(`   1. Go to Authentication > Users`);
    console.log(`   2. Click "Add User"`);
    console.log(`   3. Email: ${TEST_EMAIL}`);
    console.log(`   4. Password: ${TEST_PASSWORD}`);
    console.log(`   5. Auto-confirm: Yes`);
    console.log(`   6. Then update profiles table: role='admin', is_active=true`);
    return false;
  }
}

createAdminUser().catch(console.error);
