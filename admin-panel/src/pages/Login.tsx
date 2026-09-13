import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../store/authStore';
import { Loader2, Smartphone, Mail } from 'lucide-react';
import apiClient from '../lib/api';

/**
 * Login Form Schema - Password
 */
const passwordLoginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

/**
 * OTP Login Schema
 */
const otpLoginSchema = z.object({
  phone_number: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .regex(/^[6-9]\d{9}$/, 'Invalid phone number format (must start with 6-9 and be 10 digits)'),
  otp_code: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits')
    .optional(),
});

type PasswordLoginFormData = z.infer<typeof passwordLoginSchema>;
type OTPLoginFormData = z.infer<typeof otpLoginSchema>;

/**
 * Login Page Component with Dual Login Options
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithOTP, isAuthenticated, isLoading, error, clearError } = useAuthStore();

  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);

  const passwordForm = useForm<PasswordLoginFormData>({
    resolver: zodResolver(passwordLoginSchema),
  });

  const otpForm = useForm<OTPLoginFormData>({
    resolver: zodResolver(otpLoginSchema),
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const onPasswordSubmit = async (data: PasswordLoginFormData) => {
    clearError();
    try {
      await login(data.email, data.password);
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      // Error is handled by store
    }
  };

  const generateOTP = async (data: { phone_number: string }) => {
    setOtpLoading(true);
    clearError();
    setWhatsappLink(null);
    try {
      const response = await apiClient.post('/otp/generate', { phone_number: data.phone_number });
      const responseData = response.data?.data || {};
      setOtpSent(true);
      setCountdown(300); // 5 minutes
      // Store WhatsApp link if available (FREE TIER)
      if (responseData.whatsapp_link) {
        setWhatsappLink(responseData.whatsapp_link);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to generate OTP. Please try again.';
      clearError();
      // Set error manually since we're not using store for OTP generation
      passwordForm.setError('root', { message: errorMessage });
    } finally {
      setOtpLoading(false);
    }
  };

  const onOTPSubmit = async (data: OTPLoginFormData) => {
    if (!otpSent) {
      await generateOTP(data);
      return;
    }

    if (!data.otp_code) {
      otpForm.setError('otp_code', { message: 'OTP is required' });
      return;
    }

    clearError();
    try {
      await loginWithOTP(data.phone_number, data.otp_code);
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      // Error is handled by store
    }
  };

  const handleResendOTP = async () => {
    const phoneNumber = otpForm.getValues('phone_number');
    if (phoneNumber) {
      await generateOTP({ phone_number: phoneNumber });
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-3xl font-black text-white">M</span>
          </div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            MonsterMen90
          </h1>
          <p className="text-gray-300 text-sm">Admin Login</p>
        </div>

        {/* Login Mode Toggle */}
        <div className="flex gap-2 mb-6 bg-white/5 rounded-xl p-1">
          <button
            type="button"
            onClick={() => {
              setLoginMode('password');
              setOtpSent(false);
              setWhatsappLink(null);
              clearError();
              passwordForm.reset();
              otpForm.reset();
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
              loginMode === 'password'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Mail className="h-4 w-4 inline mr-2" />
            Password
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('otp');
              setOtpSent(false);
              setWhatsappLink(null);
              clearError();
              passwordForm.reset();
              otpForm.reset();
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
              loginMode === 'otp'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Smartphone className="h-4 w-4 inline mr-2" />
            OTP
          </button>
        </div>

        {/* Error Message */}
        {(error || passwordForm.formState.errors.root) && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6 text-sm">
            ⚠️ {error || passwordForm.formState.errors.root?.message}
          </div>
        )}

        {/* Password Login Form */}
        {loginMode === 'password' && (
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                {...passwordForm.register('email')}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="admin@example.com"
                autoComplete="email"
              />
              {passwordForm.formState.errors.email && (
                <p className="mt-1 text-sm text-red-400">{passwordForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                {...passwordForm.register('password')}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {passwordForm.formState.errors.password && (
                <p className="mt-1 text-sm text-red-400">{passwordForm.formState.errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        )}

        {/* OTP Login Form */}
        {loginMode === 'otp' && (
          <form onSubmit={otpForm.handleSubmit(onOTPSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Mobile Number
              </label>
              <input
                type="tel"
                {...otpForm.register('phone_number')}
                disabled={otpSent}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
                placeholder="9876543210"
                maxLength={10}
              />
              {otpForm.formState.errors.phone_number && (
                <p className="mt-1 text-sm text-red-400">{otpForm.formState.errors.phone_number.message}</p>
              )}
            </div>

            {otpSent && (
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  OTP Code
                </label>
                <input
                  type="text"
                  {...otpForm.register('otp_code')}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                />
                {otpForm.formState.errors.otp_code && (
                  <p className="mt-1 text-sm text-red-400">{otpForm.formState.errors.otp_code.message}</p>
                )}
                
                {/* WhatsApp OTP Link (FREE TIER) */}
                {whatsappLink && (
                  <div className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                    <p className="text-xs text-green-200 mb-2 text-center">
                      📱 Click below to receive OTP on WhatsApp:
                    </p>
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors text-center text-sm"
                    >
                      Open WhatsApp to Get OTP
                    </a>
                  </div>
                )}
                
                <div className="mt-2 text-center">
                  {countdown > 0 ? (
                    <p className="text-sm text-gray-400">
                      Resend OTP in {formatCountdown(countdown)}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={otpLoading}
                      className="text-sm text-purple-400 hover:text-purple-300 underline disabled:opacity-50"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || otpLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isLoading || otpLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  {otpSent ? 'Verifying...' : 'Sending OTP...'}
                </span>
              ) : otpSent ? (
                'Verify OTP'
              ) : (
                'Send OTP'
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-400">
          <p>🔐 Secure Admin Panel</p>
          <p className="mt-1">MonsterMen90 © 2024</p>
        </div>
      </div>
    </div>
  );
}
