import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, Clock, Package } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { useProduct } from '../hooks/useProduct';
import { useCartStore } from '../store/cartStore';
import { formatPrice, getStockStatus } from '../lib/utils';
import type { ProductVariant } from '../types';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { product, isLoading } = useProduct(slug || '');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>();
  const [quantity, setQuantity] = useState(1);
  const { addItem, openCart } = useCartStore();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Product Not Found</h1>
        <Link to="/products" className="text-brand-neon hover:text-brand-emerald">
          Back to Products
        </Link>
      </div>
    );
  }

  const stockStatus = getStockStatus(product.stock_quantity, product.low_stock_threshold);
  const currentPrice = product.price + (selectedVariant?.price_adjustment || 0);
  const primaryImage = product.images?.find((img) => img.is_primary) || product.images?.[0];

  const handleAddToCart = () => {
    addItem(product, selectedVariant, quantity);
    openCart();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link
        to="/products"
        className="inline-flex items-center text-gray-400 hover:text-brand-neon mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Products
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-square bg-brand-charcoal rounded-xl border border-brand-gray overflow-hidden">
            {primaryImage ? (
              <img
                src={primaryImage.image_url}
                alt={primaryImage.alt_text || product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-24 w-24 text-gray-600" />
              </div>
            )}
          </div>
          {/* Thumbnail gallery */}
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((image) => (
                <button
                  key={image.id}
                  className="aspect-square bg-brand-charcoal rounded-lg border border-brand-gray overflow-hidden hover:border-brand-neon transition-colors"
                >
                  <img
                    src={image.image_url}
                    alt={image.alt_text || ''}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-4">{product.name}</h1>

          {/* Price */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-3xl font-bold text-brand-neon">
              {formatPrice(currentPrice)}
            </span>
            {product.compare_at_price && (
              <span className="text-xl text-gray-500 line-through">
                {formatPrice(product.compare_at_price)}
              </span>
            )}
          </div>

          {/* Stock status */}
          <div className="mb-6">
            <Badge
              variant={
                stockStatus === 'in_stock'
                  ? 'success'
                  : stockStatus === 'low_stock'
                  ? 'warning'
                  : 'danger'
              }
            >
              {stockStatus === 'in_stock'
                ? 'In Stock'
                : stockStatus === 'low_stock'
                ? `Only ${product.stock_quantity} left`
                : 'Out of Stock'}
            </Badge>
          </div>

          {/* Print time */}
          {product.print_time_hours && (
            <div className="flex items-center text-gray-400 mb-6">
              <Clock className="h-5 w-5 mr-2" />
              <span>Estimated print time: {product.print_time_hours} hours</span>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <p className="text-gray-400 mb-8">{product.description}</p>
          )}

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Size / Option
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      selectedVariant?.id === variant.id
                        ? 'border-brand-neon bg-brand-neon/10 text-brand-neon'
                        : 'border-brand-gray text-gray-300 hover:border-brand-neon/50'
                    }`}
                  >
                    {variant.name}
                    {variant.price_adjustment !== 0 && (
                      <span className="ml-1 text-sm">
                        ({variant.price_adjustment > 0 ? '+' : ''}
                        {formatPrice(variant.price_adjustment)})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quantity
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 bg-brand-charcoal border border-brand-gray rounded-lg hover:border-brand-neon transition-colors"
              >
                <Minus className="h-5 w-5 text-gray-400" />
              </button>
              <span className="text-white text-xl font-semibold w-12 text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-2 bg-brand-charcoal border border-brand-gray rounded-lg hover:border-brand-neon transition-colors"
              >
                <Plus className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Add to cart */}
          <Button
            onClick={handleAddToCart}
            size="lg"
            className="w-full"
            disabled={stockStatus === 'out_of_stock' && !product.continue_selling_when_out_of_stock}
          >
            Add to Cart - {formatPrice(currentPrice * quantity)}
          </Button>
        </div>
      </div>
    </div>
  );
}
