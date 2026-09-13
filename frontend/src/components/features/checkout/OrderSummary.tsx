/**
 * Order Summary Component
 * Read-only order summary for checkout page
 */

interface OrderSummaryProps {
  totalAmount: number;
  shipping: number;
  tax: number;
  finalTotal: number;
  onCheckoutClick: () => void;
}

export default function OrderSummary({
  totalAmount,
  shipping,
  tax,
  finalTotal,
  onCheckoutClick,
}: OrderSummaryProps) {
  return (
    <div className="lg:sticky lg:top-20 bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Order Summary</h2>

      <div className="space-y-3 mb-6">
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
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Total</span>
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
            ₹{finalTotal.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Checkout Button */}
      <button
        onClick={onCheckoutClick}
        className="w-full h-12 bg-primary hover:bg-primary-dark text-gray-900 font-semibold rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Checkout
      </button>
    </div>
  );
}
