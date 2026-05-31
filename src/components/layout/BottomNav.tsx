import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingCart, User, Handshake } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

export default function BottomNav() {
  const location = useLocation();
  const { openCart, getItemCount } = useCartStore();
  const { user } = useAuthStore();
  const itemCount = getItemCount();
  const [isAffiliate, setIsAffiliate] = useState(false);

  useEffect(() => {
    if (!user) { setIsAffiliate(false); return; }
    supabase
      .from('affiliates')
      .select('id')
      .eq('status', 'approved')
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle()
      .then(({ data }) => { setIsAffiliate(!!data); });
  }, [user]);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/products', icon: Search, label: 'Shop' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden z-40">
      {/* Glass background with blur */}
      <div className="absolute inset-0 glass-strong rounded-t-3xl" />

      {/* Nav content */}
      <div className="relative flex items-center justify-around h-20 px-2 pb-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className="relative flex flex-col items-center justify-center w-16 h-16 transition-all btn-press"
            >
              {/* Active glow background */}
              {active && (
                <div className="absolute inset-1 bg-[var(--color-primary)]/20 rounded-2xl animate-glow-pulse" />
              )}
              <div className={`relative z-10 p-2 rounded-xl transition-all ${
                active
                  ? 'text-[var(--color-primary)]'
                  : 'text-gray-400 hover:text-gray-200'
              }`}>
                <item.icon className={`h-6 w-6 transition-transform ${active ? 'scale-110' : ''}`} />
              </div>
              <span className={`relative z-10 text-xs mt-0.5 font-medium transition-colors ${
                active ? 'text-[var(--color-primary)]' : 'text-gray-500'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Cart button - center with special styling */}
        <button
          onClick={openCart}
          className="relative flex flex-col items-center justify-center w-16 h-16 btn-press"
        >
          <div className={`relative z-10 p-3 rounded-2xl transition-all hover:scale-105 active:scale-95 ${
            itemCount > 0
              ? 'bg-[var(--color-primary)] shadow-neon'
              : 'bg-gray-700'
          }`}>
            <ShoppingCart className={`h-6 w-6 ${itemCount > 0 ? 'text-black' : 'text-gray-300'}`} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg animate-scale-pop">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </div>
          <span className="relative z-10 text-xs mt-1 font-medium text-gray-400">Cart</span>
        </button>

        {/* Affiliate - only shown for approved affiliates */}
        {isAffiliate && user && (
          <Link
            to="/affiliate/dashboard"
            className="relative flex flex-col items-center justify-center w-16 h-16 transition-all btn-press"
          >
            {isActive('/affiliate/dashboard') && (
              <div className="absolute inset-1 bg-[var(--color-primary)]/20 rounded-2xl animate-glow-pulse" />
            )}
            <div className={`relative z-10 p-2 rounded-xl transition-all ${
              isActive('/affiliate/dashboard')
                ? 'text-[var(--color-primary)]'
                : 'text-gray-400 hover:text-gray-200'
            }`}>
              <Handshake className={`h-6 w-6 transition-transform ${isActive('/affiliate/dashboard') ? 'scale-110' : ''}`} />
            </div>
            <span className={`relative z-10 text-xs mt-0.5 font-medium transition-colors ${
              isActive('/affiliate/dashboard') ? 'text-[var(--color-primary)]' : 'text-gray-500'
            }`}>
              Affiliate
            </span>
          </Link>
        )}

        {/* Account */}
        <Link
          to={user ? '/account' : '/login'}
          className="relative flex flex-col items-center justify-center w-16 h-16 transition-all btn-press"
        >
          {/* Active glow background */}
          {(isActive('/account') || isActive('/login')) && (
            <div className="absolute inset-1 bg-[var(--color-primary)]/20 rounded-2xl animate-glow-pulse" />
          )}
          <div className={`relative z-10 p-2 rounded-xl transition-all ${
            isActive('/account') || isActive('/login')
              ? 'text-[var(--color-primary)]'
              : 'text-gray-400 hover:text-gray-200'
          }`}>
            <User className={`h-6 w-6 transition-transform ${
              isActive('/account') || isActive('/login') ? 'scale-110' : ''
            }`} />
          </div>
          <span className={`relative z-10 text-xs mt-0.5 font-medium transition-colors ${
            isActive('/account') || isActive('/login') ? 'text-[var(--color-primary)]' : 'text-gray-500'
          }`}>
            {user ? 'Account' : 'Sign In'}
          </span>
        </Link>
      </div>
    </nav>
  );
}
