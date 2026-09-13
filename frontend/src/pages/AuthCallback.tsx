/**
 * Auth Callback Page
 * Handles OAuth callbacks (Google, etc.)
 */

import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuthFromCallback } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    const userStr = searchParams.get('user');
    const error = searchParams.get('error');

    if (error) {
      // Redirect to login with error
      navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true });
      return;
    }

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        const returnUrl = searchParams.get('returnUrl') || sessionStorage.getItem('auth_return_url') || '/';
        if (sessionStorage.getItem('auth_return_url')) sessionStorage.removeItem('auth_return_url');
        setAuthFromCallback(user, token);
        navigate(returnUrl, { replace: true });
      } catch (err) {
        console.error('Failed to parse user data:', err);
        navigate('/login?error=Sign-in could not be completed. Please try again.', { replace: true });
      }
    } else {
      navigate('/login?error=Authentication incomplete. Please try signing in again.', { replace: true });
    }
  }, [searchParams, navigate, setAuthFromCallback]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Completing sign-in...</p>
      </div>
    </div>
  );
}
