/**
 * Checkout Page
 * Cart summary (read-only) + Mandatory form modal
 * NO payment - manual confirmation flow
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Info } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useBuyerTypeStore } from '../store/buyerTypeStore';
import { apiService } from '../services/api';
import BackButton from '../components/common/BackButton';
import CheckoutForm, { type CheckoutFormData } from '../components/features/checkout/CheckoutForm';
import OrderSummary from '../components/features/checkout/OrderSummary';
import Breadcrumb from '../components/common/Breadcrumb';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, getTotalAmount } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { buyerType } = useBuyerTypeStore();
  const [showFormModal, setShowFormModal] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const placeOrderKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (items.length === 0) {
      navigate('/cart');
      return;
    }
  }, [isAuthenticated, items.length, navigate]);

  const totalAmount = getTotalAmount();
  const shipping = totalAmount > 1000 ? 0 : 50;
  const tax = Math.round(totalAmount * 0.18);
  const finalTotal = totalAmount + shipping + tax;

  const handleCheckoutClick = () => {
    setShowFormModal(true);
    setError(null);
  };

  const handleFormSubmit = async (data: CheckoutFormData) => {
    setIsPlacingOrder(true);
    setError(null);

    if (!placeOrderKeyRef.current) {
      placeOrderKeyRef.current = crypto.randomUUID();
    }
    const idempotencyKey = placeOrderKeyRef.current;

    try {
      const response = await apiService.createOrder(
        {
          user_type: buyerType || 'single',
          user_details: {
            name: data.name,
            email: data.email,
            contact_number: data.contactNumber,
          },
        },
        idempotencyKey
      );

      if (response.success) {
        placeOrderKeyRef.current = null;
        navigate(`/order-success/${response.data.id}`, {
          state: {
            orderNumber: response.data.order_number,
            customerName: data.name,
            contactNumber: data.contactNumber,
          },
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (!isAuthenticated || items.length === 0) {
    return null;
  }

  return (
    <div className="container-custom py-8">
      <Breadcrumb />
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <BackButton to="/cart" label="Back to Cart" />
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Checkout</h1>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900 dark:text-blue-100">
          <p className="font-semibold mb-1">Order Summary</p>
          <p>Review your cart items below. Click "Checkout" to complete your order.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items - Read Only (2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Cart Items</h2>
          {items.map((item) => {
            const imageUrl = item.products.image_url || item.products.image_urls?.[0] || '';
            const buyerPrice = item.products.buyer_price || item.products.price_buyer || 0;
            const wholesalePrice = item.products.wholesaler_price || item.products.price_wholesale;
            const unitPrice = buyerType === 'wholeseller' && wholesalePrice
              ? wholesalePrice
              : buyerPrice;
            const price = unitPrice * item.quantity;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex gap-4"
              >
                {/* Product Image */}
                <div className="w-[120px] h-[120px] flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={item.products.title}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-400 text-sm">No Image</span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {item.products.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        ₹{price.toLocaleString('en-IN')}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Quantity: {item.quantity}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary & Checkout Button (1 column) */}
        <div className="lg:col-span-1">
          <OrderSummary
            totalAmount={totalAmount}
            shipping={shipping}
            tax={tax}
            finalTotal={finalTotal}
            onCheckoutClick={handleCheckoutClick}
          />
        </div>
      </div>

      {/* Mandatory Form Modal */}
      <CheckoutForm
        isOpen={showFormModal}
        isSubmitting={isPlacingOrder}
        error={error}
        onClose={() => {
          setShowFormModal(false);
          setError(null);
        }}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
