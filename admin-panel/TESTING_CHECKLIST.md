# 🧪 Admin Panel Testing Checklist

## Testing Phase - Smoke Testing & Regression Verification

**Date:** Testing Phase  
**Scope:** Admin Panel - Authentication, Products, Orders  
**Backend:** READ-ONLY (no changes allowed)

---

## ✅ PRE-TEST SETUP

### Prerequisites
- [ ] Backend server running (`npm run dev` in `backend/`)
- [ ] Admin panel running (`npm run dev` in `admin-panel/`)
- [ ] Database seeded with test data:
  - [ ] At least 1 admin user (role: 'admin')
  - [ ] At least 5 products (mix of active/inactive)
  - [ ] At least 3 orders (different statuses)
  - [ ] At least 2 regular users

### Environment Variables
- [ ] `VITE_API_URL` set correctly in `admin-panel/.env`
- [ ] Backend `.env` configured with Supabase credentials

---

## 🔐 1. AUTHENTICATION TESTING

### Login Flow
- [ ] **Valid Admin Login**
  - [ ] Navigate to `/login`
  - [ ] Enter valid admin email/password
  - [ ] Submit form
  - [ ] ✅ Redirects to `/dashboard`
  - [ ] ✅ User info appears in sidebar
  - [ ] ✅ Token stored in localStorage

- [ ] **Invalid Credentials**
  - [ ] Enter invalid email/password
  - [ ] Submit form
  - [ ] ✅ Error message displayed
  - [ ] ✅ No redirect occurs
  - [ ] ✅ Form remains on login page

- [ ] **Empty Fields**
  - [ ] Submit form with empty email
  - [ ] ✅ Validation error for email
  - [ ] Submit form with empty password
  - [ ] ✅ Validation error for password

- [ ] **Session Persistence**
  - [ ] Login successfully
  - [ ] Refresh page
  - [ ] ✅ Still authenticated
  - [ ] ✅ Dashboard loads without re-login

### Logout Flow
- [ ] **Logout from Dashboard**
  - [ ] Click logout button in sidebar
  - [ ] ✅ Redirects to `/login`
  - [ ] ✅ Token removed from localStorage
  - [ ] ✅ Cannot access protected routes

### Route Protection
- [ ] **Unauthenticated Access**
  - [ ] Logout or clear localStorage
  - [ ] Navigate to `/dashboard/products`
  - [ ] ✅ Redirects to `/login`
  - [ ] ✅ Original URL preserved in state

- [ ] **Admin Role Check**
  - [ ] Login as non-admin user (if exists)
  - [ ] Navigate to `/dashboard/products`
  - [ ] ✅ Shows "Access Denied" page
  - [ ] ✅ Cannot access admin routes

---

## 📦 2. PRODUCT MANAGEMENT TESTING

### Products List (`/dashboard/products`)
- [ ] **Page Loads**
  - [ ] Navigate to Products page
  - [ ] ✅ Products list displays
  - [ ] ✅ Loading spinner shows initially
  - [ ] ✅ Products render after load

- [ ] **Pagination**
  - [ ] If >20 products exist
  - [ ] ✅ "Next" button appears
  - [ ] Click "Next"
  - [ ] ✅ Page 2 loads
  - [ ] ✅ "Previous" button appears
  - [ ] ✅ Page numbers update

- [ ] **Category Filter**
  - [ ] Select category from dropdown
  - [ ] ✅ Only products from that category show
  - [ ] ✅ Total count updates
  - [ ] Select "All Categories"
  - [ ] ✅ All products show

- [ ] **Status Badges**
  - [ ] ✅ Active products show green badge
  - [ ] ✅ Inactive products show red badge
  - [ ] ✅ Badge text matches product status

- [ ] **Empty State**
  - [ ] Filter to category with no products
  - [ ] ✅ Empty state message displays
  - [ ] ✅ "Add Product" button visible

- [ ] **Error Handling**
  - [ ] Stop backend server
  - [ ] Navigate to Products page
  - [ ] ✅ Error message displays
  - [ ] ✅ Page doesn't crash

### Create Product (`/dashboard/products/create`)
- [ ] **Form Validation**
  - [ ] Submit empty form
  - [ ] ✅ Required field errors show
  - [ ] ✅ Form doesn't submit

