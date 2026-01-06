import { Link } from 'react-router-dom';
import { ShoppingCart, Menu, X, User } from 'lucide-react';
import { useState } from 'react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { openCart, getItemCount } = useCartStore();
  const { user, isAdmin } = useAuthStore();
  const { settings } = useSettingsStore();
  const itemCount = getItemCount();

  const navLinks = [
    { href: '/products', label: 'Products' },
    { href: '/custom-quote', label: 'Custom Orders' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-brand-charcoal border-b border-brand-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.store_name}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <>
                <span className="text-2xl font-bold text-brand-neon">{settings.store_name || 'OPOSSUM'}</span>
                <span className="text-sm text-gray-400">3D</span>
              </>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-gray-300 hover:text-brand-neon transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side icons */}
          <div className="flex items-center space-x-4">
            {/* User account */}
            <Link
              to={user ? '/account' : '/login'}
              className="hidden md:flex text-gray-300 hover:text-brand-neon transition-colors"
            >
              <User className="h-6 w-6" />
            </Link>

            {/* Admin link */}
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden md:flex text-gray-300 hover:text-brand-neon transition-colors text-sm"
              >
                Admin
              </Link>
            )}

            {/* Cart button */}
            <button
              onClick={openCart}
              className="relative text-gray-300 hover:text-brand-neon transition-colors"
            >
              <ShoppingCart className="h-6 w-6" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-brand-neon text-brand-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>

            {/* Mobile login button / menu */}
            {!user ? (
              <Link
                to="/login"
                className="md:hidden bg-brand-neon text-brand-black px-4 py-1.5 rounded-lg font-semibold text-sm hover:bg-brand-emerald transition-colors"
              >
                Login
              </Link>
            ) : (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-gray-300 hover:text-brand-neon transition-colors"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-brand-gray">
            <nav className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-300 hover:text-brand-neon transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to={user ? '/account' : '/login'}
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-300 hover:text-brand-neon transition-colors"
              >
                {user ? 'Account' : 'Sign In'}
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-300 hover:text-brand-neon transition-colors"
                >
                  Admin Dashboard
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
