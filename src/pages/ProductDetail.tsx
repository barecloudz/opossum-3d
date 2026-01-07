import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Minus, Plus, Clock, Package, Heart } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { ProductDetailSkeleton } from '../components/ui/Skeleton';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import RelatedProducts from '../components/product/RelatedProducts';
import ProductReviews from '../components/product/ProductReviews';
import { useProduct } from '../hooks/useProduct';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useAuthStore } from '../store/authStore';
import { formatPrice, getStockStatus } from '../lib/utils';
import type { ProductVariant } from '../types';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { product, isLoading } = useProduct(slug || '');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>();
  const [quantity, setQuantity] = useState(1);
  const { addItem, openCart } = useCartStore();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
  const { user } = useAuthStore();

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-theme mb-4">Product Not Found</h1>
        <Link to="/products" className="text-[var(--color-primary)] hover:opacity-80">
          Back to Products
        </Link>
      </div>
    );
  }

  const stockStatus = getStockStatus(product.stock_quantity, product.low_stock_threshold);
  const currentPrice = product.price + (selectedVariant?.price_adjustment || 0);
  const primaryImage = product.images?.find((img) => img.is_primary) || product.images?.[0];
  const inWishlist = isInWishlist(product.id);

  // Calculate discount percentage
  const isOnSale = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = isOnSale
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;
  const savings = isOnSale ? product.compare_at_price! - product.price : 0;

  const handleAddToCart = () => {
    addItem(product, selectedVariant, quantity);
    openCart();
  };

  const handleWishlistToggle = () => {
    if (inWishlist) {
      removeFromWishlist(product.id, user?.id);
    } else {
      addToWishlist(product.id, user?.id);
    }
  };

  // Build breadcrumb items
  const breadcrumbItems: { label: string; href?: string }[] = [
    { label: 'Products', href: '/products' },
  ];
  if (product.category) {
    breadcrumbItems.push({
      label: product.category.name,
      href: `/products?category=${product.category.slug}`,
    });
  }
  breadcrumbItems.push({ label: product.name });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbItems} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-square bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
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
                  className="aspect-square bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden hover:border-[var(--color-primary)] transition-colors"
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
          <h1 className="text-3xl font-bold text-theme mb-4">{product.name}</h1>

          {/* Price */}
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold text-[var(--color-primary)]">
                {formatPrice(currentPrice)}
              </span>
              {isOnSale && (
                <>
                  <span className="text-xl text-theme opacity-50 line-through">
                    {formatPrice(product.compare_at_price!)}
                  </span>
                  <span className="bg-red-500 text-white text-sm font-bold px-2 py-1 rounded">
                    {discountPercent}% OFF
                  </span>
                </>
              )}
            </div>
            {isOnSale && (
              <p className="text-green-400 text-sm mt-1">
                You save {formatPrice(savings)}
              </p>
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
            <div className="flex items-center text-theme opacity-60 mb-6">
              <Clock className="h-5 w-5 mr-2" />
              <span>Estimated print time: {product.print_time_hours} hours</span>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <p className="text-theme opacity-60 mb-8">{product.description}</p>
          )}

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-theme opacity-80 mb-2">
                Size / Option
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      selectedVariant?.id === variant.id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] text-theme opacity-80 hover:border-[var(--color-primary)]/50'
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
            <label className="block text-sm font-medium text-theme opacity-80 mb-2">
              Quantity
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)] transition-colors"
              >
                <Minus className="h-5 w-5 text-theme opacity-60" />
              </button>
              <span className="text-theme text-xl font-semibold w-12 text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)] transition-colors"
              >
                <Plus className="h-5 w-5 text-theme opacity-60" />
              </button>
            </div>
          </div>

          {/* Add to cart and wishlist */}
          <div className="flex gap-3">
            <Button
              onClick={handleAddToCart}
              size="lg"
              className="flex-1"
              disabled={stockStatus === 'out_of_stock' && !product.continue_selling_when_out_of_stock}
            >
              Add to Cart - {formatPrice(currentPrice * quantity)}
            </Button>
            <button
              onClick={handleWishlistToggle}
              className={`p-4 rounded-lg border transition-all ${
                inWishlist
                  ? 'bg-red-500 border-red-500 text-white'
                  : 'bg-[var(--color-surface)] border-[var(--color-border)] text-theme hover:border-red-500 hover:text-red-500'
              }`}
            >
              <Heart className={`h-6 w-6 ${inWishlist ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Product Reviews */}
      <ProductReviews productId={product.id} />

      {/* Related Products */}
      <RelatedProducts
        currentProductId={product.id}
        categoryId={product.category_id}
      />
    </div>
  );
}
