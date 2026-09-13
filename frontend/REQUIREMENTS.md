# 🎯 Frontend Requirements - Pixel Perfect Specifications

## 📐 Design System - Exact Measurements

### **Colors**
- **Primary Accent:** `#ffdc46` (Yellow)
- **Primary Dark:** `#e6c63f` (Hover state)
- **Primary Light:** `#ffe866` (Active state)
- **Background:** `#ffffff` (White)
- **Text Primary:** `#111827` (Gray-900)
- **Text Secondary:** `#6b7280` (Gray-500)
- **Text Muted:** `#9ca3af` (Gray-400)
- **Border:** `#e5e7eb` (Gray-200)
- **Border Dark:** `#d1d5db` (Gray-300)
- **Error:** `#ef4444` (Red-500)
- **Success:** `#10b981` (Green-500)

### **Typography**
- **Font Family:** `'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Font Weights:**
  - Regular: `400`
  - Medium: `500`
  - Semibold: `600`
  - Bold: `700`
- **Font Sizes:**
  - H1: `32px` (2rem) - Line height: `1.2`
  - H2: `24px` (1.5rem) - Line height: `1.3`
  - H3: `20px` (1.25rem) - Line height: `1.4`
  - H4: `18px` (1.125rem) - Line height: `1.4`
  - Body: `16px` (1rem) - Line height: `1.5`
  - Small: `14px` (0.875rem) - Line height: `1.5`
  - XSmall: `12px` (0.75rem) - Line height: `1.4`

### **Spacing Scale**
- `4px` (0.25rem)
- `8px` (0.5rem)
- `12px` (0.75rem)
- `16px` (1rem)
- `20px` (1.25rem)
- `24px` (1.5rem)
- `32px` (2rem)
- `40px` (2.5rem)
- `48px` (3rem)
- `64px` (4rem)

### **Shadows**
- **Soft:** `0 2px 8px rgba(0, 0, 0, 0.08)`
- **Medium:** `0 4px 12px rgba(0, 0, 0, 0.12)`
- **Hover:** `0 6px 16px rgba(0, 0, 0, 0.16)`
- **Card:** `0 1px 3px rgba(0, 0, 0, 0.1)`

### **Border Radius**
- **Small:** `4px`
- **Medium:** `8px`
- **Large:** `12px`
- **Full:** `9999px` (for pills/badges)

---

## 🧱 Component Specifications

### **1. Product Card**
- **Dimensions:** `280px × 350px` (width × height)
- **Image:** `280px × 280px` (1:1 aspect ratio)
- **Padding:** `12px` all sides
- **Border:** `1px solid #e5e7eb`
- **Border Radius:** `8px`
- **Background:** `#ffffff`
- **Shadow:** Soft shadow, hover → Medium shadow
- **Hover Effect:** 
  - Image zoom: `scale(1.05)` with `transition: transform 0.3s ease`
  - Shadow elevation
  - Card lift: `translateY(-4px)`
- **Button:** 
  - Color: `#ffdc46`
  - Hover: `#e6c63f`
  - Size: `100% width, 40px height`
  - Border radius: `6px`
  - Font: `14px, weight 600`
  - Transition: `0.3s ease`

**Layout:**
```
┌─────────────────────┐
│   Image (280×280)   │
│                     │
├─────────────────────┤
│ Title (16px, bold)  │
│ Price (18px, bold)  │
│ [Add to Cart Button]│
└─────────────────────┘
```

### **2. Navbar**
- **Height:** `64px` (4rem)
- **Background:** `#ffffff`
- **Shadow:** `0 2px 8px rgba(0, 0, 0, 0.08)`
- **Sticky:** `position: sticky, top: 0, z-index: 50`
- **Logo:** `40px × 40px` with `8px` border radius
- **Search Bar:** `max-width: 400px, height: 40px`
- **Icons:** `20px × 20px` with `8px` padding
- **Cart Badge:** `16px × 16px` circle, `#ffdc46` background

