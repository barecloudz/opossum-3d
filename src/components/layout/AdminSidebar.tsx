import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  ShoppingBag,
  Users,
  MessageSquare,
  Settings,
  Palette,
  Tag,
  Mail,
  ArrowLeft,
  Menu,
  X,
  Megaphone,
  ChevronDown,
  ChevronRight,
  Star,
  Shield,
  Image,
  Lightbulb,
  Store,
  Layout,
} from 'lucide-react';
import { useState } from 'react';

// Top-level items (always visible)
export const topNavItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
];

// Store section
export const storeSubItems = [
  { href: '/admin/products', icon: Package, label: 'Products' },
  { href: '/admin/categories', icon: FolderOpen, label: 'Categories' },
  { href: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
];

// Customers section
export const customersSubItems = [
  { href: '/admin/customers', icon: Users, label: 'Customers' },
  { href: '/admin/quotes', icon: MessageSquare, label: 'Quote Requests' },
  { href: '/admin/reviews', icon: Star, label: 'Reviews' },
];

// Storefront section
export const storefrontSubItems = [
  { href: '/admin/banners', icon: Image, label: 'Banners' },
  { href: '/admin/example-works', icon: Lightbulb, label: 'Example Works' },
  { href: '/admin/themes', icon: Palette, label: 'Themes' },
];

// Marketing section
export const marketingSubItems = [
  { href: '/admin/promo-codes', icon: Tag, label: 'Promo Codes' },
  { href: '/admin/subscribers', icon: Mail, label: 'Email Subscribers' },
];

// Bottom items (always visible)
export const bottomNavItems = [
  { href: '/admin/team', icon: Shield, label: 'Team' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

// All nav items for page title lookup
export const navItems = [
  ...topNavItems,
  ...storeSubItems,
  ...customersSubItems,
  ...storefrontSubItems,
  ...marketingSubItems,
  ...bottomNavItems,
];

export function getPageTitle(pathname: string): string {
  // Check for exact match first
  const exactMatch = navItems.find(item => item.href === pathname);
  if (exactMatch) return exactMatch.label;

  // Check marketing sub-items
  const marketingMatch = marketingSubItems.find(item => item.href === pathname);
  if (marketingMatch) return marketingMatch.label;

  // Check for partial matches (e.g., /admin/products/new matches Products)
  const partialMatch = navItems.find(item =>
    item.href !== '/admin' && pathname.startsWith(item.href)
  );
  if (partialMatch) return partialMatch.label;

  // Check marketing partial matches
  const marketingPartial = marketingSubItems.find(item =>
    pathname.startsWith(item.href)
  );
  if (marketingPartial) return marketingPartial.label;

  return 'Admin';
}

export default function AdminSidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(
    storeSubItems.some(item => location.pathname.startsWith(item.href))
  );
  const [customersOpen, setCustomersOpen] = useState(
    customersSubItems.some(item => location.pathname.startsWith(item.href))
  );
  const [storefrontOpen, setStorefrontOpen] = useState(
    storefrontSubItems.some(item => location.pathname.startsWith(item.href))
  );
  const [marketingOpen, setMarketingOpen] = useState(
    marketingSubItems.some(item => location.pathname.startsWith(item.href))
  );

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Logo */}
      <div className={`p-5 border-b ${isMobile ? 'border-brand-neon/20 bg-brand-charcoal' : 'border-brand-gray'}`}>
        <Link to="/admin" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          <img src="/images/favicon/android-chrome-192x192.png" alt="Nexalon" className="h-8 w-8 object-contain" />
          <span className="font-bold tracking-widest text-[#0D1B2A] text-sm">NEXALON</span>
          <span className="text-xs text-gray-400 bg-brand-gray px-2 py-0.5 rounded">Admin</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 p-4 space-y-1 overflow-y-auto ${isMobile ? 'bg-brand-charcoal' : ''}`}>
        {/* Dashboard */}
        {topNavItems.map((item) => (
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

        {/* Store collapsible */}
        <div>
          <button
            onClick={() => setStoreOpen(!storeOpen)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
              storeSubItems.some(item => isActive(item.href))
                ? 'bg-brand-neon/10 text-brand-neon border border-brand-neon/30'
                : 'text-gray-300 hover:bg-brand-gray/50 hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Store className={`h-5 w-5 ${storeSubItems.some(item => isActive(item.href)) ? 'text-brand-neon' : ''}`} />
              <span className="font-medium">Store</span>
            </div>
            {storeOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {storeOpen && (
            <div className="ml-4 mt-1 space-y-1">
              {storeSubItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-all ${
                    isActive(item.href)
                      ? 'bg-brand-neon/10 text-brand-neon'
                      : 'text-gray-400 hover:bg-brand-gray/50 hover:text-white'
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${isActive(item.href) ? 'text-brand-neon' : ''}`} />
                  <span className="text-sm">{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Customers collapsible */}
        <div>
          <button
            onClick={() => setCustomersOpen(!customersOpen)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
              customersSubItems.some(item => isActive(item.href))
                ? 'bg-brand-neon/10 text-brand-neon border border-brand-neon/30'
                : 'text-gray-300 hover:bg-brand-gray/50 hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Users className={`h-5 w-5 ${customersSubItems.some(item => isActive(item.href)) ? 'text-brand-neon' : ''}`} />
              <span className="font-medium">Customers</span>
            </div>
            {customersOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {customersOpen && (
            <div className="ml-4 mt-1 space-y-1">
              {customersSubItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-all ${
                    isActive(item.href)
                      ? 'bg-brand-neon/10 text-brand-neon'
                      : 'text-gray-400 hover:bg-brand-gray/50 hover:text-white'
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${isActive(item.href) ? 'text-brand-neon' : ''}`} />
                  <span className="text-sm">{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Storefront collapsible */}
        <div>
          <button
            onClick={() => setStorefrontOpen(!storefrontOpen)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
              storefrontSubItems.some(item => isActive(item.href))
                ? 'bg-brand-neon/10 text-brand-neon border border-brand-neon/30'
                : 'text-gray-300 hover:bg-brand-gray/50 hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Layout className={`h-5 w-5 ${storefrontSubItems.some(item => isActive(item.href)) ? 'text-brand-neon' : ''}`} />
              <span className="font-medium">Storefront</span>
            </div>
            {storefrontOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {storefrontOpen && (
            <div className="ml-4 mt-1 space-y-1">
              {storefrontSubItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-all ${
                    isActive(item.href)
                      ? 'bg-brand-neon/10 text-brand-neon'
                      : 'text-gray-400 hover:bg-brand-gray/50 hover:text-white'
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${isActive(item.href) ? 'text-brand-neon' : ''}`} />
                  <span className="text-sm">{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Marketing collapsible */}
        <div>
          <button
            onClick={() => setMarketingOpen(!marketingOpen)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
              marketingSubItems.some(item => isActive(item.href))
                ? 'bg-brand-neon/10 text-brand-neon border border-brand-neon/30'
                : 'text-gray-300 hover:bg-brand-gray/50 hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Megaphone className={`h-5 w-5 ${marketingSubItems.some(item => isActive(item.href)) ? 'text-brand-neon' : ''}`} />
              <span className="font-medium">Marketing</span>
            </div>
            {marketingOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {marketingOpen && (
            <div className="ml-4 mt-1 space-y-1">
              {marketingSubItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-all ${
                    isActive(item.href)
                      ? 'bg-brand-neon/10 text-brand-neon'
                      : 'text-gray-400 hover:bg-brand-gray/50 hover:text-white'
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${isActive(item.href) ? 'text-brand-neon' : ''}`} />
                  <span className="text-sm">{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Bottom items - Team & Settings */}
        {bottomNavItems.map((item) => (
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

  const pageTitle = getPageTitle(location.pathname);

  return (
    <>
      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-brand-charcoal border-b border-brand-gray h-14 flex items-center px-4">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-brand-neon hover:bg-brand-gray transition-colors"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        <h1 className="absolute left-1/2 transform -translate-x-1/2 text-white font-semibold">
          {pageTitle}
        </h1>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`md:hidden fixed top-14 bottom-0 left-0 z-50 w-72 bg-gradient-to-b from-brand-charcoal to-brand-black border-r border-brand-neon/20 flex flex-col transform transition-transform shadow-2xl shadow-brand-neon/10 ${
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
