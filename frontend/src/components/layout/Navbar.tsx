/**
 * Navbar Component
 * Full-width responsive Bewakoof-style layout
 * Desktop (> md): white bg | Mobile/Tablet (≤ md): yellow bg
 * Left: Logo + MEN | WOMEN | Center: Search | Right: | LOGIN | Wishlist | Cart | Dark mode
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Heart, ShoppingCart, User, Menu, X, Store, Truck, Wallet, ShoppingBag, Snowflake, Zap, Sparkles, Shirt } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import ThemeToggle from '../common/ThemeToggle';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { getItemCount } = useCartStore();
  const itemCount = getItemCount();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMobileMenuOpen && !target.closest('.sidebar-menu') && !target.closest('button[aria-label="Toggle Menu"]')) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <nav
        className="w-full flex flex-col sticky top-0 z-50 sm:bg-white sm:dark:bg-gray-900 bg-yellow-400 dark:bg-yellow-400 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300"
        role="navigation"
      >
        <div className="w-full max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4 sm:gap-6 lg:gap-8">
            {/* Left: Hamburger (≤50% screens only) + Logo + MEN | WOMEN */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-shrink-0">
              {/* Hamburger - Only visible on screens ≤50% (sm and below) */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="sm:hidden p-2 -ml-2 text-gray-900 hover:text-gray-700 transition-colors"
                aria-label="Toggle Menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" strokeWidth={2} /> : <Menu className="w-5 h-5" strokeWidth={2} />}
              </button>
              {/* Logo - Stylish text for >50% screens, "Monster" cursive script for ≤50% screens */}
              <Link to="/" className="flex items-center group">
                {/* Stylish text logo - Only visible on screens >640px (sm and above) */}
                <span className="hidden sm:block text-xl md:text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tighter uppercase bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-gray-200 dark:to-gray-100 bg-clip-text text-transparent">
                  Monster Men 90
                </span>
                {/* "Monster" cursive script - Only visible on screens ≤640px, solid black, no background */}
                <span className="sm:hidden text-3xl md:text-4xl font-bold text-gray-900 logo-monster-cursive">
                  Monster
                </span>
              </Link>
          </div>

          {/* Center: Search bar (desktop) */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-2xl mx-8 lg:mx-12 min-w-0"
          >
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by products"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-900 dark:text-gray-400" strokeWidth={2} />
            </div>
          </form>

          {/* Right: divider | LOGIN | Wishlist | Cart | Dark mode (extreme right) */}
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            {/* Vertical divider (desktop, before LOGIN) */}
            <div className="hidden md:block w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" aria-hidden />
            {isAuthenticated ? (
              <div className="hidden md:block relative group">
                <button
                  className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-900 dark:text-gray-100 hover:text-primary dark:hover:text-primary transition-colors uppercase"
                  aria-label="User Menu"
                >
                  <User className="w-5 h-5" strokeWidth={2} />
                  <span>{user?.full_name?.split(' ')[0] ?? 'Account'}</span>
                </button>
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all py-1 z-50">
                  <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                    Profile
                  </Link>
                  <Link to="/orders" className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                    Orders
                  </Link>
                  <button onClick={logout} className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:flex items-center px-3 py-2 text-sm font-bold text-gray-900 dark:text-gray-100 hover:text-primary dark:hover:text-primary transition-colors uppercase"
              >
                LOGIN
              </Link>
            )}

            {/* Wishlist - Red fill on hover */}
            <Link
              to={isAuthenticated ? '/wishlist' : '/login'}
              className="p-2 text-gray-900 dark:text-gray-100 transition-all duration-200 rounded-lg group"
              aria-label="Wishlist"
            >
              <Heart 
                className="w-5 h-5 transition-all duration-200 group-hover:fill-red-500 group-hover:stroke-red-500" 
                strokeWidth={2}
                fill="transparent"
              />
            </Link>
            
            {/* Cart - Black fill on hover */}
            <Link
              to={isAuthenticated ? '/cart' : '/login'}
              className="relative p-2 text-gray-900 dark:text-gray-100 transition-all duration-200 rounded-lg group"
              aria-label="Cart"
            >
              <ShoppingCart 
                className="w-5 h-5 transition-all duration-200 group-hover:fill-gray-900 dark:group-hover:fill-gray-100 group-hover:stroke-gray-900 dark:group-hover:stroke-gray-100" 
                strokeWidth={2}
                fill="transparent"
              />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] bg-primary text-gray-900 text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
            
            {/* Search Button - After cart, before dark/light button */}
            <button
              onClick={() => {
                const searchInput = document.querySelector('input[type="text"][placeholder*="Search"]') as HTMLInputElement;
                if (searchInput) {
                  searchInput.focus();
                } else {
                  navigate('/search');
                }
              }}
              className="p-2 text-gray-900 dark:text-gray-100 hover:text-primary dark:hover:text-primary transition-all duration-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Search"
            >
              <Search className="w-5 h-5" strokeWidth={2} />
            </button>
            
            <div className="ml-1">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      </nav>

      {/* Slide-out Sidebar Menu - Fully responsive */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-[60] sm:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Sidebar - 85% width on ≤50% screens */}
          <div className="sidebar-menu fixed top-0 left-0 h-full w-[85vw] bg-white z-[70] overflow-y-auto shadow-2xl transform transition-transform duration-300 ease-in-out sm:hidden">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Hey There!</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close Menu"
                >
                  <X className="w-5 h-5 text-gray-900" strokeWidth={2} />
                </button>
              </div>

              {/* Login / Sign Up Section */}
              <div className="p-4 border-b border-gray-200">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full border-2 border-blue-600 flex items-center justify-center">
                    <User className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <span className="font-medium">Login / Sign Up</span>
                </Link>
              </div>

              {/* SHOP IN Section */}
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">SHOP IN</h3>
                <nav className="flex flex-col gap-1">
                  <Link
                    to="/category/men"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 py-2 text-gray-900 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <User className="w-5 h-5 text-yellow-500" strokeWidth={2} />
                    <span>Men</span>
                  </Link>
                  <Link
                    to="/category/women"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 py-2 text-gray-900 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <User className="w-5 h-5 text-yellow-500" strokeWidth={2} />
                    <span>Women</span>
                  </Link>
                  <Link
                    to="/category/winterwear"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 py-2 text-gray-900 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <Snowflake className="w-5 h-5 text-yellow-500" strokeWidth={2} />
                    <span>Winterwear Collection</span>
                  </Link>
                  <Link
                    to="/category/clearance"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 py-2 text-gray-900 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <div className="w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center">
                      <ShoppingBag className="w-3 h-3 text-red-500" strokeWidth={2} fill="red" />
                    </div>
                    <span>Clearance Store</span>
                  </Link>
                  <Link
                    to="/category/fandom"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 py-2 text-gray-900 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <Zap className="w-5 h-5 text-yellow-500" strokeWidth={2} />
                    <span>Shop by Fandom</span>
                  </Link>
                  <Link
                    to="/category/specials"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 py-2 text-gray-900 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <Sparkles className="w-5 h-5 text-yellow-500" strokeWidth={2} />
                    <span>Specials</span>
                  </Link>
                  <Link
                    to="/customize"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 py-2 text-gray-900 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <Shirt className="w-5 h-5 text-yellow-500" strokeWidth={2} />
                    <span>Customise your own T-Shirt</span>
                  </Link>
                </nav>
              </div>

              {/* ENGAGE Section */}
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">ENGAGE</h3>
                <Link
                  to="/stores"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 py-2 text-gray-900 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
                >
                  {/* Find a Store Icon - Circular with storefront, yellow fill, black border */}
                  <div className="w-6 h-6 rounded-full border-[3px] border-gray-900 flex items-center justify-center bg-yellow-500">
                    <Store className="w-3.5 h-3.5 text-gray-900" strokeWidth={2.5} fill="currentColor" />
                  </div>
                  <span>Find a Store</span>
                </Link>
              </div>

              {/* MY PROFILE Section */}
              {isAuthenticated && (
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">MY PROFILE</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {/* My Account - Yellow outline person icon */}
                    <Link
                      to="/profile"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-lg border-2 border-yellow-500 flex items-center justify-center">
                        <User className="w-6 h-6 text-yellow-500" strokeWidth={2.5} />
                      </div>
                      <span className="text-xs font-medium text-gray-900">My Account</span>
                    </Link>
                    {/* My Orders - Yellow outline truck icon */}
                    <Link
                      to="/orders"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-lg border-2 border-yellow-500 flex items-center justify-center">
                        <Truck className="w-6 h-6 text-yellow-500" strokeWidth={2.5} />
                      </div>
                      <span className="text-xs font-medium text-gray-900">My Orders</span>
                    </Link>
                    {/* My Wallet - Yellow filled wallet icon */}
                    <Link
                      to="/wallet"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-lg border-2 border-yellow-500 flex items-center justify-center bg-yellow-500">
                        <Wallet className="w-6 h-6 text-gray-900" strokeWidth={2.5} fill="currentColor" />
                      </div>
                      <span className="text-xs font-medium text-gray-900">My Wallet</span>
                    </Link>
                    {/* My Wishlist - Yellow outline heart icon */}
                    <Link
                      to="/wishlist"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-lg border-2 border-yellow-500 flex items-center justify-center">
                        <Heart className="w-6 h-6 text-yellow-500" strokeWidth={2.5} />
                      </div>
                      <span className="text-xs font-medium text-gray-900">My Wishlist</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* CONTACT US Section */}
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">CONTACT US</h3>
                <nav className="flex flex-col gap-1">
                  <Link
                    to="/help"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="py-2 text-gray-900 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    Help & Support
                  </Link>
                  <Link
                    to="/feedback"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="py-2 text-gray-900 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    Feedback & Suggestions
                  </Link>
                </nav>
              </div>

              {/* ABOUT US Section */}
              <div className="p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">ABOUT US</h3>
                <nav className="flex flex-col gap-1">
                  <Link
                    to="/about"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="py-2 text-gray-900 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    Our Story
                  </Link>
                  <Link
                    to="/fanbook"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="py-2 text-gray-900 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    Fanbook
                  </Link>
                </nav>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
