import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, AlertCircle, RefreshCw } from 'lucide-react';
import Input from '../components/ui/Input';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-theme mb-2">Products</h1>
        <p className="text-theme opacity-60">Browse our collection of 3D printed and laser engraved items</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category filter */}
        <div className="flex gap-4">
          <select
            value={selectedCategory || ''}
            onChange={(e) => handleCategoryChange(e.target.value || null)}
            className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-theme focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-theme focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="newest">Newest</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <ProductGridSkeleton count={8} />
      ) : error ? (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-theme mb-2">Failed to load products</p>
          <p className="text-theme opacity-60 text-sm mb-4">{error.message}</p>
          <Button onClick={() => fetchProducts(true)} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Filter className="h-12 w-12 text-theme opacity-40 mx-auto mb-4" />
          <p className="text-theme opacity-60">No products found matching your criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
