/**
 * Breadcrumb Component for Admin Panel
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

  // Route name mapping for admin panel
  const routeNames: Record<string, string> = {
    'dashboard': 'Dashboard',
    'products': 'Products',
    'products-create': 'Create Product',
    'products-edit': 'Edit Product',
    'orders': 'Orders',
    'order-details': 'Order Details',
    'users': 'Users',
    'inventory': 'Inventory',
    'leads': 'Leads',
    'analytics': 'Analytics',
    'settings': 'Settings',
    'login': 'Login',
  };

  // Build breadcrumb items from pathname
  const buildBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [{ label: 'Dashboard', path: '/dashboard' }];

    let currentPath = '';
    let isFirst = true;
    pathnames.forEach((pathname) => {
      // Skip 'dashboard' as it's already added
      if (pathname === 'dashboard' && isFirst) {
        isFirst = false;
        return;
      }
      isFirst = false;
      
      currentPath += `/${pathname}`;
      const label = routeNames[pathname] || pathname.charAt(0).toUpperCase() + pathname.slice(1).replace(/-/g, ' ');
      breadcrumbs.push({
        label,
        path: currentPath,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbItems = items || buildBreadcrumbs();

  // Don't show breadcrumb on dashboard home
  if (location.pathname === '/dashboard' || location.pathname === '/dashboard/') {
    return null;
  }

  return (
    <nav
      className={`flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-4 ${className}`}
      aria-label="Breadcrumb"
    >
      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1;

        return (
          <div key={item.path} className="flex items-center gap-2">
            {index === 0 ? (
              <Link
                to={item.path}
                className="flex items-center gap-1 hover:text-gray-300 dark:hover:text-gray-400 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ) : isLast ? (
              <span className="text-gray-300 dark:text-gray-400 font-medium">{item.label}</span>
            ) : (
              <Link
                to={item.path}
                className="hover:text-gray-300 dark:hover:text-gray-400 transition-colors"
              >
                {item.label}
              </Link>
            )}
            {!isLast && (
              <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-600" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
