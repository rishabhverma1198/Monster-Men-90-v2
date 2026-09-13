/**
 * Hero Product Card Component
 * Large featured product card for top slider
 * Similar to Bewakoof.com hero section
 */

import { Link } from 'react-router-dom';
import type { Product } from '../../types/api';

interface HeroProductCardProps {
  product: Product;
  index: number;
  isActive: boolean;
}

export default function HeroProductCard({ product, isActive }: HeroProductCardProps) {
  const imageUrl = product.image_urls?.[0] || product.image_url || '';
  
  return (
    <Link
      to={`/product/${product.id}`}
      className={`block w-full h-full transition-opacity duration-500 ${
        isActive ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="relative w-full h-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 group">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.title}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
            <span className="text-gray-400 text-lg">No Image</span>
          </div>
        )}
        
        {/* Overlay with Product Info */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">{product.title}</h3>
          <p className="text-xl md:text-2xl font-bold text-primary">₹{product.price_buyer.toLocaleString('en-IN')}</p>
        </div>
      </div>
    </Link>
  );
}
