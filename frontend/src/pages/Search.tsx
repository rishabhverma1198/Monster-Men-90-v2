/**
 * Search Results Page
 * Dynamic search results from backend
 * Pixel-perfect product grid
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/common/ProductCard';
import { apiService } from '../services/api';
import type { Product } from '../types/api';
import BackButton from '../components/common/BackButton';
import Breadcrumb from '../components/common/Breadcrumb';

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const searchProducts = async () => {
      if (!query.trim()) {
        setProducts([]);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiService.searchProducts(query, { limit: 20, offset: 0 }, { signal: controller.signal });
        if (response.success) {
          setProducts(response.data.products || []);
        }
      } catch (err: any) {
        if (err?.code !== 'ABORTED') setError(err.message || 'Search failed');
      } finally {
        setIsLoading(false);
      }
    };
    searchProducts();
    return () => controller.abort();
  }, [query]);

  return (
    <div className="container-custom py-8">
      <Breadcrumb />
      {/* Back Button */}
      <div className="mb-6">
        <BackButton to="/" label="Back to Home" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {query ? `Search Results for "${query}"` : 'Search Products'}
      </h1>

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
          <p className="text-gray-500 mb-4">
            {query ? 'No products found matching your search.' : 'Enter a search query to find products.'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-6">{products.length} products found</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
