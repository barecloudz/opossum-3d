import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Truck, Shield } from 'lucide-react';
import Button from '../components/ui/Button';
import { useSettingsStore } from '../store/settingsStore';

export default function Home() {
  const { settings } = useSettingsStore();

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Hero Background Image */}
        {settings.hero_image_url && (
          <div className="absolute inset-0">
            <img
              src={settings.hero_image_url}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-brand-black/70" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-emerald-dark/20 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="relative z-10 max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Custom{' '}
              <span className="text-brand-neon">3D Printed</span>{' '}
              Creations
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              From articulated fidget toys to stunning gothic dragons.
              High-quality 3D printing and laser engraving, made to order.
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
      <section className="py-16 bg-brand-charcoal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-brand-emerald-dark rounded-lg flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-brand-neon" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Premium Quality</h3>
              <p className="text-gray-400">
                20 years of combined experience with $12k in professional equipment
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-brand-emerald-dark rounded-lg flex items-center justify-center mx-auto mb-4">
                <Truck className="h-6 w-6 text-brand-neon" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Fast Shipping</h3>
              <p className="text-gray-400">
                Affordable USPS shipping on all orders, typically around $5
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-brand-emerald-dark rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-brand-neon" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Custom Orders</h3>
              <p className="text-gray-400">
                Have something specific in mind? We can bring your vision to life
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Placeholder */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">Featured Products</h2>
            <Link to="/products" className="text-brand-neon hover:text-brand-emerald transition-colors flex items-center">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Placeholder product cards */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-brand-charcoal rounded-xl border border-brand-gray p-4 hover:border-brand-neon/50 transition-colors">
                <div className="aspect-square bg-brand-gray rounded-lg mb-4" />
                <div className="h-4 bg-brand-gray rounded w-3/4 mb-2" />
                <div className="h-4 bg-brand-gray rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-brand-charcoal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Have a Custom Project in Mind?
          </h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
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
