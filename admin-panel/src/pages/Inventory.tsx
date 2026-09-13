import { useState, useEffect } from 'react';
import type { AxiosError } from 'axios';
import { inventoryApi, type InventoryItem, type ApiErrorResponse } from '../lib/api';

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lowStockFilter, setLowStockFilter] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryApi.getInventory();
      setInventory(data || []);
    } catch (err) {
      setError((err as AxiosError<ApiErrorResponse>).response?.data?.message || 'Failed to fetch inventory');
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (id: string, newStock: number) => {
    try {
      await inventoryApi.updateStock(id, newStock);
      fetchInventory(); // Refresh list
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      alert('Error: ' + (axiosErr.response?.data?.message || axiosErr.message));
    }
  };

  const handleUpdateReorderLevel = async (id: string, newLevel: number) => {
    try {
      await inventoryApi.updateReorderLevel(id, newLevel);
      fetchInventory(); // Refresh list
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorResponse>;
      alert('Error: ' + (axiosErr.response?.data?.message || axiosErr.message));
    }
  };

  const availableStock = (item: InventoryItem) => item.stock - item.reserved;
  const isLowStock = (item: InventoryItem) => availableStock(item) <= item.reorder_level;

  const filteredInventory = lowStockFilter
    ? inventory.filter(isLowStock)
    : inventory;

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
          <h1 className="text-4xl font-bold text-white mb-2">Inventory</h1>
          <p className="text-gray-400">Monitor and manage product stock levels</p>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockFilter}
              onChange={(e) => setLowStockFilter(e.target.checked)}
              className="w-5 h-5 rounded border-purple-500/20 bg-gray-800"
            />
            <span className="text-gray-300">Show Low Stock Only</span>
          </label>
          <div className="text-2xl font-bold text-purple-400">
            {inventory.length} Products
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6">
          ⚠️ {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6">
          <div className="text-gray-400 text-sm mb-2">Total Stock</div>
          <div className="text-3xl font-bold text-white">
            {inventory.reduce((sum, item) => sum + item.stock, 0)}
          </div>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6">
          <div className="text-gray-400 text-sm mb-2">Reserved</div>
          <div className="text-3xl font-bold text-yellow-400">
            {inventory.reduce((sum, item) => sum + item.reserved, 0)}
          </div>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6">
          <div className="text-gray-400 text-sm mb-2">Available</div>
          <div className="text-3xl font-bold text-green-400">
            {inventory.reduce((sum, item) => sum + availableStock(item), 0)}
          </div>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6">
          <div className="text-gray-400 text-sm mb-2">Low Stock Items</div>
          <div className="text-3xl font-bold text-red-400">
            {inventory.filter(isLowStock).length}
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-gray-800/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-gray-300 font-semibold">Product</th>
                <th className="px-6 py-4 text-left text-gray-300 font-semibold">Total Stock</th>
                <th className="px-6 py-4 text-left text-gray-300 font-semibold">Reserved</th>
                <th className="px-6 py-4 text-left text-gray-300 font-semibold">Available</th>
                <th className="px-6 py-4 text-left text-gray-300 font-semibold">Reorder Level</th>
                <th className="px-6 py-4 text-left text-gray-300 font-semibold">Status</th>
                <th className="px-6 py-4 text-left text-gray-300 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filteredInventory.map((item) => {
                const available = availableStock(item);
                const lowStock = isLowStock(item);
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-800/30 transition-colors ${
                      lowStock ? 'bg-red-500/5' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {item.products?.image_url && (
                          <img
                            src={item.products.image_url}
                            alt={item.products.title}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        )}
                        <div>
                          <div className="font-medium text-white">
                            {item.products?.title || 'Unknown Product'}
                          </div>
                          <div className="text-sm text-gray-400">ID: {item.product_id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={item.stock}
                        onChange={(e) =>
                          handleUpdateStock(item.id, parseInt(e.target.value) || 0)
                        }
                        className="w-20 px-2 py-1 bg-gray-800 border border-purple-500/20 rounded text-white text-sm"
                      />
                    </td>
                    <td className="px-6 py-4 text-yellow-400 font-medium">{item.reserved}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`font-bold ${
                          available > 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {available}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={item.reorder_level}
                        onChange={(e) =>
                          handleUpdateReorderLevel(item.id, parseInt(e.target.value) || 0)
                        }
                        className="w-20 px-2 py-1 bg-gray-800 border border-purple-500/20 rounded text-white text-sm"
                      />
                    </td>
                    <td className="px-6 py-4">
                      {lowStock ? (
                        <span className="px-3 py-1 bg-red-500/20 text-red-300 rounded-lg text-sm font-medium">
                          Low Stock
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-lg text-sm font-medium">
                          In Stock
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all text-sm">
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredInventory.length === 0 && (
        <div className="text-center py-12 text-gray-400">No inventory items found</div>
      )}
    </div>
  );
}
