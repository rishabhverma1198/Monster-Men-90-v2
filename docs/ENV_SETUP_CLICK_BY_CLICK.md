# 🔐 Environment Variables – Step-by-Step Setup (Beginner Friendly)

SQL migration run ho chuka hai. Ab env variables set karna hai taaki auth, Google login, WhatsApp OTP sab kaam kare.

---

## ⚡ Ek nazar mein – Kya kya chahiye

| App | Zaroori keys | Optional |
|-----|----------------|----------|
| **Backend** | PORT, NODE_ENV, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, ALLOW_ORIGINS, **FRONTEND_URL**, **BACKEND_URL** | ADMIN_NAME, ADMIN_PHONE, LOG_LEVEL, Nimbuspost vars |
| **Frontend** | **VITE_API_BASE_URL** | VITE_ADMIN_NAME, VITE_ADMIN_PHONE, VITE_ADMIN_EMAIL |
| **Admin Panel** | **VITE_API_URL**, **VITE_SUPABASE_URL**, **VITE_SUPABASE_ANON_KEY** | – |

**Backend mein ab `BACKEND_URL` add kar diya gaya hai.** Agar tumne khud `.env` edit nahi kiya tha to `ADMIN_PHONE` khali hai – WhatsApp order alerts ke liye apna number daal sakte ho (e.g. `919876543210`).

---

## 📍 Step 1: Backend `.env` (Monster Men 90 Backend)

**Folder:** `d:\.PROJECT-MONSTER-MEN-90\backend`  
**File:** `.env` (agar nahi hai to `backend` folder ke andar nayi file banao, naam exactly `.env` hona chahiye)

### 1.1 Backend `.env` mein ye keys honi chahiye

| Key | Kya hai | Tumhare paas hai? | Kahan se milegi / Kya likhna hai |
|-----|---------|-------------------|----------------------------------|
| **PORT** | Server ka port | ✅ Hoga | `5000` (default) |
| **NODE_ENV** | development / production | ✅ Hoga | `development` local ke liye |
| **SUPABASE_URL** | Supabase project URL | ✅ Hoga | Supabase Dashboard → Project Settings → API → Project URL |
| **SUPABASE_SERVICE_ROLE_KEY** | Supabase secret key (backend only) | ✅ Hoga | Supabase Dashboard → Project Settings → API → `service_role` (secret) |
| **SUPABASE_ANON_KEY** | Supabase anon/public key | ✅ Hoga | Supabase Dashboard → Project Settings → API → `anon` public |
| **JWT_SECRET** | Token sign karne ke liye secret | ✅ Hoga | Koi bhi strong random string (e.g. `monster-secret-key` ya 32+ char) |
| **ALLOW_ORIGINS** | CORS – kaunse sites API call kar sakti hain | ✅ Hoga | `http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:3001` |
| **LOG_LEVEL** | Logs kitne detail | ✅ Hoga | `info` |
| **FRONTEND_URL** | Frontend site ka URL | ✅ Hoga | Local: `http://localhost:5173` |
| **BACKEND_URL** | Backend API ka full URL (Google callback ke liye zaroori) | ❌ **Check karo** | Local: `http://localhost:5000` (jis port pe backend chal raha hai) |

### 1.2 Backend mein optional (lekin useful) keys

| Key | Kya hai | Kahan se / Kya likhna |
|-----|---------|------------------------|
| **ADMIN_NAME** | Order success pe dikhne wala admin naam | Apna naam ya `Admin` |
| **ADMIN_PHONE** | WhatsApp order alerts / contact (with country code, e.g. `919876543210`) | Apna 10-digit number with country code |

### 1.3 Backend – Click by click kya karna hai

1. **File kholo:**  
   `d:\.PROJECT-MONSTER-MEN-90\backend\.env`

2. **Check karo:**  
   Line mein `BACKEND_URL` hai ya nahi.

3. **Agar BACKEND_URL nahi hai to last mein ye add karo (ek nayi line):**
   ```env
   # Auth / Google redirect (same machine = localhost, port jis pe backend chal raha hai)
   BACKEND_URL=http://localhost:5000
   ```

