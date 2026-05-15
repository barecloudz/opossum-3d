import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Mail, Phone } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { BannerSlide } from '../types';

// Custom hook for touch/swipe support
function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (Math.abs(distance) >= minSwipeDistance) {
      if (distance > 0) {
        onSwipeLeft();
      } else {
        onSwipeRight();
      }
    }
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
}

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [banners, setBanners] = useState<BannerSlide[]>([]);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const { data, error } = await supabase
          .from('banner_slides')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setBanners(data || []);
      } catch (err) {
        console.error('Error fetching banners:', err);
      }
    };

    fetchBanners();
  }, []);

  useEffect(() => {
    if (currentSlide >= banners.length) {
      setCurrentSlide(0);
    }
  }, [banners.length, currentSlide]);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  const bannerSwipe = useSwipe(nextSlide, prevSlide);

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide, banners.length]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="px-4 pt-12 pb-8">
        <div className="max-w-4xl mx-auto text-center">
          <img
            src="/images/favicon/android-chrome-512x512.png"
            alt="Nexalon Creations"
            className="w-24 h-24 object-contain mx-auto mb-6"
          />
          <h1 className="text-4xl md:text-5xl font-bold text-[#0D1B2A] mb-4 tracking-tight">
            Nexalon Creations
          </h1>
          <p className="text-lg text-[#6B7280] mb-8 max-w-2xl mx-auto leading-relaxed">
            Custom 3D printed and laser engraved products built to your exact specifications. Professional quality, personal touch.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/custom-quote"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white font-semibold rounded-2xl hover:opacity-90 transition-opacity btn-press"
            >
              Request a Custom Quote <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="mailto:NexalonCreations@gmail.com"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] text-[#0D1B2A] font-semibold rounded-2xl hover:border-[var(--color-primary)] transition-colors btn-press"
            >
              <Mail className="h-4 w-4" />
              Contact Us
            </a>
          </div>
        </div>
      </div>

      {/* Featured Banner Carousel */}
      {banners.length > 0 && (
        <div className="px-4 mb-12">
          <div className="max-w-7xl mx-auto">
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
                    className={`w-full flex-shrink-0 relative bg-gradient-to-r ${slide.gradient} p-6 md:p-8`}
                  >
                    {slide.image_url && (
                      <img
                        src={slide.image_url}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                    <div className="relative z-10 ml-10 mr-10 md:ml-12 md:mr-12">
                      {slide.badge && (
                        <div className="inline-block bg-black/20 rounded-lg px-3 py-1 text-sm font-medium text-white mb-2">
                          {slide.badge}
                        </div>
                      )}
                      <h2 className={`text-3xl md:text-4xl font-bold ${slide.text_color === 'dark' ? 'text-black' : 'text-white'} mb-2`}>
                        {slide.title}
                      </h2>
                      <p className={`text-xl md:text-2xl font-bold ${slide.text_color === 'dark' ? 'text-black/80' : 'text-white/80'} mb-4`}>
                        {slide.subtitle}
                      </p>
                      <Link
                        to={slide.cta_link}
                        className={`inline-flex items-center gap-2 ${
                          slide.text_color === 'dark'
                            ? 'bg-black text-white hover:bg-black/80'
                            : 'bg-white text-black hover:bg-white/90'
                        } px-5 py-2.5 rounded-xl font-medium transition-colors btn-press`}
                      >
                        {slide.cta_text} <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full" />
                    <div className="absolute -right-5 -bottom-10 w-32 h-32 bg-white/10 rounded-full" />
                  </div>
                ))}
              </div>

              <button
                onClick={prevSlide}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors backdrop-blur-sm btn-press"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors backdrop-blur-sm btn-press"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {banners.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`transition-all ${
                      currentSlide === index
                        ? 'w-6 h-2 bg-white rounded-full'
                        : 'w-2 h-2 bg-white/50 rounded-full hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* What We Make */}
      <div className="px-4 mb-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[#0D1B2A] text-center mb-8">What We Create</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { title: 'Measuring Spoon Sets', desc: 'Custom printed and engraved measuring spoon sets built to order' },
              { title: 'Branded Kits', desc: 'Professional kits printed with your name, logo, or brand' },
              { title: 'Custom Accessories', desc: 'Specialty accessories designed and produced to your specs' },
              { title: 'Laser Engraved Products', desc: 'Precise, high-quality engravings on a wide range of materials' },
              { title: 'Bulk Orders', desc: 'Volume orders for teams, events, or organizations' },
              { title: 'Custom Projects', desc: 'Have an idea? We can design and build it' },
            ].map((item) => (
              <div
                key={item.title}
                className="glass rounded-2xl p-5 border border-[var(--color-border)]"
              >
                <h3 className="font-semibold text-[#0D1B2A] mb-2">{item.title}</h3>
                <p className="text-sm text-[#6B7280]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact + Footer */}
      <div className="px-4 pb-24 md:pb-12">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-xl font-bold text-[#0D1B2A] mb-4">Get In Touch</h2>
          <div className="flex flex-col gap-3">
            <a
              href="mailto:NexalonCreations@gmail.com"
              className="flex items-center justify-center gap-2 py-3 px-4 glass border border-[var(--color-border)] rounded-xl text-theme hover:border-[var(--color-primary)] transition-colors"
            >
              <Mail className="h-5 w-5 text-[var(--color-primary)]" />
              NexalonCreations@gmail.com
            </a>
            <a
              href="tel:8283882151"
              className="flex items-center justify-center gap-2 py-3 px-4 glass border border-[var(--color-border)] rounded-xl text-theme hover:border-[var(--color-primary)] transition-colors"
            >
              <Phone className="h-5 w-5 text-[var(--color-primary)]" />
              828-388-2151
            </a>
          </div>
          <p className="mt-8 text-sm text-[#9CA3AF]">
            Interested in earning commissions?{' '}
            <Link to="/affiliate/apply" className="text-[var(--color-primary)] hover:underline">
              Join our affiliate program
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
