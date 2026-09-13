/**
 * Floating Back Button Component
 * Fixed position button at bottom right of page
 * Always navigates to home page
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function FloatingBackButton() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Don't show on home page
  if (location.pathname === '/') {
    return null;
  }

  const handleClick = () => {
    navigate('/');
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-primary hover:bg-primary-dark text-gray-900 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
      aria-label="Back to Home"
      title="Back to Home"
    >
      <ArrowLeft className="w-6 h-6" />
    </button>
  );
}
