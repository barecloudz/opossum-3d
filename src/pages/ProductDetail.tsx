import { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Minus, Plus, Clock, Package, Heart, Share2, ShoppingCart, Check, ChevronDown, ChevronUp } from 'lucide-react';
import Button from '../components/ui/Button';
import { ProductDetailSkeleton } from '../components/ui/Skeleton';
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
  const navigate = useNavigate();
  const { product, isLoading } = useProduct(slug || '');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [userSelectedImage, setUserSelectedImage] = useState(false); // Track if user clicked a thumbnail
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const { addItem, openCart } = useCartStore();

  // Swipe support for main image
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const handleImageTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleImageTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleImageTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const images = product?.images || [];
    if (images.length <= 1) return;

    if (Math.abs(distance) >= minSwipeDistance) {
      setUserSelectedImage(true);
      if (distance > 0) {
        // Swipe left - next image
        setSelectedImageIndex((prev) => (prev + 1) % images.length);
      } else {
        // Swipe right - previous image
        setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
      }
      setImageLoading(true);
    }
  };
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isInWishlist } = useWishlistStore();
  const { user } = useAuthStore();

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Product Not Found</h1>
          <p className="text-gray-400 mb-6">The product you're looking for doesn't exist.</p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-black font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  const effectiveStock = selectedVariant ? selectedVariant.stock_quantity : product.stock_quantity;
  const stockStatus = getStockStatus(effectiveStock, product.low_stock_threshold);
  const currentPrice = product.price + (selectedVariant?.price_adjustment || 0);
  const maxQuantity = product.track_inventory && !product.continue_selling_when_out_of_stock ? effectiveStock : 99;
  const images = product.images || [];

  // If variant has a specific image and user hasn't clicked a thumbnail, show variant image
  // Otherwise show the selected gallery image
  const variantImageUrl = selectedVariant?.image_url;
  const showVariantImage = variantImageUrl && !userSelectedImage;
  const selectedImage = showVariantImage
    ? { image_url: variantImageUrl, alt_text: selectedVariant?.name || null }
    : (images[selectedImageIndex] || images[0]);

  const inWishlist = isInWishlist(product.id);

  // Calculate discount percentage
  const isOnSale = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = isOnSale
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  const handleAddToCart = () => {
    setIsAdding(true);
    addItem(product, selectedVariant, quantity);
    setTimeout(() => {
      setIsAdding(false);
      openCart();
    }, 600);
  };

  const handleWishlistToggle = () => {
    if (inWishlist) {
      removeFromWishlist(product.id, user?.id);
    } else {
      addToWishlist(product.id, user?.id);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: product.name,
        text: product.description || `Check out ${product.name}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="min-h-screen pb-32 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 glass-strong">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors btn-press"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 text-gray-400 hover:text-white transition-colors btn-press"
            >
              <Share2 className="h-5 w-5" />
            </button>
            <button
              onClick={handleWishlistToggle}
              className={`p-2 transition-colors btn-press ${
                inWishlist ? 'text-red-500' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Heart className={`h-5 w-5 ${inWishlist ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-4 animate-fade-in">
            {/* Main Image - Swipeable */}
            <div
              className="relative aspect-square glass rounded-3xl overflow-hidden"
              onTouchStart={handleImageTouchStart}
              onTouchMove={handleImageTouchMove}
              onTouchEnd={handleImageTouchEnd}
            >
              {/* Sale badge */}
              {isOnSale && (
                <div className="absolute top-4 left-4 z-10 bg-red-500 text-white text-sm font-bold px-3 py-1.5 rounded-xl">
                  {discountPercent}% OFF
                </div>
              )}

              {/* Loading skeleton */}
              {imageLoading && selectedImage && (
                <div className="absolute inset-0 bg-[var(--color-surface)] animate-pulse flex items-center justify-center z-5">
                  <Package className="h-16 w-16 text-gray-600 animate-pulse" />
                </div>
              )}

              {selectedImage ? (
                <img
                  src={selectedImage.image_url}
                  alt={selectedImage.alt_text || product.name}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                  onLoad={() => setImageLoading(false)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-24 w-24 text-gray-600" />
                </div>
              )}

              {/* Navigation arrows - visible on larger screens or when multiple images */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => {
                      setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
                      setUserSelectedImage(true);
                      setImageLoading(true);
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm btn-press z-10"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedImageIndex((prev) => (prev + 1) % images.length);
                      setUserSelectedImage(true);
                      setImageLoading(true);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm btn-press z-10"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>

                  {/* Image counter */}
                  <div className="absolute bottom-4 right-4 px-3 py-1 rounded-full bg-black/40 text-white text-sm backdrop-blur-sm z-10">
                    {selectedImageIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail gallery */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => {
                      if (selectedImageIndex !== index || showVariantImage) {
                        setImageLoading(true);
                      }
                      setSelectedImageIndex(index);
                      setUserSelectedImage(true);
                    }}
                    className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden transition-all btn-press ${
                      selectedImageIndex === index && !showVariantImage
                        ? 'ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-background)]'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={image.image_url}
                      alt={image.alt_text || ''}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Image dots for mobile */}
            {images.length > 1 && (
              <div className="flex justify-center gap-2 lg:hidden">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (selectedImageIndex !== index || showVariantImage) {
                        setImageLoading(true);
                      }
                      setSelectedImageIndex(index);
                      setUserSelectedImage(true);
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      selectedImageIndex === index && !showVariantImage
                        ? 'bg-[var(--color-primary)] w-6'
                        : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {/* Category */}
            {product.category && (
              <Link
                to={`/products?category=${product.category.slug}`}
                className="inline-block text-[var(--color-primary)] text-sm font-medium hover:underline"
              >
                {product.category.name}
              </Link>
            )}

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-white">{product.name}</h1>

            {/* Price */}
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold text-[var(--color-primary)]">
                {formatPrice(currentPrice)}
              </span>
              {isOnSale && (
                <span className="text-xl text-gray-500 line-through">
                  {formatPrice(product.compare_at_price!)}
                </span>
              )}
            </div>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Select Option
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => {
                        const newVariant = selectedVariant?.id === variant.id ? undefined : variant;
                        setSelectedVariant(newVariant);
                        setQuantity(1);
                        setUserSelectedImage(false); // Reset so variant image shows
                        if (newVariant?.image_url) {
                          setImageLoading(true);
                        }
                      }}
                      className={`px-4 py-2.5 rounded-xl font-medium transition-all btn-press ${
                        selectedVariant?.id === variant.id
                          ? 'bg-[var(--color-primary)] text-black'
                          : 'glass text-white hover:bg-white/10'
                      }`}
                    >
                      {variant.name}
                      {variant.price_adjustment !== 0 && (
                        <span className="ml-1 opacity-70">
                          ({variant.price_adjustment > 0 ? '+' : ''}
                          {formatPrice(variant.price_adjustment)})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock status */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              stockStatus === 'in_stock'
                ? 'bg-green-500/20 text-green-400'
                : stockStatus === 'low_stock'
                ? 'bg-orange-500/20 text-orange-400'
                : 'bg-red-500/20 text-red-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                stockStatus === 'in_stock'
                  ? 'bg-green-400'
                  : stockStatus === 'low_stock'
                  ? 'bg-orange-400'
                  : 'bg-red-400'
              }`} />
              {stockStatus === 'in_stock'
                ? 'In Stock'
                : stockStatus === 'low_stock'
                ? `Only ${effectiveStock} left`
                : 'Out of Stock'}
            </div>

            {/* Print time */}
            {product.print_time_hours && (
              <div className="flex items-center text-gray-400">
                <Clock className="h-5 w-5 mr-2" />
                <span>Estimated print time: {product.print_time_hours} hours</span>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="desc-card-wrapper">
                <div className="desc-card">
                  <div className="desc-card-titlebar" aria-hidden="true"></div>
                  <div className="desc-card-accent" aria-hidden="true"></div>
                  <div className="desc-card-corner" aria-hidden="true"></div>
                  <div className="desc-card-edge" aria-hidden="true"></div>
                  <h2 className="desc-card-title">Product Description</h2>
                  <div className="desc-card-text">
                    <p
                      className={!isDescriptionExpanded ? 'line-clamp-4' : ''}
                      style={{ whiteSpace: 'pre-line' }}
                    >
                      {product.description}
                    </p>
                    <button
                      onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                      className="mt-3 text-[var(--color-primary)] hover:underline text-sm font-medium inline-flex items-center gap-1"
                    >
                      {isDescriptionExpanded ? (
                        <>Show less <ChevronUp className="h-4 w-4" /></>
                      ) : (
                        <>Read more <ChevronDown className="h-4 w-4" /></>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Quantity
              </label>
              <div className="inline-flex items-center glass rounded-xl">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 text-gray-400 hover:text-white transition-colors btn-press"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <span className="text-white text-lg font-semibold w-12 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                  disabled={quantity >= maxQuantity}
                  className="p-3 text-gray-400 hover:text-white transition-colors btn-press disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Add to cart */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleAddToCart}
                size="lg"
                className={`flex-1 btn-press ${isAdding ? 'animate-cart-bounce' : ''}`}
                disabled={stockStatus === 'out_of_stock' && !product.continue_selling_when_out_of_stock}
              >
                {isAdding ? (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    Added!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Add to Cart - {formatPrice(currentPrice * quantity)}
                  </>
                )}
              </Button>
              <button
                onClick={handleWishlistToggle}
                className={`p-4 rounded-xl transition-all btn-press ${
                  inWishlist
                    ? 'bg-red-500 text-white'
                    : 'glass text-white hover:bg-red-500/20 hover:text-red-400'
                }`}
              >
                <Heart className={`h-6 w-6 ${inWishlist ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Product Reviews */}
        <div className="mt-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <ProductReviews productId={product.id} />
        </div>

        {/* Related Products */}
        <div className="mt-12 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <RelatedProducts
            currentProductId={product.id}
            categoryId={product.category_id}
          />
        </div>
      </div>
    </div>
  );
}
