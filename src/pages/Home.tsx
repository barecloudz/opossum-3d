import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight, ShoppingCart, Bell, RefreshCw, Heart, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useProductStore } from '../store/productStore';
import { useWishlistStore } from '../store/wishlistStore';
import { supabase } from '../lib/supabase';
import type { Category, BannerSlide } from '../types';

// Custom hook for touch/swipe support
function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (Math.abs(distance) >= minSwipeDistance) {
      if (distance > 0) {
        onSwipeLeft();
      } else {
        onSwipeRight();
      }
    }
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
}

// Gradient colors for categories without images
const categoryGradients = [
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-purple-500 to-pink-600',
  'from-cyan-500 to-blue-600',
  'from-rose-500 to-pink-600',
  'from-indigo-500 to-purple-600',
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const { user } = useAuthStore();
  const { getItemCount, addItem } = useCartStore();
  const { items: wishlistItems, addItem: addToWishlist, removeItem: removeFromWishlist } = useWishlistStore();
  const navigate = useNavigate();
  const itemCount = getItemCount();

  // Use global product store (cached across page navigations)
  const { products, isLoading, error, fetchProducts } = useProductStore();

  // Fetch banners and categories from database
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const { data, error } = await supabase
          .from('banner_slides')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setBanners(data || []);
      } catch (err) {
        console.error('Error fetching banners:', err);
      }
    };

    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchBanners();
    fetchCategories();
  }, []);

  const isProductInWishlist = (productId: string) => wishlistItems.includes(productId);

  const handleQuickAdd = async (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    setAddingToCart(product.id);
    addItem(product, undefined, 1);
    // Brief delay to show animation
    setTimeout(() => setAddingToCart(null), 600);
  };

  const handleWishlist = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProductInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product.id);
    }
  };

  // Reset slide index if banners change and current index is out of bounds
  useEffect(() => {
    if (currentSlide >= banners.length) {
      setCurrentSlide(0);
    }
  }, [banners.length, currentSlide]);

  // Banner carousel auto-rotation
  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  // Banner swipe handlers
  const bannerSwipe = useSwipe(nextSlide, prevSlide);

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(nextSlide, 5000); // Auto-rotate every 5 seconds
    return () => clearInterval(timer);
  }, [nextSlide, banners.length]);

  // Category slider state
  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkCategoryScroll = useCallback(() => {
    const container = categoryContainerRef.current;
    if (!container) return;
    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 1);
  }, []);

  useEffect(() => {
    checkCategoryScroll();
    const container = categoryContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkCategoryScroll);
      window.addEventListener('resize', checkCategoryScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkCategoryScroll);
      }
      window.removeEventListener('resize', checkCategoryScroll);
    };
  }, [checkCategoryScroll, categories]);

  const scrollCategories = (direction: 'left' | 'right') => {
    const container = categoryContainerRef.current;
    if (!container) return;
    const scrollAmount = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Fetch products on mount (will use cache if available)
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Get featured products (marked as featured in admin), limit to 6
  const featuredProducts = products.filter((p) => p.is_featured).slice(0, 6);

  // Get user's first name
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ||
                    user?.email?.split('@')[0] ||
                    'Guest';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <div className="px-4 pt-6 pb-4">
        <div className="max-w-7xl mx-auto">
          {/* Greeting & Icons Row */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-gray-400 text-sm">Hello,</p>
              <h1 className="text-xl font-bold text-white">{firstName}</h1>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
                <Bell className="h-6 w-6" />
              </button>
              <Link to="/cart" className="relative p-2 text-gray-400 hover:text-white transition-colors">
                <ShoppingCart className="h-6 w-6" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[var(--color-primary)] text-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-12 pr-4 py-3 bg-[var(--color-surface)]/90 border border-[var(--color-border)] rounded-2xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent backdrop-blur-sm"
            />
          </form>
        </div>
      </div>

      {/* Featured Banner Carousel */}
      {banners.length > 0 && (
      <div className="px-4 mb-8">
        <div className="max-w-7xl mx-auto">
          <div
            className="relative overflow-hidden rounded-3xl"
            onTouchStart={bannerSwipe.onTouchStart}
            onTouchMove={bannerSwipe.onTouchMove}
            onTouchEnd={bannerSwipe.onTouchEnd}
          >
            {/* Slides */}
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {banners.map((slide) => (
                <div
                  key={slide.id}
                  className={`w-full flex-shrink-0 relative bg-gradient-to-r ${slide.gradient} p-6 md:p-8`}
                >
                  {/* Banner image (if exists) */}
                  {slide.image_url && (
                    <img
                      src={slide.image_url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  {/* Content with padding to avoid arrow overlap */}
                  <div className="relative z-10 ml-10 mr-10 md:ml-12 md:mr-12">
                    {slide.badge && (
                      <div className="inline-block bg-black/20 rounded-lg px-3 py-1 text-sm font-medium text-white mb-2">
                        {slide.badge}
                      </div>
                    )}
                    <h2 className={`text-3xl md:text-4xl font-bold ${slide.text_color === 'dark' ? 'text-black' : 'text-white'} mb-2`}>
                      {slide.title}
                    </h2>
                    <p className={`text-xl md:text-2xl font-bold ${slide.text_color === 'dark' ? 'text-black/80' : 'text-white/80'} mb-4`}>
                      {slide.subtitle}
                    </p>
                    <Link
                      to={slide.cta_link}
                      className={`inline-flex items-center gap-2 ${
                        slide.text_color === 'dark'
                          ? 'bg-black text-white hover:bg-black/80'
                          : 'bg-white text-black hover:bg-white/90'
                      } px-5 py-2.5 rounded-xl font-medium transition-colors btn-press`}
                    >
                      {slide.cta_text} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                  {/* Decorative circles */}
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full" />
                  <div className="absolute -right-5 -bottom-10 w-32 h-32 bg-white/10 rounded-full" />
                </div>
              ))}
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors backdrop-blur-sm btn-press"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors backdrop-blur-sm btn-press"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Dots indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`transition-all ${
                    currentSlide === index
                      ? 'w-6 h-2 bg-white rounded-full'
                      : 'w-2 h-2 bg-white/50 rounded-full hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Categories */}
      <div className="px-4 mb-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-lg font-bold text-white mb-4">Categories</h2>
          <div className="relative">
            {/* Scroll container */}
            <div
              ref={categoryContainerRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {categoriesLoading ? (
                // Loading skeletons
                [1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-40 h-40 flex-shrink-0 rounded-2xl bg-[var(--color-surface)] animate-pulse" />
                ))
              ) : categories.length > 0 ? (
                categories.map((category, index) => (
                  <Link
                    key={category.id}
                    to={`/products?category=${category.slug}`}
                    className={`relative overflow-hidden rounded-2xl w-40 h-40 flex-shrink-0 p-4 flex flex-col justify-end group card-hover btn-press ${
                      !category.image_url ? `bg-gradient-to-br ${categoryGradients[index % categoryGradients.length]}` : ''
                    }`}
                  >
                    {/* Category image */}
                    {category.image_url && (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    {/* Shimmer overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    {/* Overlay for better text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    <span className="relative z-10 text-white font-semibold text-lg drop-shadow-lg">
                      {category.name}
                    </span>
                  </Link>
                ))
              ) : (
                // Fallback when no categories exist
                <div className="w-full text-center py-8 text-gray-400">
                  No categories available yet.
                </div>
              )}
            </div>

            {/* Left Arrow */}
            {canScrollLeft && (
              <button
                onClick={() => scrollCategories('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm btn-press z-10"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}

            {/* Right Arrow */}
            {canScrollRight && (
              <button
                onClick={() => scrollCategories('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm btn-press z-10"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hot Products */}
      <div className="px-4 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Hot Products</h2>
            <Link
              to="/products"
              className="text-[var(--color-primary)] hover:opacity-80 transition-colors flex items-center text-sm font-medium"
            >
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {isLoading ? (
              // Loading skeletons
              [1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-[var(--color-surface)]/80 backdrop-blur-sm rounded-2xl border border-[var(--color-border)] p-3">
                  <div className="aspect-square bg-[var(--color-border)] rounded-xl mb-3 animate-pulse" />
                  <div className="h-4 bg-[var(--color-border)] rounded w-3/4 mb-2 animate-pulse" />
                  <div className="h-4 bg-[var(--color-border)] rounded w-1/2 animate-pulse" />
                </div>
              ))
            ) : error ? (
              // Error state with retry
              <div className="col-span-full text-center py-12">
                <p className="text-red-400 mb-2">Failed to load products</p>
                <p className="text-gray-500 text-sm mb-4">{error.message}</p>
                <button
                  onClick={() => fetchProducts(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-white hover:border-[var(--color-primary)] transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
              </div>
            ) : featuredProducts.length > 0 ? (
              featuredProducts.map((product) => {
                const primaryImage = product.images?.find((img) => img.is_primary) || product.images?.[0];
                const inWishlist = isProductInWishlist(product.id);
                const isAdding = addingToCart === product.id;
                return (
                  <Link
                    key={product.id}
                    to={`/products/${product.slug}`}
                    className="glass rounded-2xl p-3 card-hover group relative overflow-hidden"
                  >
                    {/* Sale badge */}
                    {product.compare_at_price && product.compare_at_price > product.price && (
                      <div className="absolute top-4 left-4 z-20 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                        SALE
                      </div>
                    )}

                    {/* Wishlist button */}
                    <button
                      onClick={(e) => handleWishlist(e, product)}
                      className={`absolute top-4 right-4 z-20 p-2 rounded-xl transition-all btn-press ${
                        inWishlist
                          ? 'bg-red-500 text-white'
                          : 'bg-black/40 backdrop-blur-sm text-white hover:bg-black/60'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${inWishlist ? 'fill-current' : ''}`} />
                    </button>

                    <div className="aspect-square bg-[var(--color-border)] rounded-xl mb-3 overflow-hidden relative">
                      {primaryImage ? (
                        <img
                          src={primaryImage.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          No image
                        </div>
                      )}
                    </div>

                    <h3 className="font-medium text-white text-sm mb-1 line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors">
                      {product.name}
                    </h3>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--color-primary)] font-bold">
                          ${product.price.toFixed(2)}
                        </span>
                        {product.compare_at_price && product.compare_at_price > product.price && (
                          <span className="text-gray-500 line-through text-xs">
                            ${product.compare_at_price.toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Quick add button */}
                      <button
                        onClick={(e) => handleQuickAdd(e, product)}
                        disabled={isAdding}
                        className={`p-2 rounded-xl transition-all btn-press ${
                          isAdding
                            ? 'bg-[var(--color-primary)] text-black animate-cart-bounce'
                            : 'bg-[var(--color-surface)] text-white hover:bg-[var(--color-primary)] hover:text-black'
                        }`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    {product.stock_quantity !== undefined && product.stock_quantity < 10 && product.stock_quantity > 0 && (
                      <span className="text-xs text-orange-400 mt-2 block">
                        Only {product.stock_quantity} left
                      </span>
                    )}
                  </Link>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12 text-gray-400">
                No products available yet. Check back soon!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
