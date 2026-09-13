/**
 * Logo Component
 * Minimalistic Monster Energy style logo for Monster Men 90
 * Theme-based design with yellow/primary colors
 * Responsive: Full name on large screens, M only on smaller screens
 */

import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export default function Logo({ className = '', showText = true }: LogoProps) {
  return (
    <Link to="/" className={`flex items-center space-x-2 sm:space-x-3 group ${className}`}>
      {/* Monster Energy Style M Logo */}
      <div className="relative flex-shrink-0">
        {/* Main M - Minimalistic, bold, black on yellow background */}
        <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-primary dark:bg-primary rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-md">
          {/* Bold, angular M similar to Monster Energy */}
          <svg 
            viewBox="0 0 100 100" 
            className="w-full h-full p-2"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Left vertical line */}
            <path 
              d="M 20 20 L 20 80 L 30 80 L 30 50 L 50 80 L 50 20 L 40 20 L 40 50 Z" 
              fill="black" 
              className="dark:fill-gray-900"
            />
            {/* Right vertical line */}
            <path 
              d="M 50 20 L 50 80 L 60 80 L 60 50 L 80 80 L 80 20 L 70 20 L 70 50 Z" 
              fill="black" 
              className="dark:fill-gray-900"
            />
          </svg>
        </div>
      </div>
      
      {/* Brand Name - Only visible on larger screens (lg and above) */}
      {showText && (
        <div className="hidden lg:flex flex-col">
          <span className="text-lg xl:text-xl font-black text-gray-900 dark:text-gray-100 leading-tight tracking-tight">
            MONSTER
          </span>
          <span className="text-xs xl:text-sm font-bold text-gray-700 dark:text-gray-300 leading-tight -mt-0.5 tracking-wide">
            MEN 90
          </span>
        </div>
      )}
    </Link>
  );
}
