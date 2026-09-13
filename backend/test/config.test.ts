/**
 * TEST CONFIGURATION
 * Uses existing admin user from Supabase
 * 
 * Default credentials (can be overridden via env):
 * Email: monstermen900@gmail.com
 * Password: monster@900
 */

export const TEST_CONFIG = {
  email: process.env.TEST_EMAIL || 'monstermen900@gmail.com',
  password: process.env.TEST_PASSWORD || 'monster@900',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
};
