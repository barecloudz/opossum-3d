import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { Tag, Check, X, CreditCard } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { stripePromise } from '../lib/stripe';
import { formatPrice } from '../lib/utils';
import { DEFAULT_SHIPPING_COST } from '../lib/constants';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import PaymentForm from '../components/checkout/PaymentForm';
import { useToast } from '../components/ui/Toast';
import type { PromoCode } from '../types';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, getSubtotal, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [step, setStep] = useState<'details' | 'payment'>('details');
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
    marketingOptIn: true,
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

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items.length, navigate]);

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

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setPromoError('This code has expired');
        return;
      }

      if (data.min_order_amount && subtotal < data.min_order_amount) {
        setPromoError(`Minimum order ${formatPrice(data.min_order_amount)} required`);
        return;
      }

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

  const createOrderAndPaymentIntent = async () => {
    setIsLoading(true);

    try {
      // Build shipping address
      const shippingAddress = {
        address_line_1: formData.address,
        address_line_2: formData.apartment || undefined,
        city: formData.city,
        state: formData.state,
        postal_code: formData.zip,
        country: 'US',
      };

      // Create the order first (pending status)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id || null,
          guest_email: !user ? formData.email : null,
          guest_name: !user ? `${formData.firstName} ${formData.lastName}` : null,
          status: 'pending',
          subtotal: subtotal,
          shipping_cost: shipping,
          tax: 0,
          total: total,
          shipping_address: shippingAddress,
          billing_address: shippingAddress,
          promo_code_id: appliedPromo?.id || null,
          discount_amount: discount,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        variant_id: item.variant?.id || null,
        product_name: item.product.name,
        variant_name: item.variant?.name || null,
        quantity: item.quantity,
        unit_price: item.product.price + (item.variant?.price_adjustment || 0),
        total_price: (item.product.price + (item.variant?.price_adjustment || 0)) * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      setOrderId(order.id);

      // Create payment intent
      const response = await fetch('/.netlify/functions/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(total * 100), // Convert to cents
          orderId: order.id,
          customerEmail: formData.email,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create payment intent');
      }

      if (!responseData.clientSecret) {
        throw new Error('No client secret returned');
      }

      setClientSecret(responseData.clientSecret);
      setStep('payment');
    } catch (err: any) {
      console.error('Error creating order:', err);
      addToast(err.message || 'Failed to create order. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      // Update order status to paid
      if (orderId) {
        await supabase
          .from('orders')
          .update({ status: 'paid' })
          .eq('id', orderId);

        // Update inventory
        for (const item of items) {
          if (item.product.track_inventory) {
            if (item.variant) {
              const newStock = Math.max(0, item.variant.stock_quantity - item.quantity);
              await supabase
                .from('product_variants')
                .update({ stock_quantity: newStock })
                .eq('id', item.variant.id);
            } else {
              const newStock = Math.max(0, item.product.stock_quantity - item.quantity);
              await supabase
                .from('products')
                .update({ stock_quantity: newStock })
                .eq('id', item.product.id);
            }
          }
        }

        // Update promo code usage
        if (appliedPromo) {
          await supabase
            .from('promo_codes')
            .update({ uses_count: appliedPromo.uses_count + 1 })
            .eq('id', appliedPromo.id);
        }

        // Add email subscriber if opted in
        if (formData.marketingOptIn && formData.email) {
          const { data: existingSub } = await supabase
            .from('email_subscribers')
            .select('id')
            .eq('email', formData.email.toLowerCase())
            .single();

          if (!existingSub) {
            await supabase.from('email_subscribers').insert({
              email: formData.email.toLowerCase(),
              first_name: formData.firstName || null,
              last_name: formData.lastName || null,
              source: 'checkout',
              is_subscribed: true,
              subscribed_at: new Date().toISOString(),
            });
          }
        }
      }

      clearCart();
      navigate(`/order-confirmation/${orderId}`);
    } catch (err) {
      console.error('Error finalizing order:', err);
    }
  };

  const handlePaymentError = (message: string) => {
    addToast(message, 'error');
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-theme mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Form */}
        <div className="space-y-8">
          {step === 'details' ? (
            <>
              {/* Contact Information */}
              <Card>
                <h2 className="text-xl font-semibold text-theme mb-4">Contact Information</h2>
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
                      className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                    />
                    <label htmlFor="marketingOptIn" className="text-theme opacity-60 text-sm">
                      Email me with news and offers
                    </label>
                  </div>
                </div>
              </Card>

              {/* Shipping Address */}
              <Card>
                <h2 className="text-xl font-semibold text-theme mb-4">Shipping Address</h2>
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

              <Button
                onClick={createOrderAndPaymentIntent}
                className="w-full"
                size="lg"
                isLoading={isLoading}
                disabled={!formData.email || !formData.firstName || !formData.lastName || !formData.address || !formData.city || !formData.state || !formData.zip}
              >
                Continue to Payment
              </Button>
            </>
          ) : (
            <>
              {/* Payment Section */}
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="h-5 w-5 text-[var(--color-primary)]" />
                  <h2 className="text-xl font-semibold text-theme">Payment</h2>
                </div>

                <div className="mb-4 p-3 bg-[var(--color-background)] rounded-lg border border-[var(--color-border)]">
                  <p className="text-theme opacity-60 text-sm">
                    Shipping to: {formData.firstName} {formData.lastName}, {formData.address}, {formData.city}, {formData.state} {formData.zip}
                  </p>
                  <button
                    onClick={() => setStep('details')}
                    className="text-[var(--color-primary)] text-sm hover:underline mt-1"
                  >
                    Edit details
                  </button>
                </div>

                {clientSecret && (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: 'night',
                        variables: {
                          colorPrimary: '#00ff66',
                          colorBackground: '#1a1a1a',
                          colorText: '#f5f5f5',
                          colorDanger: '#ef4444',
                          fontFamily: 'system-ui, sans-serif',
                          borderRadius: '8px',
                        },
                      },
                    }}
                  >
                    <PaymentForm
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                      isProcessing={isLoading}
                      setIsProcessing={setIsLoading}
                    />
                  </Elements>
                )}
              </Card>
            </>
          )}
        </div>

        {/* Right Column - Order Summary */}
        <div>
          <Card className="sticky top-24">
            <h2 className="text-xl font-semibold text-theme mb-4">Order Summary</h2>

            {/* Items */}
            <div className="space-y-4 mb-6">
              {items.map((item) => {
                const itemPrice = item.product.price + (item.variant?.price_adjustment || 0);
                return (
                  <div
                    key={`${item.product.id}-${item.variant?.id || 'default'}`}
                    className="flex gap-4"
                  >
                    <div className="w-16 h-16 bg-[var(--color-border)] rounded-lg flex-shrink-0 relative">
                      <span className="absolute -top-2 -right-2 bg-[var(--color-primary)] text-[var(--color-background)] text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-theme font-medium">{item.product.name}</p>
                      {item.variant && (
                        <p className="text-theme opacity-60 text-sm">{item.variant.name}</p>
                      )}
                    </div>
                    <span className="text-theme opacity-60">
                      {formatPrice(itemPrice * item.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Promo Code */}
            {step === 'details' && (
              <div className="border-t border-[var(--color-border)] pt-4 mb-4">
                {appliedPromo ? (
                  <div className="flex items-center justify-between bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-[var(--color-primary)]" />
                      <span className="font-mono text-[var(--color-primary)] font-medium">{appliedPromo.code}</span>
                      <span className="text-theme opacity-60 text-sm">
                        ({appliedPromo.discount_type === 'percentage'
                          ? `${appliedPromo.discount_value}% off`
                          : `${formatPrice(appliedPromo.discount_value)} off`})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removePromoCode}
                      className="text-theme opacity-60 hover:text-red-400 transition-colors"
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
            )}

            {/* Totals */}
            <div className="border-t border-[var(--color-border)] pt-4 space-y-2">
              <div className="flex justify-between text-theme opacity-60">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-500">
                  <span className="flex items-center gap-1">
                    <Check className="h-4 w-4" />
                    Discount
                  </span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-theme opacity-60">
                <span>Shipping</span>
                <span>{formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold pt-2 border-t border-[var(--color-border)]">
                <span className="text-theme">Total</span>
                <span className="text-[var(--color-primary)]">{formatPrice(total)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
