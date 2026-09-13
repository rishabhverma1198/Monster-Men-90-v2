# Auth Design – Senior Full Stack Analysis

## Current State (Why Login/Signup Isn’t Working as Expected)

### 1. **Login page (mobile number)**
- **Issue:** "CONTINUE" pe click karne par sirf `/login-email` pe redirect ho raha hai.
- **Code:** `Login.tsx` line 46–49: `onSubmit` mein koi API call nahi, direct `navigate('/login-email')`.
- **Result:** Mobile OTP flow implement hi nahi hai.

### 2. **Google Sign-in**
- **Backend:** `/api/auth/google` aur `/api/auth/google/callback` implemented hain (Supabase OAuth).
- **Frontend:** `window.location.href = VITE_API_BASE_URL + '/api/auth/google'` se backend pe redirect.
- **Possible issues:**
  - `VITE_API_BASE_URL` galat/empty ho to redirect fail.
  - Supabase Dashboard mein Google provider enable + correct redirect URL na ho.
  - Callback URL backend ko point kare (`BACKEND_URL/api/auth/google/callback`) aur frontend ko token ke sath (`FRONTEND_URL/auth/callback?token=...`).

### 3. **Skip Sign-in**
- **Issue:** Koi “Continue as Guest” / “Skip Sign-in” option nahi.
- **Current:** Cart, Wishlist, ProductDetail add-to-cart sab `isAuthenticated` false hone par direct `/login` pe bhej dete hain.
- **Expected:** Guest browse kar sake; Add to Cart pe hi login/signup prompt (modal ya redirect with returnUrl).

### 4. **OTP via WhatsApp (customer)**
- **Issue:** Customer ke liye WhatsApp OTP flow nahi hai.
- **Existing:** `backend/routes/otp.ts` sirf **admin** OTP ke liye (admin_otps, admin phone).
- **Required:** Customer ke liye alag flow: mobile number → OTP generate → WhatsApp link → verify → create/link user → JWT.

### 5. **Forgot password**
- **Issue:** UI par “Forgot password?” link nahi; backend par bhi forgot/reset flow nahi.
- **Required:** Email ya phone se OTP → verify → new password set (email users) ya sign-in (phone users).

### 6. **Database**
- **profiles:** Code `full_name`, `is_active`, `avatar_url` use karta hai. Schema file mein `status`, `company_name`, `gst_number` bhi hain. `phone_number` customer auth ke liye chahiye.
- **auth.users:** Supabase – email/password + Google. Phone-only users ke liye synthetic email (`phone@domain.phone`) + admin createUser use ho sakta hai.
- **user_otps:** Customer OTP store karne ke liye nayi table chahiye (admin_otps se alag).

---

## Target Behaviour (E‑commerce Style)

| Feature | Behaviour |
|--------|-----------|
| **Browse** | Login optional. Home, category, product detail sab bina login. |
| **Add to Cart** | Guest add to cart click kare → “Login or Sign up to add to cart” (modal ya login page with returnUrl). |
| **Login options** | 1) Google 2) Mobile number → OTP on WhatsApp → enter OTP → sign in / sign up. |
| **Sign up** | Same as login (Google ya phone OTP). Pehli baar phone/Google se → profile create, DB me save. |
| **Forgot password** | Email login page par link. Email ya phone enter → OTP → verify → set new password / sign in. |
| **DB** | profiles + auth.users sync. Customer OTP ke liye user_otps. Sab required columns present. |

---

## Implementation Plan

1. **DB migration**  
   - profiles: `phone_number` (unique nullable), `full_name`, `is_active` (ya `status`), `auth_method` (optional).  
   - user_otps: id, phone_number, otp_code, expires_at, is_used, attempts, created_at.  
   - Optional: password_reset_otps ya same user_otps with type column.

2. **Backend**  
   - `POST /auth/otp/send` – body: `{ phone_number }` → generate OTP, save user_otps, return WhatsApp link (or send via provider).  
   - `POST /auth/otp/verify` – body: `{ phone_number, otp_code }` → validate → create/update auth.users + profiles → return JWT.  
   - `POST /auth/forgot-password` – body: `{ email }` or `{ phone_number }` → send OTP (email link ya WhatsApp).  
   - `POST /auth/reset-password` – body: `{ email_or_phone, otp_code, new_password }` → verify OTP → set password / sign in.

3. **Frontend**  
   - **Skip sign-in:**  
     - Login page par “Continue as Guest” → home pe, no token.  
     - Add to Cart (guest): modal “Login or Sign up to add this to cart” with Login / Sign up (Google + Phone).  
   - **Mobile OTP:**  
     - Login page: mobile number → CONTINUE → call `/auth/otp/send` → show “OTP sent to WhatsApp” + OTP input → Verify → `/auth/otp/verify` → store token, redirect (or returnUrl).  
   - **Google:**  
     - Same as now; ensure env (VITE_API_BASE_URL, BACKEND_URL, FRONTEND_URL) and Supabase redirect URLs correct.  
   - **Forgot password:**  
     - Login-email page par “Forgot password?” → enter email/phone → OTP → verify → set new password / sign in.

---

## Files to Add/Change

- **DB:** `backend/migrations/002_auth_customer_otp_and_profiles.sql`  
- **Backend:** `backend/src/routes/auth.ts` (add OTP send/verify, forgot/reset); optional: `auth.controller.ts` + `auth.service.ts`.  
- **Frontend:**  
  - `Login.tsx` – mobile OTP flow (send + verify steps), “Continue as Guest”.  
  - `LoginEmail.tsx` – “Forgot password?” link + flow.  
  - `ProductCard.tsx` / Cart – guest add to cart → login modal or redirect with returnUrl.  
  - `api.ts` – add `authOtpSend`, `authOtpVerify`, `forgotPassword`, `resetPassword`.  
  - `authStore` – optional: `loginWithOtp(phone, otp)`, `continueAsGuest()`.

Is plan ke hisaab se implementation step-by-step apply kiya ja sakta hai (DB → backend → frontend).
