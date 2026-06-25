import { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Minus, Plus, Clock, Package, Heart, Share2, ShoppingCart, Check, ChevronDown, ChevronUp, Upload, X as XIcon, ImageIcon, Palette, MessageSquare } from 'lucide-react';

import Button from '../components/ui/Button';
import { COLOR_PRESETS } from '../lib/constants';
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
  const { product, isLoading, error, refetch } = useProduct(slug || '');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [userSelectedImage, setUserSelectedImage] = useState(false); // Track if user clicked a thumbnail
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [customizationImageUrl, setCustomizationImageUrl] = useState('');
  const [customizationUploading, setCustomizationUploading] = useState(false);
  const [quantityInput, setQuantityInput] = useState('1');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [colorRatios, setColorRatios] = useState<Record<string, number>>({});
  const [colorSplitError, setColorSplitError] = useState<string | null>(null);
  const [productDescription, setProductDescription] = useState('');
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Failed to load product. Please try again.</p>
          <button onClick={refetch} className="px-4 py-2 bg-brand-neon text-black font-medium rounded-lg">
            Retry
          </button>
        </div>
      </div>
    );
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

  const handleCustomizationUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Please upload an image under 10MB.');
      return;
    }
    setCustomizationUploading(true);
    try {
      const { uploadToCloudinary } = await import('../lib/cloudinary');
      const url = await uploadToCloudinary(file, 'customizations');
      setCustomizationImageUrl(url);
    } catch {
      alert('Upload failed. Please try again.');
    } finally {
      setCustomizationUploading(false);
    }
  };

  // Auto-distribute units evenly across colors
  const distributeUnits = (colors: string[], qty: number): Record<string, number> => {
    if (colors.length === 0) return {};
    const base = Math.floor(qty / colors.length);
    const remainder = qty - base * colors.length;
    const result: Record<string, number> = {};
    colors.forEach((c, i) => { result[c] = base + (i < remainder ? 1 : 0); });
    return result;
  };

  const toggleColor = (colorName: string) => {
    setSelectedColors(prev => {
      const next = prev.includes(colorName)
        ? prev.filter(c => c !== colorName)
        : [...prev, colorName];
      setColorRatios(distributeUnits(next, quantity));
      setColorSplitError(null);
      return next;
    });
  };

  const updateColorUnits = (colorName: string, value: number) => {
    setColorRatios(prev => ({ ...prev, [colorName]: Math.max(0, value) }));
    setColorSplitError(null);
  };

  // When quantity changes, redistribute units proportionally
  const handleQuantityChange = (newQty: number) => {
    setQuantity(newQty);
    setQuantityInput(String(newQty));
    if (selectedColors.length > 1) {
      setColorRatios(distributeUnits(selectedColors, newQty));
      setColorSplitError(null);
    }
  };

  const handleAddToCart = () => {
    // Validate color units if multiple colors selected and qty > 1
    if (selectedColors.length > 1 && quantity > 1) {
      const totalUnits = selectedColors.reduce((sum, c) => sum + (colorRatios[c] ?? 0), 0);
      if (totalUnits !== quantity) {
        setColorSplitError(`Color units must add up to ${quantity} (your order quantity). Currently: ${totalUnits}. Adjust the amounts so they equal your total.`);
        return;
      }
    }
    setColorSplitError(null);
    setIsAdding(true);

    // qty=1 with multiple colors selected: just use whichever single color has units=1, or first selected
    // qty>1 with multiple colors: encode as "Color:units"
    const encodedColors = selectedColors.length > 1 && quantity > 1
      ? selectedColors.map(c => `${c}:${colorRatios[c] ?? 0}`)
      : selectedColors.slice(0, quantity === 1 ? 1 : undefined);

    addItem(
      product,
      selectedVariant,
      quantity,
      customizationImageUrl || undefined,
      encodedColors.length ? encodedColors : undefined,
      productDescription.trim() || undefined,
    );
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
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100">
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
              className="relative aspect-square bg-[#F8FAFC] border border-gray-100 rounded-3xl overflow-hidden"
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
            <h1 className="text-2xl md:text-3xl font-bold text-[#0D1B2A]">{product.name}</h1>

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

            {/* Quantity (top) */}
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center bg-gray-100 rounded-xl border border-gray-200">
                <button
                  onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
                  className="p-2.5 text-gray-500 hover:text-[#0D1B2A] transition-colors btn-press"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={quantityInput}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    setQuantityInput(raw);
                    const parsed = parseInt(raw, 10);
                    if (!isNaN(parsed) && parsed >= 1) {
                      handleQuantityChange(Math.min(maxQuantity, parsed));
                    }
                  }}
                  onBlur={() => {
                    const parsed = parseInt(quantityInput, 10);
                    const clamped = isNaN(parsed) ? 1 : Math.min(maxQuantity, Math.max(1, parsed));
                    handleQuantityChange(clamped);
                  }}
                  onFocus={(e) => e.target.select()}
                  className="text-[#0D1B2A] text-base font-semibold w-12 text-center bg-transparent focus:outline-none"
                />
                <button
                  onClick={() => handleQuantityChange(Math.min(maxQuantity, quantity + 1))}
                  disabled={quantity >= maxQuantity}
                  className="p-2.5 text-gray-500 hover:text-[#0D1B2A] transition-colors btn-press disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <span className="text-sm text-gray-400">qty</span>
            </div>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-3">
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
                        setQuantityInput('1');
                        setUserSelectedImage(false); // Reset so variant image shows
                        if (newVariant?.image_url) {
                          setImageLoading(true);
                        }
                      }}
                      className={`px-4 py-2.5 rounded-xl font-medium transition-all btn-press ${
                        selectedVariant?.id === variant.id
                          ? 'bg-[var(--color-primary)] text-black'
                          : 'bg-gray-100 text-[#0D1B2A] hover:bg-gray-200'
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

            {/* Logo / Artwork Upload — only for customizable products */}
            {product.is_customizable && (
              <div className="rounded-2xl border-2 border-dashed border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <ImageIcon className="h-4 w-4 text-[var(--color-primary)]" />
                  <p className="text-sm font-semibold text-[#0D1B2A]">Upload Your Logo / Artwork</p>
                  <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">Optional</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  This product can be custom-engraved or printed with your design. Upload a PNG, JPG, or SVG file if you have one.
                </p>

                {customizationImageUrl ? (
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-white flex-shrink-0">
                      <img src={customizationImageUrl} alt="Your uploaded artwork" className="w-full h-full object-contain p-1" />
                      <button
                        onClick={() => setCustomizationImageUrl('')}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </div>
                    <div>
                      <p className="text-green-600 text-sm font-semibold flex items-center gap-1">
                        <Check className="h-4 w-4" /> Artwork uploaded
                      </p>
                      <label className="mt-1 text-xs text-[var(--color-primary)] underline cursor-pointer hover:opacity-80">
                        Replace
                        <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleCustomizationUpload(f); e.target.value = ''; }} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className={`flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-gray-300 bg-white cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all ${customizationUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleCustomizationUpload(f); e.target.value = ''; }} />
                    <Upload className="h-6 w-6 text-gray-400" />
                    <span className="text-sm text-gray-500 font-medium">
                      {customizationUploading ? 'Uploading...' : 'Click to upload your logo'}
                    </span>
                    <span className="text-xs text-gray-400">PNG, JPG, SVG up to 10MB</span>
                  </label>
                )}
              </div>
            )}

            {/* Color Selection — only when enabled on product */}
            {product.allow_color_selection && (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="h-4 w-4 text-[var(--color-primary)]" />
                  <p className="text-sm font-semibold text-[#0D1B2A]">Pick Your Colors</p>
                  {selectedColors.length > 0 && (
                    <span className="text-xs text-[var(--color-primary)] font-medium ml-auto">
                      {selectedColors.length} selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-3">Select one or more colors for your product (optional)</p>
                <div className="flex flex-wrap gap-2">
                  {(product.available_colors?.length
                    ? product.available_colors.map(name => ({
                        name,
                        hex: COLOR_PRESETS.find(p => p.name === name)?.hex ?? '#888888',
                      }))
                    : COLOR_PRESETS
                  ).map(color => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => toggleColor(color.name)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all btn-press ${
                        selectedColors.includes(color.name)
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 font-medium'
                          : 'border-gray-200 hover:border-[var(--color-primary)]/50 text-gray-600'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                        style={{ backgroundColor: color.hex }}
                      />
                      {color.name}
                      {selectedColors.includes(color.name) && (
                        <Check className="h-3 w-3 text-[var(--color-primary)]" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Qty nudge — shown when 2+ colors picked but qty is 1 */}
                {selectedColors.length > 1 && quantity === 1 && (
                  <div className="mt-3 flex items-center gap-3 p-3 bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-xl">
                    <span className="text-sm text-[#0D1B2A] flex-1">Want multiple colors? Increase your quantity.</span>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(2)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Set qty to 2
                    </button>
                  </div>
                )}

                {/* Color unit split — shown when 2+ colors selected AND qty > 1 */}
                {selectedColors.length > 1 && quantity > 1 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                    <p className="text-xs font-medium text-[#0D1B2A]">How many of each color? <span className="text-gray-400 font-normal">(must add up to {quantity})</span></p>
                    {selectedColors.map(colorName => {
                      const hex = COLOR_PRESETS.find(p => p.name === colorName)?.hex ?? '#888';
                      const units = colorRatios[colorName] ?? 0;
                      return (
                        <div key={colorName} className="flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full flex-shrink-0 border border-gray-300" style={{ backgroundColor: hex }} />
                          <span className="text-sm text-[#0D1B2A] flex-1">{colorName}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateColorUnits(colorName, units - 1)}
                              className="w-7 h-7 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={units}
                              onChange={e => updateColorUnits(colorName, parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                              onFocus={e => e.target.select()}
                              className="w-10 text-center text-sm font-semibold border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                            />
                            <button
                              type="button"
                              onClick={() => updateColorUnits(colorName, units + 1)}
                              className="w-7 h-7 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {(() => {
                      const total = selectedColors.reduce((s, c) => s + (colorRatios[c] ?? 0), 0);
                      return (
                        <div className={`text-xs font-medium pt-1 border-t border-gray-200 ${total === quantity ? 'text-green-600' : 'text-orange-500'}`}>
                          Total: {total} / {quantity} {total === quantity ? '✓' : `— need ${quantity - total > 0 ? `${quantity - total} more` : `${total - quantity} less`}`}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Color split error */}
                {colorSplitError && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 text-xs">
                    {colorSplitError}
                  </div>
                )}
              </div>
            )}

            {/* Description Prompt — only when enabled on product */}
            {product.show_description_prompt && (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="h-4 w-4 text-[var(--color-primary)]" />
                  <p className="text-sm font-semibold text-[#0D1B2A]">Tell Us How You Want Your Product</p>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Describe any specific details, text, dimensions, or special requests for your order.
                </p>
                <textarea
                  value={productDescription}
                  onChange={e => setProductDescription(e.target.value)}
                  rows={4}
                  placeholder="e.g., Name to engrave, specific text, size preferences, finish style..."
                  className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 text-[#0D1B2A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none text-sm"
                />
              </div>
            )}

            {/* Quantity (bottom) */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-3">
                Quantity
              </label>
              <div className="inline-flex items-center bg-gray-100 rounded-xl border border-gray-200">
                <button
                  onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
                  className="p-3 text-gray-500 hover:text-[#0D1B2A] transition-colors btn-press"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={quantityInput}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    setQuantityInput(raw);
                    const parsed = parseInt(raw, 10);
                    if (!isNaN(parsed) && parsed >= 1) {
                      handleQuantityChange(Math.min(maxQuantity, parsed));
                    }
                  }}
                  onBlur={() => {
                    const parsed = parseInt(quantityInput, 10);
                    const clamped = isNaN(parsed) ? 1 : Math.min(maxQuantity, Math.max(1, parsed));
                    handleQuantityChange(clamped);
                  }}
                  onFocus={(e) => e.target.select()}
                  className="text-[#0D1B2A] text-lg font-semibold w-16 text-center bg-transparent focus:outline-none"
                />
                <button
                  onClick={() => handleQuantityChange(Math.min(maxQuantity, quantity + 1))}
                  disabled={quantity >= maxQuantity}
                  className="p-3 text-gray-500 hover:text-[#0D1B2A] transition-colors btn-press disabled:opacity-30 disabled:cursor-not-allowed"
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
                disabled={
                  (stockStatus === 'out_of_stock' && !product.continue_selling_when_out_of_stock) ||
                  customizationUploading
                }
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
                    : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-400 border border-gray-200'
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
