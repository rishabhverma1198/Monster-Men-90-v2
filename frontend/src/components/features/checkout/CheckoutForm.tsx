/**
 * Checkout Form Component
 * Mandatory form modal for order completion
 */

import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const checkoutFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  contactNumber: z.string().regex(/^[6-9]\d{9}$/, 'Invalid contact number (10 digits required)'),
});

export type CheckoutFormData = z.infer<typeof checkoutFormSchema>;

interface CheckoutFormProps {
  isOpen: boolean;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (data: CheckoutFormData) => void;
}

export default function CheckoutForm({
  isOpen,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: CheckoutFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutFormSchema),
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  // Pre-compute ARIA invalid values as string literals for accessibility
  const nameAriaInvalid = (errors.name ? "true" : "false") as "true" | "false";
  const emailAriaInvalid = (errors.email ? "true" : "false") as "true" | "false";
  const contactNumberAriaInvalid = (errors.contactNumber ? "true" : "false") as "true" | "false";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Complete Your Order
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Please provide your details to complete the order. All fields are required.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Name *
            </label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-gray-100"
              {...({ 'aria-invalid': nameAriaInvalid } as any)}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Email *
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-gray-100"
              {...({ 'aria-invalid': emailAriaInvalid } as any)}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Contact Number */}
          <div>
            <label htmlFor="contactNumber" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Contact Number *
            </label>
            <input
              id="contactNumber"
              type="tel"
              {...register('contactNumber')}
              placeholder="10-digit mobile number"
              maxLength={10}
              className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-gray-100"
              {...({ 'aria-invalid': contactNumberAriaInvalid } as any)}
            />
            {errors.contactNumber && (
              <p className="mt-1 text-xs text-red-500">{errors.contactNumber.message}</p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 h-11 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-11 px-4 bg-primary hover:bg-primary-dark text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
