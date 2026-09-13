# Google Provider add ho gaya – Ab kya karna hai

**Code fix (done):** Backend callback ab sahi redirect karta hai — agar frontend full callback URL bhejta hai (`.../auth/callback`) to dobara `/auth/callback` add nahi hota; error redirects bhi sahi frontend origin pe `/login` pe jaate hain.

---

## Step 1: Supabase – Redirect URL add karna (zaroori)

Google login ke baad Supabase tumhare **backend** pe redirect karega. Iske liye backend URL Supabase mein allowed hona chahiye.

1. **Supabase Dashboard** → **Authentication** → **URL Configuration** (left sidebar, CONFIGURATION ke andar).
2. **Redirect URLs** (ya **Additional Redirect URLs**) section dhundho.
3. **Add URL** / **+ Add** pe click karo.
4. Ye URL daalo:
   ```
   http://localhost:5000/api/auth/google/callback
   ```
   (Agar backend alag port pe chal raha hai to wahi port use karo.)
5. **Save** karo.

---

## Step 2: Env check karna

### Backend `.env`
- `BACKEND_URL=http://localhost:5000`
- `FRONTEND_URL=http://localhost:5173`

### Frontend `.env`
- `VITE_API_BASE_URL=http://localhost:5000`

Agar koi missing ho to add karo, phir **backend aur frontend dono restart** karo.

---

## Step 3: Backend aur Frontend chalana

1. **Backend:**  
   `backend` folder mein:
   ```bash
   npm run dev
   ```
   (Port 5000 pe chalna chahiye.)

2. **Frontend:**  
   Naya terminal → `frontend` folder:
   ```bash
   npm run dev
   ```
   (Port 5173 pe chalna chahiye.)

---

## Step 4: Google Sign-In test karna

1. Browser mein jao: **http://localhost:5173**
2. **Login** pe jao (navbar se ya direct `/login`).
3. **Google** button pe click karo.
4. Google account se sign in karo (agar Test users mein ho).
5. Sign-in ke baad tumhe **home** (ya jahan returnUrl ho) pe redirect hona chahiye, aur **logged in** dikhna chahiye.

**Naya user:** Google se pehli baar sign in karte waqt bhi kaam karega — backend automatically profile create karta hai (new user signup with Google). Koi pehle signup ki zaroorat nahi.

---

## Agar error aaye

| Error | Kya karna hai |
|-------|----------------|
| Redirect URL mismatch | Supabase → URL Configuration mein `http://localhost:5000/api/auth/google/callback` add kiya hai confirm karo. |
| Access blocked / Test users | Google Cloud → OAuth consent screen → **Test users** mein apna Gmail add karo, ya app **Publish** karo. |
| 404 on callback | Backend chal raha hai confirm karo; `BACKEND_URL` same port pe ho. |
| CORS / Network error | Backend `.env` mein `ALLOW_ORIGINS` mein `http://localhost:5173` ho. |

---

## Checklist

- [ ] Supabase → URL Configuration → Redirect URL `http://localhost:5000/api/auth/google/callback` add + Save
- [ ] Backend `.env` → BACKEND_URL, FRONTEND_URL set
- [ ] Frontend `.env` → VITE_API_BASE_URL set
- [ ] Backend run (npm run dev)
- [ ] Frontend run (npm run dev)
- [ ] Browser → Login → Google → test

Iske baad Google sign-in flow complete ho jana chahiye.