- [ ] **Product Creation**
  - [ ] Fill all required fields:
    - Title
    - Description
    - Category
    - Price
    - Stock
  - [ ] Upload product image
  - [ ] ✅ Image preview shows
  - [ ] Submit form
  - [ ] ✅ Success message/redirect
  - [ ] ✅ Product appears in list

- [ ] **Image Upload**
  - [ ] Select image file
  - [ ] ✅ Preview displays
  - [ ] ✅ File uploads to Supabase
  - [ ] ✅ Image URL included in product

- [ ] **Optional Fields**
  - [ ] Leave wholesale price empty
  - [ ] Leave MOQ empty
  - [ ] Submit form
  - [ ] ✅ Product creates successfully
  - [ ] ✅ Optional fields not sent if empty

### Edit Product (`/dashboard/products/:id/edit`)
- [ ] **Load Existing Product**
  - [ ] Click "Edit" on a product
  - [ ] ✅ Form pre-fills with product data
  - [ ] ✅ Image displays if exists

- [ ] **Update Product**
  - [ ] Change product title
  - [ ] Change price
  - [ ] Submit form
  - [ ] ✅ Success message
  - [ ] ✅ Changes reflect in product list

- [ ] **Image Replacement**
  - [ ] Upload new image
  - [ ] ✅ New preview shows
  - [ ] Submit form
  - [ ] ✅ New image URL saved

- [ ] **Toggle Active Status**
  - [ ] Toggle "Active" switch
  - [ ] Submit form
  - [ ] ✅ Status updates
  - [ ] ✅ Badge changes in list

- [ ] **Invalid Product ID**
  - [ ] Navigate to `/dashboard/products/invalid-id/edit`
  - [ ] ✅ Error message displays
  - [ ] ✅ Page doesn't crash

### Delete Product
- [ ] **Soft Delete**
  - [ ] Click "Delete" on a product
  - [ ] ✅ Confirmation dialog appears
  - [ ] Confirm deletion
  - [ ] ✅ Product removed from list (or marked inactive)
  - [ ] ✅ Success message shows

- [ ] **Cancel Delete**
  - [ ] Click "Delete"
  - [ ] Click "Cancel" in dialog
  - [ ] ✅ Dialog closes
  - [ ] ✅ Product remains in list

---

## 🛒 3. ORDERS MANAGEMENT TESTING

### Orders List (`/dashboard/orders`)
- [ ] **Page Loads**
  - [ ] Navigate to Orders page
  - [ ] ✅ Orders list displays
  - [ ] ✅ Loading spinner shows initially
  - [ ] ✅ Orders render after load

- [ ] **Pagination**
  - [ ] If >20 orders exist
  - [ ] ✅ Pagination controls appear
  - [ ] Click "Next"
  - [ ] ✅ Page 2 loads
  - [ ] ✅ Page numbers update

- [ ] **Status Filter**
  - [ ] Select "Pending" from dropdown
  - [ ] ✅ Only pending orders show
  - [ ] ✅ Total count updates
  - [ ] Select "All Statuses"
  - [ ] ✅ All orders show

- [ ] **Status Badges**
  - [ ] ✅ Pending: Yellow badge
  - [ ] ✅ Confirmed: Blue badge
  - [ ] ✅ Shipped: Purple badge
  - [ ] ✅ Delivered: Green badge
  - [ ] ✅ Cancelled: Red badge

- [ ] **Order Information Display**
  - [ ] ✅ Order number displays
  - [ ] ✅ Customer name/email displays
  - [ ] ✅ Total amount displays
  - [ ] ✅ Created date displays
  - [ ] ✅ Item count displays

- [ ] **Empty State**
  - [ ] Filter to status with no orders
  - [ ] ✅ Empty state message displays

- [ ] **Error Handling**
  - [ ] Stop backend server
  - [ ] Navigate to Orders page
  - [ ] ✅ Error message displays
  - [ ] ✅ Page doesn't crash

### Order Details (`/dashboard/orders/:id`)
- [ ] **Page Loads**
  - [ ] Click "View" on an order
  - [ ] ✅ Order details page loads
  - [ ] ✅ Loading spinner shows initially
  - [ ] ✅ Order data displays after load

