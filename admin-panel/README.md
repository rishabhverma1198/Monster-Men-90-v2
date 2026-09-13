# Monster Men 90 — Admin Panel

The admin dashboard for Monster Men 90, used by store operators to manage products, orders, inventory, users, and leads, and to monitor store analytics in real time.

This is the operator-facing half of the project — see the repository root [README](../README.md) for the full-project overview, and `frontend/` for the customer-facing storefront.

## Purpose

The admin panel gives a store operator a single dashboard to run day-to-day operations: managing the product catalog and its variants, tracking and updating orders, monitoring stock levels, managing customer accounts, following up on leads, and viewing sales analytics — all backed by the same Supabase database and Express backend that power the customer storefront.

## Features

**Authentication & access control**
- Email/password login and phone OTP login, using the same backend JWT session mechanism as the customer app
- Session state managed via a Zustand store (`authStore`), with route protection so the dashboard is only reachable once authenticated

**Dashboard & analytics**
- `DashboardHome` — live store statistics pulled from the backend
- `Analytics` — sales/order charts (via Recharts), with a **live Supabase realtime subscription** on the `orders` table so figures update without a manual refresh

**Product management**
- List, create, and edit products, including image and video upload
- Move a product between gender categories, and toggle a product active/inactive
- Per-product **variant management** (sizes/colors) with individual stock levels

**Order management**
- List and filter orders, view full order detail, and update order status
- Shipment creation and label generation via a shipping-provider integration on the order detail view

**Inventory management**
- Stock and reorder-level tracking per item, with a low-stock filter

**Users**
- List users, change roles, and activate/deactivate accounts

**Leads**
- Searchable list of incoming leads

**Settings**
- Admin profile management, including an avatar upload flow with an image-cropping tool, and password change

## Technology Stack

- React 19 + TypeScript
- Vite (via `rolldown-vite`) as the build tool
- Zustand for authentication/session state
- React Router for routing
- Axios for backend API communication
- `@supabase/supabase-js` for the direct realtime analytics subscription
- Recharts for analytics visualizations

## Project Structure

```
admin-panel/
├── src/
│   ├── pages/           # DashboardHome, Analytics, Products, ProductsCreate,
│   │                    #   ProductsEdit, Orders, OrderDetails, Inventory,
│   │                    #   Users, Leads, Settings, Login
│   ├── components/
│   │   ├── common/      # Shared UI (e.g. ImageCropModal, confirm dialogs)
│   │   └── features/    # VariantManager, ShippingSection
│   ├── store/           # authStore (Zustand) — the auth implementation
│   ├── hooks/           # Custom hooks (e.g. useToast)
│   ├── lib/              # API client and Supabase client
│   ├── types/             # TypeScript types
│   ├── utils/              # Utility functions (image/video compression)
│   ├── __tests__/          # Unit/component tests
│   └── test/                # Test setup
└── tests/e2e/               # Playwright end-to-end tests
```

## Development Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Type-check + build for production
npm run build

# Lint
npm run lint
```

Copy `.env.example` to `.env.local` and fill in your own values before running the app — see that file for the exact variables required (API URL, Supabase URL/anon key). Never commit a real `.env`/`.env.local` file.

## Testing

- **Unit/component tests** (Vitest): `npm run test:run`
- **Interactive test UI**: `npm run test:ui`
- **Coverage**: `npm run test:coverage`
- **End-to-end tests** (Playwright, covering auth, product management, and navigation/regression flows): `npm run test:e2e`
- **Everything**: `npm run test:all`

## Known Limitations

- No payment gateway is involved in this admin surface (orders are managed post-checkout; no payment processing exists in the project).
