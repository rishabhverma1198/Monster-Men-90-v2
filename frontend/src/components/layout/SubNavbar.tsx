/**
 * Sub Navbar Component
 * Sticky sub-navigation below main navbar
 * MEN/WOMEN toggle and category links
 */

import { Link, useLocation } from 'react-router-dom';
import { useCategoryStore } from '../../store/categoryStore';

const SUB_CATEGORIES = [
  { name: 'WINTERWEAR', slug: 'winterwear' },
  { name: 'SUMMER WEAR', slug: 'summer-wear' },
  { name: 'TRENDING', slug: 'trending' },
  { name: 'PLUS SIZE', slug: 'plus-size' },
];

export default function SubNavbar() {
  const location = useLocation();
  const { selectedCategory, setCategory } = useCategoryStore();

  // Don't show on welcome page and login/signup pages
  if (location.pathname === '/welcome' || location.pathname === '/login' || location.pathname === '/signup') {
    return null;
  }

  const handleCategorySelect = (category: 'men' | 'women') => {
    setCategory(category);
    // Don't navigate, just filter products on current page
    // Products will be filtered based on selectedCategory in Home.tsx
  };

  return (
    <div className="sticky top-16 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-300">
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-12 w-full gap-4 md:gap-6">
          {/* MEN/WOMEN Toggle - fixed on left with margin */}
          <div className="flex items-center flex-shrink-0">
            <div className="relative bg-gray-200 dark:bg-gray-700 rounded-full p-1 flex items-center">
              <div
                className={`absolute top-1 bottom-1 rounded-full bg-primary transition-all duration-300 ease-in-out ${
                  selectedCategory === 'men'
                    ? 'left-1 right-1/2 mr-1'
                    : selectedCategory === 'women'
                    ? 'left-1/2 right-1 ml-1'
                    : 'left-1 right-1'
                }`}
              />
              <button
                type="button"
                onClick={() => handleCategorySelect('men')}
                className={`relative z-10 px-4 sm:px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                  selectedCategory === 'men'
                    ? 'text-gray-900 dark:text-gray-900'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                MEN
              </button>
              <button
                type="button"
                onClick={() => handleCategorySelect('women')}
                className={`relative z-10 px-4 sm:px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                  selectedCategory === 'women'
                    ? 'text-gray-900 dark:text-gray-900'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                WOMEN
              </button>
            </div>
          </div>

          {/* Category Links - fill remaining space with equal gaps (auto-adjusts for any number of items) */}
          <nav className="hidden md:flex flex-1 items-center justify-evenly min-w-0">
            {SUB_CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                to={`/category/${category.slug}`}
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors whitespace-nowrap px-2 py-1 flex-shrink-0"
              >
                {category.name}
              </Link>
            ))}
          </nav>

          {/* Mobile: scrollable category strip */}
          <nav className="flex md:hidden flex-1 overflow-x-auto scrollbar-hide gap-4 min-w-0 py-1">
            {SUB_CATEGORIES.map((category) => (
              <Link
                key={category.slug}
                to={`/category/${category.slug}`}
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors whitespace-nowrap flex-shrink-0"
              >
                {category.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
