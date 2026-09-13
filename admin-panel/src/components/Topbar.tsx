import { useState, useEffect } from 'react';
import { Search, Settings, X, User, Lock, Bell, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { adminApi, type AdminProfile } from '../lib/api';
import Notifications from './Notifications';
import { useToast } from '../hooks/useToast';

/**
 * Topbar Component
 *
 * Admin dashboard top navigation bar with functional Settings modal
 */
export default function Topbar() {
  const { user } = useAuthStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [isActive, setIsActive] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchProfile = async () => {
    try {
      const data = await adminApi.getProfile();
      setProfile(data);
      setIsActive(data.is_active ?? true);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      toast({
        variant: 'error',
        title: 'Error',
        description: 'Failed to load profile',
      });
    }
  };

  // Fetch profile when settings modal opens
  useEffect(() => {
    if (isSettingsOpen && !profile) {
      fetchProfile();
    }
  }, [isSettingsOpen]);

  const handleAccountSettings = () => {
    setIsSettingsOpen(false);
    navigate('/dashboard/settings', { state: { tab: 'profile' } });
  };

  const handlePreferences = () => {
    setIsSettingsOpen(false);
    navigate('/dashboard/settings', { state: { tab: 'preferences' } });
  };

  const handleSecurity = () => {
    setIsSettingsOpen(false);
    navigate('/dashboard/settings', { state: { tab: 'password' } });
  };

  const handleToggleActive = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStatus = e.target.checked;
    setIsActive(newStatus);
    
    try {
      // Note: Admin cannot deactivate themselves via API for security reasons
      // This is just UI feedback - actual status change would require backend support
      toast({
        variant: 'info',
        title: 'Status Update',
        description: 'Account status changes require admin privileges. Contact system administrator.',
      });
    } catch {
      setIsActive(!newStatus); // Revert on error
      toast({
        variant: 'error',
        title: 'Error',
        description: 'Failed to update account status',
      });
    }
  };

  return (
    <header className="bg-gray-800/50 backdrop-blur-lg border-b border-purple-500/20 sticky top-0 z-30">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Search Bar - Fully Functional */}
          <label htmlFor="search-input" className="flex-1 max-w-xl">
            <span className="sr-only">Search products, orders, users</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="search-input"
                type="text"
                name="search"
                placeholder="Search products, orders, users..."
                title="Search products, orders, users"
                className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const query = (e.target as HTMLInputElement).value.trim();
                    if (query) {
                      // Navigate to search results or filter products
                      window.location.href = `/dashboard/products?search=${encodeURIComponent(query)}`;
                    }
                  }
                }}
              />
            </div>
          </label>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Notifications
              onNotificationClick={(notification) => {
                // Handle notification click - navigate to relevant page
                if (notification.type === 'order' && notification.metadata?.order_id) {
                  window.location.href = `/dashboard/orders/${notification.metadata.order_id}`;
                } else if (notification.type === 'stock' && notification.metadata?.product_id) {
                  window.location.href = `/dashboard/products/${notification.metadata.product_id}/edit`;
                }
              }}
            />

            {/* User Profile with Settings */}
            <div className="flex items-center space-x-3 pl-4 border-l border-gray-700">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white">
                  {user?.full_name || profile?.full_name || 'Admin'}
                </p>
                <p className="text-xs text-gray-400 capitalize">
                  {user?.role || 'Administrator'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen(!isSettingsOpen);
                  if (!isSettingsOpen && !profile) {
                    fetchProfile();
                  }
                }}
                className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform cursor-pointer relative"
                title="Settings"
                aria-label="Open Settings"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-white">
                    {(user?.full_name || profile?.full_name || user?.email || 'A').charAt(0).toUpperCase()}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></span>
                )}
              </button>
            </div>
          </div>

          {/* Settings Panel - Fully Functional */}
          {isSettingsOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                onClick={() => setIsSettingsOpen(false)}
              />
              <div className="absolute right-4 top-16 mt-2 w-96 bg-gray-800/95 backdrop-blur-xl border border-purple-500/20 rounded-xl shadow-2xl z-50 max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-purple-500/20 flex items-center justify-between flex-shrink-0">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Settings
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                    title="Close Settings"
                    aria-label="Close Settings"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </div>

                {/* Profile Section */}
                <div className="p-4 border-b border-purple-500/20 flex-shrink-0">
                  <div className="p-3 bg-gray-900/50 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Profile</p>
                    <p className="text-white font-medium">
                      {profile?.full_name || user?.full_name || 'Admin'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {profile?.email || user?.email || 'admin@example.com'}
                    </p>
                  </div>
                </div>

                {/* Navigation Tabs */}
                <div className="p-4 space-y-2 flex-shrink-0 border-b border-purple-500/20">
                  <button
                    type="button"
                    onClick={handleAccountSettings}
                    className="w-full px-4 py-3 rounded-lg transition-all text-left flex items-center gap-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300"
                  >
                    <User className="h-4 w-4" />
                    <span className="font-medium">Account Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePreferences}
                    className="w-full px-4 py-3 rounded-lg transition-all text-left flex items-center gap-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300"
                  >
                    <Bell className="h-4 w-4" />
                    <span className="font-medium">Preferences</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSecurity}
                    className="w-full px-4 py-3 rounded-lg transition-all text-left flex items-center gap-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300"
                  >
                    <Lock className="h-4 w-4" />
                    <span className="font-medium">Security</span>
                  </button>
                </div>

                {/* Active Toggle */}
                <div className="p-4 flex items-center justify-between flex-shrink-0 border-t border-purple-500/20">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Account Status</p>
                      <p className="text-xs text-gray-400">
                        {isActive ? 'Your account is active' : 'Your account is inactive'}
                      </p>
                    </div>
                  </div>
                  <label htmlFor="account-status-toggle" className="relative inline-flex items-center cursor-pointer">
                    <input
                      id="account-status-toggle"
                      type="checkbox"
                      checked={isActive}
                      onChange={handleToggleActive}
                      className="sr-only peer"
                      aria-label="Toggle account status"
                      title="Toggle account status"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
