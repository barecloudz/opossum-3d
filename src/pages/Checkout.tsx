import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { ChevronLeft, Tag, Check, X, Truck, Store } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { stripePromise } from '../lib/stripe';
import { formatPrice } from '../lib/utils';
import { DEFAULT_SHIPPING_COST } from '../lib/constants';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import PaymentForm from '../components/checkout/PaymentForm';
import { useToast } from '../components/ui/Toast';
import type { PromoCode } from '../types';

type ShippingMethod = 'delivery' | 'pickup';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, getSubtotal, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('delivery');
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);

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
  const shipping = shippingMethod === 'delivery' ? DEFAULT_SHIPPING_COST : 0;

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

  // Redirect if cart is empty (but not after successful payment)
  useEffect(() => {
    if (items.length === 0 && !paymentComplete) {
      navigate('/cart');
    }
  }, [items.length, navigate, paymentComplete]);

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
      const shippingAddress = shippingMethod === 'delivery' ? {
        address_line_1: formData.address,
        address_line_2: formData.apartment || undefined,
        city: formData.city,
        state: formData.state,
        postal_code: formData.zip,
        country: 'US',
      } : {
        address_line_1: 'Local Pickup',
        city: 'Hendersonville',
        state: 'NC',
        postal_code: '28792',
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
    const confirmedOrderId = orderId;
    const orderItems = [...items];

    setPaymentComplete(true);
    clearCart();

    if (confirmedOrderId) {
      navigate(`/order-confirmation/${confirmedOrderId}`);
    } else {
      navigate('/');
    }

    // Background operations
    if (confirmedOrderId) {
      supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', confirmedOrderId)
        .then(({ error }) => {
          if (error) console.error('Error updating order status:', error);
        });

      fetch('/.netlify/functions/send-order-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: confirmedOrderId,
          orderNumber: confirmedOrderId.slice(0, 8).toUpperCase(),
          customerEmail: formData.email,
          customerName: `${formData.firstName} ${formData.lastName}`,
          items: orderItems.map(item => ({
            product_name: item.product.name,
            variant_name: item.variant?.name,
            quantity: item.quantity,
            unit_price: item.product.price + (item.variant?.price_adjustment || 0),
            total_price: (item.product.price + (item.variant?.price_adjustment || 0)) * item.quantity,
          })),
          subtotal,
          shipping,
          discount: discount > 0 ? discount : undefined,
          total,
          shippingAddress: shippingMethod === 'delivery' ? {
            address_line_1: formData.address,
            address_line_2: formData.apartment || undefined,
            city: formData.city,
            state: formData.state,
            postal_code: formData.zip,
          } : { address_line_1: 'Local Pickup - Hendersonville, NC' },
        }),
      }).catch(err => console.error('Error sending confirmation email:', err));

      for (const item of orderItems) {
        if (item.product.track_inventory) {
          if (item.variant) {
            const newStock = Math.max(0, item.variant.stock_quantity - item.quantity);
            supabase
              .from('product_variants')
              .update({ stock_quantity: newStock })
              .eq('id', item.variant.id);
          } else {
            const newStock = Math.max(0, item.product.stock_quantity - item.quantity);
            supabase
              .from('products')
              .update({ stock_quantity: newStock })
              .eq('id', item.product.id);
          }
        }
      }

      if (appliedPromo) {
        supabase
          .from('promo_codes')
          .update({ uses_count: appliedPromo.uses_count + 1 })
          .eq('id', appliedPromo.id);
      }

      if (formData.marketingOptIn && formData.email) {
        supabase
          .from('email_subscribers')
          .select('id')
          .eq('email', formData.email.toLowerCase())
          .single()
          .then(({ data: existingSub }) => {
            if (!existingSub) {
              supabase.from('email_subscribers').insert({
                email: formData.email.toLowerCase(),
                first_name: formData.firstName || null,
                last_name: formData.lastName || null,
                source: 'checkout',
                is_subscribed: true,
                subscribed_at: new Date().toISOString(),
              });
            }
          });
      }
    }
  };

  const handlePaymentError = (message: string) => {
    addToast(message, 'error');
  };

  const isFormValid = formData.email && formData.firstName && formData.lastName &&
    (shippingMethod === 'pickup' || (formData.address && formData.city && formData.state && formData.zip));

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[var(--color-surface)]/95 backdrop-blur-sm border-b border-[var(--color-border)]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => step === 'payment' ? setStep('details') : navigate(-1)}
            className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold text-white">Checkout</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Order Summary - Compact */}
        <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm rounded-2xl border border-[var(--color-border)] p-4">
          <div className="space-y-3">
            {items.map((item) => {
              const itemPrice = item.product.price + (item.variant?.price_adjustment || 0);
              const primaryImage = item.product.images?.find(img => img.is_primary) || item.product.images?.[0];
              return (
                <div
                  key={`${item.product.id}-${item.variant?.id || 'default'}`}
                  className="flex items-center gap-4"
                >
                  <div className="w-16 h-16 bg-[var(--color-border)] rounded-xl flex-shrink-0 overflow-hidden">
                    {primaryImage?.image_url ? (
                      <img
                        src={primaryImage.image_url}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">{item.product.name}</h3>
                    <p className="text-gray-400 text-sm">
                      Qty: {item.quantity}
                      {item.variant && ` • ${item.variant.name}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[var(--color-primary)] font-bold">{formatPrice(itemPrice * item.quantity)}</p>
                    <p className="text-gray-500 text-xs">incl. taxes</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {step === 'details' ? (
          <>
            {/* Shipping Method */}
            <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm rounded-2xl border border-[var(--color-border)] p-4">
              <h2 className="text-white font-semibold mb-4">Shipping method</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShippingMethod('delivery')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${
                    shippingMethod === 'delivery'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white'
                      : 'border-[var(--color-border)] text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <Truck className="h-5 w-5" />
                  <span className="font-medium">Home delivery</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShippingMethod('pickup')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${
                    shippingMethod === 'pickup'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white'
                      : 'border-[var(--color-border)] text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <Store className="h-5 w-5" />
                  <span className="font-medium">Pick up</span>
                </button>
              </div>
              {shippingMethod === 'pickup' && (
                <p className="mt-3 text-sm text-gray-400">
                  Pick up at Hendersonville, NC. We'll email you when your order is ready.
                </p>
              )}
            </div>

            {/* Contact & Address */}
            <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm rounded-2xl border border-[var(--color-border)] p-4 space-y-4">
              <h2 className="text-white font-semibold">Contact information</h2>

              <Input
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />

              <div className="grid grid-cols-2 gap-3">
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
                label="Phone (optional)"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
              />

              {shippingMethod === 'delivery' && (
                <>
                  <div className="border-t border-[var(--color-border)] pt-4 mt-4">
                    <h2 className="text-white font-semibold mb-4">Shipping address</h2>
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
                  <div className="grid grid-cols-3 gap-3">
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
                      label="ZIP"
                      name="zip"
                      value={formData.zip}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  name="marketingOptIn"
                  id="marketingOptIn"
                  checked={formData.marketingOptIn}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <label htmlFor="marketingOptIn" className="text-gray-400 text-sm">
                  Email me with news and offers
                </label>
              </div>
            </div>

            {/* Promo Code */}
            <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm rounded-2xl border border-[var(--color-border)] p-4">
              <h2 className="text-white font-semibold mb-4">Promo code</h2>
              {appliedPromo ? (
                <div className="flex items-center justify-between bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-[var(--color-primary)]" />
                    <span className="font-mono text-[var(--color-primary)] font-medium">{appliedPromo.code}</span>
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
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Enter code"
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

            {/* Order Total */}
            <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm rounded-2xl border border-[var(--color-border)] p-4 space-y-3">
              <div className="flex justify-between text-gray-400">
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
              <div className="flex justify-between text-gray-400">
                <span>Shipping</span>
                <span>{shippingMethod === 'pickup' ? 'Free' : formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold pt-3 border-t border-[var(--color-border)]">
                <span className="text-white">Total</span>
                <span className="text-[var(--color-primary)]">{formatPrice(total)}</span>
              </div>
            </div>

            {/* Continue Button */}
            <Button
              onClick={createOrderAndPaymentIntent}
              className="w-full"
              size="lg"
              isLoading={isLoading}
              disabled={!isFormValid}
            >
              Continue to Payment
            </Button>
          </>
        ) : (
          <>
            {/* Payment Section */}
            <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm rounded-2xl border border-[var(--color-border)] p-4">
              <h2 className="text-white font-semibold mb-4">Select payment method</h2>

              {/* Shipping summary */}
              <div className="mb-4 p-3 bg-[var(--color-background)]/50 rounded-xl">
                <p className="text-gray-400 text-sm">
                  {shippingMethod === 'delivery' ? (
                    <>Shipping to: {formData.firstName} {formData.lastName}, {formData.address}, {formData.city}, {formData.state} {formData.zip}</>
                  ) : (
                    <>Local pickup in Hendersonville, NC</>
                  )}
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
                        colorPrimary: '#9AFF00',
                        colorBackground: '#1a1a1a',
                        colorText: '#f5f5f5',
                        colorDanger: '#ef4444',
                        fontFamily: 'system-ui, sans-serif',
                        borderRadius: '12px',
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
            </div>

            {/* Order Total - Payment Step */}
            <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm rounded-2xl border border-[var(--color-border)] p-4">
              <div className="flex justify-between text-xl font-bold">
                <span className="text-white">Total</span>
                <span className="text-[var(--color-primary)]">{formatPrice(total)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
