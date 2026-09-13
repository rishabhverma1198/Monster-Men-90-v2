/**
 * Cart Summary Component
 * Order summary sidebar with totals and checkout button
 */

import { Link } from 'react-router-dom';

interface CartSummaryProps {
  totalAmount: number;
  shipping: number;
  tax: number;
  finalTotal: number;
}

export default function CartSummary({
  totalAmount,
  shipping,
  tax,
  finalTotal,
}: CartSummaryProps) {
  return (
    <div className="lg:sticky lg:top-20 bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Order Summary</h2>

      <div className="space-y-4 mb-6">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Subtotal</span>
          <span>₹{totalAmount.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Shipping</span>
          <span>{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Tax (GST)</span>
          <span>₹{tax.toLocaleString('en-IN')}</span>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-between">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Total</span>
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
            ₹{finalTotal.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Checkout Button */}
      <Link
        to="/checkout"
        className="block w-full h-12 bg-primary hover:bg-primary-dark text-gray-900 font-semibold rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-center leading-[48px]"
      >
        Proceed to Checkout
      </Link>

      {/* Continue Shopping */}
      <Link
        to="/"
        className="block w-full mt-3 text-center text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
      >
        Continue Shopping
      </Link>
    </div>
  );
}
