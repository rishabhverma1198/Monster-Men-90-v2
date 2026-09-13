import { useState, useEffect } from 'react';
import type { AxiosError } from 'axios';
import { userApi, type User, type ApiErrorResponse } from '../lib/api';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userApi.getUsers();
      setUsers(data || []);
    } catch (err) {
      setError((err as AxiosError<ApiErrorResponse>).response?.data?.message || 'Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await userApi.updateUserRole(userId, newRole as 'admin' | 'buyer' | 'wholesaler');
      fetchUsers(); // Refresh list
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      alert('Error: ' + (axiosErr.response?.data?.message || axiosErr.message));
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      await userApi.updateUserStatus(userId, !currentStatus);
      fetchUsers(); // Refresh list
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      alert('Error: ' + (axiosErr.response?.data?.message || axiosErr.message));
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleColors: Record<string, string> = {
    admin: 'bg-red-500/20 text-red-300',
    manager: 'bg-blue-500/20 text-blue-300',
    wholesaler: 'bg-purple-500/20 text-purple-300',
    buyer: 'bg-green-500/20 text-green-300',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Users</h1>
          <p className="text-gray-400">Manage user accounts and permissions</p>
        </div>
        <div className="text-2xl font-bold text-purple-400">{users.length} Total Users</div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6">
          ⚠️ {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-3 bg-gray-800 border border-purple-500/20 rounded-xl text-white focus:border-purple-500 focus:outline-none"
        />
      </div>

      {/* Users Table */}
      <div className="bg-gray-800/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-gray-300 font-semibold">User</th>
                <th className="px-6 py-4 text-left text-gray-300 font-semibold">Email</th>
                <th className="px-6 py-4 text-left text-gray-300 font-semibold">Role</th>
                <th className="px-6 py-4 text-left text-gray-300 font-semibold">Status</th>
                <th className="px-6 py-4 text-left text-gray-300 font-semibold">Joined</th>
                <th className="px-6 py-4 text-left text-gray-300 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-white">
                          {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-white">{user.full_name || 'No Name'}</div>
                        {user.phone_number && (
                          <div className="text-sm text-gray-400">{user.phone_number}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{user.email}</td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className={`px-3 py-1 rounded-lg font-medium text-sm border-0 ${roleColors[user.role] || roleColors.buyer}`}
                    >
                      <option value="buyer">Buyer</option>
                      <option value="wholesaler">Wholesaler</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(user.id, user.is_active)}
                      className={`px-3 py-1 rounded-lg font-medium text-sm ${
                        user.is_active
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all text-sm">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12 text-gray-400">No users found</div>
      )}
    </div>
  );
}
