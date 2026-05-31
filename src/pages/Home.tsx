import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Printer, Zap, Package, Users, Star, Mail, Phone, ShoppingCart } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../store/cartStore';
import { formatPrice } from '../lib/utils';
import type { BannerSlide, Product } from '../types';

function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };
  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const d = touchStartX.current - touchEndX.current;
    if (Math.abs(d) >= 50) d > 0 ? onSwipeLeft() : onSwipeRight();
  };
  return { onTouchStart, onTouchMove, onTouchEnd };
}

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const { addItem, openCart } = useCartStore();

  useEffect(() => {
    supabase
      .from('banner_slides')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .then(({ data }) => setBanners(data || []));

    supabase
      .from('products')
      .select('*, images:product_images(*)')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('display_order', { ascending: true })
      .limit(4)
      .then(({ data }) => setFeaturedProducts(data || []));
  }, []);

  useEffect(() => {
    if (currentSlide >= banners.length) setCurrentSlide(0);
  }, [banners.length, currentSlide]);

  const nextSlide = useCallback(() => setCurrentSlide(p => (p + 1) % banners.length), [banners.length]);
  const prevSlide = useCallback(() => setCurrentSlide(p => (p - 1 + banners.length) % banners.length), [banners.length]);
  const bannerSwipe = useSwipe(nextSlide, prevSlide);

  useEffect(() => {
    if (banners.length === 0) return;
    const t = setInterval(nextSlide, 5000);
    return () => clearInterval(t);
  }, [nextSlide, banners.length]);

  const handleQuickAdd = (product: Product) => {
    addItem(product, undefined, 1);
    openCart();
  };

  const getPrimaryImage = (product: Product) =>
    product.images?.find(i => i.is_primary)?.image_url ||
    product.images?.[0]?.image_url ||
    null;

  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <div className="bg-[#0D1B2A] overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 py-14 md:py-20 flex flex-col md:flex-row items-center gap-10 md:gap-16">

          {/* Left — text */}
          <div className="flex-1 text-center md:text-left order-2 md:order-1">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 mb-5">
              <span className="w-2 h-2 bg-[#1677FF] rounded-full animate-pulse" />
              <span className="text-white/80 text-sm font-medium">Custom 3D Printing & Laser Engraving</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight mb-4">
              Your Vision.<br />
              <span className="text-[#1677FF]">Made Real.</span>
            </h1>
            <p className="text-white/60 text-base mb-8 max-w-md leading-relaxed">
              Precision 3D printed products built to your exact specifications. Custom and bulk orders welcome.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Link
                to="/products"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#1677FF] hover:bg-[#1060d0] text-white font-bold rounded-2xl transition-colors btn-press text-base"
              >
                Shop Now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/custom-quote"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-2xl transition-colors btn-press text-base"
              >
                Custom Quote
              </Link>
            </div>
          </div>

          {/* Right — product showcase */}
          <div className="flex-1 order-1 md:order-2 flex justify-center md:justify-end">
            <div className="relative">
              {/* Glow */}
              <div className="absolute inset-0 bg-[#1677FF]/20 rounded-3xl blur-3xl scale-110" />
              {/* Product card */}
              <Link to="/products/shake-maker-spoons" className="relative block">
                <div className="relative bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-3xl p-3 backdrop-blur-sm">
                  <img
                    src="https://res.cloudinary.com/dblvtidrh/image/upload/v1779975289/opossum/products/1000018893_ynfaqo.png"
                    alt="Shake Maker Spoons"
                    className="w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 object-contain rounded-2xl"
                  />
                  {/* Label */}
                  <div className="mt-2 px-3 pb-2 flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold text-sm">Shake Maker Spoons</p>
                      <p className="text-[#1677FF] font-extrabold">$5.00</p>
                    </div>
                    <div className="bg-[#1677FF] text-white text-xs font-bold px-3 py-1.5 rounded-xl">
                      Shop →
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* ── TRUST STRIP ──────────────────────────────────────── */}
      <div className="bg-[#0D1B2A] py-4">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {[
              { icon: Star, text: 'Premium Quality' },
              { icon: Zap, text: 'Fast Turnaround' },
              { icon: Package, text: 'Custom Orders' },
              { icon: Users, text: 'Bulk Pricing Available' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-white/80 text-sm font-medium">
                <Icon className="h-4 w-4 text-[#1677FF]" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FEATURED PRODUCTS ────────────────────────────────── */}
      {featuredProducts.length > 0 && (
        <div className="px-4 py-14 bg-[#F8FAFC]">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-[#1677FF] text-sm font-semibold uppercase tracking-widest mb-1">Our Products</p>
                <h2 className="text-2xl md:text-3xl font-extrabold text-[#0D1B2A]">Ready to Ship</h2>
              </div>
              <Link
                to="/products"
                className="hidden sm:inline-flex items-center gap-1.5 text-[#1677FF] font-semibold text-sm hover:gap-2.5 transition-all"
              >
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredProducts.map((product) => {
                const img = getPrimaryImage(product);
                return (
                  <div key={product.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group border border-gray-100">
                    <Link to={`/products/${product.slug}`} className="block relative aspect-square bg-gray-50 overflow-hidden">
                      {img ? (
                        <img
                          src={img}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-10 w-10 text-gray-300" />
                        </div>
                      )}
                      {product.compare_at_price && product.compare_at_price > product.price && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          SALE
                        </span>
                      )}
                    </Link>
                    <div className="p-3">
                      <Link to={`/products/${product.slug}`}>
                        <p className="font-semibold text-[#0D1B2A] text-sm leading-tight line-clamp-2 mb-1 hover:text-[#1677FF] transition-colors">
                          {product.name}
                        </p>
                      </Link>
                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <span className="font-bold text-[#0D1B2A] text-sm">{formatPrice(product.price)}</span>
                          {product.compare_at_price && product.compare_at_price > product.price && (
                            <span className="text-gray-400 text-xs line-through ml-1">{formatPrice(product.compare_at_price)}</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleQuickAdd(product)}
                          className="p-1.5 rounded-lg bg-[#1677FF]/10 text-[#1677FF] hover:bg-[#1677FF] hover:text-white transition-colors btn-press"
                          title="Add to cart"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-6 sm:hidden">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 text-[#1677FF] font-semibold text-sm"
              >
                View All Products <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── BANNER CAROUSEL (promos) ──────────────────────────── */}
      {banners.length > 0 && (
        <div className="px-4 py-10 bg-white">
          <div className="max-w-5xl mx-auto">
            <div
              className="relative overflow-hidden rounded-3xl"
              onTouchStart={bannerSwipe.onTouchStart}
              onTouchMove={bannerSwipe.onTouchMove}
              onTouchEnd={bannerSwipe.onTouchEnd}
            >
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {banners.map((slide) => (
                  <div
                    key={slide.id}
                    className={`w-full flex-shrink-0 relative bg-gradient-to-r ${slide.gradient} min-h-[160px] md:min-h-[200px] flex items-center`}
                  >
                    {slide.image_url && (
                      <img src={slide.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    <div className="relative z-10 px-10 py-8 md:px-14">
                      {slide.badge && (
                        <div className="inline-block bg-black/20 rounded-lg px-3 py-1 text-xs font-semibold text-white mb-2 uppercase tracking-wide">
                          {slide.badge}
                        </div>
                      )}
                      <h2 className={`text-2xl md:text-3xl font-extrabold ${slide.text_color === 'dark' ? 'text-black' : 'text-white'} mb-1`}>
                        {slide.title}
                      </h2>
                      <p className={`text-base md:text-lg font-semibold ${slide.text_color === 'dark' ? 'text-black/70' : 'text-white/80'} mb-4`}>
                        {slide.subtitle}
                      </p>
                      <Link
                        to={slide.cta_link}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors btn-press ${
                          slide.text_color === 'dark'
                            ? 'bg-black text-white hover:bg-black/80'
                            : 'bg-white text-black hover:bg-white/90'
                        }`}
                      >
                        {slide.cta_text} <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full pointer-events-none" />
                    <div className="absolute -right-5 -bottom-10 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
                  </div>
                ))}
              </div>
              {banners.length > 1 && (
                <>
                  <button onClick={prevSlide} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors backdrop-blur-sm btn-press">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={nextSlide} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors backdrop-blur-sm btn-press">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {banners.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className={`transition-all rounded-full ${currentSlide === i ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/75'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <div className="px-4 py-14 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[#1677FF] text-sm font-semibold uppercase tracking-widest mb-1">Simple Process</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#0D1B2A]">How It Works</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Browse or Submit',
                desc: 'Shop our existing products or submit a custom quote request with your specs and idea.',
              },
              {
                step: '02',
                title: 'We Design & Build',
                desc: 'Our team prints and engraves your order with precision equipment to your exact specifications.',
              },
              {
                step: '03',
                title: 'Delivered to You',
                desc: 'Your finished product ships straight to your door. Bulk and rush orders available.',
              },
            ].map((item) => (
              <div key={item.step} className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <span className="absolute -top-3 left-5 text-5xl font-extrabold text-[#1677FF]/10 leading-none select-none">
                  {item.step}
                </span>
                <div className="w-10 h-10 bg-[#1677FF]/10 rounded-xl flex items-center justify-center mb-4 mt-2">
                  <span className="text-[#1677FF] font-bold text-sm">{item.step}</span>
                </div>
                <h3 className="font-bold text-[#0D1B2A] mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SERVICES ─────────────────────────────────────────── */}
      <div className="px-4 py-14 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[#1677FF] text-sm font-semibold uppercase tracking-widest mb-1">What We Offer</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#0D1B2A]">Our Services</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Printer, title: '3D Printing', desc: 'FDM printing in a wide range of materials and colors' },
              { icon: Zap, title: 'Laser Engraving', desc: 'Precise engravings on wood, acrylic, metal and more' },
              { icon: Star, title: 'Branded Kits', desc: 'Custom branded products with your logo and name' },
              { icon: Users, title: 'Bulk Orders', desc: 'Volume pricing for teams, events and organizations' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-[#F8FAFC] rounded-2xl p-5 border border-gray-100 hover:border-[#1677FF]/30 hover:shadow-sm transition-all">
                <div className="w-10 h-10 bg-[#1677FF]/10 rounded-xl flex items-center justify-center mb-3">
                  <Icon className="h-5 w-5 text-[#1677FF]" />
                </div>
                <h3 className="font-bold text-[#0D1B2A] text-sm mb-1">{title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA BANNER ───────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <img src="/images/hexagon-wall-background.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        <div className="relative bg-[#0D1B2A] px-6 py-16 text-center">
          <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-3">
            Have a custom idea?
          </h2>
          <p className="text-white/60 text-base mb-8 max-w-md mx-auto">
            Tell us what you need. We'll design, print, and engrave it — exactly how you imagined it.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/custom-quote"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#1677FF] hover:bg-[#1060d0] text-white font-bold rounded-2xl transition-colors btn-press"
            >
              Request a Custom Quote <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-2xl transition-colors btn-press"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>

      {/* ── CONTACT ──────────────────────────────────────────── */}
      <div className="px-4 py-12 bg-white">
        <div className="max-w-sm mx-auto text-center">
          <h2 className="text-xl font-bold text-[#0D1B2A] mb-6">Get In Touch</h2>
          <div className="flex flex-col gap-3">
            <a
              href="mailto:NexalonCreations@gmail.com"
              className="flex items-center justify-center gap-3 py-3.5 px-5 bg-[#F8FAFC] border border-gray-200 rounded-2xl text-[#0D1B2A] hover:border-[#1677FF] hover:bg-[#1677FF]/5 transition-colors font-medium text-sm"
            >
              <Mail className="h-4 w-4 text-[#1677FF] flex-shrink-0" />
              NexalonCreations@gmail.com
            </a>
            <a
              href="tel:8283882151"
              className="flex items-center justify-center gap-3 py-3.5 px-5 bg-[#F8FAFC] border border-gray-200 rounded-2xl text-[#0D1B2A] hover:border-[#1677FF] hover:bg-[#1677FF]/5 transition-colors font-medium text-sm"
            >
              <Phone className="h-4 w-4 text-[#1677FF] flex-shrink-0" />
              828-388-2151
            </a>
          </div>
          <p className="mt-8 text-xs text-gray-400">
            Interested in earning commissions?{' '}
            <Link to="/affiliate/apply" className="text-[#1677FF] hover:underline font-medium">
              Join our affiliate program
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
}
