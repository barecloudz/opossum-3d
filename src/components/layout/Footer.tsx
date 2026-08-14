import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      // Check if already subscribed
      const { data: existingSub } = await supabase
        .from('email_subscribers')
        .select('id, is_subscribed')
        .eq('email', email.toLowerCase())
        .single();

      if (existingSub) {
        if (existingSub.is_subscribed) {
          setError('This email is already subscribed!');
        } else {
          // Resubscribe
          await supabase
            .from('email_subscribers')
            .update({
              is_subscribed: true,
              unsubscribed_at: null,
            })
            .eq('id', existingSub.id);
          setIsSubscribed(true);
        }
      } else {
        // Create new subscriber
        await supabase.from('email_subscribers').insert({
          email: email.toLowerCase(),
          source: 'footer',
          is_subscribed: true,
          subscribed_at: new Date().toISOString(),
        });
        setIsSubscribed(true);
      }
    } catch (err) {
      setError('Failed to subscribe. Please try again.');
      console.error('Subscribe error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <footer className="bg-[var(--color-surface)]/90 backdrop-blur-sm border-t border-[var(--color-border)] mt-auto pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <span className="text-xl font-bold text-[var(--color-primary)]">NEXALON</span>
              <span className="text-sm text-theme opacity-60">CREATIONS</span>
            </Link>
            <p className="text-theme opacity-60 text-sm">
              Custom 3D printing and laser engraving. Bringing your ideas to life.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-theme font-semibold mb-4">Quick Links</h3>
            <nav className="flex flex-col space-y-2">
              <Link to="/products" className="text-theme opacity-60 hover:text-[var(--color-primary)] text-sm transition-colors">
                Products
              </Link>
              <Link to="/custom-quote" className="text-theme opacity-60 hover:text-[var(--color-primary)] text-sm transition-colors">
                Custom Orders
              </Link>
              <Link to="/cart" className="text-theme opacity-60 hover:text-[var(--color-primary)] text-sm transition-colors">
                Cart
              </Link>
              <Link to="/return-policy" className="text-theme opacity-60 hover:text-[var(--color-primary)] text-sm transition-colors">
                Return Policy
              </Link>
              <Link to="/privacy-policy" className="text-theme opacity-60 hover:text-[var(--color-primary)] text-sm transition-colors">
                Privacy Policy
              </Link>
            </nav>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-theme font-semibold mb-4">Account</h3>
            <nav className="flex flex-col space-y-2">
              <Link to="/login" className="text-theme opacity-60 hover:text-[var(--color-primary)] text-sm transition-colors">
                Sign In
              </Link>
              <Link to="/register" className="text-theme opacity-60 hover:text-[var(--color-primary)] text-sm transition-colors">
                Create Account
              </Link>
              <Link to="/account" className="text-theme opacity-60 hover:text-[var(--color-primary)] text-sm transition-colors">
                My Account
              </Link>
            </nav>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-theme font-semibold mb-4">Stay Updated</h3>
            <p className="text-theme opacity-60 text-sm mb-4">
              Get notified about new products and exclusive offers.
            </p>
            {isSubscribed ? (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <Check className="h-5 w-5" />
                <span>Thanks for subscribing!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme opacity-40" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your email"
                      className="w-full pl-10 pr-4 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-theme text-sm placeholder:text-theme/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-background)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {error && (
                  <p className="text-red-400 text-xs">{error}</p>
                )}
              </form>
            )}
          </div>
        </div>

        <div className="border-t border-[var(--color-border)] mt-8 pt-8 text-center">
          <p className="text-theme opacity-50 text-sm">
            &copy; {new Date().getFullYear()} Nexalon Creations. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
