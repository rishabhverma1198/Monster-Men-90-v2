# Monster Men 90 — Backend API

The Express + TypeScript REST API powering both the customer storefront (`../frontend`) and the admin dashboard (`../admin-panel`), backed by a Supabase (PostgreSQL) database.

See the repository root [README](../README.md) for the full-project overview.

## Architecture

The backend follows a layered architecture:

```
src/
├── routes/         # Thin routing layer — maps HTTP verbs/paths to controllers
├── controllers/    # Request handling and orchestration
├── services/       # Business logic and data access (Supabase queries, shipping integration, etc.)
├── middleware/      # Security, validation, and error handling
├── schemas/          # Request validation schemas
├── config/            # Supabase client and app configuration
├── utils/              # Shared utilities
└── server.ts            # App bootstrap and route auto-loader
```

Routes are auto-loaded at startup: every file in `src/routes/` is mounted at `/api/<filename>` (e.g. `routes/products.ts` → `/api/products`).

## API Overview

All routes below are mounted under `/api/`. This list reflects the routes actually defined in `src/routes/` — verified directly from the source, not assumed.

| Mount | Route group | Covers |
|---|---|---|
| `/api/auth` | Authentication | Signup, login, logout, session check/refresh, `/me`, profile get/update, phone/email OTP verification for profile changes, password reset flow, Google OAuth (`/google`, `/google/callback`) |
| `/api/otp` | OTP login | `/generate`, `/verify` |
| `/api/products` | Product catalog | List, search, categories, get by ID, create |
| `/api/cart` | Shopping cart | Add, get, update, remove item, clear |
| `/api/orders` | Orders (customer-facing) | Create, list, get by ID |
| `/api/orders-transaction` | Order creation (transactional) | Create order as a single DB transaction |
| `/api/variants` | Product variants | Get by product, create, update, delete, update inventory |
| `/api/shipping` | Shipping integration | Create shipment, get rates, track by AWB, cancel, public order tracking |
| `/api/users` | User management (admin) | List, search, get/update/delete by ID, role and status updates |
| `/api/admin` | Admin operations | Dashboard stats, status, product CRUD + move-gender/status toggles, order list/update, inventory (stock/reorder-level), notifications, leads, admin profile |

## Authentication

- **Session model**: backend-issued JWTs. Login (password or OTP) returns a token used as a Bearer token on subsequent requests.
- **Customer auth**: email/password, phone OTP, and Google OAuth (via Supabase), plus forgot-password/reset-password flows.
- **Admin auth**: email/password and OTP, via the same `/api/auth` and `/api/otp` routes, distinguished by role.

## Database

Backed by **Supabase** (PostgreSQL), accessed via `@supabase/supabase-js`. Tables actually queried by the codebase (verified via source, not assumed): `products`, `categories`, `variants`, `inventory`, `orders`, `order_items`, `cart_items`, `profiles`, `user_otps`, `admin_otps`, `admin_notifications`, `admin_audit_log`, `idempotency_keys`. Schema and migrations live in `../supabase/`.

## Security Middleware

- **Helmet** — standard security headers
- **CORS** — explicit allowed-origins configuration
- **CSRF protection** (`middleware/csrf.ts`)
- **Rate limiting** (`middleware/rateLimiter.ts`) on sensitive/public endpoints
- **Account lockout** (`middleware/accountLockout.ts`) to slow brute-force login attempts
- **Centralized error handling** (`middleware/errorHandler.ts`) returning structured `{ success, code, message, requestId, timestamp }` responses, never leaking stack traces to clients

## Logging

Structured logging via **Winston**.

## Development Setup

```bash
# Install dependencies
npm install

# Start in development (auto-restarts on change)
npm run dev

# Type-check only
npm run type-check

# Build for production
npm run build

# Start the built server
npm run start
```

The dev/start scripts automatically free port 5000 before starting (see `scripts/kill-port.ps1`) to avoid `EADDRINUSE` errors during local development.

## Environment Variables

Copy `.env.example` to `.env` and fill in your own values — see that file for the exact variables required, including: server port, Supabase URL and keys, JWT secret, allowed CORS origins, log level, shipping-provider credentials, and default admin contact info. **Never commit a real `.env` file.**

## Testing

- **Vitest suite** (`src/__tests__/`): unit/integration tests including authentication.
- **Standalone integration scripts** (`test/`): run against a live server/database for specific flows — see the scripts prefixed `test:` in `package.json` (e.g. `test:api`, `test:comprehensive`, `test:public`) for the available checks. These hit real endpoints and are intended for manual verification, not CI.

## Known Limitations

- No payment gateway integration exists in the API.
- The project is not currently deployed — this API is intended to run in local development (`http://localhost:5000` by default).
