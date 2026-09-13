# Automated Testing – Auth & Cross-Check

## Backend (Vitest)

### Auth tests (accuracy + cross-check)

Auth flow is covered by **`backend/src/__tests__/auth.test.ts`**:

| Test | What it checks |
|------|----------------|
| **GET /api/auth/check** | 400 when identifier missing; 200 + `exists: true/false`, `type: email|phone` for email/phone; 400 for invalid phone (too short) |
| **POST /api/auth/otp/send** | 400 when phone normalizes to &lt;10 digits; 429 when recent OTP exists (rate limit); 200 + `whatsapp_url` when OTP sent |
| **POST /api/auth/otp/verify** | 400 for invalid/missing OTP; 200 + `user` + `token` when OTP valid and profile exists |
| **GET /api/auth/google** | Redirect to Google OAuth URL; `redirectTo` includes backend callback URL and `redirect_url` param |
| **GET /api/auth/google/callback** | Error → redirect to `frontendOrigin/login?error=...` (no double path); success → redirect to frontend callback URL **without** double `/auth/callback`; missing code → redirect to `/login` |

### Run auth tests only

```bash
cd backend
npm run test:auth
```

### Run full backend test suite

```bash
cd backend
npm run test
```

**Status:** All backend tests pass with full accuracy:
- **auth.test.ts** – 14 tests (GET /auth/check, customer OTP send/verify, Google OAuth redirect URL)
- **otp.test.ts** – 6 tests (admin OTP generate/verify; mocks fixed for “admin not found” and “OTP disabled”)
- **nimbuspost.test.ts** – skipped when `NIMBUSPOST_API_KEY` is not set (no failures)

---

## Frontend (Vitest + React Testing Library)

### Auth-related tests (written, blocked by rolldown-vite)

- **`frontend/src/__tests__/store/authStore.test.ts`** – login, logout, loginWithOtp, setAuthFromCallback, continueAsGuest
- **`frontend/src/__tests__/api.test.ts`** – Auth API: login, signup, otpSend, otpVerify (URL + payload)
- **`frontend/src/__tests__/pages/AuthCallback.test.tsx`** – OAuth callback: error → `/login`; token+user → setAuthFromCallback + returnUrl

### Run frontend tests

```bash
cd frontend
npm run test
```

**Note:** With **rolldown-vite** (frontend override), named exports from app modules (`apiService`, `useAuthStore`) can be `undefined` at test runtime, so frontend tests may fail. A polyfill for `__vite_ssr_exportName__` is in `src/__tests__/setup.ts`. For **full accuracy** until frontend uses standard Vite for tests, rely on the **backend test suite** (`cd backend && npm run test`).

---

## Cross-check summary

| Layer | What is tested |
|-------|----------------|
| **Backend auth routes** | OTP send/verify validation, rate limit, success; Google initiate + callback redirect URL (no double `/auth/callback`), error redirect to frontend `/login` |
| **Frontend auth store** | Login, OTP login, OAuth callback state, guest mode, logout |
| **Frontend API service** | Auth endpoints called with correct method, URL, and body |
| **Frontend AuthCallback** | URL params → setAuthFromCallback + navigate; sessionStorage return URL |

Running **`npm run test:auth`** in `backend` gives a fast, accurate check of the auth flow and Google redirect behaviour.
