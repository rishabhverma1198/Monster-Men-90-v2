/**
 * Cart Item Component
 * Individual cart item with quantity controls and remove button
 */

import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { CartItem as CartItemType } from '../../../types/api';

interface CartItemProps {
  item: CartItemType;
  buyerType: 'single' | 'wholeseller' | null;
  onUpdateQuantity: (cartItemId: string, quantity: number) => void;
  onDeleteClick: (cartItemId: string) => void;
}

function CartItem({
  item,
  buyerType,
  onUpdateQuantity,
  onDeleteClick,
}: CartItemProps) {
  // Handle both column name variations (name/title, buyer_price/price_buyer, etc.)
  const productName = item.products.name || item.products.title || 'Unknown Product';
  const imageUrl = item.products.image_url || item.products.image_urls?.[0] || '';
  
  // Handle price columns (buyer_price/price_buyer, wholesaler_price/price_wholesale)
  const buyerPrice = item.products.buyer_price || item.products.price_buyer || 0;
  const wholesalePrice = item.products.wholesaler_price || item.products.price_wholesale;
  
  const unitPrice = buyerType === 'wholeseller' && wholesalePrice
    ? wholesalePrice
    : buyerPrice;
  const price = unitPrice * item.quantity;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[150px] flex gap-4">
      {/* Product Image - 120px × 120px */}
      <Link
        to={`/product/${item.product_id}`}
        className="w-[120px] h-[120px] flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={productName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-400 text-sm">No Image</span>
          </div>
        )}
      </Link>

      {/* Product Info */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <Link
            to={`/product/${item.product_id}`}
            className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-primary transition-colors"
          >
            {item.products.title}
          </Link>
          <div className="mt-2">
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              ₹{price.toLocaleString('en-IN')}
            </p>
            {buyerType === 'wholeseller' && wholesalePrice && (
              <p className="text-sm text-gray-500 dark:text-gray-400 line-through">
                ₹{(buyerPrice * item.quantity).toLocaleString('en-IN')}
              </p>
            )}
            {buyerType === 'single' && wholesalePrice && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Wholesale: ₹{wholesalePrice.toLocaleString('en-IN')} (MOQ: 20)
              </p>
            )}
          </div>
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
              className="w-8 h-8 border border-gray-300 dark:border-gray-600 rounded-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-12 text-center font-medium text-gray-900 dark:text-gray-100">
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              className="w-8 h-8 border border-gray-300 dark:border-gray-600 rounded-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Remove Button */}
          <button
            onClick={() => onDeleteClick(item.id)}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors"
            aria-label="Remove item"
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(CartItem);
