/**
 * MASTER TEST RUNNER
 * Runs all tests and provides comprehensive report
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkBackendHealth() {
  try {
    const { stdout } = await execAsync('curl http://localhost:5000/health 2>&1');
    return stdout.includes('uptime') || stdout.includes('200');
  } catch {
    return false;
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('   MASTER TEST RUNNER');
  console.log('═══════════════════════════════════════════════════\n');

  // Check if backend is running
  console.log('🔍 Checking backend server...');
  const backendRunning = await checkBackendHealth();
  
  if (!backendRunning) {
    console.log('❌ Backend server is not running!');
    console.log('\n💡 Please start the backend server first:');
    console.log('   cd backend');
    console.log('   npm run dev');
    console.log('\n   Then run tests again:');
    console.log('   npm run test:comprehensive');
    process.exit(1);
  }

  console.log('✅ Backend server is running\n');

  // Run comprehensive tests
  console.log('🚀 Running comprehensive test suite...\n');
  try {
    const { stdout, stderr } = await execAsync('npm run test:comprehensive', {
      cwd: process.cwd(),
    });
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error: any) {
    console.error('Test execution error:', error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
  }
}

main().catch(console.error);
