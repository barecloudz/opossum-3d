import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Printer, Zap, Package, Users, Star, ShoppingCart } from 'lucide-react';
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

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => e.target.classList.toggle('visible', e.isIntersecting)),
      { threshold: 0.1 }
    );
    document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [featuredProducts]);

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
        <div className="max-w-6xl mx-auto px-5 py-16 md:py-28 flex flex-col md:flex-row items-center gap-10 md:gap-16">

          {/* Left — text */}
          <div className="flex-1 text-center md:text-left order-2 md:order-1">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-[#1677FF] rounded-full animate-pulse" />
              <span className="text-white/80 text-sm font-medium">Custom 3D Printing & Laser Engraving</span>
            </div>
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl text-white leading-[1.05] tracking-tight mb-6">
              Have an idea you want{' '}
              <span className="text-[#1677FF] italic">brought to life?</span>
            </h1>
            <p className="text-white/60 text-base md:text-lg mb-8 max-w-md leading-relaxed">
              Every piece crafted to your exact specification — 3D printed, laser engraved, or custom apparel. Shipped straight to your door.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <a
                href="mailto:nexaloncreations@gmail.com?subject=Custom%20Request"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#1677FF] hover:bg-[#1060d0] text-white font-bold rounded-2xl transition-colors btn-press text-base shadow-lg shadow-[#1677FF]/30"
              >
                Send Your Idea <ArrowRight className="h-5 w-5" />
              </a>
              <Link
                to="/shop"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/25 text-white font-bold rounded-2xl transition-colors btn-press text-base"
              >
                Browse Products
              </Link>
            </div>
          </div>

          {/* Right — creativity button */}
          <div className="flex-1 order-1 md:order-2 flex justify-center md:justify-end">
            <div className="relative">
              <div className="absolute inset-0 bg-[#1677FF]/20 rounded-full blur-3xl scale-110" />
              <a href="mailto:nexaloncreations@gmail.com?subject=Custom%20Request" className="relative block group">
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 rounded-full overflow-hidden ring-4 ring-[#1677FF]/30 group-hover:ring-[#1677FF]/60 transition-all duration-300 group-hover:scale-105 shadow-2xl">
                  <img
                    src="/images/creativity.jpeg"
                    alt="Submit a creative idea"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-[#1677FF]/0 group-hover:bg-[#1677FF]/15 transition-colors duration-300 flex items-end justify-center pb-7">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[#1677FF] text-white text-sm font-bold px-5 py-2 rounded-full shadow-lg">
                      Send Your Idea →
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-center text-[#1677FF] text-sm font-semibold group-hover:underline">Creativity Button</p>
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* ── TRUST STRIP ──────────────────────────────────────── */}
      <div className="bg-[#0D1B2A] border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            {[
              { icon: Star, text: 'Premium Quality' },
              { icon: Zap, text: 'Fast Turnaround' },
              { icon: Package, text: 'Custom Orders' },
              { icon: Users, text: 'Bulk Pricing Available' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={text} className="flex items-center gap-2.5 text-white/75 text-sm font-medium">
                {i > 0 && <span className="text-white/15 hidden sm:inline mr-6 text-lg select-none">·</span>}
                <Icon className="h-4 w-4 text-[#1677FF] flex-shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION DIVIDER ──────────────────────────────────── */}
      <div className="bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        </div>
      </div>

      {/* ── BANNER CAROUSEL (promos) ──────────────────────────── */}
      {banners.length > 0 && (
        <div className="px-4 pt-10 pb-0 bg-white">
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
                    className="w-full flex-shrink-0 relative min-h-[160px] md:min-h-[200px] flex items-center overflow-hidden"
                    style={{ background: slide.gradient }}
                  >
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full pointer-events-none" />
                    <div className="absolute -right-5 -bottom-10 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />

                    <div className="relative z-10 w-full flex items-center justify-between px-8 md:px-14 py-6">
                      <div className="flex-1 pr-4">
                        {slide.badge && (
                          <div className="inline-block bg-black/20 rounded-lg px-3 py-1 text-xs font-semibold text-white mb-2 uppercase tracking-wide">
                            {slide.badge}
                          </div>
                        )}
                        <h2 className={`font-display text-2xl md:text-4xl ${slide.text_color === 'dark' ? 'text-black' : 'text-white'} mb-1`}>
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

                      {slide.image_url && (
                        <div className="flex-shrink-0 w-32 h-32 md:w-44 md:h-44 bg-white rounded-2xl shadow-lg flex items-center justify-center overflow-hidden">
                          <img
                            src={slide.image_url}
                            alt=""
                            className="w-full h-full object-contain p-3"
                          />
                        </div>
                      )}
                    </div>
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

      {/* ── FEATURED PRODUCTS ────────────────────────────────── */}
      {featuredProducts.length > 0 && (
        <div className="px-4 py-20 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div className="reveal" data-reveal>
                <p className="text-[#1677FF] text-xs font-semibold uppercase tracking-widest mb-2">Our Products</p>
                <h2 className="font-display text-3xl md:text-4xl text-[#0D1B2A]">Most Popular</h2>
              </div>
              <Link
                to="/shop"
                className="hidden sm:inline-flex items-center gap-1.5 text-[#1677FF] font-semibold text-sm hover:gap-2.5 transition-all"
              >
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {featuredProducts.map((product, i) => {
                const img = getPrimaryImage(product);
                return (
                  <Link
                    key={product.id}
                    to={`/products/${product.slug}`}
                    data-reveal
                    className={`reveal reveal-delay-${i + 1} bg-white rounded-2xl overflow-hidden shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group border border-gray-100`}
                  >
                    <div className="relative aspect-[3/4] bg-[#F8FAFC] overflow-hidden">
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
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
                          SALE
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleQuickAdd(product); }}
                        className="absolute bottom-2 right-2 p-2 bg-[#1677FF] text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-[#1060d0] btn-press"
                        title="Add to cart"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="p-4">
                      <p className="font-bold text-[#0D1B2A] text-sm leading-tight line-clamp-2 mb-2 group-hover:text-[#1677FF] transition-colors">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#1677FF] text-sm">{formatPrice(product.price)}</span>
                        {product.compare_at_price && product.compare_at_price > product.price && (
                          <span className="text-gray-400 text-xs line-through">{formatPrice(product.compare_at_price)}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="text-center mt-8 sm:hidden">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1677FF]/10 text-[#1677FF] font-semibold text-sm rounded-2xl hover:bg-[#1677FF]/20 transition-colors"
              >
                View All Products <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <div className="px-4 py-20 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 reveal" data-reveal>
            <p className="text-[#1677FF] text-xs font-semibold uppercase tracking-widest mb-3">Simple Process</p>
            <h2 className="font-display text-3xl md:text-4xl text-[#0D1B2A]">How It Works</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-4 relative">
            {/* Connecting line between steps — desktop only */}
            <div className="absolute hidden sm:block top-8 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-[#1677FF]/20 via-[#1677FF]/40 to-[#1677FF]/20" />

            {[
              {
                icon: Zap,
                title: 'Browse or Submit',
                desc: 'Shop our products or send us your idea — we handle custom orders of any size.',
              },
              {
                icon: Printer,
                title: 'We Build It',
                desc: 'Our team prints and engraves your order with precision to your exact specifications.',
              },
              {
                icon: Package,
                title: 'Delivered to You',
                desc: 'Your finished product ships straight to your door. Bulk and rush orders available.',
              },
            ].map((item, i) => (
              <div
                key={item.title}
                data-reveal
                className={`reveal reveal-delay-${i + 1} flex flex-col items-center text-center px-4`}
              >
                <div className="relative mb-6">
                  {/* Ghost number behind icon */}
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[5.5rem] font-display font-bold text-[#1677FF]/6 select-none leading-none pointer-events-none">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="relative z-10 w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center">
                    <item.icon className="h-7 w-7 text-[#1677FF]" />
                  </div>
                </div>
                <h3 className="font-bold text-[#0D1B2A] mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SERVICES ─────────────────────────────────────────── */}
      <div className="px-4 py-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 reveal" data-reveal>
            <p className="text-[#1677FF] text-xs font-semibold uppercase tracking-widest mb-3">What We Offer</p>
            <h2 className="font-display text-3xl md:text-4xl text-[#0D1B2A]">Our Services</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Printer, title: '3D Printing', desc: 'FDM printing in a wide range of materials and colors', dark: true },
              { icon: Zap, title: 'Laser Engraving', desc: 'Precise engravings on wood, acrylic, metal and more', dark: false },
              { icon: Star, title: 'Branded Kits', desc: 'Custom branded products with your logo and name', dark: false },
              { icon: Users, title: 'Bulk Orders', desc: 'Volume pricing for teams, events and organizations', dark: true },
            ].map(({ icon: Icon, title, desc, dark }, i) => (
              <div
                key={title}
                data-reveal
                className={`reveal reveal-delay-${i + 1} rounded-2xl p-6 border transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  dark
                    ? 'bg-[#0D1B2A] border-white/10'
                    : 'bg-white border-gray-100 hover:border-[#1677FF]/20'
                }`}
              >
                {/* Top accent line */}
                <div className={`h-0.5 w-8 mb-5 rounded-full ${dark ? 'bg-[#1677FF]' : 'bg-[#1677FF]/40'}`} />
                <div className={`w-12 h-12 ${dark ? 'bg-[#1677FF]/20' : 'bg-[#1677FF]/10'} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className="h-6 w-6 text-[#1677FF]" />
                </div>
                <h3 className={`font-bold text-sm mb-2 ${dark ? 'text-white' : 'text-[#0D1B2A]'}`}>{title}</h3>
                <p className={`text-xs leading-relaxed ${dark ? 'text-white/50' : 'text-gray-500'}`}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA BANNER ───────────────────────────────────────── */}
      <div
        className="relative overflow-hidden bg-[#0D1B2A]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div className="relative px-6 py-20 text-center reveal" data-reveal>
          <p className="text-[#1677FF] text-xs font-semibold uppercase tracking-widest mb-4">Let's Build Something</p>
          <h2 className="font-display text-4xl md:text-5xl text-white mb-4">
            Have a custom idea?
          </h2>
          <p className="text-white/50 text-base mb-10 max-w-md mx-auto leading-relaxed">
            Tell us what you need. We'll design, print, and engrave it exactly how you imagined it.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/custom-quote"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#1677FF] hover:bg-[#1060d0] text-white font-bold rounded-2xl transition-colors btn-press shadow-lg shadow-[#1677FF]/20"
            >
              Request a Custom Quote <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/shop"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-2xl transition-colors btn-press"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
