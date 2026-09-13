/**
 * Wishlist Page
 * Display user's saved products (when backend endpoint is ready)
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import ProductCard from '../components/common/ProductCard';
import BackButton from '../components/common/BackButton';
import type { Product } from '../types/api';
import Breadcrumb from '../components/common/Breadcrumb';

export default function Wishlist() {
  const { isAuthenticated } = useAuthStore();
  const [wishlistItems] = useState<Product[]>([]);
  const [isLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // TODO: Implement when backend endpoint is ready
    // const fetchWishlist = async () => {
    //   try {
    //     setIsLoading(true);
    //     const response = await apiService.getWishlist();
    //     if (response.success) {
    //       setWishlistItems(response.data || []);
    //     }
    //   } catch (err) {
    //     console.error('Failed to load wishlist:', err);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // };
    // fetchWishlist();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="container-custom py-12">
        <div className="text-center">
          <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h2>
          <p className="text-gray-600 mb-6">Please login to view your wishlist</p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 bg-primary hover:bg-primary-dark text-gray-900 font-semibold rounded-lg transition-colors duration-300"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container-custom py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <Breadcrumb />
      {/* Back Button */}
      <div className="mb-6">
        <BackButton to="/" label="Back to Home" />
      </div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
      </div>

      {wishlistItems.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your wishlist is empty</h2>
          <p className="text-gray-600 mb-6">Start adding products to your wishlist!</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-primary hover:bg-primary-dark text-gray-900 font-semibold rounded-lg transition-colors duration-300"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {wishlistItems.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
