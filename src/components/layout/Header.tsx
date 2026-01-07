import { Link } from 'react-router-dom';
import { ShoppingCart, Menu, X, User } from 'lucide-react';
import { useState } from 'react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { openCart, getItemCount } = useCartStore();
  const { user, isAdmin } = useAuthStore();
  const itemCount = getItemCount();

  const navLinks = [
    { href: '/products', label: 'Products' },
    { href: '/custom-quote', label: 'Custom Orders' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-brand-charcoal border-b border-brand-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          {/* Mobile Left - Cart */}
          <button
            onClick={openCart}
            className="md:hidden relative text-gray-300 hover:text-brand-neon transition-colors p-1"
          >
            <ShoppingCart className="h-6 w-6" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand-neon text-brand-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </button>

          {/* Desktop Left - Logo */}
          <Link to="/" className="hidden md:flex items-center">
            <img
              src="/images/logo.jpg"
              alt="Opossum Works"
              className="h-12 w-auto object-contain"
            />
          </Link>

          {/* Mobile Center - Logo */}
          <Link to="/" className="md:hidden absolute left-1/2 transform -translate-x-1/2">
            <img
              src="/images/logo.jpg"
              alt="Opossum Works"
              className="h-10 w-auto object-contain"
            />
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
            {/* User account - Desktop */}
            <Link
              to={user ? '/account' : '/login'}
              className="hidden md:flex text-gray-300 hover:text-brand-neon transition-colors"
            >
              <User className="h-6 w-6" />
            </Link>

            {/* Admin link - Desktop */}
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden md:flex text-gray-300 hover:text-brand-neon transition-colors text-sm"
              >
                Admin
              </Link>
            )}

            {/* Cart button - Desktop */}
            <button
              onClick={openCart}
              className="hidden md:block relative text-gray-300 hover:text-brand-neon transition-colors"
            >
              <ShoppingCart className="h-6 w-6" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-brand-neon text-brand-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>

            {/* Mobile Right - Login/Menu */}
            <div className="flex items-center space-x-2 md:hidden">
              {!user && (
                <Link
                  to="/login"
                  className="text-gray-300 hover:text-brand-neon transition-colors p-1"
                >
                  <User className="h-6 w-6" />
                </Link>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-300 hover:text-brand-neon transition-colors p-1"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
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
