import { useState, useEffect, useCallback } from 'react';
import type { AxiosError } from 'axios';
import { Link } from 'react-router-dom';
import {
  Search,
  User,
  Phone,
  Calendar,
  Loader2,
  Eye,
} from 'lucide-react';
import { leadsApi, type Lead, type ApiErrorResponse } from '../lib/api';

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const offset = (page - 1) * limit;
      const response = await leadsApi.getLeads({ limit, offset });

      setLeads(response?.leads ?? []);
      setTotal(response?.total ?? 0);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      setError(
        axiosErr?.response?.data?.message ||
          axiosErr?.message ||
          'Failed to fetch leads'
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.user_name?.toLowerCase().includes(query) ||
      lead.user_email?.toLowerCase().includes(query) ||
      lead.user_phone?.includes(query) ||
      lead.order_number?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getUserTypeColor = (type: string) => {
    return type === 'wholeseller'
      ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
      : 'bg-green-500/20 text-green-300 border-green-500/50';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Leads</h1>
        <p className="text-gray-400">
          Customer leads from checkout forms - Future CRM ready
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, phone, or order number..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-12 text-center">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Leads Found</h3>
          <p className="text-gray-400">
            {searchQuery
              ? 'No leads match your search criteria.'
              : 'No leads available yet. Leads will appear here when customers complete checkout.'}
          </p>
        </div>
      ) : (
        <>
          {/* Leads Table */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold mr-3">
                            {lead.user_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">
                              {lead.user_name || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-400">{lead.user_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-300">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          {lead.user_phone || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-purple-300">
                          {lead.order_number || lead.id.substring(0, 8)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getUserTypeColor(
                            lead.user_type || 'single'
                          )}`}
                        >
                          {lead.user_type === 'wholeseller' ? 'Wholeseller' : 'Single'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-white">
                          ₹{lead.total_amount?.toLocaleString() || '0'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-400">
                          <Calendar className="h-4 w-4 mr-2" />
                          {formatDate(lead.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          to={`/dashboard/orders/${lead.id}`}
                          className="inline-flex items-center px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Order
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} leads
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
