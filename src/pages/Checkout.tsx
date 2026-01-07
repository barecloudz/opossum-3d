import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Check, X } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { formatPrice } from '../lib/utils';
import { DEFAULT_SHIPPING_COST } from '../lib/constants';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import type { PromoCode } from '../types';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, getSubtotal, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);

  const [formData, setFormData] = useState({
    email: user?.email || '',
    firstName: '',
    lastName: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    marketingOptIn: false,
  });

  const subtotal = getSubtotal();
  const shipping = DEFAULT_SHIPPING_COST;

  // Calculate discount
  let discount = 0;
  if (appliedPromo) {
    if (appliedPromo.discount_type === 'percentage') {
      discount = subtotal * (appliedPromo.discount_value / 100);
    } else {
      discount = Math.min(appliedPromo.discount_value, subtotal);
    }
  }

  const total = subtotal + shipping - discount;

  const applyPromoCode = async () => {
    if (!promoCode.trim()) return;

    setPromoLoading(true);
    setPromoError('');

    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase().trim())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setPromoError('Invalid promo code');
        return;
      }

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setPromoError('This code has expired');
        return;
      }

      // Check minimum order
      if (data.min_order_amount && subtotal < data.min_order_amount) {
        setPromoError(`Minimum order ${formatPrice(data.min_order_amount)} required`);
        return;
      }

      // Check max uses
      if (data.max_uses && data.uses_count >= data.max_uses) {
        setPromoError('This code has reached its usage limit');
        return;
      }

      setAppliedPromo(data);
      setPromoCode('');
    } catch (err) {
      setPromoError('Failed to apply code');
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    setPromoError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // TODO: Implement Stripe payment
    // For now, simulate a successful order
    await new Promise((resolve) => setTimeout(resolve, 2000));

    clearCart();
    navigate('/order-confirmation/demo-order-id');
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Checkout</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Form */}
          <div className="space-y-8">
            {/* Contact Information */}
            <Card>
              <h2 className="text-xl font-semibold text-white mb-4">Contact Information</h2>
              <div className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="marketingOptIn"
                    id="marketingOptIn"
                    checked={formData.marketingOptIn}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-brand-gray bg-brand-black text-brand-neon focus:ring-brand-neon"
                  />
                  <label htmlFor="marketingOptIn" className="text-gray-400 text-sm">
                    Email me with news and offers
                  </label>
                </div>
              </div>
            </Card>

            {/* Shipping Address */}
            <Card>
              <h2 className="text-xl font-semibold text-white mb-4">Shipping Address</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                  <Input
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <Input
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                />
                <Input
                  label="Apartment, suite, etc. (optional)"
                  name="apartment"
                  value={formData.apartment}
                  onChange={handleInputChange}
                />
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="City"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                  />
                  <Input
                    label="State"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    required
                  />
                  <Input
                    label="ZIP Code"
                    name="zip"
                    value={formData.zip}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <Input
                  label="Phone (optional)"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
            </Card>

            {/* Payment - Placeholder */}
            <Card>
              <h2 className="text-xl font-semibold text-white mb-4">Payment</h2>
              <p className="text-gray-400">
                Stripe payment integration will be added here.
              </p>
              <div className="mt-4 p-4 bg-brand-black rounded-lg border border-brand-gray">
                <p className="text-sm text-gray-500">
                  Demo mode - click "Place Order" to simulate a successful payment
                </p>
              </div>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <Card className="sticky top-24">
              <h2 className="text-xl font-semibold text-white mb-4">Order Summary</h2>

              {/* Items */}
              <div className="space-y-4 mb-6">
                {items.map((item) => {
                  const itemPrice = item.product.price + (item.variant?.price_adjustment || 0);
                  return (
                    <div
                      key={`${item.product.id}-${item.variant?.id || 'default'}`}
                      className="flex gap-4"
                    >
                      <div className="w-16 h-16 bg-brand-gray rounded-lg flex-shrink-0 relative">
                        <span className="absolute -top-2 -right-2 bg-brand-neon text-brand-black text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{item.product.name}</p>
                        {item.variant && (
                          <p className="text-gray-400 text-sm">{item.variant.name}</p>
                        )}
                      </div>
                      <span className="text-gray-400">
                        {formatPrice(itemPrice * item.quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Promo Code */}
              <div className="border-t border-brand-gray pt-4 mb-4">
                {appliedPromo ? (
                  <div className="flex items-center justify-between bg-brand-emerald-dark/20 border border-brand-neon/30 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-brand-neon" />
                      <span className="font-mono text-brand-neon font-medium">{appliedPromo.code}</span>
                      <span className="text-gray-400 text-sm">
                        ({appliedPromo.discount_type === 'percentage'
                          ? `${appliedPromo.discount_value}% off`
                          : `${formatPrice(appliedPromo.discount_value)} off`})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removePromoCode}
                      className="text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder="Promo code"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                          className="font-mono"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={applyPromoCode}
                        isLoading={promoLoading}
                        disabled={!promoCode.trim()}
                      >
                        Apply
                      </Button>
                    </div>
                    {promoError && (
                      <p className="text-red-400 text-sm">{promoError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="border-t border-brand-gray pt-4 space-y-2">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span className="flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      Discount
                    </span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-400">
                  <span>Shipping</span>
                  <span>{formatPrice(shipping)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t border-brand-gray">
                  <span className="text-white">Total</span>
                  <span className="text-brand-neon">{formatPrice(total)}</span>
                </div>
              </div>

              <Button type="submit" className="w-full mt-6" size="lg" isLoading={isLoading}>
                Place Order
              </Button>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
