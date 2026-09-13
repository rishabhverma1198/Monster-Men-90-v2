/**
 * Filter & Sort Page
 * Reusable component for filtering and sorting products
 * Fully responsive, matches reference design
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Search, Heart, ShoppingBag, ChevronUp, ChevronDown } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import ProductCard from '../components/common/ProductCard';
import { apiService } from '../services/api';
import type { Product } from '../types/api';


interface FilterState {
  gender: string[];
  sizes: string[];
  brand: string[];
  color: string[];
  design: string[];
  fit: string[];
  sleeve: string[];
  neck: string[];
  rating: string | null;
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Green', value: '#00FF00' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Purple', value: '#800080' },
  { name: 'Blue', value: '#0000FF' },
  { name: 'Red', value: '#FF0000' },
  { name: 'Yellow', value: '#FFFF00' },
  { name: 'Orange', value: '#FFA500' },
];
const DESIGNS = ['Graphic Print', 'Solid', 'Typography', 'App', 'Striped', 'Pattern'];
const FITS = ['Oversized Fit', 'Regular Fit', 'Relaxed Fit', 'Super Loose Fit', 'Unisex Fit'];
const SLEEVES = ['Half Sleeve', 'Full Sleeve'];
const NECKS = ['Round Neck', 'V-Neck'];
const RATINGS = ['4.5 And Above', '4 And Above', '3.5 And Above', '2.5 And Above'];

const COLOR_CLASS_MAP: Record<string, string> = {
  Black: 'bg-black',
  Green: 'bg-green-500',
  White: 'bg-white',
  Purple: 'bg-purple-500',
  Blue: 'bg-blue-500',
  Red: 'bg-red-500',
  Yellow: 'bg-yellow-500',
  Orange: 'bg-orange-500',
};

export default function FilterSort() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getItemCount } = useCartStore();
  const itemCount = getItemCount();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const categoryTitle = searchParams.get('title') || 'Products';
  const categoryParam = searchParams.get('category') || 'all';

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    gender: [],
    sizes: [],
    brand: [],
    color: [],
    design: [],
    fit: [],
    sleeve: [],
    neck: [],
    rating: null,
  });
  const [sortBy, setSortBy] = useState<string>('Popularity');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    gender: true,
    sizes: true,
    brand: true,
    color: true,
    design: true,
    fit: true,
    sleeve: true,
    neck: true,
    ratings: true,
  });

  // Count active filters
  const activeFilterCount = 
    filters.gender.length +
    filters.sizes.length +
    filters.brand.length +
    filters.color.length +
    filters.design.length +
    filters.fit.length +
    filters.sleeve.length +
    filters.neck.length +
    (filters.rating ? 1 : 0);

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: any = { limit: 100, offset: 0 };
      
      if (categoryParam !== 'all') {
        params.category = categoryParam;
      }
      
      // Apply gender filter
      if (filters.gender.length > 0) {
        params.gender = filters.gender[0]; // Backend supports single gender
      }

      const response = await apiService.getProducts(params);
      if (response.success) {
        let filteredProducts = response.data.products || [];
        
        // Apply client-side filters (sizes, brand, color, etc.)
        // Note: These would ideally be handled by backend
        
        // Apply sorting
        filteredProducts = sortProducts(filteredProducts, sortBy);
        
        setProducts(filteredProducts);
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
    } finally {
      setIsLoading(false);
    }
  }, [categoryParam, filters, sortBy]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const sortProducts = (products: Product[], sortType: string): Product[] => {
    const sorted = [...products];
    
    switch (sortType) {
      case 'Popularity':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'Price: Low to High':
        return sorted.sort((a, b) => a.price_buyer - b.price_buyer);
      case 'Price: High to Low':
        return sorted.sort((a, b) => b.price_buyer - a.price_buyer);
      case 'Newest First':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'Oldest First':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      default:
        return sorted;
    }
  };

  const toggleFilter = (category: keyof FilterState, value: string) => {
    setFilters((prev) => {
      if (category === 'rating') {
        return { ...prev, rating: prev.rating === value ? null : value };
      }
      
      const current = prev[category] as string[];
      if (current.includes(value)) {
        return { ...prev, [category]: current.filter((v) => v !== value) };
      } else {
        return { ...prev, [category]: [...current, value] };
      }
    });
  };

  const clearAllFilters = () => {
    setFilters({
      gender: [],
      sizes: [],
      brand: [],
      color: [],
      design: [],
      fit: [],
      sleeve: [],
      neck: [],
      rating: null,
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="container-custom">
          <div className="flex items-center justify-between h-16">
            {/* Left - Back Button */}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Center - Title */}
            <div className="flex-1 text-center px-4">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                {categoryTitle}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {products.length} Products
              </p>
            </div>

            {/* Right - Icons */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                type="button"
                onClick={() => navigate('/search')}
                className="p-2 text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
              <Link
                to="/wishlist"
                className="p-2 text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors"
                aria-label="Wishlist"
              >
                <Heart className="w-5 h-5" />
              </Link>
              <Link
                to="/cart"
                className="relative p-2 text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors"
                aria-label="Shopping Cart"
              >
                <ShoppingBag className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-gray-900 text-xs font-bold rounded-full flex items-center justify-center">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Free Shipping Banner */}
      <div className="bg-blue-600 text-white py-2 px-4">
        <div className="container-custom flex items-center gap-2 text-sm">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
          </svg>
          <span>FREE SHIPPING on all orders above ₹399</span>
        </div>
      </div>

      <div className="container-custom pb-20 lg:pb-4">
        <div className="flex flex-col lg:flex-row gap-4 py-4">
          {/* Filters Sidebar */}
          <aside className={`w-full lg:w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 lg:sticky lg:top-20 lg:h-fit lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto ${isSidebarOpen ? 'block' : 'hidden lg:block'}`}>
            {/* Filters Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Filters{activeFilterCount > 0 && `(${activeFilterCount})`}
              </h2>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Filter Sections */}
            <div className="space-y-4">
              {/* Gender Filter */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleSection('gender')}
                  className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-900 dark:text-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                    <span>Gender</span>
                  </div>
                  {expandedSections.gender ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedSections.gender && (
                  <div className="mt-2 space-y-2">
                    {['Men', 'Women', 'Unisex'].map((gender) => (
                      <label
                        key={gender}
                        className="flex items-center justify-between cursor-pointer py-1"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">{gender}</span>
                        <input
                          type="checkbox"
                          checked={filters.gender.includes(gender)}
                          onChange={() => toggleFilter('gender', gender)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Sizes Filter */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <button
                  type="button"
                  onClick={() => toggleSection('sizes')}
                  className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-900 dark:text-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                    <span>Sizes</span>
                  </div>
                  {expandedSections.sizes ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedSections.sizes && (
                  <div className="mt-2 space-y-2">
                    {SIZES.map((size) => (
                      <label
                        key={size}
                        className="flex items-center justify-between cursor-pointer py-1"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">{size}</span>
                        <input
                          type="checkbox"
                          checked={filters.sizes.includes(size)}
                          onChange={() => toggleFilter('sizes', size)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </label>
                    ))}
                    <button type="button" className="text-sm text-blue-600 dark:text-blue-400 mt-2 hover:underline">
                      Show
                    </button>
                  </div>
                )}
              </div>

              {/* Brand Filter */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <button
                  type="button"
                  onClick={() => toggleSection('brand')}
                  className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-900 dark:text-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                    <span>Brand</span>
                  </div>
                  {expandedSections.brand ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedSections.brand && (
                  <div className="mt-2 space-y-2">
                    {['Dewakoof', 'Dewakoof Air 1.0', 'Dewakoof American Pima'].map((brand) => (
                      <label
                        key={brand}
                        className="flex items-center justify-between cursor-pointer py-1"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">{brand}</span>
                        <input
                          type="checkbox"
                          checked={filters.brand.includes(brand)}
                          onChange={() => toggleFilter('brand', brand)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Color Filter */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <button
                  type="button"
                  onClick={() => toggleSection('color')}
                  className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-900 dark:text-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                    <span>Color</span>
                  </div>
                  {expandedSections.color ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedSections.color && (
                  <div className="mt-2 space-y-2">
                    {COLORS.map((color) => (
                      <label
                        key={color.name}
                        className="flex items-center justify-between cursor-pointer py-1"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700 dark:text-gray-300">{color.name}</span>
                          <div
                            className={`w-4 h-4 rounded border border-gray-300 ${COLOR_CLASS_MAP[color.name] || 'bg-gray-500'}`}
                          />
                        </div>
                        <input
                          type="checkbox"
                          checked={filters.color.includes(color.name)}
                          onChange={() => toggleFilter('color', color.name)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </label>
                    ))}
                    <button type="button" className="text-sm text-blue-600 dark:text-blue-400 mt-2 hover:underline">
                      Show
                    </button>
                  </div>
                )}
              </div>

              {/* Design Filter */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <button
                  type="button"
                  onClick={() => toggleSection('design')}
                  className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-900 dark:text-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                    <span>Design</span>
                  </div>
                  {expandedSections.design ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedSections.design && (
                  <div className="mt-2 space-y-2">
                    {DESIGNS.map((design) => (
                      <label
                        key={design}
                        className="flex items-center justify-between cursor-pointer py-1"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">{design}</span>
                        <input
                          type="checkbox"
                          checked={filters.design.includes(design)}
                          onChange={() => toggleFilter('design', design)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </label>
                    ))}
                    <button type="button" className="text-sm text-blue-600 dark:text-blue-400 mt-2 hover:underline">
                      Show
                    </button>
                  </div>
                )}
              </div>

              {/* Fit Filter */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <button
                  type="button"
                  onClick={() => toggleSection('fit')}
                  className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-900 dark:text-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                    <span>Fit</span>
                  </div>
                  {expandedSections.fit ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedSections.fit && (
                  <div className="mt-2 space-y-2">
                    {FITS.map((fit) => (
                      <label
                        key={fit}
                        className="flex items-center justify-between cursor-pointer py-1"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">{fit}</span>
                        <input
                          type="checkbox"
                          checked={filters.fit.includes(fit)}
                          onChange={() => toggleFilter('fit', fit)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Sleeve Filter */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <button
                  type="button"
                  onClick={() => toggleSection('sleeve')}
                  className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-900 dark:text-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                    <span>Sleeve</span>
                  </div>
                  {expandedSections.sleeve ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedSections.sleeve && (
                  <div className="mt-2 space-y-2">
                    {SLEEVES.map((sleeve) => (
                      <label
                        key={sleeve}
                        className="flex items-center justify-between cursor-pointer py-1"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">{sleeve}</span>
                        <input
                          type="checkbox"
                          checked={filters.sleeve.includes(sleeve)}
                          onChange={() => toggleFilter('sleeve', sleeve)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Neck Filter */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <button
                  type="button"
                  onClick={() => toggleSection('neck')}
                  className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-900 dark:text-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                    <span>Neck</span>
                  </div>
                  {expandedSections.neck ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedSections.neck && (
                  <div className="mt-2 space-y-2">
                    {NECKS.map((neck) => (
                      <label
                        key={neck}
                        className="flex items-center justify-between cursor-pointer py-1"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">{neck}</span>
                        <input
                          type="checkbox"
                          checked={filters.neck.includes(neck)}
                          onChange={() => toggleFilter('neck', neck)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Ratings Filter */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <button
                  type="button"
                  onClick={() => toggleSection('ratings')}
                  className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-900 dark:text-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                    <span>Ratings</span>
                  </div>
                  {expandedSections.ratings ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedSections.ratings && (
                  <div className="mt-2 space-y-2">
                    {RATINGS.map((rating) => (
                      <label
                        key={rating}
                        className="flex items-center justify-between cursor-pointer py-1"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">{rating}</span>
                        <input
                          type="radio"
                          name="rating"
                          checked={filters.rating === rating}
                          onChange={() => toggleFilter('rating', rating)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 pb-20 lg:pb-4">
            {/* Products Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">No products found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar - Sticky Footer (Mobile) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-40">
        <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
          {/* Sort Button */}
          <button
            type="button"
            onClick={() => {
              // Cycle through sort options
              const sortOptions = ['Popularity', 'Price: Low to High', 'Price: High to Low', 'Newest First', 'Oldest First'];
              const currentIndex = sortOptions.indexOf(sortBy);
              const nextIndex = (currentIndex + 1) % sortOptions.length;
              setSortBy(sortOptions[nextIndex]);
            }}
            className="flex flex-col items-center justify-center py-3 px-4 active:bg-gray-50 dark:active:bg-gray-700"
          >
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Sort</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px]">{sortBy}</span>
          </button>

          {/* Filter Button */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex flex-col items-center justify-center py-3 px-4 active:bg-gray-50 dark:active:bg-gray-700 relative"
          >
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Filter</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px]">
              {activeFilterCount > 0 
                ? `${filters.gender.length > 0 ? 'Gender' : ''}${filters.brand.length > 0 ? (filters.gender.length > 0 ? ', ' : '') + 'Brand' : ''}`
                : 'None'}
            </span>
            {activeFilterCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full"></span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
