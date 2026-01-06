import { Link, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingCart, User } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';

export default function BottomNav() {
  const location = useLocation();
  const { openCart, getItemCount } = useCartStore();
  const { user } = useAuthStore();
  const itemCount = getItemCount();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/products', icon: Search, label: 'Shop' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-brand-charcoal border-t border-brand-gray z-40">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
              isActive(item.href) ? 'text-brand-neon' : 'text-gray-400'
            }`}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        ))}

        {/* Cart button */}
        <button
          onClick={openCart}
          className="relative flex flex-col items-center justify-center w-full h-full text-gray-400"
        >
          <ShoppingCart className="h-6 w-6" />
          {itemCount > 0 && (
            <span className="absolute top-2 right-1/4 bg-brand-neon text-brand-black text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
              {itemCount > 9 ? '9+' : itemCount}
            </span>
          )}
          <span className="text-xs mt-1">Cart</span>
        </button>

        {/* Account */}
        <Link
          to={user ? '/account' : '/login'}
          className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
            isActive('/account') || isActive('/login') ? 'text-brand-neon' : 'text-gray-400'
          }`}
        >
          <User className="h-6 w-6" />
          <span className="text-xs mt-1">{user ? 'Account' : 'Sign In'}</span>
        </Link>
      </div>
    </nav>
  );
}
