/**
 * Test Runner Script
 * Runs all tests and generates report
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const TEST_COMMANDS = [
  { name: 'Routing Tests', command: 'npm run test -- routing' },
  { name: 'API Tests', command: 'npm run test -- api' },
  { name: 'Component Tests', command: 'npm run test -- ProductCard' },
  { name: 'Store Tests', command: 'npm run test -- authStore' },
  { name: 'UI/UX Tests', command: 'npm run test -- ui-ux' },
  { name: 'Backend Communication Tests', command: 'npm run test -- backend-communication' },
  { name: 'Product Features Tests', command: 'npm run test -- product-features' },
];

async function runTests() {
  console.log('🧪 Starting Automated Test Suite...\n');
  console.log('═══════════════════════════════════════════════════\n');

  const results: Array<{ name: string; success: boolean; output: string }> = [];

  for (const test of TEST_COMMANDS) {
    try {
      console.log(`\n📋 Running: ${test.name}...`);
      const output = execSync(test.command, { encoding: 'utf-8', stdio: 'pipe' });
      results.push({ name: test.name, success: true, output });
      console.log(`✅ ${test.name}: PASSED`);
    } catch (error: unknown) {
      const output =
        typeof error === 'object' && error !== null && 'stdout' in error
          ? String((error as { stdout?: unknown }).stdout ?? '')
          : error instanceof Error
            ? error.message
            : String(error);
      results.push({ name: test.name, success: false, output });
      console.log(`❌ ${test.name}: FAILED`);
    }
  }

  // Generate report
  const report = generateReport(results);
  writeFileSync('TEST_REPORT.md', report);
  console.log('\n═══════════════════════════════════════════════════');
  console.log('\n📊 Test Report saved to TEST_REPORT.md\n');
}

function generateReport(results: Array<{ name: string; success: boolean; output: string }>): string {
  const total = results.length;
  const passed = results.filter((r) => r.success).length;
  const failed = total - passed;
  const successRate = ((passed / total) * 100).toFixed(1);

  let report = `# 🧪 Automated Test Report\n\n`;
  report += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  report += `## Summary\n\n`;
  report += `- **Total Tests:** ${total}\n`;
  report += `- **✅ Passed:** ${passed}\n`;
  report += `- **❌ Failed:** ${failed}\n`;
  report += `- **Success Rate:** ${successRate}%\n\n`;
  report += `---\n\n`;

  report += `## Test Results\n\n`;

  results.forEach((result) => {
    report += `### ${result.success ? '✅' : '❌'} ${result.name}\n\n`;
    report += `**Status:** ${result.success ? 'PASSED' : 'FAILED'}\n\n`;
    if (!result.success && result.output) {
      report += `**Error Output:**\n\`\`\`\n${result.output.substring(0, 500)}\n\`\`\`\n\n`;
    }
    report += `---\n\n`;
  });

  return report;
}

runTests().catch(console.error);
