import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut, Handshake, ShoppingBag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isApprovedAffiliate, setIsApprovedAffiliate] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);
  const { user, isAdmin, signOut } = useAuthStore();

  useEffect(() => {
    if (!user) { setIsApprovedAffiliate(false); return; }
    supabase
      .from('affiliates')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .maybeSingle()
      .then(({ data }) => setIsApprovedAffiliate(!!data));
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-surface)]/90 backdrop-blur-sm border-b border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          {/* Mobile Left - Hamburger menu */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-theme hover:text-brand-neon transition-colors p-1"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {/* Desktop Left - Logo */}
          <Link to="/" className="hidden md:flex items-center gap-2.5">
            <img src="/images/favicon/android-chrome-192x192.png" alt="Nexalon" className="h-9 w-9 object-contain" />
            <span className="text-xl font-bold tracking-widest text-[#0D1B2A]">NEXALON</span>
          </Link>

          {/* Mobile Center - Logo */}
          <Link to="/" className="md:hidden absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
            <img src="/images/favicon/android-chrome-192x192.png" alt="Nexalon" className="h-8 w-8 object-contain" />
            <span className="text-base font-bold tracking-widest text-[#0D1B2A]">NEXALON</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/products"
              className="flex items-center gap-1.5 text-theme hover:text-[var(--color-primary)] transition-colors text-sm font-medium"
            >
              <ShoppingBag className="h-4 w-4" />
              Shop
            </Link>
            <Link
              to="/faq"
              className="text-theme hover:text-[var(--color-primary)] transition-colors text-sm font-medium"
            >
              FAQ
            </Link>
            <Link
              to={isApprovedAffiliate ? '/affiliate/dashboard' : '/affiliate/apply'}
              className="flex items-center gap-1.5 text-theme hover:text-[var(--color-primary)] transition-colors text-sm font-medium"
            >
              <Handshake className="h-4 w-4" />
              Affiliate Program
            </Link>
          </nav>

          {/* Right side icons */}
          <div className="flex items-center space-x-4">
            {/* User account - Desktop */}
            <Link
              to={user ? '/account' : '/login'}
              className="hidden md:flex text-theme hover:text-[var(--color-primary)] transition-colors"
            >
              <User className="h-6 w-6" />
            </Link>

            {/* Admin link - Desktop */}
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden md:flex text-theme hover:text-[var(--color-primary)] transition-colors text-sm"
              >
                Admin
              </Link>
            )}

            {/* Logout button - Desktop (rightmost) */}
            {user && (
              <button
                onClick={handleSignOut}
                className="hidden md:flex items-center text-theme hover:text-red-400 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            )}

            {/* Mobile Right - Account icon */}
            <Link
              to={user ? '/account' : '/login'}
              className="md:hidden text-theme hover:text-[var(--color-primary)] transition-colors p-1"
            >
              <User className="h-6 w-6" />
            </Link>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--color-border)]">
            <nav className="flex flex-col gap-3 px-2">
              <Link
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-[var(--color-surface)] hover:bg-[var(--color-primary)]/10 border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 rounded-xl text-theme font-medium transition-all"
              >
                <ShoppingBag className="h-5 w-5" />
                Shop
              </Link>
              <Link
                to="/faq"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center py-3 px-4 bg-[var(--color-surface)] hover:bg-[var(--color-primary)]/10 border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 rounded-xl text-theme font-medium transition-all"
              >
                FAQ
              </Link>
              <Link
                to={isApprovedAffiliate ? '/affiliate/dashboard' : '/affiliate/apply'}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 hover:border-[var(--color-primary)] rounded-xl text-[var(--color-primary)] font-medium transition-all"
              >
                <Handshake className="h-5 w-5" />
                Affiliate Program
              </Link>
              <Link
                to={user ? '/account' : '/login'}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center py-3 px-4 bg-[var(--color-surface)] hover:bg-brand-neon/20 border border-[var(--color-border)] hover:border-brand-neon/50 rounded-xl text-theme font-medium transition-all"
              >
                {user ? 'Account' : 'Sign In'}
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center py-3 px-4 bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 hover:border-[var(--color-primary)] rounded-xl text-[var(--color-primary)] font-medium transition-all"
                >
                  Admin Dashboard
                </Link>
              )}
              {user && (
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-[var(--color-surface)] hover:bg-red-500/10 border border-[var(--color-border)] hover:border-red-500/30 rounded-xl text-gray-400 hover:text-red-400 font-medium transition-all"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
