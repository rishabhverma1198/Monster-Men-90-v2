# Quick Reference Guide - New Features

## 🚀 How to Use New Features

### 1. Toast Notifications

**Replace alert() with toast:**

```tsx
import { useToast } from '../components/common/Toast';

function MyComponent() {
  const { showToast } = useToast();
  
  const handleAction = async () => {
    try {
      await someAction();
      showToast('Success!', 'success');
    } catch (error) {
      showToast('Error occurred', 'error');
    }
  };
}
```

**Toast Types:**
- `'success'` - Green checkmark
- `'error'` - Red X
- `'warning'` - Yellow alert
- `'info'` - Blue info

---

### 2. Loading Skeletons

**Use in pages/components:**

```tsx
import { ProductCardSkeleton, CategoryCardSkeleton } from '../components/common/Skeleton';

{isLoading ? (
  <div className="grid grid-cols-4 gap-6">
    {Array.from({ length: 8 }).map((_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
  </div>
) : (
  // Your actual content
)}
```

**Available Skeletons:**
- `ProductCardSkeleton`
- `ProductDetailSkeleton`
- `CartItemSkeleton`
- `CategoryCardSkeleton`
- `TextSkeleton`

---

### 3. Protected Routes

**Wrap protected pages:**

```tsx
import ProtectedRoute from '../components/ProtectedRoute';

<Route
  path="/profile"
  element={
    <ProtectedRoute>
      <Profile />
    </ProtectedRoute>
  }
/>
```

**Features:**
- Auto-redirects to login if not authenticated
- Shows loading state during auth check
- Seamless user experience

---

### 4. SEO Meta Tags

**Use in pages:**

```tsx
import { useSEO } from '../hooks/useSEO';

function ProductDetail() {
  const { product } = useProduct();
  
  useSEO({
    title: product.title,
    description: product.description,
    image: product.image_urls?.[0],
    url: window.location.href,
  });
  
  return <div>...</div>;
}
```

---

### 5. Optimized Image Component

**Replace regular img tags:**

```tsx
import OptimizedImage from '../components/common/OptimizedImage';

<OptimizedImage
  src={product.image_url}
  alt={product.title}
  className="w-full h-full object-cover"
  width={280}
  height={280}
/>
```

**Features:**
- Automatic error handling
- Placeholder fallback
- Lazy loading
- Smooth loading transitions

---

### 6. Environment Variables

**Access validated config:**

```tsx
import { config, apiBaseUrl, isDevelopment } from '../config/env';

// Use apiBaseUrl instead of import.meta.env.VITE_API_BASE_URL
const url = `${apiBaseUrl}/api/products`;
```

**Validation:**
- Automatically validates on app start
- Shows helpful errors in development
- Prevents runtime errors in production

---

### 7. Error Boundaries

**Already integrated!** 

If a component crashes:
- Error boundary catches it
- Shows user-friendly error message
- Provides retry/reload options
- App doesn't completely crash

**Custom error boundary:**

```tsx
import ErrorBoundary from '../components/common/ErrorBoundary';

<ErrorBoundary fallback={<CustomErrorUI />}>
  <MyComponent />
</ErrorBoundary>
```

---

### 8. Loading Spinner

**Reusable spinner:**

```tsx
import LoadingSpinner from '../components/common/LoadingSpinner';

<LoadingSpinner size="lg" /> // sm, md, lg
```

---

## 📝 Best Practices

### 1. Always Use Skeletons for Loading States
```tsx
// ❌ Bad
{isLoading && <Spinner />}

// ✅ Good
{isLoading ? <SkeletonGrid /> : <Content />}
```

### 2. Replace All alert() with Toast
```tsx
// ❌ Bad
alert('Success!');

// ✅ Good
showToast('Success!', 'success');
```

### 3. Use ProtectedRoute for Auth Pages
```tsx
// ❌ Bad
if (!isAuthenticated) return <Navigate to="/login" />;

// ✅ Good
<ProtectedRoute>
  <MyPage />
</ProtectedRoute>
```

### 4. Memoize Expensive Components
```tsx
// Already done for ProductCard
// Apply to other expensive components too
export default memo(MyComponent, customComparison);
```

### 5. Use OptimizedImage for All Images
```tsx
// ❌ Bad
<img src={url} alt="..." />

// ✅ Good
<OptimizedImage src={url} alt="..." />
```

---

## 🔍 Common Patterns

### Pattern 1: Loading State with Skeleton
```tsx
if (isLoading) {
  return <ProductCardSkeleton />;
}
```

### Pattern 2: Error Handling with Toast
```tsx
try {
  await action();
  showToast('Success!', 'success');
} catch (error) {
  showToast(error.message, 'error');
}
```

### Pattern 3: Protected Page
```tsx
<Route
  path="/page"
  element={
    <ProtectedRoute>
      <Page />
    </ProtectedRoute>
  }
/>
```

---

## ⚠️ Important Notes

1. **ToastProvider** must wrap your app (already done in App.tsx)
2. **ErrorBoundary** is already in main.tsx and App.tsx
3. **Environment variables** are validated on app start
4. **Code splitting** is automatic - all pages are lazy loaded
5. **Protected routes** require authentication check

---

## 🐛 Troubleshooting

### Toast not showing?
- Make sure ToastProvider wraps your app
- Check if useToast is called inside ToastProvider

### Protected route not working?
- Check if user is authenticated in authStore
- Verify ProtectedRoute wraps the route correctly

### Environment variable error?
- Check .env file exists
- Verify variable names match (VITE_API_BASE_URL)
- Check validation error message

### Images not loading?
- Use OptimizedImage component
- Check image URLs are valid
- Placeholder will show on error

---

**Need Help?** Check the detailed documentation in `FRONTEND_ANALYSIS_AND_IMPROVEMENTS.md`
