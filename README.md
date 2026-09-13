# Monster Men 90

A full-stack e-commerce platform for a clothing brand, built as three independent applications sharing one Supabase database: a customer-facing storefront, an admin dashboard, and an Express/TypeScript API.

The project demonstrates a complete e-commerce workflow — product catalog, cart, checkout, order tracking, and wishlist on the customer side, paired with a full admin back-office for managing products, inventory, orders, users, and leads, backed by a real, currently-working database.

## What this project is

Monster Men 90 is a clothing storefront concept with:

- A **customer storefront** where shoppers can browse products by category, search and filter, manage a wishlist, add items to a cart, check out, and track their orders.
- An **admin dashboard** for the store operator to manage the product catalog, inventory, orders, customer accounts, and incoming leads, with live sales analytics.
- A **backend API** that both frontends talk to, backed by a Supabase (PostgreSQL) database, handling authentication, business logic, and data access.

## Features

**Customer frontend**
- Product browsing by category, product detail pages, search, and filter/sort
- Cart and checkout flow
- Order history, order detail, order tracking, and an order-success confirmation page
- Wishlist (product-side UI is implemented; see [Known Limitations](#known-limitations))
- Email/password login, OTP-based login, signup, forgot-password flow, and Google OAuth callback handling
- User profile management

**Admin dashboard**
- Dashboard home with live store statistics
- Analytics page with real-time updates via a Supabase realtime subscription
- Product management: list, create, edit, activate/deactivate, move between gender categories
- Product variant management (sizes/colors) with per-variant inventory
- Inventory management with low-stock filtering and reorder-level tracking
- Order management with status updates and shipment/label generation via a shipping integration
- User management (role changes, activation/deactivation)
- Leads list with search
- Admin profile/settings, including avatar upload with an image-cropping tool

**Backend / API**
- RESTful API built with Express and TypeScript, organized into routes → controllers → services
- JWT-based session authentication plus OTP login and Google OAuth
- Product, cart, order, user, variant, inventory, and shipping endpoints
- Structured error handling with request IDs, and Winston-based logging

## Technology Stack

| Layer | Stack |
|---|---|
| Customer frontend | React 19, TypeScript, Vite, Zustand, React Router, Axios |
| Admin dashboard | React 19, TypeScript, Vite, Zustand, React Router, Recharts, Axios |
| Backend | Node.js, Express, TypeScript |
| Database | Supabase (PostgreSQL), accessed via `@supabase/supabase-js` |
| Auth | JWT (backend-issued sessions), OTP login, Google OAuth (via Supabase) |
| Security | Helmet, CORS, CSRF protection, rate limiting, account lockout |
| Testing | Vitest (unit/integration/component), Playwright (end-to-end) |

## Architecture

Three independent applications share one backend database:

```
┌─────────────────────┐      ┌─────────────────────┐
│  Customer Frontend   │      │   Admin Dashboard    │
│  (React + Vite)      │      │   (React + Vite)     │
└──────────┬───────────┘      └──────────┬───────────┘
           │                             │
           │         HTTPS / REST        │
           └──────────────┬──────────────┘
                           │
                ┌──────────▼───────────┐
                │   Backend API         │
                │   (Express + TS)      │
                │   routes → controllers│
                │   → services          │
                └──────────┬───────────┘
                           │
                ┌──────────▼───────────┐
                │  Supabase (Postgres)  │
                │  products, orders,    │
                │  cart_items, users,   │
                │  variants, inventory, │
                │  leads, and more      │
                └───────────────────────┘
```

The admin dashboard's Analytics page also connects to Supabase directly (via a realtime subscription) for live updates, alongside its normal calls to the backend API.

## Project Structure

```
.PROJECT-MONSTER-MEN-90/
├── frontend/          # Customer-facing storefront (React + Vite)
├── admin-panel/       # Admin dashboard (React + Vite)
├── backend/           # Express + TypeScript API
│   └── src/
│       ├── routes/       # Thin routing layer
│       ├── controllers/  # Request handling / business logic
│       ├── services/     # Data access / integrations
│       └── middleware/   # Security, validation, error handling
├── supabase/          # Database schema and migrations
├── docs/              # Supplementary setup notes
└── scripts/           # Utility scripts
```

## Authentication

- **Customers**: email/password login, phone-based OTP login, or Google OAuth (via Supabase), plus forgot-password/reset flows.
- **Admin**: email/password login and OTP login, using the same backend JWT session mechanism.
- Sessions are backend-issued JWTs; the backend also verifies tokens and manages refresh.

## Security

The backend includes several deliberate security layers, not just a bare Express app:

- **Helmet** for standard security headers
- **CORS** configured explicitly for allowed origins
- **CSRF protection** middleware
- **Rate limiting** on sensitive/public endpoints
- **Account lockout** middleware to slow brute-force login attempts
- Centralized error handling that returns structured error responses (no stack traces leaked to clients) with a request ID for traceability

## Database

The application uses **Supabase** (PostgreSQL). Verified tables in active use include: `products`, `categories`, `variants`, `inventory`, `orders`, `order_items`, `cart_items`, `profiles`, `user_otps`, `admin_otps`, `admin_notifications`, `admin_audit_log`, and `idempotency_keys`. Schema and migrations live in the `supabase/` directory.

## Testing

- **Customer frontend**: Vitest unit/integration/component tests (unit, component, integration, and e2e-style specs under `src/__tests__/`).
- **Admin dashboard**: Vitest component/unit tests, plus a Playwright end-to-end suite (`tests/e2e/`) covering auth, product management, and navigation/regression flows.
- **Backend**: a Vitest test suite (`src/__tests__/`) plus standalone integration test scripts under `test/` for exercising real API/database flows.

## Local Development / Setup

Each application is an independent npm project. From the repository root:

```bash
# Backend
cd backend
npm install
npm run dev        # starts the API (default: http://localhost:5000)

# Customer frontend (in a separate terminal)
cd frontend
npm install
npm run dev         # Vite dev server, default port 5173

# Admin dashboard (in a separate terminal)
cd admin-panel
npm install
npm run dev          # Vite dev server, default port (Vite will pick the next free port if 5173 is in use)
```

Common scripts available in each project: `dev`, `build`, `lint`, and `test` (see each project's `package.json` for the full list, including Playwright e2e scripts in `admin-panel`).

## Environment Variables

Each application has its own `.env.example` file documenting the variables it needs. Copy it to `.env` (or `.env.local` where used) and fill in your own values — **never commit real `.env` files**.

- `backend/.env.example` — server port, Supabase URL/keys, JWT secret, allowed origins, shipping-provider keys, admin contact defaults
- `frontend/.env.example` — API base URL, admin contact display info
- `admin-panel/.env.example` — API URL, Supabase URL/anon key

Refer to those files directly for the exact variable names required — none are reproduced here to avoid drift between this document and the actual code.

## Current Status

This is an actively developed local-development project:

- All three applications build, type-check, and run locally.
- The backend connects to a real, working Supabase database (verified end-to-end, including live product data retrieval).
- Automated tests pass across all three applications (with a small number of frontend integration tests that require live network access to run outside a sandboxed environment).
- **The project is not currently deployed to a public URL.** There is no production hosting or CI/CD deployment configured yet.

## Known Limitations

- **No payment gateway is integrated.** Checkout does not currently process real payments.
- **Wishlist is not fully wired to the backend.** The frontend Wishlist page exists, but the corresponding backend persistence is not yet complete.
- No public deployment exists yet — the project currently runs in local development only.
