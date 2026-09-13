# Admin Panel – Check / Change Checklist

---

## 1. Env (`.env.local`) – already sahi

Tumhare `admin-panel\.env.local` mein ye hona chahiye:

| Key | Value | Status |
|-----|--------|--------|
| **VITE_API_URL** | `http://localhost:5000` | ✅ Backend ka URL |
| **VITE_SUPABASE_URL** | `https://xlqelfflhnofvprvamnq.supabase.co` | ✅ Same as backend |
| **VITE_SUPABASE_ANON_KEY** | `eyJ...` (anon key) | ✅ Same as backend |

**Kuch change karne ki zaroorat nahi** – agar ye 3 values sahi hain to env theek hai.

---

## 2. Backend CORS – admin URL allowed hona chahiye

Backend `.env` mein **ALLOW_ORIGINS**:

```
ALLOW_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:3001
```

- `http://localhost:5173` = frontend (customer site)
- `http://localhost:5174` = admin panel (Vite dusra port use karta hai jab 5173 busy ho)

Agar admin alag port pe chal raha hai to us URL ko bhi is list mein add karo (comma-separated).

---

## 3. Admin panel chalana

```bash
cd admin-panel
npm run dev
```

Browser mein jo URL dikhe (e.g. `http://localhost:5174`) wahi open karo.

---

## 4. Admin login – kaun se credentials

Admin panel **backend** ke through login karta hai (email + password):

- **Email:** Wo account jo **Supabase `profiles`** mein **role = 'admin'** hai
- **Password:** Usi account ka password (Supabase Auth)

Agar koi admin user nahi hai to:

1. **Supabase Dashboard** → **Authentication** → **Users** → koi user (ya naya invite)
2. **Table Editor** → **profiles** → us user ki row mein **role** = `admin` set karo

Ya backend ke **TEST_ADMIN_EMAIL** / **TEST_ADMIN_PASSWORD** (agar tumne use kiye hon) se login try karo.

---

## 5. Quick checklist

- [ ] `admin-panel\.env.local` mein **VITE_API_URL**, **VITE_SUPABASE_URL**, **VITE_SUPABASE_ANON_KEY** set
- [ ] Backend **ALLOW_ORIGINS** mein admin ka origin (e.g. `http://localhost:5174`) included
- [ ] **Backend** chal raha ho (`npm run dev` in backend)
- [ ] **Admin panel** chal raha ho (`npm run dev` in admin-panel)
- [ ] Supabase **profiles** mein koi user **role = admin** hai
- [ ] Usi email/password se admin panel login try karo

---

## 6. Agar admin alag port pe chale

Agar `npm run dev` admin ko kisi aur port pe start kare (e.g. 5175), to:

1. **Backend `.env`** → **ALLOW_ORIGINS** mein woh URL add karo:  
   `http://localhost:5175`
2. Backend **restart** karo.

---

**Short:** Env theek hai to kuch change mat karo. Sirf backend + admin panel dono `npm run dev` se chalao, aur admin login ke liye Supabase mein koi user **role = admin** hona chahiye.
