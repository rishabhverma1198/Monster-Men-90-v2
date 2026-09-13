/**
 * Quantity Modal Component
 * For wholeseller buyers - custom quantity input with minimum 20
 */

import { useState } from 'react';
import { X } from 'lucide-react';

interface QuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  productTitle: string;
  minQuantity?: number;
}

export default function QuantityModal({
  isOpen,
  onClose,
  onConfirm,
  productTitle,
  minQuantity = 20,
}: QuantityModalProps) {
  const [quantity, setQuantity] = useState<number>(minQuantity);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setQuantity(minQuantity);
    setError(null);
    onClose();
  };

  const handleConfirm = () => {
    if (quantity < minQuantity) {
      setError(`Minimum quantity is ${minQuantity}`);
      return;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError('Quantity must be a positive number');
      return;
    }
    onConfirm(quantity);
    handleClose();
  };

  const handleIncrement = () => {
    setQuantity((prev) => prev + 1);
    setError(null);
  };

  const handleDecrement = () => {
    if (quantity > minQuantity) {
      setQuantity((prev) => prev - 1);
      setError(null);
    } else {
      setError(`Minimum quantity is ${minQuantity}`);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= minQuantity) {
      setQuantity(value);
      setError(null);
    } else if (e.target.value === '') {
      setQuantity(minQuantity);
    } else {
      setError(`Minimum quantity is ${minQuantity}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Enter Quantity
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Title */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {productTitle}
        </p>

        {/* Quantity Input */}
        <div className="mb-6">
          <label htmlFor="quantity-input" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Quantity (Minimum: {minQuantity})
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={quantity <= minQuantity}
              className="w-10 h-10 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Decrease quantity"
            >
              <span className="text-lg font-bold">−</span>
            </button>
            <input
              id="quantity-input"
              type="number"
              value={quantity}
              onChange={handleInputChange}
              min={minQuantity}
              placeholder={`Enter quantity (min: ${minQuantity})`}
              aria-describedby={error ? "error-message" : undefined}
              className="flex-1 h-10 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-gray-100"
            />
            <button
              type="button"
              onClick={handleIncrement}
              className="w-10 h-10 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              aria-label="Increase quantity"
            >
              <span className="text-lg font-bold">+</span>
            </button>
          </div>
          {error && (
            <p id="error-message" className="mt-2 text-sm text-red-500">{error}</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 h-11 px-4 bg-primary hover:bg-primary-dark text-gray-900 font-semibold rounded-lg transition-colors"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
