/**
 * Product Active Toggle Component
 * Slider toggle with Active/Inactive text
 * Green text for Active, Red text for Inactive
 * Common component for all product cards in admin panel
 */

import { useState } from 'react';

interface ProductActiveToggleProps {
  isActive: boolean;
  onToggle: (newStatus: boolean) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}

export default function ProductActiveToggle({
  isActive,
  onToggle,
  disabled = false,
  className = '',
}: ProductActiveToggleProps) {
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    if (disabled || isToggling) return;
    
    setIsToggling(true);
    try {
      await onToggle(!isActive);
    } catch (error) {
      console.error('Failed to toggle product status:', error);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Toggle Switch */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled || isToggling}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
          isActive ? 'bg-green-500' : 'bg-red-500'
        } ${disabled || isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        aria-label={isActive ? 'Deactivate product' : 'Activate product'}
        title={isActive ? 'Deactivate product' : 'Activate product'}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isActive ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>

      {/* Status Text */}
      <span
        className={`text-xs font-semibold ${
          isActive ? 'text-green-400' : 'text-red-400'
        } ${disabled || isToggling ? 'opacity-50' : ''}`}
      >
        {isActive ? 'Active' : 'Inactive'}
      </span>
    </div>
  );
}
