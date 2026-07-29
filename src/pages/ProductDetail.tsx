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
import { useSettingsStore } from '../store/settingsStore';
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
  const [artworkError, setArtworkError] = useState<string | null>(null);
  const artworkErrorRef = useRef<HTMLDivElement>(null);
  const [quantityInput, setQuantityInput] = useState('1');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [colorRatios, setColorRatios] = useState<Record<string, number>>({});
  const [colorSplitError, setColorSplitError] = useState<string | null>(null);
  const colorErrorRef = useRef<HTMLDivElement>(null);
  const [productDescription, setProductDescription] = useState('');
  // Apparel-specific state
  const [apparelSizeQtys, setApparelSizeQtys] = useState<Record<string, number>>({});
  const [selectedApparelColor, setSelectedApparelColor] = useState<string>('');
  const [apparelError, setApparelError] = useState<string | null>(null);
  // Subscribe & Save state
  const [selectedInterval, setSelectedInterval] = useState<string>('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

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
  const { settings } = useSettingsStore();

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
      const { uploadToStorage } = await import('../lib/storage');
      const url = await uploadToStorage(file, 'customizations');
      setCustomizationImageUrl(url);
      setArtworkError(null);
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
      const isRemoving = prev.includes(colorName);
      // Block adding a color if already at the quantity limit
      if (!isRemoving && prev.length >= quantity) {
        const msg = `You can only pick up to ${quantity} color${quantity !== 1 ? 's' : ''} for a quantity of ${quantity}. Increase your quantity or remove a color first.`;
        setColorSplitError(msg);
        setTimeout(() => colorErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
        return prev;
      }
      const next = isRemoving
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

  // When quantity changes, trim colors to new qty limit and redistribute
  const handleQuantityChange = (newQty: number) => {
    setQuantity(newQty);
    setQuantityInput(String(newQty));
    if (selectedColors.length > 0) {
      const trimmed = selectedColors.slice(0, newQty);
      if (trimmed.length !== selectedColors.length) {
        setSelectedColors(trimmed);
      }
      setColorRatios(distributeUnits(trimmed, newQty));
      setColorSplitError(null);
    }
  };

  const handleAddToCart = () => {
    // --- Apparel flow: add one line per size ---
    if (product.is_apparel) {
      const sizesWithQty = (product.variants || []).filter(v => (apparelSizeQtys[v.id] ?? 0) > 0);
      if (sizesWithQty.length === 0) {
        setApparelError('Please select at least one size and quantity.');
        return;
      }
      if (!selectedApparelColor && (product.available_colors?.length || 0) > 0) {
        setApparelError('Please select a color.');
        return;
      }
      setApparelError(null);
      setIsAdding(true);
      for (const variant of sizesWithQty) {
        addItem(
          product,
          variant,
          apparelSizeQtys[variant.id],
          undefined,
          selectedApparelColor ? [selectedApparelColor] : undefined,
          undefined,
        );
      }
      setTimeout(() => {
        setIsAdding(false);
        openCart();
      }, 600);
      return;
    }

    // --- Standard flow ---
    if (product.is_customizable && !customizationImageUrl) {
      setArtworkError('Please upload your artwork or logo before adding to cart.');
      setTimeout(() => artworkErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      return;
    }
    setArtworkError(null);
    if (product.require_color_selection && selectedColors.length === 0) {
      setColorSplitError('Please select at least one color before adding to cart.');
      setTimeout(() => colorErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      return;
    }
    if (selectedColors.length > 1 && quantity > 1) {
      const totalUnits = selectedColors.reduce((sum, c) => sum + (colorRatios[c] ?? 0), 0);
      if (totalUnits !== quantity) {
        const msg = `Color units must add up to ${quantity} (your order quantity). Currently: ${totalUnits}. Adjust the amounts so they equal your total.`;
        setColorSplitError(msg);
        setTimeout(() => colorErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
        return;
      }
    }
    setColorSplitError(null);
    setIsAdding(true);

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

  const INTERVAL_LABELS: Record<string, string> = {
    weekly: 'Every week',
    biweekly: 'Every 2 weeks',
    monthly: 'Every month',
    every2months: 'Every 2 months',
    quarterly: 'Every 3 months',
  };

  const handleSubscribe = async () => {
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    if (!selectedInterval) {
      setSubscribeError('Please select a delivery frequency.');
      return;
    }
    setSubscribeError(null);
    setIsSubscribing(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const discountRate = product.subscription_discount_rate ?? 10;
      const discountedPrice = currentPrice * (1 - discountRate / 100);
      const res = await fetch('/.netlify/functions/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          productId: product.id,
          variantId: selectedVariant?.id ?? null,
          interval: selectedInterval,
          quantity,
          unitPrice: discountedPrice,
          selectedColors: selectedColors.length ? selectedColors : null,
          productDescription: productDescription.trim() || null,
          productName: product.name,
          productSlug: product.slug,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Subscription failed');
      // Redirect to Stripe Checkout (handles card entry + Stripe receipt email)
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setSubscribeError(err.message || 'Something went wrong. Please try again.');
      setIsSubscribing(false);
    }
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
            {(() => {
              const tiers = product.price_tiers || [];
              const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);
              // Find active tier based on current quantity
              let activeTierPrice = currentPrice;
              for (const tier of sorted) {
                if (quantity >= tier.min_qty) activeTierPrice = tier.price_per_unit;
              }
              const hasTiers = sorted.length > 0;
              const savingsPct = hasTiers && activeTierPrice < currentPrice
                ? Math.round((1 - activeTierPrice / currentPrice) * 100)
                : 0;
              return (
                <>
                  <div className="flex items-center gap-4">
                    <span className="text-3xl font-bold text-[var(--color-primary)]">
                      {formatPrice(activeTierPrice)}
                    </span>
                    {activeTierPrice < currentPrice && (
                      <span className="text-xl text-gray-500 line-through">{formatPrice(currentPrice)}</span>
                    )}
                    {isOnSale && activeTierPrice >= currentPrice && (
                      <span className="text-xl text-gray-500 line-through">
                        {formatPrice(product.compare_at_price!)}
                      </span>
                    )}
                    {savingsPct > 0 && (
                      <span className="text-sm font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-lg">
                        Save {savingsPct}%
                      </span>
                    )}
                  </div>

                  {/* Volume pricing table */}
                  {hasTiers && (
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Volume Pricing</p>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {sorted.map((tier, i) => {
                          const isActive = quantity >= tier.min_qty &&
                            (i === sorted.length - 1 || quantity < sorted[i + 1].min_qty);
                          const label = tier.max_qty
                            ? `${tier.min_qty}–${tier.max_qty} units`
                            : `${tier.min_qty}+ units`;
                          return (
                            <div
                              key={tier.id || i}
                              className={`flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                                isActive ? 'bg-[var(--color-primary)]/10 font-semibold' : 'text-gray-600'
                              }`}
                            >
                              <span>{label}</span>
                              <span className={isActive ? 'text-[var(--color-primary)]' : ''}>
                                {formatPrice(tier.price_per_unit)} ea
                                {isActive && <span className="ml-1.5 text-xs font-normal text-green-600">← your price</span>}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Quantity (top) — hidden for apparel (per-size qty inputs are used instead) */}
            <div className={`flex items-center gap-3 ${product.is_apparel ? 'hidden' : ''}`}>
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

            {/* Apparel: Color + Size Grid */}
            {product.is_apparel ? (
              <div className="space-y-5">
                {apparelError && (
                  <p className="text-red-500 text-sm font-medium">{apparelError}</p>
                )}

                {/* Single-select color swatches */}
                {(product.available_colors?.length ?? 0) > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-semibold text-[#0D1B2A]">Color:</span>
                      {selectedApparelColor && (
                        <span className="text-sm text-[var(--color-primary)] font-medium">{selectedApparelColor}</span>
                      )}
                      <span className="ml-auto text-xs text-gray-400">
                        {(product.available_colors?.length ?? 0)} colors
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(product.available_colors ?? []).map(colorName => {
                        const hex = COLOR_PRESETS.find(p => p.name === colorName)?.hex ?? '#888888';
                        const isSelected = selectedApparelColor === colorName;
                        return (
                          <button
                            key={colorName}
                            type="button"
                            title={colorName}
                            onClick={() => {
                              setSelectedApparelColor(isSelected ? '' : colorName);
                              setApparelError(null);
                            }}
                            className={`relative w-9 h-9 rounded-full border-2 transition-all btn-press ${
                              isSelected
                                ? 'border-[var(--color-primary)] scale-110 shadow-md'
                                : 'border-gray-300 hover:border-gray-500'
                            }`}
                            style={{ backgroundColor: hex }}
                          >
                            {isSelected && (
                              <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Size qty grid */}
                {product.variants && product.variants.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-[#0D1B2A] mb-3">Choose Size</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {product.variants.map(variant => {
                        const sizeQty = apparelSizeQtys[variant.id] ?? 0;
                        const sizePrice = product.price + variant.price_adjustment;
                        return (
                          <div
                            key={variant.id}
                            className={`rounded-xl border-2 p-3 transition-all ${
                              sizeQty > 0
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <p className="text-sm font-bold text-[#0D1B2A] text-center mb-2">{variant.name}</p>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setApparelSizeQtys(prev => ({ ...prev, [variant.id]: Math.max(0, (prev[variant.id] ?? 0) - 1) }));
                                  setApparelError(null);
                                }}
                                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#0D1B2A] flex items-center justify-center font-bold text-lg transition-colors btn-press"
                              >
                                −
                              </button>
                              <span className="w-8 text-center text-sm font-semibold text-[#0D1B2A]">{sizeQty}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setApparelSizeQtys(prev => ({ ...prev, [variant.id]: (prev[variant.id] ?? 0) + 1 }));
                                  setApparelError(null);
                                }}
                                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#0D1B2A] flex items-center justify-center font-bold text-lg transition-colors btn-press"
                              >
                                +
                              </button>
                            </div>
                            <p className="text-xs text-center text-gray-500 mt-1.5">{formatPrice(sizePrice)}</p>
                          </div>
                        );
                      })}
                    </div>
                    {/* Total summary */}
                    {Object.values(apparelSizeQtys).some(q => q > 0) && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          {Object.values(apparelSizeQtys).reduce((a, b) => a + b, 0)} items
                        </span>
                        <span className="text-sm font-semibold text-[#0D1B2A]">
                          {formatPrice(
                            (product.variants ?? []).reduce((sum, v) =>
                              sum + (apparelSizeQtys[v.id] ?? 0) * (product.price + v.price_adjustment), 0
                            )
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Standard variants */
              product.variants && product.variants.length > 0 && (
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
                          setUserSelectedImage(false);
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
              )
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
              <div ref={artworkErrorRef} className="rounded-2xl border-2 border-dashed border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <ImageIcon className="h-4 w-4 text-[var(--color-primary)]" />
                  <p className="text-sm font-semibold text-[#0D1B2A]">Upload Your Logo / Artwork</p>
                  <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">Required</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  This product is custom-printed with your design. Upload a PNG, JPG, or SVG file before adding to cart.
                </p>
                {artworkError && (
                  <p className="text-red-500 text-xs font-medium mb-3">{artworkError}</p>
                )}

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

            {/* Color Selection — only when enabled on product AND not apparel (apparel uses inline swatch above) */}
            {product.allow_color_selection && !product.is_apparel && (
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
                <p className="text-xs text-gray-500 mb-3">Select one or more colors for your product{product.require_color_selection && <span className="text-red-500 font-medium"> (required)</span>}</p>
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
                  <div ref={colorErrorRef} className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 text-xs">
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
                    {product.is_apparel
                      ? `Add to Cart - ${formatPrice(
                          (product.variants ?? []).reduce((sum, v) =>
                            sum + (apparelSizeQtys[v.id] ?? 0) * (product.price + v.price_adjustment), 0
                          )
                        )}`
                      : `Add to Cart - ${formatPrice(currentPrice * quantity)}`
                    }
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

            {/* Subscribe & Save — only when feature flag + product flag are both on */}
            {settings.subscriptions_enabled && product.allow_subscriptions && !product.is_apparel && (
              <div className="rounded-2xl border-2 border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#0D1B2A]">Subscribe &amp; Save</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Save {product.subscription_discount_rate ?? 10}% on every recurring order
                    </p>
                  </div>
                  <span className="text-sm font-bold text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-xl">
                    -{product.subscription_discount_rate ?? 10}%
                  </span>
                </div>

                {subscribeSuccess ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
                    <Check className="h-4 w-4 flex-shrink-0" />
                    Subscription created! Check your account for details.
                  </div>
                ) : (
                  <>
                    {/* Frequency selector */}
                    <div className="flex flex-wrap gap-2">
                      {(product.subscription_intervals ?? []).map(interval => (
                        <button
                          key={interval}
                          type="button"
                          onClick={() => { setSelectedInterval(interval); setSubscribeError(null); }}
                          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all btn-press ${
                            selectedInterval === interval
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-[var(--color-primary)]/50'
                          }`}
                        >
                          {INTERVAL_LABELS[interval] ?? interval}
                        </button>
                      ))}
                    </div>

                    {selectedInterval && (
                      <div className="flex items-center justify-between text-sm px-1">
                        <span className="text-gray-500">Subscription price:</span>
                        <span className="font-bold text-[var(--color-primary)]">
                          {formatPrice(currentPrice * (1 - (product.subscription_discount_rate ?? 10) / 100))}
                          <span className="text-xs font-normal text-gray-400 ml-1">/ {INTERVAL_LABELS[selectedInterval]?.toLowerCase().replace('every ', '') ?? selectedInterval}</span>
                        </span>
                      </div>
                    )}

                    {subscribeError && (
                      <p className="text-red-500 text-xs font-medium">{subscribeError}</p>
                    )}

                    <button
                      type="button"
                      onClick={handleSubscribe}
                      disabled={isSubscribing}
                      className="w-full py-3 rounded-xl font-semibold text-sm border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all btn-press disabled:opacity-50"
                    >
                      {isSubscribing ? 'Setting up subscription...' : `Subscribe & Save ${product.subscription_discount_rate ?? 10}%`}
                    </button>
                    {!user && (
                      <p className="text-xs text-center text-gray-400">
                        You'll be asked to log in before subscribing.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
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
