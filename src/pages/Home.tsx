import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Truck, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;

    const fetchFeaturedProducts = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, images:product_images(*)')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(4)
          .abortSignal(controller.signal);

        clearTimeout(timeoutId);
        if (error) throw error;
        setFeaturedProducts(data || []);
        setIsLoading(false);
      } catch (err: any) {
        clearTimeout(timeoutId);

        // Retry on timeout or network error
        if ((err.name === 'AbortError' || err.message?.includes('network')) && retryCount < maxRetries) {
          retryCount++;
          console.log(`Home: Retry attempt ${retryCount}/${maxRetries}`);
          setTimeout(fetchFeaturedProducts, 1000 * retryCount);
          return;
        }

        console.error('Error fetching products:', err);
        setIsLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-[calc(100vh-8rem)] md:h-auto md:min-h-[400px]">
        {/* Hero Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero.jpg"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-brand-black/60" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-brand-emerald-dark/20 to-transparent z-[1]" />
        <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-20 flex flex-col justify-center">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-6xl font-bold text-white mb-4 md:mb-6">
              Custom{' '}
              <span className="text-brand-neon">3D Printed</span>{' '}
              Creations
            </h1>
            <p className="text-lg md:text-xl text-white mb-6 md:mb-8 bg-brand-black/70 inline-block px-4 py-2 rounded-lg">
              Precision crafted. Built to impress. Your vision, made real.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button as={Link} to="/products" size="lg">
                Shop Now <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button as={Link} to="/custom-quote" variant="outline" size="lg">
                Request Custom Quote
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-[var(--color-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-[var(--color-primary)]/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <h3 className="text-lg font-semibold text-theme mb-2">Premium Quality</h3>
              <p className="text-theme opacity-60">
                20 years of combined experience with $12k in professional equipment
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-[var(--color-primary)]/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Truck className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <h3 className="text-lg font-semibold text-theme mb-2">Fast Shipping</h3>
              <p className="text-theme opacity-60">
                Affordable USPS shipping on all orders, typically around $5
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-[var(--color-primary)]/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <h3 className="text-lg font-semibold text-theme mb-2">Custom Orders</h3>
              <p className="text-theme opacity-60">
                Have something specific in mind? We can bring your vision to life
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-theme">Featured Products</h2>
            <Link to="/products" className="text-[var(--color-primary)] hover:opacity-80 transition-colors flex items-center">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoading ? (
              // Loading skeletons
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4">
                  <div className="aspect-square bg-[var(--color-border)] rounded-lg mb-4 animate-pulse" />
                  <div className="h-4 bg-[var(--color-border)] rounded w-3/4 mb-2 animate-pulse" />
                  <div className="h-4 bg-[var(--color-border)] rounded w-1/2 animate-pulse" />
                </div>
              ))
            ) : featuredProducts.length > 0 ? (
              featuredProducts.map((product) => {
                const primaryImage = product.images?.find((img) => img.is_primary) || product.images?.[0];
                return (
                  <Link
                    key={product.id}
                    to={`/products/${product.slug}`}
                    className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4 hover:border-[var(--color-primary)]/50 transition-colors group"
                  >
                    <div className="aspect-square bg-[var(--color-border)] rounded-lg mb-4 overflow-hidden">
                      {primaryImage ? (
                        <img
                          src={primaryImage.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-theme opacity-50">
                          No image
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-theme mb-1 group-hover:text-[var(--color-primary)] transition-colors">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--color-primary)] font-bold">${product.price.toFixed(2)}</span>
                      {product.compare_at_price && product.compare_at_price > product.price && (
                        <span className="text-theme opacity-50 line-through text-sm">
                          ${product.compare_at_price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="col-span-full text-center py-8 text-theme opacity-60">
                No products available yet. Check back soon!
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[var(--color-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-theme mb-4">
            Have a Custom Project in Mind?
          </h2>
          <p className="text-theme opacity-60 mb-8 max-w-2xl mx-auto">
            Whether it's a unique gift, a custom sign, or a one-of-a-kind creation,
            we're here to help bring your ideas to life.
          </p>
          <Button as={Link} to="/custom-quote" size="lg">
            Get a Free Quote
          </Button>
        </div>
      </section>
    </div>
  );
}
