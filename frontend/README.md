# MonsterMens90 — Customer Frontend

The customer-facing storefront for Monster Men 90, a clothing e-commerce platform. Built with React 19, TypeScript, and Vite, styled with Tailwind CSS, inspired by Bewakoof.com's UI/UX.

This is the shopper-facing half of the project — see the repository root [README](../README.md) for the full-project overview, and `admin-panel/` for the store's admin dashboard.

## Features

- Product browsing by category, product detail pages, search, and filter/sort
- Cart and checkout flow
- Order history, order detail view, order tracking, and an order-success confirmation page
- Wishlist page (UI implemented; backend persistence is not yet complete — see [Known Limitations](#known-limitations))
- Authentication: email/password login, phone OTP login, signup, forgot-password flow, and a Google OAuth callback handler
- User profile page
- Route protection: cart, checkout, wishlist, profile, and order pages require an authenticated session (via `ProtectedRoute`)

## Project Structure

```
frontend/
├── src/
│   ├── pages/              # Route-level pages (Home, Category, ProductDetail, Cart,
│   │                       #   Checkout, Wishlist, Orders, OrderDetail, OrderSuccess,
│   │                       #   OrderTracking, Profile, Search, FilterSort, auth pages)
│   ├── components/
│   │   ├── common/         # Shared UI components
│   │   ├── features/       # Feature-specific components
│   │   └── layout/         # Navbar, Footer, layout shell
│   ├── services/           # API client / service layer
│   ├── store/              # Zustand state stores
│   ├── hooks/               # Custom hooks
│   ├── config/               # App configuration
│   ├── types/               # TypeScript types
│   ├── utils/                # Utility functions
│   ├── __tests__/           # Unit, component, integration, and e2e-style tests
│   ├── App.tsx              # Route definitions
│   └── main.tsx              # Entry point
└── public/                  # Static assets
```

## Routes

| Path | Page | Protected |
|---|---|---|
| `/` | Home | No |
| `/category/:categoryName` | Category listing | No |
| `/product/:productId` | Product detail | No |
| `/search` | Search | No |
| `/filter-sort` | Filter/sort | No |
| `/login`, `/login-email`, `/signup`, `/forgot-password` | Auth pages | No |
| `/auth/callback` | OAuth callback handler | No |
| `/welcome` | First-interaction/landing page | No |
| `/cart` | Cart | Yes |
| `/checkout` | Checkout | Yes |
| `/wishlist` | Wishlist | Yes |
| `/profile` | User profile | Yes |
| `/orders`, `/orders/:orderId` | Order history / detail | Yes |
| `/order-success/:id` | Order confirmation | Yes |
| `/track` | Order tracking | No |

## Technology Stack

- React 19 + TypeScript
- Vite (via `rolldown-vite`) as the build tool
- Zustand for state management
- React Router for routing
- Axios for API communication
- Tailwind CSS for styling

## API Integration

The API client lives in `src/services/`, handling authentication tokens, error handling, and request/response interceptors against the backend (`../backend`).

## Design System

- **Primary accent color**: `#ffdc46` (yellow)
- **Background**: White
- **Text**: Dark gray (`#111827`)
- **Font**: Inter, system-ui
- **Spacing**: Tailwind default scale
- Responsive breakpoints follow Tailwind's defaults (`sm`, `md`, `lg`, `xl`)

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Type-check + build for production
npm run build

# Lint
npm run lint

# Run tests
npm test
```

Copy `.env.example` to `.env` and fill in your own values before running the app — see that file for the exact variables required (API base URL and admin contact display info). Never commit a real `.env` file.

## Testing

Tests live under `src/__tests__/` and run via Vitest, covering component rendering, API integration, and backend-communication behavior. Run with `npm test`.

## Known Limitations

- The Wishlist page's UI is implemented, but it is not yet fully connected to a backend persistence endpoint.
- No payment gateway is integrated into the checkout flow.