- [ ] **Order Summary**
  - [ ] ✅ Order number displays
  - [ ] ✅ Status badge displays
  - [ ] ✅ Total amount displays
  - [ ] ✅ Item count displays
  - [ ] ✅ Created date displays
  - [ ] ✅ Updated date displays (if exists)

- [ ] **Customer Information**
  - [ ] ✅ Customer name displays
  - [ ] ✅ Customer email displays
  - [ ] ✅ User ID displays

- [ ] **Order Items**
  - [ ] ✅ All items listed
  - [ ] ✅ Product images display (if available)
  - [ ] ✅ Product titles display
  - [ ] ✅ Quantities display
  - [ ] ✅ Prices display
  - [ ] ✅ Subtotals calculate correctly

- [ ] **Notes Display**
  - [ ] If order has notes
  - [ ] ✅ Notes section displays
  - [ ] ✅ Notes content shows

- [ ] **Invalid Order ID**
  - [ ] Navigate to `/dashboard/orders/invalid-id`
  - [ ] ✅ Error message displays
  - [ ] ✅ Page doesn't crash
  - [ ] ✅ Back button works

- [ ] **Order Not Found**
  - [ ] Navigate to `/dashboard/orders/00000000-0000-0000-0000-000000000000`
  - [ ] ✅ Error message displays
  - [ ] ✅ Page doesn't crash

### Order Status Update
- [ ] **Open Status Modal**
  - [ ] Click "Update Status" button
  - [ ] ✅ Modal opens
  - [ ] ✅ Current status pre-selected
  - [ ] ✅ Current notes pre-filled (if exists)

- [ ] **Status Update**
  - [ ] Select new status (e.g., "Confirmed")
  - [ ] Add notes (optional)
  - [ ] Click "Update Status"
  - [ ] ✅ Loading state shows
  - [ ] ✅ Success: Order updates
  - [ ] ✅ Status badge updates immediately
  - [ ] ✅ Modal closes
  - [ ] ✅ Notes update (if added)

- [ ] **Status Validation**
  - [ ] Try to update to same status
  - [ ] ✅ "Update Status" button disabled
  - [ ] ✅ Cannot submit duplicate status

- [ ] **Cancel Update**
  - [ ] Open modal
  - [ ] Change status
  - [ ] Click "Cancel"
  - [ ] ✅ Modal closes
  - [ ] ✅ No changes saved

- [ ] **Error Handling**
  - [ ] Stop backend server
  - [ ] Try to update status
  - [ ] ✅ Error message displays
  - [ ] ✅ Modal stays open
  - [ ] ✅ Order data unchanged

- [ ] **Network Failure**
  - [ ] Disconnect network
  - [ ] Try to update status
  - [ ] ✅ Error message displays
  - [ ] ✅ Page doesn't crash

---

## 🔄 4. REGRESSION TESTING

### Product Management Still Works
- [ ] **After Orders Testing**
  - [ ] Navigate to Products page
  - [ ] ✅ Products list loads
  - [ ] ✅ Create product works
  - [ ] ✅ Edit product works
  - [ ] ✅ Delete product works

### Authentication Still Works
- [ ] **After All Testing**
  - [ ] Logout
  - [ ] ✅ Redirects to login
  - [ ] ✅ Login still works
  - [ ] ✅ Session persistence works
  - [ ] ✅ Route protection works

### Admin Guard Still Works
- [ ] **After All Testing**
  - [ ] Access admin routes
  - [ ] ✅ AdminRoute protection works
  - [ ] ✅ Non-admin users blocked

---

## 🐛 5. ERROR STATE TESTING

### Empty Lists
- [ ] **No Products**
  - [ ] Filter to empty category
  - [ ] ✅ Empty state message displays
  - [ ] ✅ "Add Product" button visible

- [ ] **No Orders**
  - [ ] Filter to empty status
  - [ ] ✅ Empty state message displays

### Invalid Data
- [ ] **Invalid Order ID**
  - [ ] Navigate to `/dashboard/orders/not-a-uuid`
  - [ ] ✅ Error message displays
  - [ ] ✅ Page doesn't crash

- [ ] **Invalid Product ID**
  - [ ] Navigate to `/dashboard/products/not-a-uuid/edit`
  - [ ] ✅ Error message displays
  - [ ] ✅ Page doesn't crash