### **3. Buttons**
- **Primary Button:**
  - Background: `#ffdc46`
  - Hover: `#e6c63f`
  - Text: `#111827`
  - Padding: `12px 24px`
  - Border radius: `8px`
  - Font: `14px, weight 600`
  - Transition: `background-color 0.3s ease, transform 0.2s ease`
  - Active: `transform: scale(0.98)`

- **Secondary Button:**
  - Background: `transparent`
  - Border: `1px solid #e5e7eb`
  - Hover: `background: #f9fafb`
  - Text: `#111827`

### **4. Input Fields**
- **Height:** `44px`
- **Padding:** `12px 16px`
- **Border:** `1px solid #e5e7eb`
- **Border Radius:** `8px`
- **Focus:** `border-color: #ffdc46, box-shadow: 0 0 0 3px rgba(255, 220, 70, 0.1)`
- **Font:** `16px, color: #111827`
- **Placeholder:** `#9ca3af`

### **5. Image Gallery (Product Detail)**
- **Main Image:** `500px × 500px` (desktop), `100% width` (mobile)
- **Thumbnails:** `80px × 80px` with `4px` gap
- **Zoom:** `scale(2)` on hover, `transform-origin: center`
- **Slider:** Auto-advance every `5 seconds`, fade transition `0.5s ease`

---

## 📱 Responsive Breakpoints

- **Mobile:** `< 640px` (default)
- **Tablet:** `≥ 640px` (sm:)
- **Desktop:** `≥ 768px` (md:)
- **Large Desktop:** `≥ 1024px` (lg:)
- **XL Desktop:** `≥ 1280px` (xl:)

### **Grid System**
- **Mobile:** 1 column
- **Tablet:** 2 columns (gap: `16px`)
- **Desktop:** 3 columns (gap: `24px`)
- **Large:** 4 columns (gap: `24px`)

---

## 🎨 Page Specifications

### **1. Home Page (`/`)**

#### **Hero Carousel**
- **Height:** `400px` (desktop), `300px` (mobile)
- **Width:** `100%`
- **Auto-play:** `5 seconds` interval
- **Transition:** Fade effect, `0.5s ease`
- **Indicators:** Bottom center, `8px` circles, `4px` gap
- **Navigation:** Arrow buttons, `40px × 40px`, `#ffffff` with `80%` opacity

#### **Featured Categories**
- **Section Title:** `24px, bold, margin-bottom: 32px`
- **Category Cards:** `200px × 150px`
- **Grid:** 4 columns (desktop), 2 (tablet), 1 (mobile)
- **Gap:** `24px`
- **Hover:** Scale `1.05`, shadow elevation

#### **Product Grid**
- **Section Title:** `24px, bold, margin-bottom: 24px`
- **Grid:** 4 columns (desktop), 3 (tablet), 2 (mobile), 1 (small mobile)
- **Gap:** `24px`
- **Product Cards:** As specified above

### **2. Category Listing (`/category/:categoryName`)**

#### **Filters Sidebar**
- **Width:** `280px` (desktop), hidden on mobile (drawer)
- **Background:** `#ffffff`
- **Padding:** `24px`
- **Border:** `1px solid #e5e7eb` (right side)
- **Sticky:** `position: sticky, top: 80px`

#### **Filter Sections**
- **Title:** `16px, semibold, margin-bottom: 16px`
- **Options:** `14px, regular, margin-bottom: 12px`
- **Checkboxes:** `16px × 16px`, accent color `#ffdc46`

#### **Product Grid**
- **Width:** `calc(100% - 280px)` (desktop), `100%` (mobile)
- **Sort Bar:** Height `48px`, background `#f9fafb`
- **Sort Options:** `14px, dropdown with arrow`

### **3. Product Detail (`/product/:productId`)**

#### **Image Gallery**
- **Main Container:** `500px × 500px` (desktop)
- **Thumbnail Strip:** `500px × 100px` (5 thumbnails)
- **Zoom:** Hover zoom `2x`, smooth transition
- **Navigation:** Previous/Next arrows, `40px × 40px`

