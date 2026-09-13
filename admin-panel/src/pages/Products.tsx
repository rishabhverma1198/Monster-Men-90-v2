import { useState, useEffect } from 'react';
import type { AxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Edit, Trash2, Package, Loader2, MoveRight } from 'lucide-react';
import { productApi } from '../lib/api';
import type { Product, ApiErrorResponse } from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';
import ProductStatusIndicator from '../components/common/ProductStatusIndicator';
import ProductActiveToggle from '../components/common/ProductActiveToggle';
import { useToast } from '../hooks/useToast';
import ConfirmDialog from '../components/common/ConfirmDialog';

/**
 * Products List Page
 * 
 * Displays all products with pagination and category filtering
 * Admin can view active and inactive products
 */
export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  
  // Confirmation dialogs
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; productId: string | null }>({
    open: false,
    productId: null,
  });
  const [moveDialog, setMoveDialog] = useState<{ open: boolean; productId: string | null; gender: 'men' | 'women' | null }>({
    open: false,
    productId: null,
    gender: null,
  });
  
  // Toast notifications
  const { toast } = useToast();
  
  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [page, categoryFilter, genderFilter, debouncedSearchQuery]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * limit;
      
      let response;
      if (debouncedSearchQuery) {
        // Use search endpoint when query is provided
        // Use admin products endpoint with search query
        response = await productApi.getProducts({ limit, offset, q: debouncedSearchQuery });
      } else {
        // Use regular products endpoint
        const params: { limit: number; offset: number; category?: string; gender?: string } = {
          limit,
          offset,
        };
        if (categoryFilter) {
          params.category = categoryFilter;
        }
        if (genderFilter) {
          params.gender = genderFilter;
        }
        response = await productApi.getProducts({
          limit,
          offset,
          category: categoryFilter || undefined,
          gender: genderFilter || undefined,
        });
      }
      
      setProducts(response.products);
      setTotal(response.total);
    } catch (err) {
      setError((err as AxiosError<ApiErrorResponse>).response?.data?.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const cats = await productApi.getCategories();
      setCategories(cats.map(cat => ({ id: cat.name, name: cat.name })));
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteDialog({ open: true, productId: id });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.productId) return;

    try {
      await productApi.deleteProduct(deleteDialog.productId);
      toast({
        variant: 'success',
        title: 'Product Deleted',
        description: 'Product has been permanently deleted.',
      });
      setDeleteDialog({ open: false, productId: null });
      fetchProducts(); // Refresh list
    } catch (err) {
      const errorMessage = (err as AxiosError<ApiErrorResponse>).response?.data?.message || 'Failed to delete product';
      toast({
        variant: 'error',
        title: 'Error',
        description: errorMessage,
      });
    }
  };

  const handleMoveClick = (productId: string, gender: 'men' | 'women') => {
    setMoveDialog({ open: true, productId, gender });
  };

  const handleMoveConfirm = async () => {
    if (!moveDialog.productId || !moveDialog.gender) return;

    try {
      await productApi.moveProductToGender(moveDialog.productId, moveDialog.gender);
      toast({
        variant: 'success',
        title: 'Product Moved',
        description: `Product has been moved to ${moveDialog.gender.toUpperCase()} category.`,
      });
      setMoveDialog({ open: false, productId: null, gender: null });
      fetchProducts(); // Refresh list
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Error',
        description: (err as AxiosError<ApiErrorResponse>).response?.data?.message || 'Failed to move product',
      });
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      await productApi.updateProductStatus(product.id, !product.is_active);
      toast({
        variant: 'success',
        title: 'Status Updated',
        description: `Product has been ${!product.is_active ? 'activated' : 'deactivated'} successfully.`,
      });
      fetchProducts(); // Refresh list
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Error',
        description: (err as AxiosError<ApiErrorResponse>).response?.data?.message || 'Failed to update product status',
      });
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Products</h1>
          <p className="text-gray-400">Manage your product catalog</p>
        </div>
        <Link
          to="/dashboard/products/create"
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
        >
          <Plus className="h-5 w-5" />
          <span>Add Product</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  fetchProducts();
                }
              }}
              className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Gender Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <label htmlFor="gender-select" className="sr-only">Filter by Gender</label>
            <select
              id="gender-select"
              value={genderFilter}
              onChange={(e) => {
                setGenderFilter(e.target.value);
                setPage(1);
              }}
              className="pl-10 pr-8 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Genders</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <label htmlFor="category-select" className="sr-only">Filter by Category</label>
            <select
              id="category-select"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="pl-10 pr-8 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
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
      ) : products.length === 0 ? (
        /* Empty State */
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-12 text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Products Found</h3>
          <p className="text-gray-400 mb-6">
            {categoryFilter
              ? `No products found in category "${categoryFilter}"`
              : 'Get started by adding your first product'}
          </p>
          <Link
            to="/dashboard/products/create"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            <Plus className="h-5 w-5" />
            <span>Add Product</span>
          </Link>
        </div>
      ) : (
        /* Products Grid */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-all group"
              >
                {/* Product Image - Full visibility (not cropped) */}
                <div className={`relative h-48 bg-gray-800 overflow-hidden flex items-center justify-center ${!product.is_active ? 'blur-sm opacity-60' : ''} transition-all duration-300`}>
                  {product.image_url || product.image_urls?.[0] ? (
                    <img
                      src={product.image_url || product.image_urls?.[0]}
                      alt={product.title}
                      className={`w-full h-full object-contain transition-transform duration-300 ${product.is_active ? 'group-hover:scale-105' : ''}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-16 w-16 text-gray-600" />
                    </div>
                  )}
                  {/* Status Indicator - Green/Red Dot */}
                  <ProductStatusIndicator isActive={product.is_active} />
                  
                  {/* Inactive Overlay */}
                  {!product.is_active && (
                    <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
                      <span className="text-red-400 font-bold text-lg">INACTIVE</span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className={`p-4 ${!product.is_active ? 'opacity-60' : ''} transition-opacity duration-300`}>
                  <h3 className={`text-lg font-semibold mb-1 line-clamp-1 ${product.is_active ? 'text-white' : 'text-gray-500'}`}>
                    {product.title}
                  </h3>
                  <p className={`text-sm mb-2 line-clamp-2 ${product.is_active ? 'text-gray-400' : 'text-gray-600'}`}>
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-2xl font-bold ${product.is_active ? 'text-white' : 'text-gray-500'}`}>
                      ₹{product.price_buyer.toLocaleString()}
                    </span>
                    <span className={`text-sm ${product.is_active ? 'text-gray-400' : 'text-gray-600'}`}>
                      Stock: {product.stock}
                    </span>
                  </div>
                  
                  {/* Active/Inactive Toggle - Below Stock */}
                  <div className="mb-3">
                    <ProductActiveToggle
                      isActive={product.is_active}
                      onToggle={async () => {
                        await handleToggleActive(product);
                      }}
                    />
                  </div>
                  {/* Gender Badge */}
                  {product.gender && (
                    <div className="mb-2">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/50 capitalize">
                        {product.gender}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col space-y-2">
                    {/* Move to Gender Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleMoveClick(product.id, 'men')}
                        className="flex-1 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all flex items-center justify-center space-x-1 text-xs"
                        title="Move to Men category"
                      >
                        <MoveRight className="h-3 w-3" />
                        <span>Men</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveClick(product.id, 'women')}
                        className="flex-1 px-3 py-1.5 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 rounded-lg transition-all flex items-center justify-center space-x-1 text-xs"
                        title="Move to Women category"
                      >
                        <MoveRight className="h-3 w-3" />
                        <span>Women</span>
                      </button>
                    </div>

                    {/* Edit and Delete */}
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/dashboard/products/${product.id}/edit`}
                        className="flex-1 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all flex items-center justify-center space-x-2"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Edit</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(product.id)}
                        aria-label="Delete product"
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4">
              <div className="text-sm text-gray-400">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} products
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-all"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-white">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone. The product will be permanently removed from the store."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialog({ open: false, productId: null })}
      />

      {/* Move Confirmation Dialog */}
      <ConfirmDialog
        open={moveDialog.open}
        title="Move Product"
        message={`Are you sure you want to move this product to ${moveDialog.gender?.toUpperCase()} category?`}
        confirmText="Move"
        cancelText="Cancel"
        variant="info"
        onConfirm={handleMoveConfirm}
        onCancel={() => setMoveDialog({ open: false, productId: null, gender: null })}
      />
    </div>
  );
}
