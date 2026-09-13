/**
 * Profile Page
 * User account management: view/edit profile, avatar, phone & email with OTP
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, LogOut, Edit, X, Loader2, Camera, Check, Lock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { apiService } from '../services/api';
import BackButton from '../components/common/BackButton';
import Breadcrumb from '../components/common/Breadcrumb';

type PhoneStep = 'idle' | 'send_otp' | 'verify_otp' | 'enter_new' | 'done';
type EmailStep = 'idle' | 'send_otp' | 'verify_otp' | 'enter_new' | 'done';

export default function Profile() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, setAuthFromCallback } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullNameEdit, setFullNameEdit] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Phone update flow
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('idle');
  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  // Email update flow
  const [emailStep, setEmailStep] = useState<EmailStep>('idle');
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Set password (for Google/phone users)
  const [setPasswordOpen, setSetPasswordOpen] = useState(false);
  const [setPasswordNew, setSetPasswordNew] = useState('');
  const [setPasswordConfirm, setSetPasswordConfirm] = useState('');
  const [setPasswordLoading, setSetPasswordLoading] = useState(false);
  const [setPasswordError, setSetPasswordError] = useState('');
  const [setPasswordSuccess, setSetPasswordSuccess] = useState(false);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getProfile();
      if (response.success && response.data) {
        setProfile(response.data);
        setFullNameEdit(response.data.full_name || '');
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchProfile();
  }, [isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleStartEdit = () => {
    setEditMode(true);
    setFullNameEdit(profile?.full_name || user?.full_name || '');
    // Nudge Google/phone users: auto-expand Set password so they can add email+password login
    if (profile?.auth_method === 'google' || profile?.auth_method === 'phone') {
      setSetPasswordOpen(true);
      setSetPasswordError('');
      setSetPasswordSuccess(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setFullNameEdit(profile?.full_name || '');
    setPhoneStep('idle');
    setEmailStep('idle');
    setPhoneError('');
    setEmailError('');
    setSetPasswordOpen(false);
    setSetPasswordError('');
    setSetPasswordSuccess(false);
  };

  const handleSetPassword = async () => {
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!setPasswordNew || setPasswordNew.length < 8) {
      setSetPasswordError('Password must be at least 8 characters.');
      return;
    }
    if (!strong.test(setPasswordNew)) {
      setSetPasswordError('Use uppercase, lowercase, number and special character (@$!%*?&).');
      return;
    }
    if (setPasswordNew !== setPasswordConfirm) {
      setSetPasswordError('Passwords do not match.');
      return;
    }
    setSetPasswordError('');
    setSetPasswordLoading(true);
    try {
      await apiService.setProfilePassword(setPasswordNew, setPasswordConfirm);
      setSetPasswordSuccess(true);
      setSetPasswordNew('');
      setSetPasswordConfirm('');
      setSetPasswordOpen(false);
    } catch (e: any) {
      setSetPasswordError(e?.message || 'Failed to set password. Try again.');
    } finally {
      setSetPasswordLoading(false);
    }
  };

  const handleSaveName = async () => {
    const name = fullNameEdit.trim();
    if (!name || name.length < 2) return;
    setSaving(true);
    try {
      const res = await apiService.updateProfile({ full_name: name });
      if (res.success && res.data) {
        setProfile(res.data);
        const token = localStorage.getItem('auth_token');
        if (token) setAuthFromCallback(res.data, token);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setUploadingAvatar(true);
    apiService
      .uploadProfilePicture(file)
      .then((res) => {
        const url = res.data?.url;
        if (url) return apiService.updateProfile({ avatar_url: url });
        throw new Error('No URL returned');
      })
      .then((res) => {
        if (res.success && res.data) {
          setProfile(res.data);
          const token = localStorage.getItem('auth_token');
          if (token) setAuthFromCallback(res.data, token);
        }
      })
      .catch((err) => console.error('Avatar upload failed:', err))
      .finally(() => {
        setUploadingAvatar(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
  };

  // --- Phone flow ---
  const handleSendPhoneOtp = async () => {
    setPhoneError('');
    setPhoneLoading(true);
    try {
      const res = await apiService.sendProfilePhoneOtp();
      if (res.success) {
        setPhoneStep('verify_otp');
        if (res.data?.whatsapp_url) window.open(res.data.whatsapp_url, '_blank');
      }
    } catch (e: any) {
      setPhoneError(e?.message || 'Failed to send OTP');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtpCode.trim() || phoneOtpCode.length !== 6) {
      setPhoneError('Enter 6-digit OTP');
      return;
    }
    setPhoneError('');
    setPhoneLoading(true);
    try {
      const res = await apiService.verifyProfilePhoneOtp(phoneOtpCode.trim());
      if (res.success) {
        setPhoneStep('enter_new');
      }
    } catch (e: any) {
      setPhoneError(e?.message || 'Invalid OTP');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleUpdatePhone = async () => {
    const num = newPhone.replace(/\D/g, '').slice(-10);
    if (num.length < 10) {
      setPhoneError('Enter valid 10-digit number');
      return;
    }
    setPhoneError('');
    setPhoneLoading(true);
    try {
      const res = await apiService.updateProfilePhone(num);
      if (res.success && res.data) {
        setProfile(res.data);
        const token = localStorage.getItem('auth_token');
        if (token) setAuthFromCallback(res.data, token);
        setPhoneStep('done');
        setNewPhone('');
        setTimeout(() => setPhoneStep('idle'), 1500);
      }
    } catch (e: any) {
      setPhoneError(e?.message || 'Failed to update phone');
    } finally {
      setPhoneLoading(false);
    }
  };

  // --- Email flow ---
  const handleSendEmailOtp = async () => {
    setEmailError('');
    setEmailLoading(true);
    try {
      await apiService.sendProfileEmailOtp();
      setEmailStep('verify_otp');
    } catch (e: any) {
      setEmailError(e?.message || 'Failed to send OTP');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtpCode.trim() || emailOtpCode.length !== 6) {
      setEmailError('Enter 6-digit OTP');
      return;
    }
    setEmailError('');
    setEmailLoading(true);
    try {
      const res = await apiService.verifyProfileEmailOtp(emailOtpCode.trim());
      if (res.success) setEmailStep('enter_new');
    } catch (e: any) {
      setEmailError(e?.message || 'Invalid OTP');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setEmailError('Enter valid email');
      return;
    }
    setEmailError('');
    setEmailLoading(true);
    try {
      const res = await apiService.updateProfileEmail(email);
      if (res.success && res.data) {
        setProfile(res.data);
        const token = localStorage.getItem('auth_token');
        if (token) setAuthFromCallback(res.data, token);
        setEmailStep('done');
        setNewEmail('');
        setTimeout(() => setEmailStep('idle'), 1500);
      }
    } catch (e: any) {
      setEmailError(e?.message || 'Failed to update email');
    } finally {
      setEmailLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  if (isLoading) {
    return (
      <div className="container-custom py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const displayName = profile?.full_name || user?.full_name || 'Not set';
  const displayEmail = profile?.email || user?.email || 'Not set';
  const displayPhone = profile?.phone_number || '';
  const avatarUrl = profile?.avatar_url || user?.avatar_url;

  return (
    <div className="container-custom py-8">
      <Breadcrumb />
      <div className="mb-6">
        <BackButton to="/" label="Back to Home" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Account Information</h2>
              {!editMode ? (
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark border border-primary px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg border border-gray-300"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveName}
                    disabled={saving}
                    className="flex items-center gap-2 text-sm bg-primary text-gray-900 px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Avatar + Full Name */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-900" />
                    </div>
                  )}
                  {editMode && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarSelect}
                        aria-label="Upload profile picture"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="absolute bottom-0 right-0 bg-primary border-2 border-white rounded-full p-1.5 text-gray-900 hover:opacity-90 disabled:opacity-50 shadow"
                        aria-label="Change profile picture"
                      >
                        {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      </button>
                    </>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Full Name</p>
                  {editMode ? (
                    <input
                      id="profile-full-name"
                      type="text"
                      value={fullNameEdit}
                      onChange={(e) => setFullNameEdit(e.target.value)}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Your name"
                      aria-label="Full name"
                    />
                  ) : (
                    <p className="font-semibold text-gray-900">{displayName}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-4">
                <Mail className="w-5 h-5 text-gray-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold text-gray-900">{displayEmail}</p>
                  {editMode && (
                    <button
                      type="button"
                      onClick={() => setEmailStep(emailStep === 'idle' ? 'send_otp' : emailStep)}
                      className="mt-1 text-sm text-primary hover:underline"
                    >
                      Update email (OTP on current email)
                    </button>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-4">
                <Phone className="w-5 h-5 text-gray-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold text-gray-900">{displayPhone || 'Not set'}</p>
                  {editMode && (
                    <button
                      type="button"
                      onClick={() => setPhoneStep(phoneStep === 'idle' ? 'send_otp' : phoneStep)}
                      className="mt-1 text-sm text-primary hover:underline"
                    >
                      Update phone (OTP on current phone)
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Account Type</p>
                <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-semibold">
                  {profile?.role === 'admin' ? 'Administrator' : 'Customer'}
                </span>
              </div>

              {/* Set password (for Google/phone users - sign in with email + password later) */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-5 h-5 text-gray-400 shrink-0" />
                  <p className="text-sm text-gray-600">Password for email login</p>
                </div>
                {(profile?.auth_method === 'google' || profile?.auth_method === 'phone') && (
                  <p className="text-xs text-gray-500 mb-2">
                    You signed up with {profile?.auth_method === 'google' ? 'Google' : 'phone'}. Set a password to also sign in with email + password on the login page.
                  </p>
                )}
                {setPasswordSuccess && (
                  <p className="text-sm text-green-600 font-medium mb-2">Password set. You can now sign in with email + password.</p>
                )}
                {!setPasswordOpen ? (
                  <button
                    type="button"
                    onClick={() => { setSetPasswordOpen(true); setSetPasswordError(''); setSetPasswordSuccess(false); }}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    Set password
                  </button>
                ) : (
                  <div className="space-y-3">
                    {setPasswordError && <p className="text-sm text-red-600">{setPasswordError}</p>}
                    <input
                      type="password"
                      value={setPasswordNew}
                      onChange={(e) => setSetPasswordNew(e.target.value)}
                      placeholder="New password (8+ chars, A-Z, a-z, 0-9, @$!%*?&)"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm"
                      aria-label="New password"
                    />
                    <input
                      type="password"
                      value={setPasswordConfirm}
                      onChange={(e) => setSetPasswordConfirm(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm"
                      aria-label="Confirm password"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setSetPasswordOpen(false); setSetPasswordError(''); setSetPasswordNew(''); setSetPasswordConfirm(''); }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSetPassword}
                        disabled={setPasswordLoading}
                        className="px-3 py-2 bg-primary text-gray-900 text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
                      >
                        {setPasswordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Set password
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/orders')}
                className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <p className="font-medium text-gray-900">My Orders</p>
                <p className="text-sm text-gray-600">View order history</p>
              </button>
              <button
                onClick={() => navigate('/cart')}
                className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <p className="font-medium text-gray-900">Shopping Cart</p>
                <p className="text-sm text-gray-600">View cart items</p>
              </button>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Phone update modal */}
      {editMode && phoneStep !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Update Phone Number</h3>
              <button type="button" onClick={() => setPhoneStep('idle')} className="text-gray-500 hover:text-gray-700" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            {phoneError && <p className="text-sm text-red-600 mb-3">{phoneError}</p>}
            {phoneStep === 'send_otp' && (
              <div>
                <p className="text-gray-600 mb-4">OTP will be sent to your current number via WhatsApp.</p>
                <button
                  onClick={handleSendPhoneOtp}
                  disabled={phoneLoading}
                  className="w-full py-2 bg-primary text-gray-900 font-semibold rounded-lg hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {phoneLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  Send OTP
                </button>
              </div>
            )}
            {phoneStep === 'verify_otp' && (
              <div>
                <p className="text-gray-600 mb-2">Enter the 6-digit OTP sent to your phone.</p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={phoneOtpCode}
                  onChange={(e) => setPhoneOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-lg tracking-widest mb-4"
                  placeholder="000000"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleVerifyPhoneOtp}
                    disabled={phoneLoading}
                    className="flex-1 py-2 bg-primary text-gray-900 font-semibold rounded-lg hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {phoneLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    Verify
                  </button>
                  <button
                    onClick={handleSendPhoneOtp}
                    disabled={phoneLoading}
                    className="py-2 px-4 border border-gray-300 rounded-lg text-gray-700"
                  >
                    Resend
                  </button>
                </div>
              </div>
            )}
            {phoneStep === 'enter_new' && (
              <div>
                <p className="text-gray-600 mb-2">Enter your new 10-digit phone number.</p>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
                  placeholder="9876543210"
                />
                <button
                  onClick={handleUpdatePhone}
                  disabled={phoneLoading}
                  className="w-full py-2 bg-primary text-gray-900 font-semibold rounded-lg hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {phoneLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  Update Phone
                </button>
              </div>
            )}
            {phoneStep === 'done' && <p className="text-green-600 font-medium text-center py-2">Phone updated successfully.</p>}
          </div>
        </div>
      )}

      {/* Email update modal */}
      {editMode && emailStep !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Update Email</h3>
              <button type="button" onClick={() => setEmailStep('idle')} className="text-gray-500 hover:text-gray-700" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            {emailError && <p className="text-sm text-red-600 mb-3">{emailError}</p>}
            {emailStep === 'send_otp' && (
              <div>
                <p className="text-gray-600 mb-4">OTP will be sent to your current email. In dev, check server logs if no email service.</p>
                <button
                  onClick={handleSendEmailOtp}
                  disabled={emailLoading}
                  className="w-full py-2 bg-primary text-gray-900 font-semibold rounded-lg hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {emailLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  Send OTP to current email
                </button>
              </div>
            )}
            {emailStep === 'verify_otp' && (
              <div>
                <p className="text-gray-600 mb-2">Enter the 6-digit OTP sent to your current email.</p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={emailOtpCode}
                  onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-lg tracking-widest mb-4"
                  placeholder="000000"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleVerifyEmailOtp}
                    disabled={emailLoading}
                    className="flex-1 py-2 bg-primary text-gray-900 font-semibold rounded-lg hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {emailLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    Verify
                  </button>
                  <button
                    onClick={handleSendEmailOtp}
                    disabled={emailLoading}
                    className="py-2 px-4 border border-gray-300 rounded-lg text-gray-700"
                  >
                    Resend
                  </button>
                </div>
              </div>
            )}
            {emailStep === 'enter_new' && (
              <div>
                <p className="text-gray-600 mb-2">Enter your new email address.</p>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
                  placeholder="new@example.com"
                />
                <button
                  onClick={handleUpdateEmail}
                  disabled={emailLoading}
                  className="w-full py-2 bg-primary text-gray-900 font-semibold rounded-lg hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {emailLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  Update Email
                </button>
              </div>
            )}
            {emailStep === 'done' && <p className="text-green-600 font-medium text-center py-2">Email updated successfully.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