4. **Optional – Admin contact (order success + WhatsApp):**  
   Agar ye lines nahi hain to add karo:
   ```env
   ADMIN_NAME=Admin
   ADMIN_PHONE=919876543210
   ```
   `919876543210` ki jagah apna number (country code + 10 digit, bina + ya space).

5. **Save karo** (Ctrl+S).

---

## 📍 Step 2: Frontend `.env` (Customer Website)

**Folder:** `d:\.PROJECT-MONSTER-MEN-90\frontend`  
**File:** `.env` (agar nahi hai to `frontend` folder ke andar banao)

### 2.1 Frontend mein zaroori key

| Key | Kya hai | Kya likhna |
|-----|---------|------------|
| **VITE_API_BASE_URL** | Backend API ka base URL (bina `/api`) | Local: `http://localhost:5000` |

**Important:** Vite sirf `VITE_` se start hone wali keys use karta hai. Isliye naam exactly `VITE_API_BASE_URL` hona chahiye.

### 2.2 Frontend – Optional (Order Success page pe admin contact)

| Key | Kya hai | Kya likhna |
|-----|---------|------------|
| **VITE_ADMIN_NAME** | Order success pe admin ka naam | `Admin` ya apna naam |
| **VITE_ADMIN_PHONE** | Order success pe contact number | `+919876543210` jaisa |
| **VITE_ADMIN_EMAIL** | Order success pe admin email | `admin@monstermen90.com` |

### 2.3 Frontend – Click by click

1. **File kholo:**  
   `d:\.PROJECT-MONSTER-MEN-90\frontend\.env`

2. **Check karo:**  
   Ye line honi chahiye:
   ```env
   VITE_API_BASE_URL=http://localhost:5000
   ```
   Agar nahi hai to add karo. Port wahi hona chahiye jis pe backend chal raha hai (default 5000).

3. **Optional – Order success page ke liye:**  
   Agar order success pe apna contact dikhana hai to add karo:
   ```env
   VITE_ADMIN_NAME=Admin
   VITE_ADMIN_PHONE=+919876543210
   VITE_ADMIN_EMAIL=admin@monstermen90.com
   ```

4. **Save karo.**

5. **Frontend restart karo:**  
   Env change ke baad dev server band karke dubara `npm run dev` chalao.

---

## 📍 Step 3: Admin Panel `.env`

**Folder:** `d:\.PROJECT-MONSTER-MEN-90\admin-panel`  
**File:** `.env` ya `.env.local` (Vite dono padhta hai; agar dono hain to `.env.local` priority pe)

### 3.1 Admin panel mein ye keys chahiye

| Key | Kya hai | Kya likhna |
|-----|---------|------------|
| **VITE_API_URL** | Backend API base URL | Local: `http://localhost:5000` |
| **VITE_SUPABASE_URL** | Supabase project URL | Same as backend: Supabase → Project Settings → API → Project URL |
| **VITE_SUPABASE_ANON_KEY** | Supabase anon key | Same as backend: Supabase → Project Settings → API → anon public |

### 3.2 Admin panel – Click by click

1. **File kholo:**  
   `d:\.PROJECT-MONSTER-MEN-90\admin-panel\.env`  
   Agar nahi hai to `admin-panel\.env.local` check karo (wahi use ho raha hoga).

2. **Ye 3 lines honi chahiye:**
   ```env
   VITE_API_URL=http://localhost:5000
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpUVCJ9...
   ```

3. **VITE_SUPABASE_URL aur VITE_SUPABASE_ANON_KEY:**  
   Backend `.env` mein jo `SUPABASE_URL` aur `SUPABASE_ANON_KEY` hai, wahi value yahan copy karo (Supabase Dashboard se bhi le sakte ho).

4. **Save karo.**  
   Admin panel restart karo (npm run dev).

---

## 📍 Step 4: Supabase Auth – Google Login (Redirect URL)

