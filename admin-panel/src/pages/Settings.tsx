import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'react-router-dom';
import { adminApi, type AdminProfile } from '../lib/api';
import { Loader2, Save, Lock, User, Phone, Shield, Mail, Image as ImageIcon, Bell, Settings as SettingsIcon, Upload } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import ImageCropModal from '../components/common/ImageCropModal';

/**
 * Profile Update Schema
 */
const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').optional().or(z.literal('')),
  phone_number: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  avatar_url: z.string().url('Invalid URL format').optional().or(z.literal('')),
});

/**
 * Password Change Schema
 */
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function Settings() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications' | 'preferences'>('profile');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateProfileTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();
  const location = useLocation();

  // Check if tab is passed from navigation state
  useEffect(() => {
    const state = (location.state as any);
    if (state?.tab) {
      if (state.tab === 'profile') setActiveTab('profile');
      else if (state.tab === 'preferences') setActiveTab('preferences');
      else if (state.tab === 'password') setActiveTab('password');
    }
  }, [location]);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    fetchProfile();
    
    // Cleanup timeout on unmount
    return () => {
      if (updateProfileTimeoutRef.current) {
        clearTimeout(updateProfileTimeoutRef.current);
      }
    };
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getProfile();
      setProfile(data);
      profileForm.reset({
        full_name: data.full_name || '',
        phone_number: data.phone_number || '',
        avatar_url: (data as any).avatar_url || '',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load profile');
      toast({
        variant: 'error',
        title: 'Error',
        description: err.response?.data?.message || 'Failed to load profile',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'error',
        title: 'Invalid File',
        description: 'Please select an image file',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'error',
        title: 'File Too Large',
        description: 'Image must be less than 5MB',
      });
      return;
    }

    // Create preview URL and open crop modal
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setCropModalOpen(true);
    };
    reader.onerror = () => {
      toast({
        variant: 'error',
        title: 'Error',
        description: 'Failed to read image file',
      });
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropConfirm = async (croppedImageBlob: Blob) => {
    // Prevent multiple simultaneous uploads
    if (uploadingAvatar || saving) {
      toast({
        variant: 'error',
        title: 'Please Wait',
        description: 'Another operation is in progress. Please wait.',
      });
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', croppedImageBlob, 'avatar.png');

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || '15';
          throw new Error(`Too many requests. Please wait ${retryAfter} minutes before trying again.`);
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to upload avatar');
      }

      const data = await response.json();
      const avatarUrl = data.data?.url || data.url;

      if (!avatarUrl) {
        throw new Error('No avatar URL returned from server');
      }

      // Update profile immediately (no debounce needed for single upload)
      try {
        await adminApi.updateProfile({
          avatar_url: avatarUrl,
        });

        // Refresh profile to get latest data from server
        const refreshedProfile = await adminApi.getProfile();
        setProfile(refreshedProfile);
        profileForm.setValue('avatar_url', avatarUrl);

        toast({
          variant: 'success',
          title: 'Avatar Updated',
          description: 'Your profile picture has been updated successfully',
        });
      } catch (updateErr: any) {
        console.error('Profile update error:', updateErr);
        if (updateErr.response?.status === 429) {
          toast({
            variant: 'error',
            title: 'Rate Limit Exceeded',
            description: 'Too many requests. Please wait a few minutes before trying again.',
          });
        } else {
          const errorMsg = updateErr.response?.data?.message || updateErr.message || 'Failed to update profile';
          toast({
            variant: 'error',
            title: 'Update Failed',
            description: errorMsg,
          });
        }
        throw updateErr; // Re-throw to be caught by outer catch
      }
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      toast({
        variant: 'error',
        title: 'Upload Failed',
        description: err.message || 'Failed to upload avatar',
      });
    } finally {
      setUploadingAvatar(false);
      setImageToCrop(null);
    }
  };

  const onProfileSubmit = async (data: ProfileFormData) => {
    // Prevent multiple simultaneous updates
    if (saving || uploadingAvatar) {
      toast({
        variant: 'error',
        title: 'Please Wait',
        description: 'Another operation is in progress. Please wait.',
      });
      return;
    }

    // Clear any pending debounced updates
    if (updateProfileTimeoutRef.current) {
      clearTimeout(updateProfileTimeoutRef.current);
      updateProfileTimeoutRef.current = null;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await adminApi.updateProfile({
        full_name: data.full_name || undefined,
        phone_number: data.phone_number || undefined,
        avatar_url: data.avatar_url || undefined,
      });
      setProfile(updated);
      setSuccess('Profile updated successfully!');
      toast({
        variant: 'success',
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully',
      });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      let errorMsg = 'Failed to update profile';
      
      if (err.response?.status === 429) {
        errorMsg = 'Too many requests. Please wait a few minutes before trying again.';
      } else {
        errorMsg = err.response?.data?.message || err.message || errorMsg;
      }
      
      setError(errorMsg);
      toast({
        variant: 'error',
        title: err.response?.status === 429 ? 'Rate Limit Exceeded' : 'Update Failed',
        description: errorMsg,
      });
    } finally {
      setSaving(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await adminApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      setSuccess('Password changed successfully!');
      passwordForm.reset();
      toast({
        variant: 'success',
        title: 'Password Changed',
        description: 'Your password has been changed successfully',
      });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to change password';
      setError(errorMsg);
      toast({
        variant: 'error',
        title: 'Password Change Failed',
        description: errorMsg,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Admin Settings</h1>
        <p className="text-gray-400">Manage your profile and account settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/5 rounded-xl p-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex-shrink-0 py-2 px-4 rounded-lg font-semibold transition-all whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <User className="h-4 w-4 inline mr-2" />
          Profile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('password')}
          className={`flex-shrink-0 py-2 px-4 rounded-lg font-semibold transition-all whitespace-nowrap ${
            activeTab === 'password'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Lock className="h-4 w-4 inline mr-2" />
          Password
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`flex-shrink-0 py-2 px-4 rounded-lg font-semibold transition-all whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Bell className="h-4 w-4 inline mr-2" />
          Notifications
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preferences')}
          className={`flex-shrink-0 py-2 px-4 rounded-lg font-semibold transition-all whitespace-nowrap ${
            activeTab === 'preferences'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <SettingsIcon className="h-4 w-4 inline mr-2" />
          Preferences
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/20 border border-green-500/50 text-green-200 p-4 rounded-xl">
          ✅ {success}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
            {/* Avatar Upload Section */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-1">
                  {profile && (profile as any).avatar_url ? (
                    <img
                      src={(profile as any).avatar_url}
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center">
                      <User className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 bg-purple-500 hover:bg-purple-600 text-white rounded-full p-2 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileSelect}
                  className="hidden"
                  aria-label="Upload profile picture"
                />
              </div>
              <p className="mt-2 text-sm text-gray-400">Click to upload profile picture</p>
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                <Mail className="h-4 w-4 inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-gray-400 cursor-not-allowed"
                placeholder="admin@example.com"
              />
              <p className="mt-1 text-xs text-gray-500">
                Email cannot be changed. Contact support if you need to update your email.
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                <User className="h-4 w-4 inline mr-2" />
                Full Name
              </label>
              <input
                type="text"
                {...profileForm.register('full_name')}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Admin Name"
              />
              {profileForm.formState.errors.full_name && (
                <p className="mt-1 text-sm text-red-400">
                  {profileForm.formState.errors.full_name.message}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                <Phone className="h-4 w-4 inline mr-2" />
                Phone Number (for OTP and notifications)
              </label>
              <input
                type="tel"
                {...profileForm.register('phone_number')}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="9876543210"
                maxLength={10}
              />
              {profileForm.formState.errors.phone_number && (
                <p className="mt-1 text-sm text-red-400">
                  {profileForm.formState.errors.phone_number.message}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Used for OTP login and order notifications
              </p>
            </div>

            {/* Avatar URL (Manual) */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                <ImageIcon className="h-4 w-4 inline mr-2" />
                Avatar URL (Optional)
              </label>
              <input
                type="url"
                {...profileForm.register('avatar_url')}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="https://example.com/avatar.jpg"
              />
              {profileForm.formState.errors.avatar_url && (
                <p className="mt-1 text-sm text-red-400">
                  {profileForm.formState.errors.avatar_url.message}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Or paste an image URL directly
              </p>
            </div>

            {/* OTP Enabled Info */}
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-purple-400" />
                <div>
                  <div className="text-sm font-semibold text-gray-300">
                    OTP Login Enabled
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    OTP login is always enabled. Use your phone number to receive OTP.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-5 w-5" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Current Password
              </label>
              <input
                type="password"
                {...passwordForm.register('currentPassword')}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="••••••••"
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="mt-1 text-sm text-red-400">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                New Password
              </label>
              <input
                type="password"
                {...passwordForm.register('newPassword')}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="••••••••"
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="mt-1 text-sm text-red-400">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                {...passwordForm.register('confirmPassword')}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="••••••••"
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-400">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-white/10">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-5 w-5" />
                    Changing Password...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-5 w-5" />
                    Change Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">Notification Preferences</h3>
              <p className="text-gray-400 mb-6">Manage how you receive notifications</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <div className="text-sm font-semibold text-white">Order Notifications</div>
                  <p className="text-xs text-gray-400">Get notified when new orders are placed</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" aria-label="Order notifications" />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <div className="text-sm font-semibold text-white">WhatsApp Notifications</div>
                  <p className="text-xs text-gray-400">Receive order notifications via WhatsApp</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" aria-label="Low stock alerts" />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <div className="text-sm font-semibold text-white">Low Stock Alerts</div>
                  <p className="text-xs text-gray-400">Get notified when product stock is low</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" aria-label="WhatsApp notifications" />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <div className="text-sm font-semibold text-white">Email Notifications</div>
                  <p className="text-xs text-gray-400">Receive notifications via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" aria-label="Auto-refresh dashboard" />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <button
                type="button"
                aria-label="Save notification preferences"
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center"
              >
                <Save className="mr-2 h-5 w-5" />
                Save Notification Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">General Preferences</h3>
              <p className="text-gray-400 mb-6">Customize your admin panel experience</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Items Per Page
                </label>
                <select aria-label="Items per page" className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                  <option value="10">10 items</option>
                  <option value="20" selected>20 items</option>
                  <option value="50">50 items</option>
                  <option value="100">100 items</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Default Order Status Filter
                </label>
                <select aria-label="Default order status filter" className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                  <option value="all">All Orders</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <div className="text-sm font-semibold text-white">Auto-refresh Dashboard</div>
                  <p className="text-xs text-gray-400">Automatically refresh dashboard data every 30 seconds</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" aria-label="Show inactive products" />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <div className="text-sm font-semibold text-white">Show Inactive Products</div>
                  <p className="text-xs text-gray-400">Display inactive products in product list by default</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" aria-label="Email notifications" />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <button
                type="button"
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center"
              >
                <Save className="mr-2 h-5 w-5" />
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Crop Modal */}
      <ImageCropModal
        open={cropModalOpen}
        imageSrc={imageToCrop || ''}
        onClose={() => {
          setCropModalOpen(false);
          setImageToCrop(null);
        }}
        onConfirm={handleCropConfirm}
        aspect={undefined}
        circularCrop={false}
      />
    </div>
  );
}
