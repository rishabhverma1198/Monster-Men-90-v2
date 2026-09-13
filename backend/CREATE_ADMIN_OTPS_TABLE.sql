-- Create admin_otps table for OTP functionality
-- Run this in Supabase SQL Editor

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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_otps_phone_number ON public.admin_otps(phone_number);
CREATE INDEX IF NOT EXISTS idx_admin_otps_user_id ON public.admin_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_otps_expires_at ON public.admin_otps(expires_at);

-- Enable RLS
ALTER TABLE public.admin_otps ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to manage all OTPs
DROP POLICY IF EXISTS admin_otps_service_role ON public.admin_otps;
CREATE POLICY admin_otps_service_role
ON public.admin_otps
FOR ALL
USING (true); -- Service role bypasses RLS

COMMENT ON TABLE public.admin_otps IS 'Stores OTP codes for admin login';
