/**
 * Login / Signup Page (Unified)
 * Single input: Enter Email or Phone → then Login (password) / Signup (form) or OTP (phone)
 * Google sign-in for new & existing users. Continue as Guest.
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { apiService } from '../services/api';
import { apiBaseUrl } from '../config/env';
import { getSafeReturnUrl } from '../utils/url';

const loginFirstSchema = z.object({
  identifier: z.string().min(1, 'Enter email or phone number'),
  password: z.string().optional(),
}).refine(
  (data) => {
    const v = (data.identifier || '').trim();
    const isEmail = v.includes('@') && v.length > 5 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    if (isEmail) return !!data.password?.trim();
    return true;
  },
  { message: 'Password is required for email login', path: ['password'] }
);

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'Enter 6-digit OTP'),
});

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const signupSchema = z
  .object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(strongPasswordRegex, 'Use uppercase, lowercase, number & special (@$!%*?&)'),
    confirmPassword: z.string().min(1, 'Confirm password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type LoginFirstForm = z.infer<typeof loginFirstSchema>;
type OtpForm = z.infer<typeof otpSchema>;
type SignupForm = z.infer<typeof signupSchema>;

function isEmailLike(value: string): boolean {
  const v = value.trim();
  return v.includes('@') && v.length > 5 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '').slice(-10);
}

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'identifier' | 'signup' | 'otp'>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);
  const errorRegionRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = getSafeReturnUrl(searchParams.get('returnUrl')) || '/';
  const { login, signup, loginWithOtp, continueAsGuest, isLoading } = useAuthStore();

  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) {
      setError(decodeURIComponent(urlError));
      setStep('identifier');
    }
  }, [searchParams]);

  useEffect(() => {
    if (error && errorRegionRef.current) {
      errorRegionRef.current.focus({ preventScroll: true });
    }
  }, [error]);

  const loginFirstForm = useForm<LoginFirstForm>({ resolver: zodResolver(loginFirstSchema) });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema) });
  const signupForm = useForm<SignupForm>({ resolver: zodResolver(signupSchema) });

  const onSubmitLoginFirst = async (data: LoginFirstForm) => {
    setError(null);
    const value = data.identifier.trim();
    const pwd = (data.password || '').trim();

    if (isEmailLike(value)) {
      if (!pwd) {
        setError('Enter password for email login.');
        return;
      }
      setChecking(true);
      setError(null);
      try {
        await login(value, pwd);
        navigate(returnUrl, { replace: true });
        return;
      } catch (e: any) {
        const msg = e?.message || 'Login failed.';
        const isTimeout = e?.code === 'ECONNABORTED' || msg.toLowerCase().includes('timeout');
        const isNetwork = !e?.response && msg.toLowerCase().includes('network');
        if (isTimeout) {
          setError('Request timed out. Please try again.');
          return;
        }
        if (isNetwork) {
          setError('Network error. Please check your connection and try again.');
          return;
        }
        const isAuthFailure = msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('password') || msg.toLowerCase().includes('credentials') || e?.code === 'AUTH_ERROR' || e?.response?.status === 401;
        if (isAuthFailure) {
          try {
            const checkRes = await apiService.checkAuthIdentifier(value);
            if (checkRes.success && checkRes.data) {
              if (checkRes.data.exists) {
                const authMethod = (checkRes.data as any).auth_method;
                if (authMethod === 'google') {
                  setError('This account uses Google. Please use the Sign up / Sign in with Google button below.');
                } else {
                  setError('You entered wrong password.');
                }
              } else {
                setError('There is no account found with this email. Sign up below to create an account.');
                setIdentifier(value);
                setStep('signup');
                signupForm.setValue('password', pwd);
                signupForm.setValue('confirmPassword', pwd);
              }
            } else {
              setError('Could not verify account. Please try again.');
            }
          } catch {
            setError('Could not verify account. Please check your email and password and try again.');
          }
        } else {
          setError(msg || 'Something went wrong. Please try again.');
        }
      } finally {
        setChecking(false);
      }
      return;
    }

    const phone = normalizePhone(value);
    if (phone.length < 10) {
      setError('Enter a valid 10-digit phone number or email.');
      return;
    }
    setError(null);
    try {
      const res = await apiService.otpSend(phone);
      if (res.success && res.data) {
        setIdentifier(phone);
        setWhatsappUrl(res.data.whatsapp_url || null);
        setStep('otp');
      }
    } catch (err: any) {
      const m = err?.message || '';
      if (m.toLowerCase().includes('rate') || err?.code === 'RATE_LIMIT') setError('Too many attempts. Please wait a few minutes and try again.');
      else if (m.toLowerCase().includes('network') || !err?.response) setError('Network error. Please check your connection and try again.');
      else setError(m || 'Could not send OTP. Please check the number and try again.');
    }
  };

  const onSubmitOtp = async (data: OtpForm) => {
    setError(null);
    try {
      await loginWithOtp(identifier, data.otp);
      navigate(returnUrl, { replace: true });
    } catch (err: any) {
      const m = err?.message || '';
      if (m.toLowerCase().includes('invalid') || m.toLowerCase().includes('expired')) setError('Invalid or expired OTP. Please request a new code and try again.');
      else if (m.toLowerCase().includes('network') || !err?.response) setError('Network error. Please try again.');
      else setError(m || 'Invalid OTP. Please try again.');
    }
  };

  const onSubmitSignup = async (data: SignupForm) => {
    setError(null);
    try {
      await signup(identifier, data.password, data.fullName);
      navigate(returnUrl, { replace: true });
    } catch (err: any) {
      const m = err?.message || '';
      if (m.toLowerCase().includes('already') || m.toLowerCase().includes('exists') || m.toLowerCase().includes('taken')) setError('This email is already registered. Please sign in or use Forgot password.');
      else if (m.toLowerCase().includes('network') || !err?.response) setError('Network error. Please check your connection and try again.');
      else setError(m || 'Signup failed. Please check your details and try again.');
    }
  };

  const handleContinueAsGuest = () => {
    continueAsGuest();
    navigate(returnUrl, { replace: true });
  };

  const handleGoogleSignIn = () => {
    setError(null);
    if (returnUrl && returnUrl !== '/') {
      sessionStorage.setItem('auth_return_url', returnUrl);
    }
    const callbackUrl = `${window.location.origin}/auth/callback`;
    const url = `${apiBaseUrl}/api/auth/google?redirect_url=${encodeURIComponent(callbackUrl)}`;
    window.location.href = url;
  };

  const backToIdentifier = () => {
    setStep('identifier');
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left - Hero */}
      <div className="relative w-full lg:w-[45%] h-40 lg:h-screen overflow-hidden bg-gray-900">
        <img
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=1200&fit=crop&q=80"
          alt="Fashion"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
        <div className="absolute top-6 left-6 z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-sm font-bold text-gray-900">M</span>
            </div>
            <span className="text-white font-bold">MONSTER MEN 90</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white">
            ALL EYES <span className="text-primary">ON YOU</span>
          </h1>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center py-8 lg:py-12 px-4 lg:px-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <button
            onClick={() => navigate(-1)}
            className="lg:hidden mb-4 text-gray-600 hover:text-gray-900 flex items-center gap-1"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <p className="text-base lg:text-lg font-semibold text-primary mb-1">Welcome to Monster Men 90 Family</p>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">Sign in to your account</h1>

          {error && (
            <div
              ref={errorRegionRef}
              role="alert"
              aria-live="polite"
              tabIndex={-1}
              className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              <p className="text-sm font-medium text-red-800">{error}</p>
              {error.includes('Google') && (
                <p className="text-xs text-red-600 mt-1">
                  Ensure Google sign-in is enabled in Supabase and redirect URL is configured.
                </p>
              )}
            </div>
          )}

          {step === 'identifier' && (
            <form onSubmit={loginFirstForm.handleSubmit(onSubmitLoginFirst)} className="space-y-5" noValidate>
              <div>
                <label htmlFor="login-identifier" className="sr-only">
                  Email or phone number
                </label>
                <input
                  id="login-identifier"
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Enter Email or Phone"
                  aria-describedby={loginFirstForm.formState.errors.identifier ? 'identifier-error' : undefined}
                  {...loginFirstForm.register('identifier')}
                  className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder-gray-500 transition-shadow"
                />
                {loginFirstForm.formState.errors.identifier && (
                  <p id="identifier-error" className="mt-1 text-xs text-red-600" role="alert">
                    {loginFirstForm.formState.errors.identifier.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="login-password" className="sr-only">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Password (leave blank for OTP)"
                    aria-describedby={loginFirstForm.formState.errors.password ? 'password-error' : 'password-hint'}
                    {...loginFirstForm.register('password')}
                    className="w-full h-12 pl-4 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 placeholder-gray-500 transition-shadow"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {loginFirstForm.formState.errors.password && (
                  <p id="password-error" className="mt-1 text-xs text-red-600" role="alert">
                    {loginFirstForm.formState.errors.password.message}
                  </p>
                )}
                <p id="password-hint" className="mt-1 text-xs text-gray-500">
                  Use phone? Leave blank — we&apos;ll send OTP.
                </p>
              </div>
              <div className="flex items-center justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
                >
                  Forgot password?
                </Link>
              </div>
              <button
                type="submit"
                disabled={checking || isLoading}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-gray-900 font-semibold rounded-lg disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
              >
                {checking || isLoading ? 'Please wait...' : 'Continue'}
              </button>
            </form>
          )}

          {step === 'signup' && (
            <form onSubmit={signupForm.handleSubmit(onSubmitSignup)} className="space-y-5" noValidate>
              <p className="text-sm text-gray-600">Create account for <strong>{identifier}</strong></p>
              <div>
                <label htmlFor="signup-fullName" className="sr-only">Full name</label>
                <input
                  id="signup-fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Full Name"
                  {...signupForm.register('fullName')}
                  className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 placeholder-gray-500"
                />
                {signupForm.formState.errors.fullName && (
                  <p className="mt-1 text-xs text-red-600" role="alert">{signupForm.formState.errors.fullName.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="signup-password" className="sr-only">Password</label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showSignupPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Password (8+ chars, A-Z, a-z, 0-9, @$!%*?&)"
                    {...signupForm.register('password')}
                    className="w-full h-12 pl-4 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 placeholder-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSignupPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {signupForm.formState.errors.password && (
                  <p className="mt-1 text-xs text-red-600" role="alert">{signupForm.formState.errors.password.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="signup-confirmPassword" className="sr-only">Confirm password</label>
                <div className="relative">
                  <input
                    id="signup-confirmPassword"
                    type={showSignupConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Confirm Password"
                    {...signupForm.register('confirmPassword')}
                    className="w-full h-12 pl-4 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 placeholder-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupConfirm((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label={showSignupConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showSignupConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {signupForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600" role="alert">{signupForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              <p className="text-xs text-gray-500">Never share your password with anyone.</p>
              <div className="flex gap-3">
                <button type="button" onClick={backToIdentifier} className="flex-1 h-12 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary">
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-12 bg-primary text-gray-900 font-semibold rounded-lg disabled:opacity-50 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  {isLoading ? 'Creating account...' : 'Sign up'}
                </button>
              </div>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={otpForm.handleSubmit(onSubmitOtp)} className="space-y-5" noValidate>
              <p className="text-sm text-gray-600">
                OTP sent to +91 {identifier.slice(-4).padStart(10, '•')}. Open WhatsApp to get the code.
              </p>
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Open WhatsApp to get OTP
                </a>
              )}
              <div>
                <label htmlFor="otp-code" className="sr-only">6-digit OTP</label>
                <input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="Enter 6-digit OTP"
                  {...otpForm.register('otp')}
                  className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 text-center text-lg tracking-widest"
                />
                {otpForm.formState.errors.otp && (
                  <p className="mt-1 text-xs text-red-600" role="alert">{otpForm.formState.errors.otp.message}</p>
                )}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={backToIdentifier} className="flex-1 h-12 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary">
                  Change Number
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 h-12 bg-primary text-gray-900 font-semibold rounded-lg disabled:opacity-50 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Sign in'}
                </button>
              </div>
            </form>
          )}

          {(step === 'identifier' || step === 'signup' || step === 'otp') && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-gray-500">OR</span>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-3">
                Use your Gmail (Google account). First time = sign up with Google. Next time = sign in with the same button.
              </p>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full h-12 bg-white border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 mb-4"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign up / Sign in with Google
              </button>

              <p className="text-xs text-gray-500 mb-4">
                After signup you can set a password in Profile to also sign in with email + password later.
              </p>

              <button
                type="button"
                onClick={handleContinueAsGuest}
                className="w-full h-12 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
              >
                Continue as Guest (Browse without login)
              </button>
            </>
          )}

          <p className="mt-6 text-xs text-gray-500 text-center leading-relaxed">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="text-primary underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-primary rounded">T&C</Link> and{' '}
            <Link to="/privacy" className="text-primary underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-primary rounded">Privacy Policy</Link>.
          </p>
          <p className="mt-3 text-center">
            <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded">
              Forgot password?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
