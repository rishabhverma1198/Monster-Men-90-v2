/**
 * Home Page
 * Hero carousel, featured categories, product grid
 * All data from backend APIs - no dummy data
 */

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '../components/common/ProductCard';
import { apiService } from '../services/api';
import type { Product, Category } from '../types/api';
import { ProductCardSkeleton, CategoryCardSkeleton } from '../components/common/Skeleton';
import { useBuyerTypeStore } from '../store/buyerTypeStore';
import './Home.css';



export default function Home() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const limit = 12;
  const { hasSelectedBuyerType } = useBuyerTypeStore();

  // MANDATORY: Check if buyer type is selected - redirect to welcome if not
  useEffect(() => {
    if (!hasSelectedBuyerType()) {
      navigate('/welcome', { replace: true });
      return;
    }
  }, [navigate, hasSelectedBuyerType]);

  // Fetch initial products and categories (abort on unmount)
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const params = { limit, offset: 0 };
        const productsResponse = await apiService.getProducts(params, { signal });
        if (productsResponse && productsResponse.success) {
          const responseData = productsResponse.data;
          if (responseData && Array.isArray(responseData.products)) {
            const fetchedProducts = responseData.products;
            setProducts(fetchedProducts);
            setHasMore(fetchedProducts.length === limit);
            setOffset(fetchedProducts.length);
            setCurrentSlide(0);
          } else if (responseData && responseData.products === undefined) {
            const fetchedProducts = Array.isArray(responseData) ? responseData : [];
            if (fetchedProducts.length > 0) {
              setProducts(fetchedProducts);
              setHasMore(fetchedProducts.length === limit);
              setOffset(fetchedProducts.length);
              setCurrentSlide(0);
            } else {
              setError('No products available. Please add products from admin panel.');
            }
          } else {
            setError('Failed to load products. Invalid response format.');
          }
        } else {
          setError(productsResponse?.message || 'Failed to load products. Please try again.');
        }
        const categoriesResponse = await apiService.getCategories({ signal });
        if (categoriesResponse.success && categoriesResponse.data) {
          setCategories(categoriesResponse.data || []);
        }
      } catch (err: any) {
        if (err?.code === 'ABORTED') return;
        setError(err?.message || err?.response?.data?.message || 'Failed to load products');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, []);

  // Infinite scroll - Load more products
  const loadMoreProducts = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    try {
      setIsLoadingMore(true);
      // Don't filter by gender on home page - show all products
      const params = { limit, offset };
      
      const productsResponse = await apiService.getProducts(params);
      if (productsResponse.success) {
        const newProducts = productsResponse.data.products || [];
        if (newProducts.length > 0) {
          setProducts(prev => [...prev, ...newProducts]);
          setOffset(prev => prev + newProducts.length);
          setHasMore(newProducts.length === limit);
        } else {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error('Error loading more products:', err);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [offset, limit, isLoadingMore, hasMore]); // Removed selectedCategory dependency

  // Intersection Observer for lazy loading - with debounce to prevent multiple triggers
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          // Debounce to prevent rapid-fire requests
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            if (hasMore && !isLoadingMore) {
              loadMoreProducts();
            }
          }, 300); // 300ms debounce
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '100px' // Start loading 100px before reaching the element
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      clearTimeout(timeoutId);
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMoreProducts, hasMore, isLoadingMore]);

  const totalSlides = useMemo(() => Math.ceil(products.length / 3), [products.length]);
  const maxSlide = useMemo(() => (totalSlides > 0 ? (totalSlides - 1) * 3 : 0), [totalSlides]);

  // Update CSS variable when currentSlide changes
  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.style.setProperty('--slider-transform', `-${Math.floor(currentSlide / 3) * 100}%`);
    }
  }, [currentSlide]);

  // Auto-advance carousel - Smoother animation with longer interval (6 seconds)
  useEffect(() => {
    if (totalSlides <= 1) return; // Don't auto-advance if only one set or less

    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = prev + 3;
        return next > maxSlide ? 0 : next;
      });
    }, 6000); // 6 seconds - increased for smoother experience

    return () => clearInterval(interval);
  }, [products.length, totalSlides, maxSlide]);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => {
      const next = prev + 3;
      return next > maxSlide ? 0 : next;
    });
  }, [maxSlide]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => {
      const nextSlideIdx = prev - 3;
      return nextSlideIdx < 0 ? maxSlide : nextSlideIdx;
    });
  }, [maxSlide]);

  if (isLoading) {
    return (
      <div className="container-custom py-12">
        {/* Hero Skeleton */}
        <div className="w-full h-[300px] md:h-[400px] bg-gray-200 rounded-lg mb-12 animate-pulse" />
        
        {/* Categories Skeleton */}
        <section className="mb-16">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <CategoryCardSkeleton key={i} />
            ))}
          </div>
        </section>

        {/* Products Skeleton */}
        <section>
          <div className="h-8 bg-gray-200 rounded w-48 mb-6 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-custom py-12">
        <div className="text-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-600 dark:text-red-400 font-semibold mb-2">⚠️ Error Loading Products</p>
          <p className="text-red-500 dark:text-red-300 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Product Slider - 3 Square Cards Always Visible (Bewakoof Style) */}
      {products.length > 0 && (
        <section className="relative w-full overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors">
          <div className="container-custom py-3 sm:py-4 md:py-5">
            {/* Slider Container - Always shows 3 square cards with proper margins */}
            <div className="relative overflow-hidden">
              <div
                ref={sliderRef}
                className="flex transition-transform duration-1000 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] slider-container"
              >
                {/* Create sets of 3 products */}
                {Array.from({ length: totalSlides }).map((_, setIndex) => {
                  const setProducts = products.slice(setIndex * 3, (setIndex + 1) * 3);
                  return (
                    <div
                      key={setIndex}
                      className="min-w-full grid grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6 px-2 sm:px-3 md:px-4 lg:px-5"
                    >
                      {setProducts.map((product) => (
                        <Link
                          key={product.id}
                          to={`/filter-sort?category=${encodeURIComponent(product.category || 'all')}&title=${encodeURIComponent(product.title)}`}
                          className="block w-full"
                        >
                          {/* Square Card - Aspect Ratio 1:1, larger size with proper margins */}
                          <div className="relative w-full aspect-square overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 group border border-gray-200 dark:border-gray-700">
                            {/* Product Image - Fill entire box, consume full width, no empty space */}
                            {product.image_urls?.[0] || product.image_url ? (
                              <img
                                src={product.image_urls?.[0] || product.image_url}
                                alt={product.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                                <span className="text-gray-400 text-sm">No Image</span>
                              </div>
                            )}
                          </div>
                        </Link>
                      ))}
                      {/* Fill empty slots if less than 3 products in set */}
                      {setProducts.length < 3 && Array.from({ length: 3 - setProducts.length }).map((_, emptyIdx) => (
                        <div key={`empty-${emptyIdx}`} className="w-full aspect-square" />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Indicators - Blue dots with proper spacing, positioned below slider */}
            {totalSlides > 1 && (
              <div className="flex justify-center gap-2 mt-6 mb-2 sm:mt-8 sm:mb-3">
                {Array.from({ length: totalSlides }).map((_, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setCurrentSlide(idx * 3)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      Math.floor(currentSlide / 3) === idx
                        ? 'bg-blue-500 dark:bg-blue-400 w-8'
                        : 'bg-blue-300 dark:bg-blue-600 hover:bg-blue-400 dark:hover:bg-blue-500 w-2'
                    }`}
                    aria-label={`Go to slide set ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Navigation Arrows */}
          {totalSlides > 1 && (
            <>
              <button
                type="button"
                onClick={prevSlide}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg z-10"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900 dark:text-gray-100" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg z-10"
                aria-label="Next slide"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900 dark:text-gray-100" />
              </button>
            </>
          )}
        </section>
      )}

      {/* Offer Banner - Below Slider - Reduced Height */}
      <section className="w-full bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 py-2 sm:py-3">
        <div className="container-custom">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-white">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <span className="text-lg sm:text-xl md:text-2xl font-bold">UP TO 70% OFF</span>
            </div>
            <span className="text-sm sm:text-base md:text-lg">On Purchase of Selected Items</span>
            <Link
              to="/filter-sort"
              className="px-4 py-2 bg-white text-purple-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors text-sm sm:text-base"
            >
              Shop Now
            </Link>
          </div>
        </div>
      </section>

      <div className="container-custom py-12">
        {/* Featured Categories Section */}
        {categories.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8 transition-colors">Shop by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {categories.slice(0, 4).map((category) => (
                <Link
                  key={category.id}
                  to={`/category/${category.slug}`}
                  className="block w-full h-[150px] bg-gradient-to-br from-primary/10 dark:from-primary/20 to-primary/5 dark:to-primary/10 rounded-lg p-6 hover:scale-105 transition-transform duration-300 shadow-soft hover:shadow-medium border border-gray-200 dark:border-gray-700"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 transition-colors">{category.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 transition-colors">Explore Collection</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured Products Section - Bewakoof Style Grid (Smaller Cards) */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 transition-colors">
            Featured Products {products.length > 0 && `(${products.length})`}
          </h2>
          {products.length === 0 && !isLoading ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400 transition-colors font-semibold">No products available at the moment.</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2 transition-colors">Add products from admin panel to see them here.</p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-4 transition-colors">
                Debug: Check browser console (F12) for API response details.
              </p>
            </div>
          ) : products.length > 0 ? (
            <>
              {/* Show all products (hero slider shows first 3, but we show all in grid) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              
              {/* Infinite Scroll Trigger */}
              <div ref={observerTarget} className="h-10 flex items-center justify-center mt-8">
                {isLoadingMore && (
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                )}
                {!hasMore && products.length > 0 && (
                  <p className="text-gray-500 text-sm">No more products to load</p>
                )}
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
