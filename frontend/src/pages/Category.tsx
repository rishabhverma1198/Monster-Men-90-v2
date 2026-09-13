/**
 * Category Listing Page
 * Filters sidebar, product grid, sorting
 * Pixel-perfect implementation
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ProductCard from '../components/common/ProductCard';
import { apiService } from '../services/api';
import type { Product } from '../types/api';
import { Filter, X } from 'lucide-react';
import BackButton from '../components/common/BackButton';
import Breadcrumb from '../components/common/Breadcrumb';

export default function Category() {
  const { categoryName } = useParams<{ categoryName: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'created_at' | 'price' | 'title'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (!categoryName) return;
    const controller = new AbortController();
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const response = await apiService.getProducts(
          { limit: 20, offset: 0, category: categoryName },
          { signal: controller.signal }
        );
        if (response.success) {
          const sortedProducts = [...(response.data.products || [])];
          sortedProducts.sort((a, b) => {
            if (sortBy === 'price') {
              return sortOrder === 'asc' ? a.price_buyer - b.price_buyer : b.price_buyer - a.price_buyer;
            }
            if (sortBy === 'title') {
              return sortOrder === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
            }
            return 0;
          });
          setProducts(sortedProducts);
        }
      } catch (err: any) {
        if (err?.code !== 'ABORTED') setError(err.message || 'Failed to load products');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
    return () => controller.abort();
  }, [categoryName, sortBy, sortOrder]);

  return (
    <div className="container-custom py-8">
      <Breadcrumb />
      {/* Back Button */}
      <div className="mb-6">
        <BackButton to="/" label="Back to Home" />
      </div>
      <div className="flex gap-6">
        {/* Filters Sidebar - 280px width, sticky */}
        <aside
          className={`hidden lg:block w-[280px] bg-white border-r border-gray-200 p-6 sticky top-20 h-fit ${
            showFilters ? 'block' : 'hidden'
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-gray-900">Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="lg:hidden"
              aria-label="Close filters"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Sections */}
          <div className="space-y-6">
            {/* Price Filter */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Price</h4>
              <div className="space-y-2">
                {[
                  { label: 'Under ₹500', min: 0, max: 500 },
                  { label: '₹500 - ₹1000', min: 500, max: 1000 },
                  { label: '₹1000 - ₹2000', min: 1000, max: 2000 },
                  { label: 'Above ₹2000', min: 2000, max: Infinity },
                ].map((range) => (
                  <label
                    key={range.label}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">{range.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Size Filter */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Size</h4>
              <div className="flex flex-wrap gap-2">
                {['S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                  <button
                    key={size}
                    className="w-10 h-10 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:border-primary hover:bg-primary/10 transition-colors"
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Sort Bar - 48px height */}
          <div className="bg-gray-50 h-12 flex items-center justify-between mb-6 px-4 rounded-lg">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center gap-2 text-sm font-medium text-gray-700"
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>
              <span className="text-sm text-gray-600">
                {products.length} products
              </span>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-sm text-gray-600">
                Sort by:
              </label>
              <select
                id="sort"
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as typeof sortBy);
                  setSortOrder(order as typeof sortOrder);
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="title-asc">Name: A to Z</option>
                <option value="title-desc">Name: Z to A</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500">{error}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No products found in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
