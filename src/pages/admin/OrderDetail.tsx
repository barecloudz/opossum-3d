import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, MapPin, Save, Truck, Download, AlertCircle, CheckCircle, Printer, RotateCcw, Tag, Palette } from 'lucide-react';
import { COLOR_PRESETS } from '../../lib/constants';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabase';
import { formatPrice, formatDateTime } from '../../lib/utils';
import { ORDER_STATUSES } from '../../lib/constants';
import type { Order, OrderItem, OrderStatus } from '../../types';

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');
  // Per-item color editing: map of item.id -> selected colors array
  const [itemColors, setItemColors] = useState<Record<string, string[]>>({});
  const [savingColorItemId, setSavingColorItemId] = useState<string | null>(null);
  // Per-item available colors fetched from their product
  const [productColors, setProductColors] = useState<Record<string, string[]>>({});

  // Shipping label state
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [labelData, setLabelData] = useState<{
    trackingNumber: string;
    labelUrl: string;
  } | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);
  const [isRefundingLabel, setIsRefundingLabel] = useState(false);
  const [refundMessage, setRefundMessage] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (orderError) throw orderError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id);

      if (itemsError) throw itemsError;

      setOrder(orderData);
      setItems(itemsData || []);
      setStatus(orderData.status);
      setTrackingNumber(orderData.tracking_number || '');
      setNotes(orderData.notes || '');
      // Initialize color selections from DB
      const colorMap: Record<string, string[]> = {};
      for (const item of itemsData || []) {
        colorMap[item.id] = item.selected_colors ?? [];
      }
      setItemColors(colorMap);

      // Fetch available colors for each unique product
      const productIds = [...new Set((itemsData || []).map(i => i.product_id).filter(Boolean))] as string[];
      if (productIds.length) {
        const { data: products } = await supabase
          .from('products')
          .select('id, available_colors')
          .in('id', productIds);
        const pColorMap: Record<string, string[]> = {};
        for (const p of products ?? []) {
          pColorMap[p.id] = p.available_colors?.length
            ? p.available_colors
            : COLOR_PRESETS.map(c => c.name);
        }
        setProductColors(pColorMap);
      }

      // Load stored label if available
      if (orderData.shipping_label_pdf && orderData.tracking_number) {
        setLabelData({
          trackingNumber: orderData.tracking_number,
          labelUrl: orderData.shipping_label_pdf,
        });
      }

      // Fetch promo code if one was used
      if (orderData.promo_code_id) {
        const { data: promo } = await supabase
          .from('promo_codes')
          .select('code')
          .eq('id', orderData.promo_code_id)
          .single();
        if (promo) setPromoCode(promo.code);
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      navigate('/admin/orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!order) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status,
          tracking_number: trackingNumber || null,
          notes: notes || null,
        })
        .eq('id', order.id);

      if (error) throw error;

      // If a new tracking number was added, send shipping confirmation email
      const hadNoTracking = !order.tracking_number;
      const hasNewTracking = trackingNumber && trackingNumber.trim() !== '';
      if (hadNoTracking && hasNewTracking && order.guest_email) {
        try {
          await fetch('/.netlify/functions/send-shipping-confirmation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderNumber: order.order_number.toString(),
              customerEmail: order.guest_email,
              customerName: order.guest_name || 'Customer',
              trackingNumber: trackingNumber,
              shippingAddress: order.shipping_address,
            }),
          });
        } catch (emailError) {
          console.error('Failed to send tracking email:', emailError);
          // Don't throw - save was successful
        }
      }

      // Refund clawback: if order is being cancelled, reverse any affiliate commissions
      if (status === 'cancelled' && order.status !== 'cancelled') {
        await supabase
          .from('affiliate_conversions')
          .update({ status: 'reversed' })
          .eq('order_id', order.id)
          .in('status', ['pending', 'approved']);
      }

      setOrder({ ...order, status, tracking_number: trackingNumber, notes });
    } catch (err) {
      console.error('Error updating order:', err);
      alert('Failed to update order');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveItemColors = async (itemId: string) => {
    setSavingColorItemId(itemId);
    try {
      const colors = itemColors[itemId] ?? [];
      const { error } = await supabase
        .from('order_items')
        .update({ selected_colors: colors.length ? colors : null })
        .eq('id', itemId);
      if (error) throw error;
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, selected_colors: colors.length ? colors : null } : i));
    } catch (err) {
      console.error('Error saving colors:', err);
      alert('Failed to save colors');
    } finally {
      setSavingColorItemId(null);
    }
  };

  // Calculate total weight from order items
  const calculateOrderWeight = async (): Promise<number> => {
    const productIds = items.map(item => item.product_id).filter(Boolean) as string[];

    if (productIds.length === 0) {
      return 8 * items.reduce((acc, item) => acc + item.quantity, 0); // Default 8oz per item
    }

    const { data: products } = await supabase
      .from('products')
      .select('id, weight_oz')
      .in('id', productIds);

    const weightMap = new Map(products?.map(p => [p.id, p.weight_oz || 8]) || []);

    return items.reduce((total, item) => {
      const weight = item.product_id ? (weightMap.get(item.product_id) || 8) : 8;
      return total + (weight * item.quantity);
    }, 0);
  };

  // Generate shipping label via Shippo
  const handleGenerateLabel = async () => {
    if (!order) return;

    setIsGeneratingLabel(true);
    setLabelError(null);

    const controller = new AbortController();
    const labelTimeout = setTimeout(() => controller.abort(), 25000);

    try {
      const totalWeight = await calculateOrderWeight();

      // Parse customer name
      const fullName = order.guest_name || '';
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || 'Customer';
      const lastName = nameParts.slice(1).join(' ') || firstName;

      const sessionPromise = supabase.auth.getSession();
      const sessionTimeout = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Session timeout')), 10000)
      );
      const sessionResult = await Promise.race([sessionPromise, sessionTimeout]).catch(() => null);
      const labelSession = sessionResult && 'data' in sessionResult ? sessionResult.data.session : null;

      const response = await fetch('/.netlify/functions/create-shipping-label', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(labelSession?.access_token ? { 'Authorization': `Bearer ${labelSession.access_token}` } : {}),
        },
        body: JSON.stringify({
          orderId: order.id,
          orderNumber: order.order_number,
          recipientAddress: {
            firstName,
            lastName,
            streetAddress: order.shipping_address.address_line_1,
            secondaryAddress: order.shipping_address.address_line_2,
            city: order.shipping_address.city,
            state: order.shipping_address.state,
            zipCode: order.shipping_address.postal_code,
          },
          totalWeightOz: totalWeight,
          serviceToken: order.shipping_address.shipping_service_token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate label');
      }

      setLabelData(data);
      setTrackingNumber(data.trackingNumber);

      // Auto-save tracking number, label URL, transaction ID, and update status
      await supabase
        .from('orders')
        .update({
          tracking_number: data.trackingNumber,
          shipping_label_pdf: data.labelUrl,
          shipping_label_generated_at: new Date().toISOString(),
          shippo_transaction_id: data.shippoTransactionId || null,
          shipping_label_refunded_at: null,
          status: 'shipped',
        })
        .eq('id', order.id);

      setOrder({
        ...order,
        tracking_number: data.trackingNumber,
        shipping_label_pdf: data.labelUrl,
        shipping_label_generated_at: new Date().toISOString(),
        shippo_transaction_id: data.shippoTransactionId || null,
        shipping_label_refunded_at: null,
        status: 'shipped',
      });
      setStatus('shipped');
      setRefundMessage(null);

      // Send shipping confirmation email
      if (order.guest_email) {
        try {
          await fetch('/.netlify/functions/send-shipping-confirmation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderNumber: order.order_number.toString(),
              customerEmail: order.guest_email,
              customerName: order.guest_name || 'Customer',
              trackingNumber: data.trackingNumber,
              shippingAddress: order.shipping_address,
            }),
          });
        } catch (emailError) {
          console.error('Failed to send shipping email:', emailError);
          // Don't throw - label was generated successfully
        }
      }

    } catch (error: any) {
      console.error('Label generation error:', error);
      if (error.name === 'AbortError') {
        setLabelError('Request timed out. Shippo may be slow — please try again.');
      } else {
        setLabelError(error.message || 'Failed to generate shipping label');
      }
    } finally {
      clearTimeout(labelTimeout);
      setIsGeneratingLabel(false);
    }
  };

  // Download label PDF
  const handleDownloadLabel = () => {
    if (!labelData?.labelUrl || !order) return;

    // Shippo returns a direct URL to the label PDF
    const a = document.createElement('a');
    a.href = labelData.labelUrl;
    a.download = `shipping-label-${order.order_number}.pdf`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Open label PDF in new tab for printing
  const handlePrintLabel = () => {
    if (!labelData?.labelUrl) return;
    window.open(labelData.labelUrl, '_blank');
  };

  // Refund shipping label via Shippo
  const handleRefundLabel = async () => {
    if (!order) return;
    if (!confirm('Are you sure you want to refund this shipping label? This cannot be undone.')) return;

    setIsRefundingLabel(true);
    setLabelError(null);
    setRefundMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/.netlify/functions/refund-shipping-label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ orderId: order.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to refund label');
      }

      setRefundMessage(data.message);
      setLabelData(null);
      setTrackingNumber('');
      setOrder({
        ...order,
        shipping_label_pdf: null,
        shipping_label_generated_at: null,
        shippo_transaction_id: null,
        tracking_number: null,
        shipping_label_refunded_at: new Date().toISOString(),
        status: 'processing',
      });
      setStatus('processing');
    } catch (error: any) {
      setLabelError(error.message || 'Failed to refund shipping label');
    } finally {
      setIsRefundingLabel(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return <div className="text-center py-12 text-gray-400">Order not found</div>;
  }

  return (
    <div>
      <button
        onClick={() => navigate('/admin/orders')}
        className="inline-flex items-center text-gray-400 hover:text-brand-neon mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Orders
      </button>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#0D1B2A]">Order #{order.order_number}</h1>
          <p className="text-gray-400">{formatDateTime(order.created_at)}</p>
        </div>
        <Badge
          variant={
            order.status === 'delivered'
              ? 'success'
              : order.status === 'cancelled'
              ? 'danger'
              : 'info'
          }
          className="text-base px-4 py-1"
        >
          {ORDER_STATUSES[order.status].label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="text-xl font-semibold text-[#0D1B2A] mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-brand-neon" />
              Order Items
            </h2>
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-brand-gray rounded-lg flex items-center justify-center">
                      <Package className="h-6 w-6 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-[#0D1B2A] font-medium">{item.product_name}</p>
                      {item.variant_name && (
                        <p className="text-gray-500 text-sm">{item.variant_name}</p>
                      )}
                      <p className="text-gray-400 text-sm">Qty: {item.quantity}</p>
                      {item.customization_image_url && (
                        <a
                          href={item.customization_image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 flex items-center gap-2 group"
                          title="View full size"
                        >
                          <img
                            src={item.customization_image_url}
                            alt="Customer artwork"
                            className="w-12 h-12 object-contain rounded-lg border border-gray-200 bg-white p-1"
                          />
                          <span className="text-xs text-blue-500 group-hover:underline">View artwork</span>
                        </a>
                      )}
                      {item.product_description && (
                        <p className="text-gray-400 text-xs mt-1 italic">"{item.product_description}"</p>
                      )}
                      {/* Color selection — editable by admin */}
                      {item.product_id && (
                        <div className="mt-2">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Palette className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-xs text-gray-400">Colors</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {(productColors[item.product_id] ?? COLOR_PRESETS.map(c => c.name)).map(colorName => {
                              const hex = COLOR_PRESETS.find(p => p.name === colorName)?.hex ?? '#888';
                              const selected = (itemColors[item.id] ?? []).includes(colorName);
                              return (
                                <button
                                  key={colorName}
                                  type="button"
                                  onClick={() => setItemColors(prev => {
                                    const cur = prev[item.id] ?? [];
                                    return {
                                      ...prev,
                                      [item.id]: selected
                                        ? cur.filter(c => c !== colorName)
                                        : [...cur, colorName],
                                    };
                                  })}
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition-colors ${
                                    selected
                                      ? 'border-brand-neon bg-brand-neon/10 text-brand-neon font-medium'
                                      : 'border-gray-300 text-gray-500 hover:border-brand-neon/50'
                                  }`}
                                >
                                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/20" style={{ backgroundColor: hex }} />
                                  {colorName}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            onClick={() => handleSaveItemColors(item.id)}
                            disabled={savingColorItemId === item.id}
                            className="text-xs px-3 py-1 rounded bg-brand-neon/20 border border-brand-neon/40 text-brand-neon hover:bg-brand-neon/30 transition-colors disabled:opacity-50"
                          >
                            {savingColorItemId === item.id ? 'Saving…' : 'Save Colors'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-brand-neon font-medium">
                    {formatPrice(item.total_price)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Shipping</span>
                <span>{formatPrice(order.shipping_cost)}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Tax</span>
                  <span>{formatPrice(order.tax)}</span>
                </div>
              )}
              {order.discount_amount && order.discount_amount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    Discount{promoCode && <span className="text-xs font-mono bg-green-500/10 px-1.5 py-0.5 rounded">{promoCode}</span>}
                  </span>
                  <span>-{formatPrice(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200">
                <span className="text-[#0D1B2A]">Total</span>
                <span className="text-brand-neon">{formatPrice(order.total)}</span>
              </div>
            </div>
          </Card>

          {/* Shipping Address */}
          <Card>
            <h2 className="text-xl font-semibold text-[#0D1B2A] mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-brand-neon" />
              Shipping Address
            </h2>
            <address className="text-gray-400 not-italic">
              {order.guest_name && <p className="text-[#0D1B2A] font-medium">{order.guest_name}</p>}
              <p>{order.shipping_address.address_line_1}</p>
              {order.shipping_address.address_line_2 && (
                <p>{order.shipping_address.address_line_2}</p>
              )}
              <p>
                {order.shipping_address.city}, {order.shipping_address.state}{' '}
                {order.shipping_address.postal_code}
              </p>
              <p>{order.shipping_address.country}</p>
              {order.guest_email && <p className="mt-2">{order.guest_email}</p>}
              {order.guest_phone && <p>{order.guest_phone}</p>}
            </address>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-semibold text-[#0D1B2A] mb-4">Update Order</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as OrderStatus)}
                  className="w-full px-4 py-2 bg-brand-black border border-brand-gray rounded-lg text-[#0D1B2A] focus:outline-none focus:ring-2 focus:ring-brand-neon"
                >
                  {Object.entries(ORDER_STATUSES).map(([value, { label }]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Tracking Number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
              />

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Order Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Internal notes..."
                  className="w-full px-4 py-2 rounded-lg bg-brand-black border border-brand-gray text-[#0D1B2A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-neon focus:border-transparent resize-none"
                />
              </div>

              <Button onClick={handleSave} className="w-full" isLoading={isSaving}>
                <Save className="h-5 w-5 mr-2" />
                Save Changes
              </Button>
            </div>
          </Card>

          {order.stripe_payment_intent_id && (
            <Card>
              <h2 className="text-xl font-semibold text-[#0D1B2A] mb-4">Payment</h2>
              <p className="text-gray-400 text-sm break-all">
                Stripe Payment ID: {order.stripe_payment_intent_id}
              </p>
            </Card>
          )}

          {/* Shipping Label */}
          {order.shipping_address.address_line_1 !== 'Local Pickup' ? (
            <Card>
              <h2 className="text-xl font-semibold text-[#0D1B2A] mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5 text-brand-neon" />
                Shipping Label
              </h2>

              {labelError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{labelError}</p>
                </div>
              )}

              {refundMessage && (
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-blue-400 text-sm">{refundMessage}</p>
                </div>
              )}

              {labelData ? (
                <div className="space-y-4">
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-green-400 font-medium">Label Generated!</p>
                      <p className="text-gray-400 text-sm mt-1">
                        Tracking: <span className="font-mono text-[#0D1B2A]">{labelData.trackingNumber}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handlePrintLabel}
                      className="flex-1"
                    >
                      <Printer className="h-5 w-5 mr-2" />
                      Print Label
                    </Button>
                    <Button
                      onClick={handleDownloadLabel}
                      className="flex-1"
                      variant="outline"
                    >
                      <Download className="h-5 w-5 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                  <Button
                    onClick={handleGenerateLabel}
                    className="w-full"
                    variant="outline"
                    isLoading={isGeneratingLabel}
                  >
                    <Truck className="h-5 w-5 mr-2" />
                    Generate New Label
                  </Button>
                  {order.shippo_transaction_id && (
                    <Button
                      onClick={handleRefundLabel}
                      className="w-full text-red-400 border-red-500/30 hover:bg-red-500/10"
                      variant="outline"
                      isLoading={isRefundingLabel}
                    >
                      <RotateCcw className="h-5 w-5 mr-2" />
                      Refund Label
                    </Button>
                  )}
                </div>
              ) : order.tracking_number ? (
                <div className="space-y-3">
                  <p className="text-gray-400 text-sm">
                    Tracking: <span className="font-mono text-[#0D1B2A]">{order.tracking_number}</span>
                  </p>
                  <p className="text-gray-500 text-xs">
                    Label was generated previously. Generate a new one if needed.
                  </p>
                  <Button
                    onClick={handleGenerateLabel}
                    className="w-full"
                    variant="outline"
                    isLoading={isGeneratingLabel}
                  >
                    <Truck className="h-5 w-5 mr-2" />
                    Generate New Label
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {order.shipping_label_refunded_at && (
                    <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-start gap-2">
                      <RotateCcw className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-orange-400 font-medium">Label Refunded</p>
                        <p className="text-gray-400 text-sm mt-0.5">
                          Refunded on {formatDateTime(order.shipping_label_refunded_at)}
                        </p>
                      </div>
                    </div>
                  )}
                  <>
                    <p className="text-gray-400 text-sm">
                      {order.shipping_label_refunded_at
                        ? 'Generate a new shipping label if needed.'
                        : 'Generate a shipping label for this order.'}
                    </p>
                    <Button
                      onClick={handleGenerateLabel}
                      className="w-full"
                      isLoading={isGeneratingLabel}
                    >
                      <Truck className="h-5 w-5 mr-2" />
                      Generate Shipping Label
                    </Button>
                  </>
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <h2 className="text-xl font-semibold text-[#0D1B2A] mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5 text-brand-neon" />
                Shipping
              </h2>
              <p className="text-gray-400 text-sm">
                This is a local pickup order - no shipping label needed.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
