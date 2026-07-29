import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import { useProductStore } from './store/productStore';

// Layouts
import MainLayout from './components/layout/MainLayout';
import AdminLayout from './components/layout/AdminLayout';

// Public Pages
import Home from './pages/Home';
import Products from './pages/Products';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import CustomQuote from './pages/CustomQuote';
import Wishlist from './pages/Wishlist';
import ReturnPolicy from './pages/ReturnPolicy';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Account from './pages/Account';
import NotFound from './pages/NotFound';
import FAQ from './pages/FAQ';

// Affiliate Pages
import AffiliateApply from './pages/affiliate/Apply';
import AffiliateDashboard from './pages/affiliate/Dashboard';

// Admin Pages
import AdminAffiliates from './pages/admin/Affiliates';
import AdminAffiliateDetail from './pages/admin/AffiliateDetail';
import AdminAffiliateSettings from './pages/admin/AffiliateSettings';
import AdminDashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminProductEdit from './pages/admin/ProductEdit';
import AdminCategories from './pages/admin/Categories';
import AdminOrders from './pages/admin/Orders';
import AdminOrderDetail from './pages/admin/OrderDetail';
import AdminCustomers from './pages/admin/Customers';
import AdminQuotes from './pages/admin/QuoteRequests';
import AdminSettings from './pages/admin/Settings';
import AdminThemes from './pages/admin/Themes';
import AdminPromoCodes from './pages/admin/PromoCodes';
import AdminEmailSubscribers from './pages/admin/EmailSubscribers';
import AdminReviews from './pages/admin/Reviews';
import AdminTeam from './pages/admin/Team';
import AdminBanners from './pages/admin/Banners';
import AdminExampleWorks from './pages/admin/ExampleWorks';
import AdminShippingLabel from './pages/admin/ShippingLabel';
import AdminProductionQueue from './pages/admin/ProductionQueue';
import AdminSubscriptions from './pages/admin/Subscriptions';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import CartDrawer from './components/cart/CartDrawer';
import AffiliateTracker from './components/AffiliateTracker';
import UpdateBanner from './components/UpdateBanner';
import ScrollToTop from './components/ScrollToTop';
import { ToastContainer } from './components/ui/Toast';

function App() {
  const { initialize, isLoading, setLoading } = useAuthStore();
  const { fetchSettings } = useSettingsStore();
  const { fetchProducts } = useProductStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Skip auth initialization on reset-password — the PKCE code in the URL
    // is single-use and will be consumed by the ResetPassword page itself.
    let cleanup: (() => void) | undefined;
    if (!window.location.pathname.startsWith('/reset-password')) {
      cleanup = initialize();
    } else {
      setLoading(false);
    }
    fetchSettings();
    // Pre-fetch products so they're ready when user navigates
    fetchProducts();

    // Last-resort failsafe: if INITIAL_SESSION and the 5s safety net inside
    // initialize() both fail, force-clear the splash after 6s.
    const timeout = setTimeout(() => {
      setLoading(false);
      setReady(true);
    }, 6000);

    return () => {
      cleanup?.();
      clearTimeout(timeout);
    };
  }, [initialize, fetchSettings, fetchProducts, setLoading]);

  // Update ready state when loading finishes normally
  useEffect(() => {
    if (!isLoading) {
      setReady(true);
    }
  }, [isLoading]);

  // Show loading screen while auth initializes
  if (!ready) {
    return (
      <div className="min-h-screen bg-[#F2F4F7] flex items-center justify-center">
        <div className="text-center">
          <img src="/images/favicon/android-chrome-512x512.png" alt="Nexalon" className="w-24 h-24 object-contain mx-auto mb-2" />
          <p className="text-[#0D1B2A] font-bold tracking-widest text-xl mb-6">NEXALON</p>
          <div className="w-8 h-8 border-4 border-[#1677FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:slug" element={<ProductDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="order-confirmation/:id" element={<OrderConfirmation />} />
          <Route path="custom-quote" element={<CustomQuote />} />
          <Route path="return-policy" element={<ReturnPolicy />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="faq" element={<FAQ />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route
            path="account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
          {/* Affiliate Routes */}
          <Route path="affiliate/apply" element={<AffiliateApply />} />
          <Route
            path="affiliate/dashboard"
            element={
              <ProtectedRoute>
                <AffiliateDashboard />
              </ProtectedRoute>
            }
          />
          {/* 404 inside MainLayout for proper styling */}
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute requireAdmin>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminProductEdit />} />
          <Route path="products/:id/edit" element={<AdminProductEdit />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<AdminOrderDetail />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="team" element={<AdminTeam />} />
          <Route path="quotes" element={<AdminQuotes />} />
          <Route path="promo-codes" element={<AdminPromoCodes />} />
          <Route path="subscribers" element={<AdminEmailSubscribers />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="themes" element={<AdminThemes />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="example-works" element={<AdminExampleWorks />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="affiliates" element={<AdminAffiliates />} />
          <Route path="affiliates/:id" element={<AdminAffiliateDetail />} />
          <Route path="affiliate-settings" element={<AdminAffiliateSettings />} />
          <Route path="shipping-label" element={<AdminShippingLabel />} />
          <Route path="production-queue" element={<AdminProductionQueue />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
        </Route>
      </Routes>

      {/* Affiliate ref cookie tracker */}
      <AffiliateTracker />

      {/* Global Cart Drawer */}
      <CartDrawer />

      {/* Update Banner */}
      <UpdateBanner />

      {/* Toast Notifications */}
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