#### **Product Info**
- **Title:** `28px, bold, margin-bottom: 16px`
- **Price:** `32px, bold, color: #111827, margin-bottom: 8px`
- **Description:** `16px, line-height: 1.6, color: #6b7280`
- **Size Selector:** Grid `40px × 40px` buttons, `8px` gap
- **Quantity:** Input `60px × 44px` with +/- buttons
- **Add to Cart Button:** `100% width, 48px height, #ffdc46`
- **Buy Now Button:** `100% width, 48px height, #111827, white text`

### **4. Cart Page (`/cart`)**

#### **Cart Items**
- **Item Card:** `100% width, min-height: 150px`
- **Image:** `120px × 120px`
- **Quantity Controls:** `32px × 32px` buttons
- **Remove Button:** `14px, color: #ef4444`
- **Price:** `20px, bold, right-aligned`

#### **Order Summary**
- **Width:** `350px` (desktop), `100%` (mobile)
- **Sticky:** `position: sticky, top: 80px`
- **Background:** `#f9fafb`
- **Padding:** `24px`
- **Border Radius:** `12px`
- **Total:** `24px, bold, margin-top: 16px`

### **5. Checkout Page (`/checkout`)**

#### **Address Form**
- **Input Fields:** As specified above
- **Label:** `14px, semibold, margin-bottom: 8px`
- **Error Message:** `12px, color: #ef4444, margin-top: 4px`
- **Validation:** Real-time, red border on error

#### **Payment Methods**
- **Card:** `100% width, 80px height`
- **Border:** `2px solid #e5e7eb`
- **Selected:** `border-color: #ffdc46, background: #fffef5`
- **Icon:** `24px × 24px` on left

---

## ⚡ Interactions & Animations

### **Transitions**
- **Buttons:** `0.3s ease` (background-color, transform)
- **Cards:** `0.3s ease` (transform, box-shadow)
- **Images:** `0.3s ease` (transform)
- **Modals:** `0.2s ease` (opacity, transform)

### **Hover Effects**
- **Product Cards:** 
  - Image zoom: `scale(1.05)`
  - Card lift: `translateY(-4px)`
  - Shadow: Soft → Medium
- **Buttons:**
  - Background: `#ffdc46` → `#e6c63f`
  - Transform: `scale(1.02)`
- **Links:**
  - Color: `#111827` → `#ffdc46`
  - Underline: `text-decoration: underline`

### **Loading States**
- **Spinner:** `40px × 40px`, `#ffdc46` color
- **Skeleton:** `#f3f4f6` background, shimmer effect
- **Button Loading:** Spinner inside button, disabled state

### **Error States**
- **Message:** Red text `#ef4444`, `14px`
- **Icon:** `16px × 16px` alert icon
- **Container:** Red border `1px solid #ef4444`, background `#fef2f2`

---

## 🔌 Backend Integration

### **API Endpoints (All Real-Time)**
- `GET /api/products` - Product listing
- `GET /api/products/:id` - Product detail
- `GET /api/products/search?q=...` - Search
- `GET /api/products/categories` - Categories
- `GET /api/cart` - Cart items
- `POST /api/cart` - Add to cart
- `PUT /api/cart/update` - Update quantity
- `DELETE /api/cart/:id` - Remove item
- `POST /api/orders` - Create order
- `GET /api/orders` - Order history
- `GET /api/orders/:id` - Order detail

### **Session Management**
- **Token Storage:** `localStorage.getItem('auth_token')`
- **Auto-refresh:** On 401, redirect to login
- **Cart Persistence:** Zustand persist middleware
- **User State:** Zustand persist middleware

### **Real-Time Updates**
- **Cart Count:** Updates immediately on add/remove
- **Stock Status:** Fetched on product load
- **Order Status:** Polled every 30s (if on order page)

---

## ♿ Accessibility