Yeh backend/frontend env se related hai, isliye yahan step-by-step.

### 4.1 Google provider ON karna

1. Browser mein **Supabase Dashboard** kholo: https://app.supabase.com  
2. Apna **project** select karo (jo `SUPABASE_URL` wala hai).  
3. Left sidebar se **Authentication** → **Providers** pe jao.  
4. **Google** dhundho → **Enable** karo (toggle ON).  
5. **Client ID** aur **Client Secret** daalna hoga (Google Cloud Console se – neeche).

### 4.2 Redirect URL set karna (zaroori)

1. Same **Authentication** section mein **URL Configuration** ya **Redirect URLs** dhundho.  
2. **Redirect URLs** list mein ye add karo (exact format):
   ```text
   http://localhost:5000/api/auth/google/callback
   ```
   Yahan `http://localhost:5000` wahi hona chahiye jo tumne **BACKEND_URL** mein backend `.env` mein dala hai.  
3. Save karo.

### 4.3 Google Client ID / Secret kahan se (agar abhi nahi bana)

1. https://console.cloud.google.com jao.  
2. Naya project banao ya existing select karo.  
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**.  
4. Application type: **Web application**.  
5. **Authorized redirect URIs** mein add karo:
   ```text
   https://YOUR_SUPABASE_REF.supabase.co/auth/v1/callback
   ```
   `YOUR_SUPABASE_REF` = tumhare Supabase URL ka middle part (e.g. `xlqelfflhnofvprvamnq`).  
6. Client ID aur Client Secret copy karke Supabase → Authentication → Providers → Google mein paste karo.

---

## ✅ Quick checklist (sab sahi hai ya nahi)

### Backend `.env`
- [ ] `BACKEND_URL=http://localhost:5000` (ya jis port pe backend chal raha hai)
- [ ] `FRONTEND_URL=http://localhost:5173`
- [ ] `JWT_SECRET` set (koi bhi strong string)
- [ ] `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] (Optional) `ADMIN_NAME`, `ADMIN_PHONE`

### Frontend `.env`
- [ ] `VITE_API_BASE_URL=http://localhost:5000`
- [ ] (Optional) `VITE_ADMIN_NAME`, `VITE_ADMIN_PHONE`, `VITE_ADMIN_EMAIL`

### Admin Panel `.env` / `.env.local`
- [ ] `VITE_API_URL=http://localhost:5000`
- [ ] `VITE_SUPABASE_URL` = backend wala Supabase URL
- [ ] `VITE_SUPABASE_ANON_KEY` = backend wala anon key

### Supabase
- [ ] Google provider ON
- [ ] Redirect URL: `http://localhost:5000/api/auth/google/callback` (ya tumhara BACKEND_URL + `/api/auth/google/callback`)

---

## 🆘 Agar koi key missing hai

| Key | Kahan se milegi |
|-----|------------------|
| **SUPABASE_URL** | Supabase Dashboard → Project Settings → API → Project URL |
| **SUPABASE_ANON_KEY** | Same page → Project API keys → `anon` public |
| **SUPABASE_SERVICE_ROLE_KEY** | Same page → `service_role` (secret – sirf backend, kabhi frontend mein mat dalna) |
| **JWT_SECRET** | Khud banao: koi bhi long random string (e.g. `openssl rand -hex 32` se) |
| **BACKEND_URL** | Local: `http://localhost:5000` (ya jis port pe backend run karte ho) |
| **FRONTEND_URL** | Local: `http://localhost:5173` (Vite default) |
| **ADMIN_PHONE** | Apna number: country code + 10 digit, e.g. `919876543210` |

---

## 🔄 Env change ke baad

- **Backend:** Server restart karo (`Ctrl+C` → phir `npm run dev`).  
- **Frontend / Admin panel:** Dev server restart karo taaki nayi `VITE_*` values load ho jaye.

Is guide ke hisaab se sab env set karne ke baad auth, Google login, OTP, aur admin panel theek se kaam karenge. Agar koi exact error aaye to error message bata dena.
