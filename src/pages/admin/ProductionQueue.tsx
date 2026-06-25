import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ChevronDown, ChevronRight, Hammer, ExternalLink } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { supabase } from '../../lib/supabase';
import { ORDER_STATUSES, COLOR_PRESETS } from '../../lib/constants';
import type { OrderStatus } from '../../types';

interface OrderRef {
  orderId: string;
  orderNumber: number;
  guestName: string | null;
  status: OrderStatus;
  quantity: number;
  customizationImageUrl: string | null;
  selectedColors: string[] | null;
}

interface ProductionItem {
  key: string;
  productName: string;
  variantName: string | null;
  totalQuantity: number;
  orders: OrderRef[];
}

// Statuses that still need to be made (exclude shipped/delivered/cancelled)
const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'paid', 'processing'];

export default function ProductionQueue() {
  const [items, setItems] = useState<ProductionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  const fetchQueue = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('id, order_number, guest_name, status, order_items(*)')
        .in('status', ACTIVE_STATUSES)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      // Aggregate order_items across all active orders
      const map = new Map<string, ProductionItem>();

      for (const order of data ?? []) {
        for (const item of (order.order_items as any[]) ?? []) {
          const key = `${item.product_name}|||${item.variant_name ?? ''}`;
          if (!map.has(key)) {
            map.set(key, {
              key,
              productName: item.product_name,
              variantName: item.variant_name ?? null,
              totalQuantity: 0,
              orders: [],
            });
          }
          const entry = map.get(key)!;
          entry.totalQuantity += item.quantity;
          entry.orders.push({
            orderId: order.id,
            orderNumber: order.order_number,
            guestName: order.guest_name,
            status: order.status as OrderStatus,
            quantity: item.quantity,
            customizationImageUrl: item.customization_image_url ?? null,
            selectedColors: (item.selected_colors as string[] | null) ?? null,
          });
        }
      }

      // Sort by highest quantity first
      const sorted = Array.from(map.values()).sort(
        (a, b) => b.totalQuantity - a.totalQuantity
      );
      setItems(sorted);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load production queue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const filteredItems =
    statusFilter === 'all'
      ? items
      : items
          .map(item => ({
            ...item,
            orders: item.orders.filter(o => o.status === statusFilter),
          }))
          .filter(item => item.orders.length > 0)
          .map(item => ({
            ...item,
            totalQuantity: item.orders.reduce((sum, o) => sum + o.quantity, 0),
          }));

  const totalToProduce = filteredItems.reduce((sum, i) => sum + i.totalQuantity, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0D1B2A]">Production Queue</h1>
          <p className="text-gray-400 mt-1">
            {isLoading ? 'Loading…' : `${totalToProduce} total items to make across ${filteredItems.length} product${filteredItems.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchQueue} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            statusFilter === 'all'
              ? 'bg-[#1677FF] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-[#0D1B2A]'
          }`}
        >
          All Active
        </button>
        {ACTIVE_STATUSES.map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              statusFilter === status
                ? 'bg-[#1677FF] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-[#0D1B2A]'
            }`}
          >
            {ORDER_STATUSES[status].label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <Button variant="outline" onClick={fetchQueue}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Hammer className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No items in the production queue</p>
            <p className="text-gray-500 text-sm mt-1">All orders are shipped, delivered, or cancelled.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map(item => {
            const isExpanded = expandedKeys.has(item.key);
            return (
              <div
                key={item.key}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden"
              >
                {/* Main row */}
                <button
                  onClick={() => toggleExpand(item.key)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Quantity badge */}
                    <div className="flex-shrink-0 bg-brand-neon/10 border border-brand-neon/30 rounded-xl px-3 py-2 text-center min-w-[56px]">
                      <span className="text-brand-neon font-bold text-xl leading-none block">
                        {item.totalQuantity}
                      </span>
                      <span className="text-brand-neon/70 text-xs">to make</span>
                    </div>

                    {/* Product info */}
                    <div className="min-w-0">
                      <p className="text-[#0D1B2A] font-semibold truncate">{item.productName}</p>
                      {item.variantName && (
                        <p className="text-gray-500 text-sm truncate">{item.variantName}</p>
                      )}
                      <p className="text-gray-400 text-xs mt-0.5">
                        Across {item.orders.length} order{item.orders.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Expand chevron */}
                  <div className="flex-shrink-0 ml-3">
                    {isExpanded
                      ? <ChevronDown className="h-5 w-5 text-gray-400" />
                      : <ChevronRight className="h-5 w-5 text-gray-400" />
                    }
                  </div>
                </button>

                {/* Expanded order list */}
                {isExpanded && (
                  <div className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                    {item.orders.map(o => (
                      <div key={`${o.orderId}-${item.key}`} className="flex items-center gap-3 px-5 py-3">
                        {/* Qty for this order */}
                        <span className="flex-shrink-0 w-8 text-center text-[#0D1B2A] font-bold">
                          ×{o.quantity}
                        </span>

                        {/* Order info */}
                        <div className="flex-1 min-w-0">
                          <span className="text-[#0D1B2A] font-medium">#{o.orderNumber}</span>
                          {o.guestName && (
                            <span className="text-gray-500 text-sm ml-2">{o.guestName}</span>
                          )}
                        </div>

                        {/* Status badge */}
                        <Badge
                          variant={
                            o.status === 'paid' ? 'success'
                            : o.status === 'processing' ? 'info'
                            : 'warning'
                          }
                        >
                          {ORDER_STATUSES[o.status].label}
                        </Badge>

                        {/* Color swatches */}
                        {o.selectedColors && o.selectedColors.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {o.selectedColors.map(entry => {
                              const [colorName, pct] = entry.includes(':') ? entry.split(':') : [entry, null];
                              const hex = COLOR_PRESETS.find(p => p.name === colorName)?.hex ?? '#888';
                              const units = pct && o.quantity > 1 ? Math.round(o.quantity * parseInt(pct) / 100) : null;
                              return (
                                <span key={entry} className="flex items-center gap-1 text-xs bg-brand-gray text-[#0D1B2A] px-2 py-0.5 rounded-full whitespace-nowrap">
                                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: hex }} />
                                  {colorName}{pct ? ` ${pct}%` : ''}{units ? ` (${units})` : ''}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Customization image thumbnail */}
                        {o.customizationImageUrl && (
                          <a
                            href={o.customizationImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="flex-shrink-0"
                          >
                            <img
                              src={o.customizationImageUrl}
                              alt="Custom artwork"
                              className="h-8 w-8 rounded object-cover border border-gray-200 hover:border-brand-neon transition-colors"
                            />
                          </a>
                        )}

                        {/* Link to order */}
                        <Link
                          to={`/admin/orders/${o.orderId}`}
                          onClick={e => e.stopPropagation()}
                          className="flex-shrink-0 text-gray-400 hover:text-brand-neon transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
