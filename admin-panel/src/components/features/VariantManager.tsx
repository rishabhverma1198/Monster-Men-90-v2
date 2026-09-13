import { useState, useEffect } from 'react';
import type { AxiosError } from 'axios';
import { Plus, Trash2, Save, X, Package } from 'lucide-react';
import { variantApi, type Variant, type CreateVariantInput, type ApiErrorResponse } from '../../lib/api';
import { Loader2 } from 'lucide-react';

interface VariantManagerProps {
  productId: string;
}

const SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL'];
const COLOR_OPTIONS = [
  'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink', 'Gray', 'Brown', 'Navy'
];

export default function VariantManager({ productId }: VariantManagerProps) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVariant, setNewVariant] = useState<Partial<CreateVariantInput>>({
    type: 'size',
    value: '',
  });

  useEffect(() => {
    fetchVariants();
  }, [productId]);

  const fetchVariants = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await variantApi.getVariantsByProduct(productId);
      setVariants(data);
    } catch (err) {
      setError((err as AxiosError<ApiErrorResponse>).response?.data?.message || 'Failed to fetch variants');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVariant = async () => {
    if (!newVariant.type || !newVariant.value) {
      setError('Type and value are required');
      return;
    }

    try {
      await variantApi.createVariant({
        product_id: productId,
        type: newVariant.type as 'size' | 'color',
        value: newVariant.value,
        sku_suffix: newVariant.sku_suffix,
        buyer_price: newVariant.buyer_price,
        wholesaler_price: newVariant.wholesaler_price,
      });
      setShowAddForm(false);
      setNewVariant({ type: 'size', value: '' });
      fetchVariants();
    } catch (err) {
      setError((err as AxiosError<ApiErrorResponse>).response?.data?.message || 'Failed to create variant');
    }
  };

  const handleDeleteVariant = async (id: string) => {
    if (!confirm('Are you sure you want to delete this variant?')) return;

    try {
      await variantApi.deleteVariant(id);
      fetchVariants();
    } catch (err) {
      setError((err as AxiosError<ApiErrorResponse>).response?.data?.message || 'Failed to delete variant');
    }
  };

  const handleUpdateInventory = async (variantId: string, stock: number) => {
    try {
      await variantApi.updateVariantInventory(variantId, stock);
      fetchVariants();
    } catch (err) {
      setError((err as AxiosError<ApiErrorResponse>).response?.data?.message || 'Failed to update inventory');
    }
  };

  const sizeVariants = variants.filter((v) => v.type === 'size');
  const colorVariants = variants.filter((v) => v.type === 'color');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Product Variants</h3>
          <p className="text-sm text-gray-400">Manage sizes, colors, and inventory per variant</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Variant
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Add Variant Form */}
      {showAddForm && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-white">Add New Variant</h4>
            <button
              type="button"
              aria-label="Close add variant form"
              onClick={() => {
                setShowAddForm(false);
                setNewVariant({ type: 'size', value: '' });
              }}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="variant-type" className="block text-sm font-semibold text-gray-300 mb-2">Type</label>
              <select
                id="variant-type"
                value={newVariant.type || 'size'}
                onChange={(e) => setNewVariant({ ...newVariant, type: e.target.value as 'size' | 'color' })}
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white"
              >
                <option value="size">Size</option>
                <option value="color">Color</option>
              </select>
            </div>

            <div>
              <label htmlFor="variant-value" className="block text-sm font-semibold text-gray-300 mb-2">Value</label>
              {newVariant.type === 'size' ? (
                <select
                  id="variant-value"
                  value={newVariant.value || ''}
                  onChange={(e) => setNewVariant({ ...newVariant, value: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white"
                >
                  <option value="">Select Size</option>
                  {SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  id="variant-value"
                  value={newVariant.value || ''}
                  onChange={(e) => setNewVariant({ ...newVariant, value: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white"
                >
                  <option value="">Select Color</option>
                  {COLOR_OPTIONS.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Buyer Price (₹) <span className="text-gray-500">(Optional)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={newVariant.buyer_price || ''}
                onChange={(e) =>
                  setNewVariant({ ...newVariant, buyer_price: e.target.value ? Number(e.target.value) : undefined })
                }
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Wholesaler Price (₹) <span className="text-gray-500">(Optional)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={newVariant.wholesaler_price || ''}
                onChange={(e) =>
                  setNewVariant({
                    ...newVariant,
                    wholesaler_price: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white"
                placeholder="0.00"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddVariant}
            className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-all"
          >
            Add Variant
          </button>
        </div>
      )}

      {/* Size Variants */}
      {sizeVariants.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h4 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Sizes
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sizeVariants.map((variant) => (
              <VariantCard
                key={variant.id}
                variant={variant}
                onDelete={handleDeleteVariant}
                onUpdateInventory={handleUpdateInventory}
              />
            ))}
          </div>
        </div>
      )}

      {/* Color Variants */}
      {colorVariants.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h4 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Colors
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {colorVariants.map((variant) => (
              <VariantCard
                key={variant.id}
                variant={variant}
                onDelete={handleDeleteVariant}
                onUpdateInventory={handleUpdateInventory}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {variants.length === 0 && !showAddForm && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">No variants added yet. Add your first variant to get started.</p>
        </div>
      )}
    </div>
  );
}

interface VariantCardProps {
  variant: Variant;
  onDelete: (id: string) => void;
  onUpdateInventory: (id: string, stock: number) => void;
}

function VariantCard({ variant, onDelete, onUpdateInventory }: VariantCardProps) {
  const [stock, setStock] = useState(variant.inventory?.stock || 0);
  const [updating, setUpdating] = useState(false);

  const handleStockUpdate = async () => {
    setUpdating(true);
    await onUpdateInventory(variant.id, stock);
    setUpdating(false);
  };

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h5 className="font-semibold text-white capitalize">{variant.value}</h5>
          <p className="text-xs text-gray-400 capitalize">{variant.type}</p>
        </div>
        <button
          type="button"
          aria-label="Delete variant"
          onClick={() => onDelete(variant.id)}
          className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Stock</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
              className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-sm"
              min="0"
              placeholder="0"
            />
            <button
              type="button"
              aria-label="Save stock update"
              onClick={handleStockUpdate}
              disabled={updating || stock === variant.inventory?.stock}
              className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm disabled:opacity-50 transition-colors"
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {variant.buyer_price && (
          <div className="text-xs text-gray-400">
            Price: ₹{variant.buyer_price.toLocaleString()}
          </div>
        )}

        {variant.inventory && (
          <div className="text-xs text-gray-500">
            Reserved: {variant.inventory.reserved} | Available: {variant.inventory.stock - variant.inventory.reserved}
          </div>
        )}
      </div>
    </div>
  );
}
