/**
 * Comprehensive Test Runner
 * Runs all test suites and generates report
 */

import { execSync } from 'child_process';

console.log('🧪 Starting Comprehensive Frontend Testing...\n');

const testSuites = [
  { name: 'Routing Tests', file: 'routing.test.tsx' },
  { name: 'API Integration Tests', file: 'api-integration.test.ts' },
  { name: 'Backend Communication Tests', file: 'backend-communication.test.ts' },
  { name: 'UI/UX Tests', file: 'ui-ux.test.tsx' },
  { name: 'Features Tests', file: 'features.test.tsx' },
];

const results: Record<string, { passed: boolean; error?: string }> = {};

for (const suite of testSuites) {
  try {
    console.log(`\n📋 Running ${suite.name}...`);
    execSync(`npm test -- ${suite.file} --run`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    results[suite.name] = { passed: true };
    console.log(`✅ ${suite.name} - PASSED\n`);
  } catch (error: any) {
    results[suite.name] = {
      passed: false,
      error: error.message || 'Test failed',
    };
    console.log(`❌ ${suite.name} - FAILED\n`);
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));

const passed = Object.values(results).filter((r) => r.passed).length;
const total = Object.keys(results).length;

Object.entries(results).forEach(([name, result]) => {
  const status = result.passed ? '✅ PASSED' : '❌ FAILED';
  console.log(`${status} - ${name}`);
  if (result.error) {
    console.log(`   Error: ${result.error}`);
  }
});

console.log('\n' + '='.repeat(60));
console.log(`Total: ${passed}/${total} test suites passed`);
console.log('='.repeat(60) + '\n');

process.exit(passed === total ? 0 : 1);
