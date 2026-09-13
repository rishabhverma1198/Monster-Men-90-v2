-- =========================================================
-- MIGRATION: Add Admin Profile Fields
-- Date: 2026-01-24
-- Description: Adds contact_number, whatsapp_number, full_name, otp_enabled to profiles table
-- =========================================================

BEGIN;

-- Add missing columns to profiles table
DO $$ 
BEGIN
  -- Add full_name if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'full_name'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN full_name text;
  END IF;

  -- Add contact_number if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'contact_number'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN contact_number text;
  END IF;

  -- Add whatsapp_number if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'whatsapp_number'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN whatsapp_number text;
  END IF;

  -- Add otp_enabled if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'otp_enabled'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN otp_enabled boolean DEFAULT false;
  END IF;
END $$;

-- =========================================================
-- OTP STORAGE TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS public.admin_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  otp_code text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  is_used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_otps_phone ON public.admin_otps(phone_number);
CREATE INDEX IF NOT EXISTS idx_admin_otps_user ON public.admin_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_otps_expires ON public.admin_otps(expires_at);

-- RLS Policies
ALTER TABLE public.admin_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_otps_admin ON public.admin_otps;
CREATE POLICY admin_otps_admin
ON public.admin_otps
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR user_id = auth.uid()
);

COMMIT;
