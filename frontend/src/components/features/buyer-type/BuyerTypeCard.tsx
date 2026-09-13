/**
 * Buyer Type Card Component
 * Card for selecting buyer type (Single/Wholeseller)
 */

import { ArrowRight, ShoppingBag, Package } from 'lucide-react';

interface BuyerTypeCardProps {
  type: 'single' | 'wholeseller';
  title: string;
  description: string;
  buttonText: string;
  isAnimating: boolean;
  onClick: () => void;
}

export default function BuyerTypeCard({
  type,
  title,
  description,
  buttonText,
  isAnimating,
  onClick,
}: BuyerTypeCardProps) {
  const Icon = type === 'single' ? ShoppingBag : Package;
  const gradientFrom = type === 'single' ? 'from-blue-50' : 'from-green-50';
  const gradientTo = type === 'single' ? 'to-indigo-100' : 'to-emerald-100';
  const iconColor = type === 'single' ? 'text-blue-600' : 'text-green-600';

  return (
    <div
      className={`group relative bg-white rounded-2xl overflow-hidden shadow-2xl cursor-pointer transform transition-all duration-500 hover:scale-105 hover:shadow-3xl border-2 border-gray-200 ${
        isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
      onClick={onClick}
    >
      {/* Image Container */}
      <div className={`relative h-[450px] md:h-[550px] overflow-hidden bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center`}>
        <Icon className={`w-32 h-32 ${iconColor} group-hover:scale-110 transition-transform duration-700`} />
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
        <h2 className="text-2xl md:text-3xl font-black text-white mb-2">{title}</h2>
        <p className="text-white/90 mb-4 text-sm md:text-base">{description}</p>
        <button className="w-full bg-primary hover:bg-primary-dark text-gray-900 font-black text-lg md:text-xl py-4 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-lg border-2 border-gray-900">
          {buttonText}
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