### **ARIA Labels**
- All buttons: `aria-label` attribute
- Form inputs: `aria-describedby` for errors
- Navigation: `aria-current="page"` for active links
- Images: `alt` text for all product images
- Icons: `aria-hidden="true"` with descriptive text

### **Keyboard Navigation**
- **Tab Order:** Logical flow (top to bottom, left to right)
- **Focus Indicators:** `outline: 2px solid #ffdc46, outline-offset: 2px`
- **Skip Links:** "Skip to main content" link at top
- **Modal Trapping:** Focus trapped in modals, ESC to close

### **Screen Reader Support**
- Semantic HTML5 tags (`<nav>`, `<main>`, `<article>`, `<section>`)
- Proper heading hierarchy (h1 → h2 → h3)
- Form labels associated with inputs
- Error messages announced

---

## 🎯 Branding

### **Logo**
- **Text:** "MonsterMens90"
- **Font:** `Inter, bold, 20px`
- **Icon:** Custom "M" in `40px × 40px` square, `#ffdc46` background
- **Placement:** Top-left navbar

### **Images**
- **Login/Signup:** Unique, original images (not stock photos)
- **Hero Carousel:** Brand-specific promotional images
- **Product Images:** From Supabase Storage (`product-images` bucket)
- **Format:** JPEG/PNG, optimized, WebP where supported

### **Icons**
- **Format:** SVG (Lucide React icons)
- **Size:** `20px × 20px` (standard), `24px × 24px` (large)
- **Color:** Inherit from parent or `#111827`

---

## 🚨 Error Handling

### **Empty States**
- **Empty Cart:** 
  - Icon: `64px × 64px` shopping cart
  - Message: "Your cart is empty"
  - CTA: "Continue Shopping" button
- **No Products:**
  - Icon: `64px × 64px` search
  - Message: "No products found"
  - Suggestion: "Try different filters"
- **404 Product:**
  - Message: "Product not found"
  - CTA: "Back to Home" button

### **Error Messages**
- **Network Error:** "Unable to connect. Please check your internet."
- **API Error:** Show backend error message
- **Validation Error:** Field-specific, red text below input
- **Payment Failed:** "Payment failed. Please try again."

### **Loading States**
- **Initial Load:** Skeleton screens
- **Button Actions:** Spinner + disabled state
- **Image Load:** Placeholder with spinner

---

## 📝 Code Standards

### **File Structure**
```
src/
├── components/
│   ├── common/        # Reusable components
│   ├── layout/       # Navbar, Footer
│   └── product/      # Product-specific
├── pages/            # Route pages
├── hooks/            # Custom hooks
├── utils/            # Helper functions
├── services/         # API layer
├── store/            # Zustand stores
└── types/            # TypeScript types
```

### **Naming Conventions**
- **Components:** PascalCase (`ProductCard.tsx`)
- **Hooks:** camelCase with `use` prefix (`useProduct.ts`)
- **Utils:** camelCase (`formatPrice.ts`)
- **Types:** PascalCase (`Product.ts`)

### **Code Comments**
- **Component:** JSDoc comment explaining purpose
- **Complex Logic:** Inline comments
- **API Calls:** Comment explaining endpoint
- **Props:** TypeScript interfaces (self-documenting)

### **Semantic HTML**
- Use `<nav>`, `<main>`, `<article>`, `<section>`, `<header>`, `<footer>`
- Proper heading hierarchy
- Form elements with labels
- Lists for navigation items

---

## ✅ Implementation Checklist

### **Phase 1: Core Pages**
- [ ] Home page with hero, categories, product grid
- [ ] Category listing with filters
- [ ] Product detail with gallery
- [ ] Cart page
- [ ] Checkout page

### **Phase 2: User Features**
- [ ] Login/Signup pages
- [ ] Profile page
- [ ] Order history
- [ ] Wishlist page

### **Phase 3: Enhancements**
- [ ] Search results page
- [ ] Error pages (404, 500)
- [ ] Loading states
- [ ] Animations

---

**All specifications must be followed exactly for pixel-perfect implementation.**
