-- =========================================================
-- MIGRATION: Customer Auth (OTP + Profiles)
-- Date: 2026-01-24
-- Description: Adds phone_number, full_name, is_active to profiles;
--              Creates user_otps for customer WhatsApp OTP login/signup
-- =========================================================

BEGIN;

-- =========================================================
-- 1. PROFILES – add columns if missing
-- =========================================================
DO $$
BEGIN
  -- phone_number (customer login / forgot password)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN phone_number text UNIQUE;
  END IF;

  -- full_name (many code paths use it)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN full_name text;
  END IF;

  -- is_active (code uses it; some schemas have status instead)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_active boolean DEFAULT true;
  END IF;

  -- auth_method: email | google | phone
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'auth_method'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN auth_method text DEFAULT 'email'
      CHECK (auth_method IN ('email', 'google', 'phone'));
  END IF;

  -- avatar_url (Google profile picture)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url text;
  END IF;
END $$;

-- =========================================================
-- 2. USER_OTPS – customer OTP for login/signup & forgot password
-- =========================================================
CREATE TABLE IF NOT EXISTS public.user_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  is_used boolean DEFAULT false,
  attempts int DEFAULT 0,
  max_attempts int DEFAULT 5,
  purpose text DEFAULT 'login' CHECK (purpose IN ('login', 'reset_password')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_otps_phone ON public.user_otps(phone_number);
CREATE INDEX IF NOT EXISTS idx_user_otps_expires ON public.user_otps(expires_at);

ALTER TABLE public.user_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_otps_service ON public.user_otps;
CREATE POLICY user_otps_service ON public.user_otps
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMIT;
