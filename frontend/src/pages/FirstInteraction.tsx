/**
 * First Interaction Page
 * Shows Individual Buyer vs Wholesale Buyer selection on first visit
 * Saves selection to localStorage
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBuyerTypeStore } from '../store/buyerTypeStore';
import BuyerTypeCard from '../components/features/buyer-type/BuyerTypeCard';

export default function FirstInteraction() {
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(false);
  const { setBuyerType, hasSelectedBuyerType } = useBuyerTypeStore();

  // Check if user has already selected buyer type
  useEffect(() => {
    if (hasSelectedBuyerType()) {
      navigate('/');
    }
  }, [navigate, hasSelectedBuyerType]);

  const handleSelection = (type: 'single' | 'wholeseller') => {
    setIsAnimating(true);
    
    // Store selection in buyer type store
    setBuyerType(type);
    
    // Small delay for animation
    setTimeout(() => {
      navigate('/');
    }, 300);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-yellow-200 via-yellow-100 to-yellow-50">
      {/* Background Pattern with Characters (Similar to Bewakoof but different) */}
      <div className="absolute inset-0 opacity-20">
        {/* Decorative geometric shapes instead of characters */}
        <div className="absolute top-20 left-10 w-24 h-24 border-4 border-gray-800 rounded-full" />
        <div className="absolute top-40 right-20 w-32 h-32 border-4 border-gray-800 transform rotate-45" />
        <div className="absolute bottom-32 left-1/4 w-20 h-20 bg-gray-800 rounded-full" />
        <div className="absolute bottom-20 right-1/3 w-28 h-28 border-4 border-gray-800 transform rotate-12" />
        <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-gray-800" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Logo/Brand */}
        <div className="mb-8 animate-fadeIn">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-gray-900">
              <span className="text-3xl font-bold text-gray-900">M</span>
            </div>
            <span className="text-4xl md:text-5xl font-bold text-gray-900 drop-shadow-sm">
              MonsterMens90
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-center text-gray-900 mb-2 drop-shadow-sm">
            CHOOSE YOUR BUYER TYPE
          </h1>
        </div>

        {/* Buyer Type Cards */}
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mt-8">
          <BuyerTypeCard
            type="single"
            title="Single Buyer"
            description="Shop for yourself with regular pricing"
            buttonText="Continue as Single Buyer"
            isAnimating={isAnimating}
            onClick={() => handleSelection('single')}
          />
          <BuyerTypeCard
            type="wholeseller"
            title="Wholesale Buyer"
            description="Bulk orders with wholesale pricing & MOQ"
            buttonText="Continue as Wholesale"
            isAnimating={isAnimating}
            onClick={() => handleSelection('wholeseller')}
          />
        </div>

      </div>

      {/* Dark Mode Support */}
      <style>{`
        .dark .min-h-screen {
          background: linear-gradient(to bottom right, #1a1a1a, #2d2d2d, #1a1a1a);
        }
      `}</style>
    </div>
  );
}
