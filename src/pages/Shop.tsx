import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';

export default function Shop() {
  const navigate = useNavigate();
  const { categories, isLoading } = useCategories();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-[#0D1B2A] px-4 py-12 text-center">
        <p className="text-[#1677FF] text-sm font-semibold uppercase tracking-widest mb-2">Our Products</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Shop by Category</h1>
        <p className="text-white/50 text-base max-w-sm mx-auto">
          Choose a category to browse our products
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {isLoading ? (
          /* Skeleton */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border border-gray-100 overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          /* No categories — go straight to all products */
          <div className="text-center py-16">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-6">No categories yet</p>
            <button
              onClick={() => navigate('/products')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1677FF] text-white font-bold rounded-2xl hover:bg-[#1060d0] transition-colors btn-press"
            >
              Browse All Products <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/products?category=${cat.slug}`)}
                className="group text-left bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:border-[#1677FF]/30 transition-all btn-press"
              >
                {/* Image */}
                <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative">
                  {cat.image_url ? (
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-10 w-10 text-gray-300" />
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-[#1677FF]/0 group-hover:bg-[#1677FF]/10 transition-colors duration-200" />
                </div>

                {/* Text */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-[#0D1B2A] text-sm sm:text-base leading-tight group-hover:text-[#1677FF] transition-colors">
                      {cat.name}
                    </h2>
                    <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#1677FF] transition-colors flex-shrink-0 ml-2" />
                  </div>
                  {cat.description && (
                    <p className="text-gray-400 text-xs mt-1 line-clamp-2 leading-relaxed">
                      {cat.description}
                    </p>
                  )}
                </div>
              </button>
            ))}

            {/* "All Products" card at the end */}
            <button
              onClick={() => navigate('/products')}
              className="group text-left bg-[#0D1B2A] rounded-2xl border border-transparent overflow-hidden shadow-sm hover:shadow-md hover:border-[#1677FF]/50 transition-all btn-press"
            >
              <div className="aspect-[4/3] flex items-center justify-center bg-[#1677FF]/10">
                <div className="w-16 h-16 rounded-full bg-[#1677FF]/20 flex items-center justify-center group-hover:bg-[#1677FF]/30 transition-colors">
                  <Package className="h-8 w-8 text-[#1677FF]" />
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-white text-sm sm:text-base">View All</h2>
                  <ArrowRight className="h-4 w-4 text-[#1677FF] flex-shrink-0 ml-2" />
                </div>
                <p className="text-white/40 text-xs mt-1">Browse everything we offer</p>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
