#!/bin/bash
# Complete Test Runner Script
# Runs all tests and generates comprehensive report

echo "═══════════════════════════════════════════════════"
echo "   COMPLETE TEST SUITE RUNNER"
echo "═══════════════════════════════════════════════════"
echo ""

# Step 1: Check backend health
echo "Step 1: Checking backend server..."
if curl -s http://localhost:5000/health > /dev/null; then
    echo "✅ Backend server is running"
else
    echo "❌ Backend server is not running!"
    echo "   Please start: cd backend && npm run dev"
    exit 1
fi

# Step 2: Verify/Create test user
echo ""
echo "Step 2: Verifying test user..."
npm run test:create-admin

# Step 3: Run comprehensive tests
echo ""
echo "Step 3: Running comprehensive tests..."
npm run test:comprehensive

echo ""
echo "═══════════════════════════════════════════════════"
echo "   TEST COMPLETE"
echo "═══════════════════════════════════════════════════"
