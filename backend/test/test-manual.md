# Manual API Testing Guide

Quick manual tests using curl or Postman.

## Prerequisites

1. Backend running on `http://localhost:5000`
2. Get auth token first (via login)

---

## Step 1: Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

**Save the `token` from response!**

---

## Step 2: Create Product

```bash
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "Test Product",
    "description": "Test description",
    "price": 1000,
    "wholesalePrice": 800,
    "moq": 10,
    "category": "TEST",
    "stock": 100
  }'
```

**Save the `id` from response!**

---

## Step 3: Add to Cart

```bash
curl -X POST http://localhost:5000/api/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "product_id": "PRODUCT_ID_HERE",
    "quantity": 5
  }'
```

---

## Step 4: Get Cart

```bash
curl -X GET http://localhost:5000/api/cart \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Step 5: Checkout

```bash
curl -X POST http://localhost:5000/api/orders/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{}'
```

**Save the `order.id` from response!**

---

## Step 6: Verify Inventory (Supabase Dashboard)

Check `inventory` table:
- `reserved` should increase by order quantity
- `stock` should stay the same

---

## Step 7: Cancel Order (Supabase Dashboard)

Update `orders` table:
- Set `status = 'cancelled'` for the test order
- Check `inventory.reserved` should decrease

---

## Common Errors & Solutions

### "Missing token"
- Token expired or invalid
- Re-login to get new token

### "Product not found"
- Use correct product ID
- Check product exists in database

### "Insufficient stock"
- Product inventory may not exist
- Create inventory row for product

### "Column does not exist"
- Schema mismatch
- Check database schema matches backend code

---

## Quick Health Check

```bash
# Check backend health
curl http://localhost:5000/health

# Check database connection (if test-db route exists)
curl http://localhost:5000/api/test-db
```
