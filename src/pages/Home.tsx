import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight, ShoppingCart, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';

// Category data with gradients
const categories = [
  {
    name: '3D Prints',
    slug: 'products?category=3d-prints',
    gradient: 'from-emerald-500 to-teal-600',
    image: '/images/hero.jpg',
  },
  {
    name: 'Laser Engraved',
    slug: 'products?category=laser-engraved',
    gradient: 'from-orange-500 to-red-600',
    image: '/images/hero.jpg',
  },
  {
    name: 'Keychains',
    slug: 'products?category=keychains',
    gradient: 'from-purple-500 to-pink-600',
    image: '/images/hero.jpg',
  },
  {
    name: 'Custom Orders',
    slug: 'custom-quote',
    gradient: 'from-cyan-500 to-blue-600',
    image: '/images/hero.jpg',
  },
];

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuthStore();
  const { getItemCount } = useCartStore();
  const navigate = useNavigate();
  const itemCount = getItemCount();

  // Get user's first name
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ||
                    user?.email?.split('@')[0] ||
                    'Guest';

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;

    const fetchFeaturedProducts = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, images:product_images(*)')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(6)
          .abortSignal(controller.signal);

        clearTimeout(timeoutId);
        if (error) throw error;
        setFeaturedProducts(data || []);
        setIsLoading(false);
      } catch (err: any) {
        clearTimeout(timeoutId);

        if ((err.name === 'AbortError' || err.message?.includes('network')) && retryCount < maxRetries) {
          retryCount++;
          console.log(`Home: Retry attempt ${retryCount}/${maxRetries}`);
          setTimeout(fetchFeaturedProducts, 1000 * retryCount);
          return;
        }

        console.error('Error fetching products:', err);
        setIsLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

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

      {/* Featured Banner */}
      <div className="px-4 mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-emerald-600 p-6 md:p-8">
            <div className="relative z-10">
              <div className="inline-block bg-black/20 rounded-lg px-3 py-1 text-sm font-medium text-white mb-2">
                New Arrivals
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-black mb-2">
                Custom 3D
              </h2>
              <p className="text-xl md:text-2xl font-bold text-black/80 mb-4">
                Printed Creations
              </p>
              <Link
                to="/products"
                className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl font-medium hover:bg-black/80 transition-colors"
              >
                Shop Now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {/* Decorative circles */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full" />
            <div className="absolute -right-5 -bottom-10 w-32 h-32 bg-white/10 rounded-full" />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 mb-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-lg font-bold text-white mb-4">Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category) => (
              <Link
                key={category.name}
                to={`/${category.slug}`}
                className={`relative overflow-hidden rounded-2xl aspect-square bg-gradient-to-br ${category.gradient} p-4 flex flex-col justify-end group hover:scale-[1.02] transition-transform`}
              >
                {/* Overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <span className="relative z-10 text-white font-semibold text-lg">
                  {category.name}
                </span>
              </Link>
            ))}
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
            ) : featuredProducts.length > 0 ? (
              featuredProducts.map((product) => {
                const primaryImage = product.images?.find((img) => img.is_primary) || product.images?.[0];
                return (
                  <Link
                    key={product.id}
                    to={`/products/${product.slug}`}
                    className="bg-[var(--color-surface)]/80 backdrop-blur-sm rounded-2xl border border-[var(--color-border)] p-3 hover:border-[var(--color-primary)]/50 transition-all group hover:scale-[1.02]"
                  >
                    <div className="aspect-square bg-[var(--color-border)] rounded-xl mb-3 overflow-hidden">
                      {primaryImage ? (
                        <img
                          src={primaryImage.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
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
                    {product.stock_quantity !== undefined && product.stock_quantity < 10 && product.stock_quantity > 0 && (
                      <span className="text-xs text-orange-400 mt-1 block">
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
