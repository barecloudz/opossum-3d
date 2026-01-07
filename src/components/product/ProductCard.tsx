import { Link } from 'react-router-dom';
import { Package, ShoppingCart } from 'lucide-react';
import Badge from '../ui/Badge';
import { formatPrice, getStockStatus } from '../../lib/utils';
import { useCartStore } from '../../store/cartStore';
import type { Product } from '../../types';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem, openCart } = useCartStore();
  const stockStatus = getStockStatus(product.stock_quantity, product.low_stock_threshold);
  const primaryImage = product.images?.find((img) => img.is_primary) || product.images?.[0];

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    openCart();
  };

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group bg-brand-charcoal rounded-xl border border-brand-gray overflow-hidden hover:border-brand-neon/50 hover:shadow-neon-sm transition-all"
    >
      {/* Image */}
      <div className="aspect-square bg-brand-black relative overflow-hidden">
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
        {product.is_featured && (
          <div className="absolute top-2 right-2">
            <Badge variant="success">Featured</Badge>
          </div>
        )}

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
        <h3 className="text-white font-medium mb-1 truncate group-hover:text-brand-neon transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-brand-neon font-semibold">{formatPrice(product.price)}</span>
            {product.compare_at_price && (
              <span className="text-gray-500 text-sm line-through">
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
