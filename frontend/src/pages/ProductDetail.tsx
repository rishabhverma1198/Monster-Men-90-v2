/**
 * Product Detail Page
 * Image gallery with zoom, size/quantity selectors, add to cart
 * Pixel-perfect: 500px × 500px main image
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ShoppingCart, Heart, Share2, Minus, Plus } from 'lucide-react';
import { apiService } from '../services/api';
import type { Product } from '../types/api';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useBuyerTypeStore } from '../store/buyerTypeStore';
import { useToast } from '../components/common/Toast';
import Breadcrumb from '../components/common/Breadcrumb';

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

export default function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const { addItem } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { buyerType } = useBuyerTypeStore();
  const { showToast } = useToast();

  useEffect(() => {
    if (!productId) return;
    const controller = new AbortController();
    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        const response = await apiService.getProductById(productId, { signal: controller.signal });
        if (response.success) {
          setProduct(response.data);
        } else {
          setError('Product not found');
        }
      } catch (err: any) {
        if (err?.code !== 'ABORTED') setError(err.message || 'Failed to load product');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
    return () => controller.abort();
  }, [productId]);

  const images = product?.image_urls || (product?.image_url ? [product.image_url] : []);
  const currentImage = images[selectedImageIndex] || '';

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!selectedSize) {
      showToast('Please select a size', 'warning');
      return;
    }

    setIsAddingToCart(true);
    try {
      await addItem(product!.id, quantity);
      showToast('Added to cart!', 'success');
    } catch (error: any) {
      console.error('Failed to add to cart:', error);
      showToast(error.message || 'Failed to add to cart. Please try again.', 'error');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    navigate('/checkout');
  };

  if (isLoading) {
    return (
      <div className="container-custom py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container-custom py-12">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Product not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <Breadcrumb />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image Gallery - 500px × 500px (desktop) */}
        <div>
          {/* Main Image */}
          <div className="w-full aspect-square max-w-[500px] mx-auto mb-4 bg-gray-100 rounded-lg overflow-hidden relative group">
            <img
              src={currentImage}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            {/* Zoom Indicator */}
            <div className="absolute top-4 right-4 bg-white/80 px-2 py-1 rounded text-xs text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
              Hover to zoom
            </div>
            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length)
                  }
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-900" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedImageIndex((prev) => (prev + 1) % images.length)
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5 text-gray-900" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails - 80px × 80px */}
          {images.length > 1 && (
            <div className="flex gap-2 justify-center">
              {images.map((img, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                    index === selectedImageIndex
                      ? 'border-primary scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={img}
                    alt={`${product.title} view ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          {/* Title - 28px, bold */}
          <h1 className="text-[28px] font-bold text-gray-900 mb-4">{product.title}</h1>

          {/* Price - 32px, bold - Based on buyer type */}
          <div className="mb-6">
            <p className="text-[32px] font-bold text-gray-900 dark:text-gray-100">
              ₹{(buyerType === 'wholeseller' && product.price_wholesale 
                ? product.price_wholesale 
                : product.price_buyer).toLocaleString('en-IN')}
            </p>
            {buyerType === 'wholeseller' && product.price_wholesale && (
              <p className="text-lg text-gray-500 dark:text-gray-400 line-through mt-1">
                ₹{product.price_buyer.toLocaleString('en-IN')}
              </p>
            )}
            {buyerType === 'single' && product.price_wholesale && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                Wholesale Price: ₹{product.price_wholesale.toLocaleString('en-IN')} 
                {product.wholesale_moq && ` (MOQ: ${product.wholesale_moq})`}
              </p>
            )}
          </div>

          {/* Description - 16px, line-height 1.6 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-base text-gray-600 leading-relaxed">{product.description}</p>
          </div>

          {/* Size Selector */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Size</h3>
            <div className="flex gap-2 flex-wrap">
              {SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={`w-10 h-10 border-2 rounded-md text-sm font-medium transition-all duration-300 ${
                    selectedSize === size
                      ? 'border-primary bg-primary text-gray-900'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quantity</h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                placeholder="Quantity"
                className="w-16 h-10 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-10 h-10 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mb-6">
            {/* Add to Cart - 100% width, 48px height */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isAddingToCart || !selectedSize}
              className="w-full h-12 bg-primary hover:bg-primary-dark text-gray-900 font-semibold rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isAddingToCart ? (
                <span className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </>
              )}
            </button>

            {/* Buy Now - 100% width, 48px height */}
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!selectedSize}
              className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Buy Now
            </button>
          </div>

          {/* Wishlist & Share */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors"
              aria-label="Add to wishlist"
            >
              <Heart className="w-5 h-5" />
              <span className="text-sm font-medium">Wishlist</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors"
              aria-label="Share product"
            >
              <Share2 className="w-5 h-5" />
              <span className="text-sm font-medium">Share</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
