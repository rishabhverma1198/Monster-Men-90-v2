/**
 * Product Status Indicator Component
 * Shows a small green dot for active products, red dot for inactive
 * Common component for all product displays in admin panel
 */

interface ProductStatusIndicatorProps {
  isActive: boolean;
  className?: string;
}

export default function ProductStatusIndicator({ isActive, className = '' }: ProductStatusIndicatorProps) {
  return (
    <div
      className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
        isActive ? 'bg-green-500' : 'bg-red-500'
      } shadow-lg border-2 border-white dark:border-gray-800 ${className}`}
      title={isActive ? 'Product Active' : 'Product Inactive'}
      aria-label={isActive ? 'Product Active' : 'Product Inactive'}
    />
  );
}
