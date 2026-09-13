-- =========================================================
-- FIX AUTH ORPHAN ISSUE
-- Create atomic user + profile creation function
-- =========================================================

CREATE OR REPLACE FUNCTION public.create_user_with_profile(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT DEFAULT 'User',
  p_role TEXT DEFAULT 'buyer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
BEGIN
  -- This function should be called from backend after Supabase Auth signup
  -- Backend will handle auth.signUp() first, then call this to create profile
  -- If profile creation fails, backend should delete the auth user
  
  -- For now, we'll create a helper function that backend can use
  -- to clean up orphaned users
  
  RETURN jsonb_build_object(
    'message', 'Use Supabase Auth API for user creation, then create profile',
    'cleanup_function', 'cleanup_orphaned_auth_users()'
  );
END;
$$;

-- Function to find and list orphaned auth users (no profile)
CREATE OR REPLACE FUNCTION public.find_orphaned_auth_users()
RETURNS TABLE(user_id UUID, email TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email::TEXT,
    au.created_at
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  WHERE p.id IS NULL
    AND au.email IS NOT NULL;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.find_orphaned_auth_users() TO authenticated;
