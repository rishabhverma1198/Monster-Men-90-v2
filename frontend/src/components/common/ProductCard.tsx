/**
 * Product Card Component
 * Pixel-perfect: 280px × 350px
 * Matches Bewakoof.com card design exactly
 */

import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import type { Product } from '../../types/api';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useBuyerTypeStore } from '../../store/buyerTypeStore';
import { useState, useEffect, memo, useCallback } from 'react';
import QuantityModal from './QuantityModal';

/**
 * Product Status Indicator - Green/Red Dot
 * GREEN DOT = PRODUCT ACTIVE
 * RED DOT = PRODUCT INACTIVE
 */
function ProductStatusIndicator({ isActive }: { isActive: boolean }) {
  return (
    <div
      className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${
        isActive ? 'bg-green-500' : 'bg-red-500'
      } shadow-md border border-white dark:border-gray-800 z-10`}
      title={isActive ? 'Product Active' : 'Product Inactive'}
      aria-label={isActive ? 'Product Active' : 'Product Inactive'}
    />
  );
}

interface ProductCardProps {
  product: Product;
}

// SVG Placeholder - No network request
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgwIiBoZWlnaHQ9IjI4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjgwIiBoZWlnaHQ9IjI4MCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';

function ProductCard({ product }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  
  // Initialize with placeholder to prevent empty string
  const getInitialImageSrc = () => {
    const url = product.image_urls?.[0] || product.image_url;
    return (url && url.trim() !== '') ? url : PLACEHOLDER_IMAGE;
  };
  
  const [imageSrc, setImageSrc] = useState<string>(getInitialImageSrc());
  const { addItem } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { buyerType } = useBuyerTypeStore();

  // Determine price based on buyer type
  const price = buyerType === 'wholeseller' && product.price_wholesale 
    ? product.price_wholesale 
    : product.price_buyer;

  // Update image source when product changes - prevent multiple requests
  useEffect(() => {
    const url = product.image_urls?.[0] || product.image_url;
    
    if (url && url.trim() !== '' && url !== imageSrc) {
      setImageSrc(url);
      setImageError(false);
    } else if (!url || url.trim() === '') {
      // Use placeholder if no URL
      if (imageSrc !== PLACEHOLDER_IMAGE) {
        setImageSrc(PLACEHOLDER_IMAGE);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, product.image_urls, product.image_url]);

  const handleAddToCart = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      const returnUrl = window.location.pathname + window.location.search || '/';
      window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
      return;
    }

    // For wholeseller: open quantity modal (min 20)
    if (buyerType === 'wholeseller') {
      setShowQuantityModal(true);
      return;
    }

    // For single buyer: add with quantity 1
    setIsAdding(true);
    try {
      await addItem(product.id, 1);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsAdding(false);
    }
  }, [product.id, isAuthenticated, addItem, buyerType]);

  const handleQuantityConfirm = useCallback(async (quantity: number) => {
    setIsAdding(true);
    try {
      await addItem(product.id, quantity);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsAdding(false);
    }
  }, [product.id, addItem]);

  return (
    <Link
      to={`/product/${product.id}`}
      className="block group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`View ${product.title}`}
    >
      <div className="w-full max-w-[280px] mx-auto bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100 dark:border-gray-700">
        {/* Image Container - Bewakoof style: 280px × 350px card, image takes most space */}
        <div className={`w-full h-[280px] overflow-hidden bg-gray-50 dark:bg-gray-700 relative group flex items-center justify-center ${!product.is_active ? 'blur-sm opacity-60' : ''} transition-all duration-300`}>
          {imageSrc && imageSrc.trim() !== '' ? (
            <img
              src={imageSrc}
              alt={product.title}
              className={`w-full h-full object-contain transition-transform duration-500 ease-out ${
                product.is_active && isHovered ? 'scale-105' : 'scale-100'
              }`}
              loading="lazy"
              onError={() => {
                // Prevent infinite loop - only set error once
                if (!imageError && imageSrc !== PLACEHOLDER_IMAGE) {
                  setImageError(true);
                  // Use SVG data URL as placeholder (no network request)
                  setImageSrc(PLACEHOLDER_IMAGE);
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <span className="text-gray-400 text-sm">No Image</span>
            </div>
          )}
          {/* Hover overlay effect - only for active products */}
          {product.is_active && isHovered && !imageError && imageSrc && imageSrc !== PLACEHOLDER_IMAGE && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent transition-opacity duration-300" />
          )}
          
          {/* Status Indicator - Green/Red Dot */}
          <ProductStatusIndicator isActive={product.is_active ?? true} />
          
          {/* Inactive Overlay */}
          {!product.is_active && (
            <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center pointer-events-none">
              <span className="text-red-400 font-bold text-sm">INACTIVE</span>
            </div>
          )}
        </div>

        {/* Product Info - Compact footer like Bewakoof */}
        <div className="p-3 space-y-2">
          {/* Title - Single line, ellipsis, bold */}
          <h3 
            className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight transition-colors" 
            title={product.title}
          >
            {product.title}
          </h3>

          {/* Price and Add Button Row */}
          <div className="flex items-center justify-between">
            {/* Price - Bold, prominent */}
            <span className="text-base font-bold text-gray-900 dark:text-gray-100 transition-colors">
              ₹{price.toLocaleString('en-IN')}
            </span>

            {/* Add to Cart Button - Yellow/primary color like Bewakoof */}
            <button
              onClick={handleAddToCart}
              disabled={isAdding}
              className="flex items-center justify-center gap-1 px-3 py-1.5 bg-[#ffdc46] hover:bg-[#ffd700] text-gray-900 text-xs font-bold rounded transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              aria-label={`Add ${product.title} to cart`}
            >
              {isAdding ? (
                <span className="w-3 h-3 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Add</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quantity Modal for Wholeseller */}
      <QuantityModal
        isOpen={showQuantityModal}
        onClose={() => setShowQuantityModal(false)}
        onConfirm={handleQuantityConfirm}
        productTitle={product.title}
        minQuantity={20}
      />
    </Link>
  );
}

// Memoize component to prevent unnecessary re-renders
// Only re-render if product id or price changes
export default memo(ProductCard, (prevProps, nextProps) => {
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.price_buyer === nextProps.product.price_buyer &&
    prevProps.product.title === nextProps.product.title &&
    prevProps.product.image_urls?.[0] === nextProps.product.image_urls?.[0]
  );
});
