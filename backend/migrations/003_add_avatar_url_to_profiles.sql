-- =========================================================
-- MIGRATION: Add avatar_url column to profiles table
-- Date: 2026-01-24
-- Description: Adds avatar_url column to profiles table for profile picture support
-- =========================================================

BEGIN;

-- Add avatar_url column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN avatar_url text;
    
    -- Add comment for documentation
    COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user profile picture/avatar image';
  END IF;
END $$;

COMMIT;
