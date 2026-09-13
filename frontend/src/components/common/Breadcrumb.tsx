/**
 * Breadcrumb Component
 * Shows navigation path and allows users to navigate back
 */

import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Route name mapping
  const routeNames: Record<string, string> = {
    '': 'Home',
    'category': 'Category',
    'product': 'Product',
    'cart': 'Cart',
    'checkout': 'Checkout',
    'wishlist': 'Wishlist',
    'profile': 'Profile',
    'orders': 'My Orders',
    'order-success': 'Order Success',
    'track': 'Track Order',
    'search': 'Search',
    'login': 'Login',
    'signup': 'Sign Up',
    'login-email': 'Email Login',
    'auth': 'Authentication',
    'filter-sort': 'Filter & Sort',
  };

  // Build breadcrumb items from pathname
  const buildBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [{ label: 'Home', path: '/' }];

    let currentPath = '';
    pathnames.forEach((pathname) => {
      currentPath += `/${pathname}`;
      const label = routeNames[pathname] || pathname.charAt(0).toUpperCase() + pathname.slice(1);
      breadcrumbs.push({
        label,
        path: currentPath,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbItems = items || buildBreadcrumbs();

  // Don't show breadcrumb on home page
  if (location.pathname === '/') {
    return null;
  }

  return (
    <nav
      className={`flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 ${className}`}
      aria-label="Breadcrumb"
    >
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;

        return (
          <div key={item.path} className="flex items-center gap-2">
            {index === 0 ? (
              <Link
                to={item.path}
                className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ) : isLast ? (
              <span className="text-gray-700 dark:text-gray-300 font-medium">{item.label}</span>
            ) : (
              <Link
                to={item.path}
                className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                {item.label}
              </Link>
            )}
            {!isLast && (
              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
