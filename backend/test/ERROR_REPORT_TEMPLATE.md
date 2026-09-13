# Error Report Template

Use this template to report errors for debugging.

## 1. Test Information

**Test Date:** __________  
**Test Flow:** [ ] Product Creation [ ] Add to Cart [ ] Checkout [ ] Other: _______

---

## 2. Request Details

**Endpoint:** `POST /api/cart` (example)

**Request Body:**
```json
{
  "product_id": "uuid-here",
  "quantity": 5
}
```

**Headers:**
```
Authorization: Bearer token-here
Content-Type: application/json
```

---

## 3. Error Response

**Status Code:** `400`

**Response Body:**
```json
{
  "success": false,
  "code": "OUT_OF_STOCK",
  "message": "Insufficient stock"
}
```

**OR Copy Full Error:**
```
(Paste full error message here)
```

---

## 4. Backend Logs

**Check console output:**
```
(Paste relevant console logs here)
```

---

## 5. Database State

**Product ID:** `_________`  
**Product in database?** [ ] Yes [ ] No

**Inventory Row Exists?** [ ] Yes [ ] No  
**If yes, current values:**
- `stock`: _______
- `reserved`: _______

**Cart Item Exists?** [ ] Yes [ ] No

---

## 6. Expected vs Actual

**Expected:** Item should be added to cart  
**Actual:** Got "Insufficient stock" error

---

## 7. Environment

**Backend URL:** `http://localhost:5000`  
**Node Version:** `v20.x.x`  
**Database:** Supabase (PostgreSQL)

---

## Quick Debug Checklist

- [ ] Backend server is running
- [ ] Auth token is valid (not expired)
- [ ] Product exists in database
- [ ] Inventory row exists for product
- [ ] Correct product ID used
- [ ] Checked database schema matches code

---

## Additional Context

(Any other relevant information)