### Network Failures
- [ ] **Backend Down**
  - [ ] Stop backend server
  - [ ] Try to load products
  - [ ] ✅ Error message displays
  - [ ] ✅ Page doesn't crash

- [ ] **Slow Network**
  - [ ] Throttle network (DevTools)
  - [ ] Load pages
  - [ ] ✅ Loading states display
  - [ ] ✅ No race conditions

### API Errors
- [ ] **401 Unauthorized**
  - [ ] Expire token manually
  - [ ] Try to access protected route
  - [ ] ✅ Redirects to login
  - [ ] ✅ Error handled gracefully

- [ ] **403 Forbidden**
  - [ ] Try to access admin route as non-admin
  - [ ] ✅ "Access Denied" page displays

- [ ] **404 Not Found**
  - [ ] Navigate to non-existent order
  - [ ] ✅ Error message displays
  - [ ] ✅ Page doesn't crash

- [ ] **500 Server Error**
  - [ ] Trigger server error (if possible)
  - [ ] ✅ Error message displays
  - [ ] ✅ Page doesn't crash

---

## 📱 6. UI/UX TESTING

### Responsive Design
- [ ] **Mobile View (< 768px)**
  - [ ] ✅ Sidebar collapses/overlays
  - [ ] ✅ Tables scroll horizontally
  - [ ] ✅ Forms stack vertically
  - [ ] ✅ Buttons accessible

- [ ] **Tablet View (768px - 1024px)**
  - [ ] ✅ Layout adapts
  - [ ] ✅ Navigation works

- [ ] **Desktop View (> 1024px)**
  - [ ] ✅ Full layout displays
  - [ ] ✅ Sidebar visible

### Loading States
- [ ] **All Pages**
  - [ ] ✅ Loading spinners display
  - [ ] ✅ No blank screens
  - [ ] ✅ Smooth transitions

### Navigation
- [ ] **Sidebar Navigation**
  - [ ] ✅ All links work
  - [ ] ✅ Active route highlighted
  - [ ] ✅ Toggle button works

- [ ] **Breadcrumbs/Back Buttons**
  - [ ] ✅ Back buttons work
  - [ ] ✅ Navigation history preserved

### Forms
- [ ] **Form Validation**
  - [ ] ✅ Real-time validation
  - [ ] ✅ Error messages clear
  - [ ] ✅ Submit disabled when invalid

- [ ] **Form Submission**
  - [ ] ✅ Loading states during submit
  - [ ] ✅ Success feedback
  - [ ] ✅ Error feedback

---

## ✅ 7. FINAL VERIFICATION

### Critical Paths
- [ ] **Login → Dashboard → Products → Create → Edit → Delete**
  - [ ] ✅ All steps work end-to-end

- [ ] **Login → Dashboard → Orders → View → Update Status**
  - [ ] ✅ All steps work end-to-end

### Data Integrity
- [ ] **Product Updates**
  - [ ] Update product
  - [ ] Refresh page
  - [ ] ✅ Changes persist

- [ ] **Order Updates**
  - [ ] Update order status
  - [ ] Refresh page
  - [ ] ✅ Changes persist

### Performance
- [ ] **Page Load Times**
  - [ ] ✅ Products list loads < 2s
  - [ ] ✅ Orders list loads < 2s
  - [ ] ✅ Order details loads < 2s

- [ ] **No Memory Leaks**
  - [ ] Navigate between pages multiple times
  - [ ] ✅ No performance degradation

---

## 📝 TEST RESULTS SUMMARY

### Passed Tests: ___ / ___
### Failed Tests: ___ / ___
### Blockers Found: ___

### Issues Found:
1. [ ] Issue description
2. [ ] Issue description
3. [ ] Issue description

### Notes:
- Any additional observations or edge cases discovered during testing

---

## 🚀 SIGN-OFF

**Testing Completed By:** _______________  
**Date:** _______________  
**Status:** ⬜ PASSED | ⬜ FAILED | ⬜ BLOCKERS FOUND

**Next Steps:**
- [ ] All tests passed → Proceed to final sign-off
- [ ] Blockers found → Fix blockers, re-test
- [ ] Minor issues found → Document, proceed with enhancements

---

**Last Updated:** Testing Phase
