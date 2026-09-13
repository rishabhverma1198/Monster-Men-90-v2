# E2E Tests (Playwright)

## Prerequisites

1. **Backend** running on `http://localhost:5000`:
   ```bash
   cd backend && npm run dev
   ```

2. **Admin user** exists in Supabase with:
   - Email: `monstermen900@gmail.com`
   - Password: `Monster@900` (or set env `PLAYWRIGHT_ADMIN_PASSWORD`)
   - Role: `admin`

3. **Frontend** (optional) may run on 5173. E2E uses **admin-panel on 5174** to avoid hitting the frontend app.

## Run

```bash
cd admin-panel
npm run test:e2e
```

Playwright will:
- Start the admin dev server on **port 5174**
- Open `http://localhost:5174`
- Run tests against the admin login, dashboard, products, orders, etc.

## Troubleshooting

- **All login-dependent tests fail**: Backend not running, or admin user missing/wrong password. Check backend logs and Supabase `profiles` / auth.
- **`/welcome` or wrong app**: Ensure you run E2E from `admin-panel`; the config uses port 5174 for the admin app only.
- **Rate limiting / OTP**: Auth tests use password login only. Ensure no OTP cooldown blocks reuse.
