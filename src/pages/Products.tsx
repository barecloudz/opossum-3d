import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, AlertCircle, RefreshCw } from 'lucide-react';
import ProductCard from '../components/product/ProductCard';
import Button from '../components/ui/Button';
import { ProductGridSkeleton } from '../components/ui/Skeleton';
import { useProductStore } from '../store/productStore';
import { useCategories } from '../hooks/useCategories';

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');

  // Use global product store (cached across page navigations)
  const { products, isLoading, error, fetchProducts } = useProductStore();
  const { categories } = useCategories();

  // Read category from URL on mount and when categories load
  useEffect(() => {
    const categorySlug = searchParams.get('category');
    if (categorySlug && categories.length > 0) {
      const category = categories.find((c) => c.slug === categorySlug);
      if (category) {
        setSelectedCategory(category.id);
      }
    }
  }, [searchParams, categories]);

  // Update URL when category changes
  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    if (categoryId) {
      const category = categories.find((c) => c.id === categoryId);
      if (category) {
        setSearchParams({ category: category.slug });
      }
    } else {
      setSearchParams({});
    }
  };

  // Fetch products on mount (will use cache if available)
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Safety net: if stuck loading for >12s with no products, force retry
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      const { isLoading: stillLoading, products: currentProducts } = useProductStore.getState();
      if (stillLoading && currentProducts.length === 0) {
        fetchProducts(true);
      }
    }, 12000);
    return () => clearTimeout(timer);
  }, [isLoading, fetchProducts]);

  const filteredProducts = products
    .filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  return (
    <div className="min-h-screen">
      {/* Dark page header */}
      <div
        className="bg-[#0D1B2A] px-4 py-16 text-center relative overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <p className="text-[#1677FF] text-xs font-semibold uppercase tracking-widest mb-3">Browse</p>
        <h1 className="font-display text-4xl sm:text-5xl text-white mb-3">Our Products</h1>
        <p className="text-white/50 text-sm">3D printing, laser engraving &amp; custom apparel</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-col gap-3 mb-8">
          {/* Category pills */}
          {categories.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleCategoryChange(null)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                  !selectedCategory
                    ? 'bg-[#1677FF] text-white border-[#1677FF] shadow-sm'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-[#1677FF]/50 hover:text-[#1677FF]'
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                    selectedCategory === category.id
                      ? 'bg-[#1677FF] text-white border-[#1677FF] shadow-sm'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-[#1677FF]/50 hover:text-[#1677FF]'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}

          {/* Search + Sort */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-[#0D1B2A] placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#1677FF]/30 focus:border-[#1677FF] bg-white"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[#0D1B2A] text-sm focus:outline-none focus:ring-2 focus:ring-[#1677FF]/30 focus:border-[#1677FF]"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price ↑</option>
              <option value="price-desc">Price ↓</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-[#0D1B2A] mb-2">Failed to load products</p>
            <p className="text-gray-500 text-sm mb-4">{error.message}</p>
            <Button onClick={() => fetchProducts(true)} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Filter className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">No products found matching your criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
