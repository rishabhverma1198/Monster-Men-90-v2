/**
 * Cart Page
 * Product list with quantity controls, order summary
 * Pixel-perfect: Item cards 150px min-height, summary 350px width
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Package, User } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useBuyerTypeStore } from '../store/buyerTypeStore';
import CartItem from '../components/features/cart/CartItem';
import CartSummary from '../components/features/cart/CartSummary';
import Breadcrumb from '../components/common/Breadcrumb';

export default function Cart() {
  const { items, isLoading, fetchCart, updateQuantity, removeItem } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { buyerType, setBuyerType } = useBuyerTypeStore();
  const navigate = useNavigate();
  const [showBuyerTypeModal, setShowBuyerTypeModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const controller = new AbortController();
    fetchCart(controller.signal);
    return () => controller.abort();
  }, [isAuthenticated, fetchCart, navigate]);

  const totalAmount = useMemo(() => {
    let total = 0;
    items.forEach((item) => {
      const buyerPrice = item.products.buyer_price || item.products.price_buyer || 0;
      const wholesalePrice = item.products.wholesaler_price || item.products.price_wholesale;
      const productPrice = buyerType === 'wholeseller' && wholesalePrice ? wholesalePrice : buyerPrice;
      total += productPrice * item.quantity;
    });
    return total;
  }, [items, buyerType]);

  const shipping = useMemo(() => (totalAmount > 1000 ? 0 : 50), [totalAmount]);
  const tax = useMemo(() => Math.round(totalAmount * 0.18), [totalAmount]);
  const finalTotal = useMemo(() => totalAmount + shipping + tax, [totalAmount, shipping, tax]);

  const moqMessage = useMemo(() => {
    const wholesaleItems = items.filter((item) => {
      const wholesalePrice = item.products.wholesaler_price || item.products.price_wholesale;
      return buyerType === 'single' && wholesalePrice;
    });
    if (wholesaleItems.length > 0) {
      const minMOQ = 10;
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      const needed = Math.max(0, minMOQ - totalQuantity);
      if (needed > 0) return `Add ${needed} more item(s) to unlock wholesale pricing`;
    }
    return null;
  }, [items, buyerType]);

  const handleDeleteClick = useCallback((cartItemId: string) => {
    setItemToDelete(cartItemId);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (itemToDelete) {
      await removeItem(itemToDelete);
      setItemToDelete(null);
    }
  }, [itemToDelete, removeItem]);

  const handleDeleteCancel = useCallback(() => {
    setItemToDelete(null);
  }, []);

  if (!isAuthenticated) {
    return null;
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

  if (items.length === 0) {
    return (
      <div className="container-custom py-12">
        <div className="flex flex-col items-center justify-center min-h-[60vh] py-16">
          {/* Shopping Bag with Balloon Illustration */}
          <div className="relative mb-8">
            {/* Balloon */}
            <div className="absolute -top-8 -left-4 w-16 h-20 bg-primary rounded-full flex items-center justify-center transform rotate-[-15deg]">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-xs">😊</span>
              </div>
              {/* String */}
              <div className="absolute top-full left-1/2 w-0.5 h-6 bg-gray-300 transform -translate-x-1/2" />
            </div>
            
            {/* Shopping Bag */}
            <div className="relative w-24 h-32 bg-primary rounded-lg flex items-center justify-center shadow-lg">
              <ShoppingBag className="w-12 h-12 text-gray-900" />
            </div>
          </div>

          {/* Text */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Hey, your bag feels so light!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-center">
            Let's add some items in your bag
          </p>

          {/* Start Shopping Button */}
          <Link
            to="/"
            className="inline-block px-8 py-4 bg-primary hover:bg-primary-dark text-gray-900 font-bold rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
          >
            START SHOPPING
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-8">
      <Breadcrumb />
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Shopping Cart</h1>
        
        {/* Buyer Type Switcher */}
        <button
          onClick={() => setShowBuyerTypeModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          {buyerType === 'wholeseller' ? (
            <>
              <Package className="w-5 h-5" />
              <span className="text-sm font-medium">Wholesale Buyer</span>
            </>
          ) : (
            <>
              <User className="w-5 h-5" />
              <span className="text-sm font-medium">Individual Buyer</span>
            </>
          )}
        </button>
      </div>

      {/* MOQ Unlock Message */}
      {moqMessage && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {moqMessage}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items - 2 columns on desktop */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              buyerType={buyerType}
              onUpdateQuantity={updateQuantity}
              onDeleteClick={handleDeleteClick}
            />
          ))}
        </div>

        {/* Order Summary - 1 column */}
        <div className="lg:col-span-1">
          <CartSummary
            totalAmount={totalAmount}
            shipping={shipping}
            tax={tax}
            finalTotal={finalTotal}
          />
        </div>
      </div>

      {/* Buyer Type Modal */}
      {showBuyerTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Change Buyer Type
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Select your buyer type to see appropriate pricing
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setBuyerType('single');
                  setShowBuyerTypeModal(false);
                }}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  buyerType === 'single'
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <User className="w-6 h-6" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Single Buyer</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Regular pricing for personal use</p>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => {
                  setBuyerType('wholeseller');
                  setShowBuyerTypeModal(false);
                }}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  buyerType === 'wholeseller'
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Package className="w-6 h-6" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Wholesale Buyer</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Bulk orders with wholesale pricing</p>
                  </div>
                </div>
              </button>
            </div>
            
            <button
              onClick={() => setShowBuyerTypeModal(false)}
              className="mt-6 w-full py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Remove Item
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to remove this cart item?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 h-11 px-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
