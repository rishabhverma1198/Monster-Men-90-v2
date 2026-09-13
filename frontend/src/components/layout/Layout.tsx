/**
 * Main Layout Component
 * Wraps all pages with Navbar and Footer
 */

import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import SubNavbar from './SubNavbar';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

const AUTH_PAGES = ['/welcome', '/login', '/login-email', '/signup', '/forgot-password', '/auth/callback'];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const hideNavAndFooter = AUTH_PAGES.includes(location.pathname);

  if (hideNavAndFooter) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors duration-300">
      <Navbar />
      <SubNavbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
