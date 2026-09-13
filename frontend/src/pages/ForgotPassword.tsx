/**
 * Forgot Password Page
 * Enter email or phone → OTP via WhatsApp (phone) or reset link (email)
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function ForgotPassword() {
  const [step, setStep] = useState<'input' | 'otp' | 'done'>('input');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setAuthFromCallback } = useAuthStore();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (email.trim()) {
        await apiService.forgotPassword({ email: email.trim() });
        setStep('done');
      } else if (phone.replace(/\D/g, '').length >= 10) {
        const res = await apiService.forgotPassword({
          phone_number: phone.replace(/\D/g, '').slice(-10),
        });
        if (res.success && res.data?.whatsapp_url) {
          setWhatsappUrl(res.data.whatsapp_url);
          setStep('otp');
        } else {
          setStep('done');
        }
      } else {
        setError('Enter email or 10-digit mobile number');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to send');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiService.resetPassword({
        phone_number: phone.replace(/\D/g, '').slice(-10),
        otp_code: otp,
      });
      if (res.success && res.data && 'token' in res.data) {
        const { user, token } = res.data;
        setAuthFromCallback(user, token);
        navigate('/', { replace: true });
      } else {
        setStep('done');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4">
      <div className="max-w-md w-full">
        <Link
          to="/login-email"
          className="mb-6 text-gray-600 hover:text-gray-900 flex items-center gap-2"
        >
          ← Back to Login
        </Link>

        <div className="bg-white rounded-lg p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Forgot password?</h1>
          <p className="text-sm text-gray-600 mb-6">
            Enter your email or mobile number. We'll send you an OTP on WhatsApp (for phone) or a reset link (for email).
          </p>

          {step === 'input' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setPhone(''); }}
                  className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  placeholder="your@email.com"
                />
              </div>
              <div className="text-center text-gray-500">OR</div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile (10 digits)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setEmail(''); }}
                  className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                  placeholder="9876543210"
                  maxLength={10}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send OTP / Reset Link'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-gray-600">
                OTP sent to your WhatsApp. Enter the 6-digit code below.
              </p>
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg flex items-center justify-center"
                >
                  Open WhatsApp to get OTP
                </a>
              )}
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit OTP"
                className="w-full h-11 px-4 border border-gray-300 rounded-lg text-center text-lg tracking-widest"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full h-12 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('input'); setError(null); }}
                className="w-full text-gray-600 text-sm"
              >
                Use different email/phone
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="space-y-4">
              <p className="text-gray-600">
                {email
                  ? 'If an account exists with this email, you will receive a password reset link. Check your inbox.'
                  : 'If you entered a phone number, check WhatsApp for the OTP and use the form above to verify.'}
              </p>
              <Link
                to="/login-email"
                className="block w-full h-12 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg flex items-center justify-center"
              >
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
