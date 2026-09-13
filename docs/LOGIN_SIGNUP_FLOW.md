# Login / Signup Flow (Unified)

## Overview

- **Single page:** `/login` — user enters **Email or Phone** in one field.
- **Email:** Backend checks if user exists → **Login** (password) or **Signup** (name + password).
- **Phone:** OTP sent via WhatsApp → verify OTP → **Login or Signup in one step** (backend creates profile if new).
- **Google:** New and existing users can sign in; backend creates profile for first-time Google users.
- **Guest:** Continue as Guest to browse without account.

## Flow

1. User opens **Login / Sign up** and types **Email** or **Phone** in "Enter Email or Phone".
2. **Continue**:
   - **If email:** `GET /api/auth/check?identifier=...` → `exists: true` → show **Password** (login) | `exists: false` → show **Sign up** form (name, password, confirm).
   - **If phone:** `POST /api/auth/otp/send` → WhatsApp link → user enters **6-digit OTP** → `POST /api/auth/otp/verify` → login (or signup if new).
3. **Google:** Redirect to backend → Google OAuth → callback → profile created if new → redirect to frontend with token.
4. **Forgot password:** Link to `/forgot-password`.

## Backend

- `GET /api/auth/check?identifier=email_or_phone` — returns `{ exists: boolean, type: 'email'|'phone' }`.
- Existing routes: `POST /api/auth/otp/send`, `POST /api/auth/otp/verify`, `POST /api/auth/login`, `POST /api/auth/signup`, `GET /api/auth/google`, `GET /api/auth/google/callback`.

## Phone-only users

After OTP signup, user is logged in. They can set a password later from **Profile** (if you add "Set password" there) to enable email/password login.

## Automated tests

- Backend: `npm run test:auth` (includes GET /auth/check, OTP send/verify, Google redirect).
- Frontend: use Login page; run E2E or manual test for full flow.
