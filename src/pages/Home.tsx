import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight, ShoppingCart, Bell, RefreshCw, Heart, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useProductStore } from '../store/productStore';
import { useWishlistStore } from '../store/wishlistStore';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const { user } = useAuthStore();
  const { getItemCount, addItem } = useCartStore();
  const { items: wishlistItems, addItem: addToWishlist, removeItem: removeFromWishlist } = useWishlistStore();
  const navigate = useNavigate();
  const itemCount = getItemCount();

  // Use global product store (cached across page navigations)
  const { products, isLoading, error, fetchProducts } = useProductStore();

  const isInWishlist = (productId: string) => wishlistItems.some(item => item.id === productId);

  const handleQuickAdd = async (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    setAddingToCart(product.id);
    addItem(product, 1);
    // Brief delay to show animation
    setTimeout(() => setAddingToCart(null), 600);
  };

  const handleWishlist = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  // Fetch products on mount (will use cache if available)
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Get first 6 products for featured section
  const featuredProducts = products.slice(0, 6);

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-stagger">
            {categories.map((category) => (
              <Link
                key={category.name}
                to={`/${category.slug}`}
                className={`relative overflow-hidden rounded-2xl aspect-square bg-gradient-to-br ${category.gradient} p-4 flex flex-col justify-end group card-hover btn-press`}
              >
                {/* Shimmer overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                {/* Overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <span className="relative z-10 text-white font-semibold text-lg drop-shadow-lg">
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
                const inWishlist = isInWishlist(product.id);
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
