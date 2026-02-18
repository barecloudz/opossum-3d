import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { ChevronLeft, Tag, Check, X, Loader2 } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { stripePromise } from '../lib/stripe';
import { formatPrice } from '../lib/utils';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import PaymentForm from '../components/checkout/PaymentForm';
import { useToast } from '../components/ui/Toast';
import type { PromoCode } from '../types';

interface RateOption {
  serviceToken: string;
  serviceName: string;
  provider: string;
  rate: number;
  estimatedDays: number | null;
}

// Valid US state codes for validation
const VALID_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'AS', 'MP',
]);

export default function Checkout() {
  const navigate = useNavigate();
  const { items, getSubtotal, clearCart } = useCartStore();
  const { user, isAdmin } = useAuthStore();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);

  // Shipping rate state
  const [shippingRates, setShippingRates] = useState<RateOption[]>([]);
  const [selectedRateIndex, setSelectedRateIndex] = useState<number>(0);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [isRateFallback, setIsRateFallback] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  // Featured promo codes (shown on checkout)
  const [featuredPromos, setFeaturedPromos] = useState<PromoCode[]>([]);

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

  // Auto-populate email when user loads after initial render
  useEffect(() => {
    if (user?.email && !formData.email) {
      setFormData(prev => ({ ...prev, email: user.email || '' }));
    }
  }, [user?.email]);

  const subtotal = getSubtotal();
  const selectedRate = shippingRates[selectedRateIndex] || null;
  const shippingRate = selectedRate?.rate ?? null;
  const estimatedDelivery = selectedRate?.estimatedDays ?? null;
  const shipping = shippingRate ?? 0;

  // Calculate total weight from cart items (in ounces)
  const getTotalWeight = useCallback((): number => {
    return items.reduce((total, item) => {
      const weight = item.product.weight_oz || 8; // Default 8oz if not set
      return total + (weight * item.quantity);
    }, 0);
  }, [items]);

  // Check if address is complete enough to calculate shipping
  const canCalculateShipping = formData.zip && formData.zip.length >= 5 &&
    formData.city && formData.state && formData.address;

  // Fetch shipping rates
  const fetchShippingRate = useCallback(async () => {
    if (!canCalculateShipping) {
      return;
    }

    setShippingLoading(true);
    setShippingError(null);

    try {
      const response = await fetch('/.netlify/functions/get-shipping-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationAddress: {
            streetAddress: formData.address,
            secondaryAddress: formData.apartment,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zip,
          },
          totalWeightOz: getTotalWeight(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.rates?.length > 0) {
        setShippingRates(data.rates);
        setSelectedRateIndex(0); // Auto-select cheapest
        setIsRateFallback(data.fallbackUsed);

        if (data.fallbackUsed) {
          setShippingError('Could not get exact rates. Using estimated rate.');
        } else {
          setShippingError(null);
        }
      } else {
        setShippingRates([]);
        setIsRateFallback(true);
        setShippingError(data.error || 'Failed to calculate shipping. Please try again.');
      }
    } catch (error) {
      console.error('Failed to fetch shipping rate:', error);
      setShippingRates([]);
      setIsRateFallback(true);
      setShippingError('Unable to connect to shipping service. Please try again.');
    } finally {
      setShippingLoading(false);
    }
  }, [formData.address, formData.apartment, formData.city, formData.state, formData.zip, getTotalWeight, canCalculateShipping]);

  // Reset shipping when address changes significantly
  useEffect(() => {
    setShippingRates([]);
    setSelectedRateIndex(0);
    setIsRateFallback(false);
    setShippingError(null);
  }, [formData.zip, formData.city, formData.state]);

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

  // Fetch featured promo codes (shown on checkout when eligible)
  useEffect(() => {
    const fetchFeaturedPromos = async () => {
      try {
        const { data, error } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('is_active', true)
          .eq('show_on_checkout', true);

        if (error) throw error;

        // Filter valid promos (not expired, not maxed out)
        const now = new Date();
        const validPromos = (data || []).filter(promo => {
          if (promo.expires_at && new Date(promo.expires_at) < now) return false;
          if (promo.starts_at && new Date(promo.starts_at) > now) return false;
          if (promo.max_uses && promo.uses_count >= promo.max_uses) return false;
          return true;
        });

        setFeaturedPromos(validPromos);
      } catch (err) {
        console.error('Error fetching featured promos:', err);
      }
    };

    fetchFeaturedPromos();
  }, []);


  // Get eligible featured promos (subtotal meets min order amount)
  const eligiblePromos = featuredPromos.filter(promo => {
    if (appliedPromo) return false; // Hide if a promo is already applied
    if (promo.min_order_amount && subtotal < promo.min_order_amount) return false;
    return true;
  });

  const applyPromoCode = async () => {
    if (!promoCode.trim()) return;

    setPromoLoading(true);
    setPromoError('');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase().trim())
        .eq('is_active', true)
        .abortSignal(controller.signal)
        .single();

      clearTimeout(timeoutId);

      if (error || !data) {
        setPromoError('Invalid promo code');
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setPromoError('This code has expired');
        return;
      }

      if (data.starts_at && new Date(data.starts_at) > new Date()) {
        setPromoError('This code is not yet active');
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
    } catch (err: any) {
      setPromoError(err.name === 'AbortError' ? 'Request timed out, please try again' : 'Failed to apply code');
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    setPromoError('');
  };

  // Apply a featured promo code directly (already validated)
  const applyFeaturedPromo = (promo: PromoCode) => {
    setAppliedPromo(promo);
    setPromoCode('');
    setPromoError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      // Auto-uppercase state code and limit to 2 chars
      [name]: type === 'checkbox'
        ? checked
        : name === 'state'
          ? value.toUpperCase().slice(0, 2)
          : value,
    }));
  };

  // Validate state code
  const isValidState = !formData.state || VALID_STATES.has(formData.state.toUpperCase());

  const createOrderAndPaymentIntent = async () => {
    setIsLoading(true);

    try {
      // Build shipping address with selected service token for label generation
      const shippingAddress = {
        address_line_1: formData.address,
        address_line_2: formData.apartment || undefined,
        city: formData.city,
        state: formData.state,
        postal_code: formData.zip,
        country: 'US',
        shipping_service_token: selectedRate?.serviceToken,
      };

      // Create the order first (pending status)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id || null,
          guest_email: formData.email || user?.email || null,
          guest_name: `${formData.firstName} ${formData.lastName}`.trim() || null,
          guest_phone: formData.phone || null,
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

      // Validate variant IDs still exist in database before inserting
      const variantIds = items.map(i => i.variant?.id).filter(Boolean) as string[];
      let validVariantIds = new Set<string>();
      if (variantIds.length > 0) {
        const { data: validVariants } = await supabase
          .from('product_variants')
          .select('id')
          .in('id', variantIds);
        validVariantIds = new Set((validVariants || []).map(v => v.id));
      }

      // Create order items (set variant_id to null if variant no longer exists)
      const orderItems = items.map((item) => {
        const variantExists = item.variant?.id ? validVariantIds.has(item.variant.id) : false;
        return {
          order_id: order.id,
          product_id: item.product.id,
          variant_id: variantExists ? item.variant!.id : null,
          product_name: item.product.name,
          variant_name: item.variant?.name || null,
          quantity: item.quantity,
          unit_price: item.product.price + (item.variant?.price_adjustment || 0),
          total_price: (item.product.price + (item.variant?.price_adjustment || 0)) * item.quantity,
        };
      });

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

    if (!confirmedOrderId) {
      clearCart();
      navigate('/');
      return;
    }

    try {
      // CRITICAL: Update order status to 'paid' - must complete before navigation
      const { error: statusError } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', confirmedOrderId);

      if (statusError) {
        console.error('[Checkout] CRITICAL: Failed to update order status to paid:', statusError);
        // Still continue - order exists, payment succeeded
      } else {
        console.log('[Checkout] Order status updated to paid');
      }

      // Update inventory - await to ensure stock is decremented
      const inventoryPromises = orderItems
        .filter(item => item.product.track_inventory)
        .map(async (item) => {
          if (item.variant) {
            const newStock = Math.max(0, item.variant.stock_quantity - item.quantity);
            const { error } = await supabase
              .from('product_variants')
              .update({ stock_quantity: newStock })
              .eq('id', item.variant.id);
            if (error) console.error('[Checkout] Failed to update variant inventory:', error);
          } else {
            const newStock = Math.max(0, item.product.stock_quantity - item.quantity);
            const { error } = await supabase
              .from('products')
              .update({ stock_quantity: newStock })
              .eq('id', item.product.id);
            if (error) console.error('[Checkout] Failed to update product inventory:', error);
          }
        });

      await Promise.all(inventoryPromises);
      console.log('[Checkout] Inventory updated');

      // Update promo code usage with atomic increment to prevent race condition
      if (appliedPromo) {
        const { error: promoError } = await supabase.rpc('increment_promo_usage', {
          promo_id: appliedPromo.id
        }).maybeSingle();

        // Fallback if RPC doesn't exist - use regular update
        if (promoError?.code === 'PGRST202') {
          await supabase
            .from('promo_codes')
            .update({ uses_count: appliedPromo.uses_count + 1 })
            .eq('id', appliedPromo.id);
        }
        console.log('[Checkout] Promo code usage updated');
      }

      // Add to email subscribers if opted in (upsert to prevent duplicates)
      if (formData.marketingOptIn && formData.email) {
        await supabase
          .from('email_subscribers')
          .upsert({
            email: formData.email.toLowerCase(),
            first_name: formData.firstName || null,
            last_name: formData.lastName || null,
            source: 'checkout',
            is_subscribed: true,
            subscribed_at: new Date().toISOString(),
          }, { onConflict: 'email', ignoreDuplicates: true });
        console.log('[Checkout] Email subscriber processed');
      }

    } catch (err) {
      console.error('[Checkout] Error in post-payment processing:', err);
      // Continue to confirmation - payment succeeded, these are secondary operations
    }

    // Clear cart and navigate only after critical operations complete
    clearCart();
    navigate(`/order-confirmation/${confirmedOrderId}`);

    // Auto-generate shipping label in background (non-blocking)
    if (formData.address !== 'Local Pickup') {
      fetch('/.netlify/functions/auto-generate-shipping-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: confirmedOrderId }),
      }).catch(err => console.error('[Checkout] Auto label generation failed:', err));
    }

    // Send admin notification email in background (non-blocking)
    const orderPayload = {
      orderNumber: confirmedOrderId.slice(0, 8).toUpperCase(),
      customerEmail: formData.email,
      customerName: `${formData.firstName} ${formData.lastName}`,
      customerPhone: formData.phone || undefined,
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
      shippingAddress: {
        address_line_1: formData.address,
        address_line_2: formData.apartment || undefined,
        city: formData.city,
        state: formData.state,
        postal_code: formData.zip,
      },
    };

    fetch('/.netlify/functions/send-admin-order-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    }).catch(err => console.error('[Checkout] Admin notification failed:', err));

    // Send confirmation email in background (non-blocking)
    fetch('/.netlify/functions/send-order-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...orderPayload, orderId: confirmedOrderId }),
    })
      .then(res => {
        if (!res.ok) console.error('[Checkout] Confirmation email failed:', res.status);
        else console.log('[Checkout] Confirmation email sent');
      })
      .catch(err => console.error('[Checkout] Error sending confirmation email:', err));
  };

  const handlePaymentError = (message: string) => {
    addToast(message, 'error');
  };

  // Admin test payment - skips Stripe entirely
  const handleTestPayment = async () => {
    if (!isAdmin) return;
    setIsLoading(true);

    try {
      const shippingAddress = {
        address_line_1: formData.address,
        address_line_2: formData.apartment || undefined,
        city: formData.city,
        state: formData.state,
        postal_code: formData.zip,
        country: 'US',
        shipping_service_token: selectedRate?.serviceToken,
      };

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id || null,
          guest_email: formData.email || user?.email || null,
          guest_name: `${formData.firstName} ${formData.lastName}`.trim() || null,
          guest_phone: formData.phone || null,
          status: 'paid',
          subtotal,
          shipping_cost: shipping,
          tax: 0,
          total,
          shipping_address: shippingAddress,
          billing_address: shippingAddress,
          promo_code_id: appliedPromo?.id || null,
          discount_amount: discount,
          notes: 'TEST ORDER - Admin test payment',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Validate variant IDs
      const variantIds = items.map(i => i.variant?.id).filter(Boolean) as string[];
      let validVariantIds = new Set<string>();
      if (variantIds.length > 0) {
        const { data: validVariants } = await supabase
          .from('product_variants')
          .select('id')
          .in('id', variantIds);
        validVariantIds = new Set((validVariants || []).map(v => v.id));
      }

      // Create order items
      const orderItems = items.map((item) => {
        const variantExists = item.variant?.id ? validVariantIds.has(item.variant.id) : false;
        return {
          order_id: order.id,
          product_id: item.product.id,
          variant_id: variantExists ? item.variant!.id : null,
          product_name: item.product.name,
          variant_name: item.variant?.name || null,
          quantity: item.quantity,
          unit_price: item.product.price + (item.variant?.price_adjustment || 0),
          total_price: (item.product.price + (item.variant?.price_adjustment || 0)) * item.quantity,
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update inventory
      const inventoryPromises = items
        .filter(item => item.product.track_inventory)
        .map(async (item) => {
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
        });

      await Promise.all(inventoryPromises);

      // Update promo usage
      if (appliedPromo) {
        const { error: promoError } = await supabase.rpc('increment_promo_usage', {
          promo_id: appliedPromo.id
        }).maybeSingle();

        if (promoError?.code === 'PGRST202') {
          await supabase
            .from('promo_codes')
            .update({ uses_count: appliedPromo.uses_count + 1 })
            .eq('id', appliedPromo.id);
        }
      }

      setPaymentComplete(true);
      clearCart();
      navigate(`/order-confirmation/${order.id}`);

      // Auto-generate shipping label in background
      if (formData.address !== 'Local Pickup') {
        fetch('/.netlify/functions/auto-generate-shipping-label', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id }),
        }).catch(err => console.error('[Checkout] Auto label generation failed:', err));
      }

      // Send admin notification email
      const testOrderPayload = {
        orderNumber: order.id.slice(0, 8).toUpperCase(),
        customerEmail: formData.email,
        customerName: `${formData.firstName} ${formData.lastName}`,
        customerPhone: formData.phone || undefined,
        items: items.map(item => ({
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
        shippingAddress: {
          address_line_1: formData.address,
          address_line_2: formData.apartment || undefined,
          city: formData.city,
          state: formData.state,
          postal_code: formData.zip,
        },
      };

      fetch('/.netlify/functions/send-admin-order-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testOrderPayload),
      }).catch(err => console.error('[Checkout] Admin notification failed:', err));

      // Send customer confirmation email
      fetch('/.netlify/functions/send-order-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...testOrderPayload, orderId: order.id }),
      }).catch(err => console.error('[Checkout] Confirmation email failed:', err));

    } catch (err: any) {
      console.error('[Checkout] Test payment error:', err);
      addToast(err.message || 'Test payment failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // For delivery orders: require a selected rate to prevent losing money
  const hasValidShippingRate = shippingRates.length > 0 && shippingRate !== null && !isRateFallback;

  const isFormValid = formData.email && formData.firstName && formData.lastName &&
    formData.address && formData.city && formData.state && formData.zip &&
    formData.zip.length >= 5 && isValidState &&
    hasValidShippingRate && !shippingLoading;

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
                  maxLength={2}
                  placeholder="NC"
                />
                <Input
                  label="ZIP"
                  name="zip"
                  value={formData.zip}
                  onChange={handleInputChange}
                  required
                  maxLength={10}
                  placeholder="28792"
                />
              </div>
              {formData.state && !isValidState && (
                <p className="text-red-400 text-sm mt-1">Please enter a valid US state code (e.g., NC, CA, NY)</p>
              )}

              {/* Shipping Options */}
              {canCalculateShipping && isValidState && (
                <div className="mt-4 p-4 bg-[var(--color-background)]/50 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white font-medium">Shipping Method</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={fetchShippingRate}
                      isLoading={shippingLoading}
                      disabled={shippingLoading}
                      className="shrink-0"
                    >
                      {shippingRates.length > 0 ? 'Refresh Rates' : 'Get Rates'}
                    </Button>
                  </div>

                  {shippingLoading && (
                    <div className="flex items-center gap-2 text-gray-400 py-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Fetching shipping options...</span>
                    </div>
                  )}

                  {!shippingLoading && shippingRates.length > 0 && (
                    <div className="space-y-2">
                      {shippingRates.map((rate, index) => (
                        <label
                          key={rate.serviceToken}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                            selectedRateIndex === index
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                              : 'border-[var(--color-border)] hover:bg-white/5'
                          }`}
                        >
                          <input
                            type="radio"
                            name="shippingRate"
                            checked={selectedRateIndex === index}
                            onChange={() => setSelectedRateIndex(index)}
                            className="w-4 h-4 border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                          />
                          <div className="flex-1">
                            <span className="text-white text-sm font-medium">{rate.serviceName}</span>
                            {rate.estimatedDays && (
                              <span className="text-gray-400 text-xs ml-2">
                                ({rate.estimatedDays} day{rate.estimatedDays !== 1 ? 's' : ''})
                              </span>
                            )}
                          </div>
                          <span className="text-[var(--color-primary)] font-bold text-sm">
                            {formatPrice(rate.rate)}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {!shippingLoading && shippingRates.length === 0 && (
                    <p className="text-gray-400 text-sm py-2">Click "Get Rates" to see shipping options</p>
                  )}

                  {shippingError && (
                    <p className="text-red-400 text-sm mt-2">{shippingError}</p>
                  )}
                  {isRateFallback && !shippingError && (
                    <p className="text-orange-400 text-sm mt-2">
                      Could not get exact rates. Please verify your address and try again.
                    </p>
                  )}
                </div>
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
                <div className="space-y-3">
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

                  {/* Featured promo codes */}
                  {eligiblePromos.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-gray-500 text-xs">Available offers:</p>
                      <div className="flex flex-wrap gap-2">
                        {eligiblePromos.map((promo) => (
                          <button
                            key={promo.id}
                            type="button"
                            onClick={() => applyFeaturedPromo(promo)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-lg text-sm hover:bg-[var(--color-primary)]/20 transition-colors"
                          >
                            <Tag className="h-3 w-3 text-[var(--color-primary)]" />
                            <span className="font-mono text-[var(--color-primary)] font-medium">{promo.code}</span>
                            <span className="text-gray-400">
                              {promo.discount_type === 'percentage'
                                ? `${promo.discount_value}% off`
                                : `${formatPrice(promo.discount_value)} off`}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
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
                <span className="flex items-center gap-2">
                  Shipping
                  {shippingLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                </span>
                <span className={shippingRate === null && !shippingLoading ? 'text-orange-400' : ''}>
                  {shippingLoading
                    ? 'Calculating...'
                    : shippingRate !== null
                      ? formatPrice(shipping)
                      : 'Not calculated'}
                </span>
              </div>
              {!shippingLoading && (
                <p className="text-xs text-right">
                  {shippingRate === null ? (
                    <span className="text-orange-400">Select a shipping method above to continue</span>
                  ) : isRateFallback ? (
                    <span className="text-orange-400">Could not verify rate - please recalculate</span>
                  ) : selectedRate ? (
                    <span className="text-gray-500">
                      {selectedRate.serviceName}
                      {estimatedDelivery && ` - Est. ${estimatedDelivery} business day${estimatedDelivery !== 1 ? 's' : ''}`}
                    </span>
                  ) : null}
                </p>
              )}
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

            {isAdmin && (
              <Button
                onClick={handleTestPayment}
                className="w-full border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                size="lg"
                variant="outline"
                isLoading={isLoading}
                disabled={!isFormValid}
              >
                Test Payment (Admin Only)
              </Button>
            )}
          </>
        ) : (
          <>
            {/* Payment Section */}
            <div className="bg-[var(--color-surface)]/80 backdrop-blur-sm rounded-2xl border border-[var(--color-border)] p-4">
              <h2 className="text-white font-semibold mb-4">Select payment method</h2>

              {/* Shipping summary */}
              <div className="mb-4 p-3 bg-[var(--color-background)]/50 rounded-xl">
                <p className="text-gray-400 text-sm">
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
