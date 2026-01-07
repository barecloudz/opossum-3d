import { Link } from 'react-router-dom';
import { Package, ShoppingCart, Heart } from 'lucide-react';
import Badge from '../ui/Badge';
import { formatPrice, getStockStatus } from '../../lib/utils';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useAuthStore } from '../../store/authStore';
import type { Product } from '../../types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem, openCart } = useCartStore();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
  const { user } = useAuthStore();
  const stockStatus = getStockStatus(product.stock_quantity, product.low_stock_threshold);
  const primaryImage = product.images?.find((img) => img.is_primary) || product.images?.[0];
  const inWishlist = isInWishlist(product.id);

  // Calculate discount percentage
  const isOnSale = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = isOnSale
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    openCart();
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inWishlist) {
      removeFromWishlist(product.id, user?.id);
    } else {
      addToWishlist(product.id, user?.id);
    }
  };

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-primary)]/50 hover:shadow-neon-sm transition-all"
    >
      {/* Image */}
      <div className="aspect-square bg-[var(--color-background)] relative overflow-hidden">
        {primaryImage ? (
          <img
            src={primaryImage.image_url}
            alt={primaryImage.alt_text || product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-16 w-16 text-gray-600" />
          </div>
        )}

        {/* Stock badge */}
        {stockStatus !== 'in_stock' && (
          <div className="absolute top-2 left-2">
            <Badge variant={stockStatus === 'low_stock' ? 'warning' : 'danger'}>
              {stockStatus === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
            </Badge>
          </div>
        )}

        {/* Featured badge */}
        {product.is_featured && !isOnSale && (
          <div className="absolute top-2 right-2">
            <Badge variant="success">Featured</Badge>
          </div>
        )}

        {/* Sale badge */}
        {isOnSale && (
          <div className="absolute top-2 right-2">
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
              {discountPercent}% OFF
            </span>
          </div>
        )}

        {/* Wishlist button - always bottom left */}
        <button
          onClick={handleWishlistToggle}
          className={`absolute bottom-2 left-2 p-2 rounded-full transition-all ${
            inWishlist
              ? 'bg-red-500 text-white'
              : 'bg-white/80 text-gray-600 hover:bg-white hover:text-red-500'
          }`}
        >
          <Heart className={`h-4 w-4 ${inWishlist ? 'fill-current' : ''}`} />
        </button>

        {/* Quick add button */}
        <button
          onClick={handleAddToCart}
          disabled={stockStatus === 'out_of_stock' && !product.continue_selling_when_out_of_stock}
          className="absolute bottom-2 right-2 p-2 bg-brand-neon text-brand-black rounded-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-emerald"
        >
          <ShoppingCart className="h-5 w-5" />
        </button>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-theme font-medium mb-1 truncate group-hover:text-[var(--color-primary)] transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[var(--color-primary)] font-semibold">{formatPrice(product.price)}</span>
            {product.compare_at_price && (
              <span className="text-theme opacity-50 text-sm line-through">
                {formatPrice(product.compare_at_price)}
              </span>
            )}
          </div>
          {/* Mobile Add to Cart */}
          <button
            onClick={handleAddToCart}
            disabled={stockStatus === 'out_of_stock' && !product.continue_selling_when_out_of_stock}
            className="md:hidden p-2 bg-brand-neon text-brand-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed active:bg-brand-emerald"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}
