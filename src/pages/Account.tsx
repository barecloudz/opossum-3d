import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Package, LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { formatDate, formatPrice } from '../lib/utils';
import { ORDER_STATUSES } from '../lib/constants';

export default function Account() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'orders' | 'settings'>('orders');

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Mock orders for demo
  const orders: { id: string; order_number: number; status: keyof typeof ORDER_STATUSES; total: number; created_at: string }[] = [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-brand-charcoal rounded-full flex items-center justify-center border border-brand-gray">
            <User className="h-8 w-8 text-brand-neon" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {profile?.first_name
                ? `${profile.first_name} ${profile.last_name || ''}`
                : 'My Account'}
            </h1>
            <p className="text-gray-400">{user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" onClick={handleSignOut}>
          <LogOut className="h-5 w-5 mr-2" />
          Sign Out
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-brand-gray">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'orders'
              ? 'text-brand-neon border-b-2 border-brand-neon'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Package className="h-5 w-5 inline mr-2" />
          Orders
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === 'settings'
              ? 'text-brand-neon border-b-2 border-brand-neon'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Settings className="h-5 w-5 inline mr-2" />
          Settings
        </button>
      </div>

      {/* Content */}
      {activeTab === 'orders' ? (
        <div>
          {orders.length === 0 ? (
            <Card className="text-center py-12">
              <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No orders yet</p>
              <Button onClick={() => navigate('/products')}>Start Shopping</Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} hover>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Order #{order.order_number}</p>
                      <p className="text-gray-400 text-sm">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          order.status === 'delivered'
                            ? 'success'
                            : order.status === 'cancelled'
                            ? 'danger'
                            : 'info'
                        }
                      >
                        {ORDER_STATUSES[order.status].label}
                      </Badge>
                      <p className="text-brand-neon font-semibold mt-1">
                        {formatPrice(order.total)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Card>
          <h2 className="text-xl font-semibold text-white mb-4">Account Settings</h2>
          <p className="text-gray-400">
            Account settings management coming soon. You'll be able to update your profile,
            manage addresses, and change your password.
          </p>
        </Card>
      )}
    </div>
  );
}
