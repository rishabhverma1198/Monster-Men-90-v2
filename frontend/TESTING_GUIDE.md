# 🧪 Frontend Testing Guide

## 📋 Test Suite Overview

Complete automated testing suite covering:
- ✅ Routing tests
- ✅ API integration tests
- ✅ Component tests
- ✅ Store tests
- ✅ UI/UX specifications tests
- ✅ Backend communication tests
- ✅ Feature functionality tests
- ✅ E2E flow tests

---

## 🚀 Running Tests

### **All Tests**
```bash
npm run test
```

### **Watch Mode**
```bash
npm run test -- --watch
```

### **UI Mode (Visual)**
```bash
npm run test:ui
```

### **Coverage Report**
```bash
npm run test:coverage
```

### **Specific Test File**
```bash
npm run test -- routing
npm run test -- api
npm run test -- ProductCard
```

---

## 📁 Test Structure

```
src/__tests__/
├── setup.ts                    # Test configuration
├── routing.test.tsx            # Route accessibility
├── api.test.ts                 # API service layer
├── ui-ux.test.tsx              # Pixel-perfect specs
├── backend-communication.test.ts # Backend integration
├── components/
│   └── ProductCard.test.tsx    # Component tests
├── store/
│   └── authStore.test.ts       # State management
├── features/
│   └── product-features.test.tsx # Feature tests
├── e2e/
│   └── checkout-flow.test.tsx  # End-to-end flows
└── integration/
    └── api-integration.test.ts  # Real API calls
```

---

## 🎯 Test Categories

### **1. Routing Tests** (`routing.test.tsx`)
- ✅ All routes accessible
- ✅ Correct components render
- ✅ Route parameters work

**Tests:**
- Home page (`/`)
- Category page (`/category/:categoryName`)
- Product detail (`/product/:productId`)
- Cart page (`/cart`)
- Checkout page (`/checkout`)
- Login page (`/login`)
- Signup page (`/signup`)
- Search page (`/search`)

---

### **2. API Tests** (`api.test.ts`)
- ✅ Correct endpoint calls
- ✅ Request parameters
- ✅ Response handling
- ✅ Error handling

**Tests:**
- Auth APIs (login, signup)
- Product APIs (list, search, detail)
- Cart APIs (get, add, update, remove)
- Order APIs (create, list)

---

### **3. Component Tests** (`components/ProductCard.test.tsx`)
- ✅ Pixel-perfect dimensions
- ✅ Correct styling
- ✅ Interactive elements
- ✅ Accessibility

**Tests:**
- ProductCard: 280px × 350px
- Image aspect ratio
- Button styling
- Price formatting

---

### **4. Store Tests** (`store/authStore.test.ts`)
- ✅ State initialization
- ✅ Actions work correctly
- ✅ Persistence (localStorage)
- ✅ Token management

**Tests:**
- Auth store initialization
- Login flow
- Logout flow
- Token storage

---

### **5. UI/UX Tests** (`ui-ux.test.tsx`)
- ✅ Pixel-perfect specifications
- ✅ Color codes
- ✅ Spacing
- ✅ Typography

**Tests:**
- Navbar: 64px height, sticky
- ProductCard: 280px width, aspect ratio
- Buttons: Primary color `#ffdc46`
- Shadows: Soft, medium, hover

---

### **6. Backend Communication Tests** (`backend-communication.test.ts`)
- ✅ Token injection
- ✅ Error handling
- ✅ Network errors
- ✅ API errors

**Tests:**
- Authorization header
- 401 error handling
- Network error handling
- API error structure

---

### **7. Feature Tests** (`features/product-features.test.tsx`)
- ✅ Product display
- ✅ Add to cart
- ✅ Authentication checks
- ✅ Loading states

**Tests:**
- Product information display
- Add to cart button
- Unauthenticated redirect
- Loading state

---

### **8. E2E Tests** (`e2e/checkout-flow.test.tsx`)
- ✅ Complete user journeys
- ✅ Multi-page flows
- ✅ State persistence

**Tests:**
- Home → Product → Cart → Checkout flow

---

### **9. Integration Tests** (`integration/api-integration.test.ts`)
- ✅ Real API calls (requires backend)
- ✅ Actual data fetching
- ✅ End-to-end communication

**Requirements:**
- Backend server running on `http://localhost:5000`
- Test user credentials in `.env`:
  ```
  VITE_API_BASE_URL=http://localhost:5000
  VITE_TEST_EMAIL=monstermen900@gmail.com
  VITE_TEST_PASSWORD=Monster@900
  ```

---

## 🔧 Test Configuration

### **Vitest Config** (`vitest.config.ts`)
```typescript
{
  environment: 'jsdom',
  setupFiles: ['./src/__tests__/setup.ts'],
  globals: true,
  css: true
}
```

### **Test Setup** (`src/__tests__/setup.ts`)
- React Testing Library cleanup
- localStorage mock
- window.matchMedia mock
- Jest DOM matchers

---

## 📊 Expected Results

### **All Tests Passing:**
```
✅ Routing Tests: PASSED
✅ API Tests: PASSED
✅ Component Tests: PASSED
✅ Store Tests: PASSED
✅ UI/UX Tests: PASSED
✅ Backend Communication Tests: PASSED
✅ Product Features Tests: PASSED
✅ E2E Tests: PASSED
✅ Integration Tests: PASSED (if backend running)
```

---

## 🐛 Troubleshooting

### **Tests Failing:**
1. Check backend is running (for integration tests)
2. Verify test user credentials
3. Clear localStorage: `localStorage.clear()`
4. Reinstall dependencies: `npm install`

### **Mock Issues:**
- Ensure mocks are properly set up
- Check import paths
- Verify mock return values

### **TypeScript Errors:**
- Run `npm run build` to check types
- Ensure all types are imported correctly

---

## 📝 Writing New Tests

### **Component Test Template:**
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Component from '../Component';

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### **API Test Template:**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { apiService } from '../services/api';

describe('API Service', () => {
  it('should call correct endpoint', async () => {
    const response = await apiService.method();
    expect(response.success).toBe(true);
  });
});
```

---

## ✅ Test Checklist

Before marking tests complete:
- [ ] All routes tested
- [ ] All API endpoints tested
- [ ] All components tested
- [ ] All stores tested
- [ ] UI/UX specs verified
- [ ] Backend communication verified
- [ ] Features tested
- [ ] E2E flows tested
- [ ] Integration tests pass (with backend)

---

**Status:** Test Suite Complete ✅  
**Coverage:** Routing, API, Components, Stores, UI/UX, Backend, Features, E2E
