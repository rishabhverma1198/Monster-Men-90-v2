# Google OAuth – Client ID & Client Secret kahan se lene hain (Step by Step)

Ye keys **Google Cloud Console** se milti hain. Supabase wale page pe sirf paste karte hain.

---

## Step 1: Google Cloud Console kholna

1. Browser mein jao: **https://console.cloud.google.com**
2. Apne Google account se **sign in** karo (wohi account jisse Supabase use karte ho, zaroori nahi).

---

## Step 2: Project select karna ya naya banana

1. Page ke **top left** pe **project dropdown** dikhega (naam likha hoga, e.g. "My Project").
2. Uspe **click** karo.
3. **"New Project"** pe click karo **ya** koi existing project select karo.
4. Agar naya project banaya:
   - **Project name** daalo (e.g. "Monster Men 90").
   - **Create** pe click karo.
5. Jab project ban jaye, **us project ko select** karke dropdown band karo (top left pe project name dikhna chahiye).

---

## Step 3: OAuth consent screen setup (pehli baar)

**Important:** Jo **App name** yahan daaloge, wahi "Sign in with Google" consent screen pe dikhega. Agar yahan sahi naam nahi hoga to user ko `xlqelfflhnofvprvamnq.supabase.co` jaisa Supabase URL dikh sakta hai.

1. **Left sidebar** (☰ menu) se jao: **APIs & Services** → **OAuth consent screen**.
2. **User Type:**  
   - **External** select karo (public users ke liye) → **Create**.
3. **App information** fill karo:
   - **App name:** **Monster Men 90 The Premium Clothing Store** (yehi naam consent screen pe dikhega — bilkul yahi daalo)
   - **User support email:** apna email
   - **Developer contact:** apna email
4. **Save and Continue**.
5. **Scopes** wale step pe **Save and Continue** (default scope kaafi hai).
6. **Test users** (agar External + Testing mode hai) – abhi skip kar sakte ho → **Save and Continue**.
7. **Back to dashboard** pe click karo.

Agar pehle se OAuth consent screen bana chuke ho aur ab sirf naam change karna hai:
- **APIs & Services** → **OAuth consent screen** → **EDIT APP** (ya App information) → **App name** ko **"Monster Men 90 The Premium Clothing Store"** kar do → **Save**.

---

## Step 4: Credentials banana (Client ID & Client Secret)

1. **Left sidebar** se jao: **APIs & Services** → **Credentials**.
2. **+ Create Credentials** (upar) pe click karo.
3. List se **"OAuth client ID"** select karo.
4. **Application type:** **"Web application"** select karo.
5. **Name:** kuch bhi daal sakte ho (e.g. "Monster Men 90 Web").
6. **Authorized redirect URIs** – yahan **Supabase wala callback URL** add karna zaroori hai:
   - **+ ADD URI** pe click karo.
   - Ye URL daalo (apne Supabase project ke hisaab se):
     ```
     https://xlqelfflhnofvprvamnq.supabase.co/auth/v1/callback
     ```
     Agar tumhara Supabase URL alag hai to **Supabase Dashboard → Authentication → Sign In / Providers → Google** wale page pe jo **"Callback URL (for OAuth)"** dikh raha hai, wahi copy karke yahan paste karo.
   - Sirf yehi URL add karo (extra spaces ya typo mat daalna).
7. **Create** pe click karo.

---

## Step 5: Client ID aur Client Secret copy karna

1. Ek popup / screen aayega jahan **Client ID** aur **Client secret** dikhenge.
2. **Client ID:**  
   - `xxxxx.apps.googleusercontent.com` jaisa long string.  
   - Isko **copy** karo (copy icon ya select → Ctrl+C).
3. **Client secret:**  
   - Koi short secret string.  
   - Isko bhi **copy** karo.
4. **OK** pe click karo (baad mein bhi Credentials list se dubara dekh sakte ho).

---

## Step 6: Supabase mein daalna

1. **Supabase Dashboard** kholo → **Authentication** → **Sign In / Providers** → **Google**.
2. **Client IDs** wale box mein:  
   - Sirf **Client ID** paste karo (jo `xxxxx.apps.googleusercontent.com` wala hai).  
   - Comma-separated list mat banao agar ek hi client use kar rahe ho.
3. **Client Secret (for OAuth)** wale box mein:  
   - **Client secret** paste karo.
4. **Save** pe click karo.

---

## Step 7: Supabase Redirect URLs (IMPORTANT - New users ke liye)

Agar "please wait" dikhe ya "Authentication failed" aaye, **Supabase Redirect URLs** check karo:

1. **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. **Redirect URLs** list mein ye URL add karo (agar nahi hai):
   ```
   http://localhost:5000/api/auth/google/callback
   ```
3. Production ke liye (baad mein):
   ```
   https://yourdomain.com/api/auth/google/callback
   ```
4. **Save** karo

**Kyon zaroori hai:** Google sign-in ke baad Supabase user ko backend callback pe redirect karta hai. Agar ye URL whitelist mein nahi hoga, redirect fail ho jayega aur new user signup nahi chalega.

---

## Checklist

- [ ] Google Cloud Console → sahi project select
- [ ] OAuth consent screen (External) setup
- [ ] Credentials → Create → OAuth client ID → **Web application**
- [ ] **Authorized redirect URIs** mein **Supabase callback URL** add (e.g. `https://xlqelfflhnofvprvamnq.supabase.co/auth/v1/callback`)
- [ ] Client ID copy → Supabase **Client IDs** mein paste
- [ ] Client secret copy → Supabase **Client Secret (for OAuth)** mein paste
- [ ] Supabase pe **Save**
- [ ] **Authentication → URL Configuration** → Redirect URLs mein `http://localhost:5000/api/auth/google/callback` add

---

## Important

- **Authorized redirect URIs** mein **sirf wahi URL** hona chahiye jo Supabase Google page pe **"Callback URL (for OAuth)"** mein dikh raha hai. Agar alag daala to Google login fail ho jayega.
- **Client secret** kabhi public repo ya frontend code mein mat dalna; sirf Supabase (server-side) pe use karo.

Is hisaab se keys le kar Supabase wale Google page pe daal do, phir **Save** karo. Uske baad Google sign-in test kar sakte ho.
