import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  MessageSquare,
  Settings,
  Palette,
  ArrowLeft,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/products', icon: Package, label: 'Products' },
  { href: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
  { href: '/admin/customers', icon: Users, label: 'Customers' },
  { href: '/admin/quotes', icon: MessageSquare, label: 'Quote Requests' },
  { href: '/admin/themes', icon: Palette, label: 'Themes' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminSidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Logo */}
      <div className={`p-5 border-b ${isMobile ? 'border-brand-neon/20 bg-brand-charcoal' : 'border-brand-gray'}`}>
        <Link to="/admin" className="flex items-center space-x-2" onClick={() => setMobileOpen(false)}>
          <img
            src="/images/logo.jpg"
            alt="Opossum Works"
            className="h-8 w-auto object-contain"
          />
          <span className="text-xs text-gray-400 bg-brand-gray px-2 py-0.5 rounded">Admin</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 p-4 space-y-1 ${isMobile ? 'bg-brand-charcoal' : ''}`}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
              isActive(item.href)
                ? 'bg-brand-neon/10 text-brand-neon border border-brand-neon/30'
                : 'text-gray-300 hover:bg-brand-gray/50 hover:text-white border border-transparent'
            }`}
          >
            <item.icon className={`h-5 w-5 ${isActive(item.href) ? 'text-brand-neon' : ''}`} />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Back to store */}
      <div className={`p-4 border-t ${isMobile ? 'border-brand-neon/20 bg-brand-charcoal' : 'border-brand-gray'}`}>
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-brand-neon transition-colors rounded-lg hover:bg-brand-gray/50"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Back to Store</span>
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 bg-brand-charcoal border border-brand-gray p-2.5 rounded-lg text-brand-neon hover:bg-brand-gray transition-colors shadow-lg"
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-brand-charcoal to-brand-black border-r border-brand-neon/20 flex flex-col transform transition-transform shadow-2xl shadow-brand-neon/10 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent isMobile={true} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-brand-charcoal border-r border-brand-gray flex-col">
        <SidebarContent isMobile={false} />
      </aside>
    </>
  );
}
