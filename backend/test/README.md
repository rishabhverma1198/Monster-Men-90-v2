# API Test Suite

Automated testing for critical API flows.

## Prerequisites

1. **Backend server running** on `http://localhost:5000`
2. **Test user created** in Supabase Auth
   - Email: `test@example.com`
   - Password: `Test@1234`
   - Or modify `TEST_USER` in `api-test.ts`

## Setup

1. Install test dependencies:
```bash
cd backend
npm install dotenv axios
# or if using tsx:
npm install -D tsx dotenv axios
```

2. Set environment variables (`.env` file):
```env
BACKEND_URL=http://localhost:5000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Run Tests

### Option 1: Using tsx (Recommended)
```bash
npx tsx backend/test/api-test.ts
```

### Option 2: Compile and Run
```bash
cd backend
npx tsc test/api-test.ts --outDir test/dist --esModuleInterop
node test/dist/api-test.js
```

## What It Tests

1. ✅ **Authentication** - Login and get token
2. ✅ **Product Creation** - Create product, verify inventory row
3. ✅ **Add to Cart** - Add product to cart
4. ✅ **Get Cart** - Fetch cart items
5. ✅ **Checkout** - Create order, verify inventory reservation
6. ✅ **Order Cancellation** - Cancel order, verify inventory release

## Test Output

The script will show:
- ✅ Green for passed tests
- ❌ Red for failed tests
- ℹ️ Cyan for informational messages

## Debugging

If tests fail:
1. Check backend server is running
2. Verify environment variables
3. Check test user exists
4. Review error messages in output

## Manual Testing Alternative

See `test-manual.md` for manual curl/Postman commands.
