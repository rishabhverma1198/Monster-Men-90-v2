-- =========================================================
-- MIGRATION: Profile OTP for change email / change phone
-- Date: 2026-01-24
-- Description: user_otps - add user_id, email, verified_at;
--              extend purpose to include 'change_email', 'change_phone'
-- =========================================================

BEGIN;

-- Add user_id (links OTP to user for change_phone/change_email)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_otps' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.user_otps ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add email (for change_email OTP; phone_number used for change_phone)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_otps' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.user_otps ADD COLUMN email text;
  END IF;
END $$;

-- Add verified_at (set when OTP is verified; used to allow update-phone/update-email within time window)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_otps' AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE public.user_otps ADD COLUMN verified_at timestamptz;
  END IF;
END $$;

-- Extend purpose check to include change_email, change_phone
ALTER TABLE public.user_otps DROP CONSTRAINT IF EXISTS user_otps_purpose_check;
ALTER TABLE public.user_otps ADD CONSTRAINT user_otps_purpose_check
  CHECK (purpose IN ('login', 'reset_password', 'change_email', 'change_phone'));

CREATE INDEX IF NOT EXISTS idx_user_otps_user_id ON public.user_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_user_otps_email ON public.user_otps(email) WHERE email IS NOT NULL;

COMMIT;
