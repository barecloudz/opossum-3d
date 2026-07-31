import { X, ShoppingBag, Minus, Plus, Trash2, ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { formatPrice } from '../../lib/utils';
import { parseColor } from '../../lib/constants';
import Button from '../ui/Button';

export default function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, getSubtotal } = useCartStore();
  const subtotal = getSubtotal();

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[var(--color-surface)] z-50 flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-bold text-theme">Your Cart</h2>
            {items.length > 0 && (
              <span className="bg-[#1677FF] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
          <button
            onClick={closeCart}
            className="p-1.5 text-theme opacity-50 hover:opacity-100 hover:bg-gray-100 rounded-lg transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-20 h-20 bg-[#1677FF]/10 rounded-full flex items-center justify-center mb-5">
                <ShoppingBag className="h-9 w-9 text-[#1677FF]" />
              </div>
              <h3 className="text-[#0D1B2A] font-bold text-lg mb-2">Your cart is empty</h3>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">Looks like you haven't added anything yet. Explore our products and find something you'll love.</p>
              <Button onClick={closeCart} as={Link} to="/products" className="px-8">
                Start Shopping
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const variantAdjustment = item.variant?.price_adjustment || 0;
                const basePrice = item.product.price + variantAdjustment;
                const tiers = [...(item.product.price_tiers || [])].sort((a: any, b: any) => a.min_qty - b.min_qty);
                let tierUnitPrice = item.product.price;
                for (const tier of tiers) {
                  if (item.quantity >= tier.min_qty) tierUnitPrice = tier.price_per_unit;
                }
                const tierPrice = tierUnitPrice + variantAdjustment;
                const lineTotal = tierPrice * item.quantity;
                const isTierApplied = tierPrice < basePrice;
                // Find next tier unlock nudge
                const nextTier = tiers.find((t: any) => t.min_qty > item.quantity);
                const qtyToNextTier = nextTier ? nextTier.min_qty - item.quantity : null;
                return (
                  <li
                    key={`${item.product.id}-${item.variant?.id || 'default'}`}
                    className="flex gap-4 bg-[var(--color-background)] rounded-lg p-3"
                  >
                    {/* Product image placeholder */}
                    <div className="w-24 h-24 bg-[var(--color-border)] rounded-xl flex items-center justify-center flex-shrink-0">
                      {item.product.images?.[0]?.image_url ? (
                        <img
                          src={item.product.images[0].image_url}
                          alt={item.product.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <ShoppingBag className="h-8 w-8 text-theme opacity-40" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-theme font-medium truncate">{item.product.name}</h3>
                      {item.variant && (
                        <p className="text-theme opacity-60 text-sm">{item.variant.name}</p>
                      )}
                      {item.customization_image_url && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <img
                            src={item.customization_image_url}
                            alt="Custom artwork"
                            className="w-7 h-7 rounded object-contain border border-[var(--color-border)] bg-white p-0.5"
                          />
                          <span className="text-theme opacity-50 text-xs flex items-center gap-0.5">
                            <ImageIcon className="h-3 w-3" /> Custom artwork
                          </span>
                        </div>
                      )}
                      {item.selected_colors && item.selected_colors.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {item.selected_colors.map(c => {
                            const { name, hex } = parseColor(c.split(':')[0]);
                            return (
                              <span key={c} className="flex items-center gap-1 text-xs text-theme opacity-60">
                                <span className="w-3 h-3 rounded-full border border-white/30 flex-shrink-0" style={{ backgroundColor: hex }} />
                                {name}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {item.product_description && (
                        <p className="text-theme opacity-50 text-xs mt-1 line-clamp-2 italic">
                          "{item.product_description}"
                        </p>
                      )}
                      <div className="mt-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[var(--color-primary)] font-semibold">
                            {formatPrice(tierPrice)}
                            {item.quantity > 1 && <span className="text-xs font-normal text-theme opacity-50 ml-1">ea</span>}
                          </p>
                          {isTierApplied && (
                            <span className="text-xs text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded">
                              Volume price
                            </span>
                          )}
                        </div>
                        {item.quantity > 1 && (
                          <p className="text-xs text-theme opacity-50">{formatPrice(lineTotal)} total</p>
                        )}
                        {qtyToNextTier && nextTier && (
                          <p className="text-xs text-[var(--color-primary)] opacity-70 mt-0.5">
                            Add {qtyToNextTier} more to unlock {formatPrice(nextTier.price_per_unit)}/ea
                          </p>
                        )}
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, item.quantity - 1, item.variant?.id)
                            }
                            className="p-1 bg-[var(--color-border)] rounded hover:opacity-80 transition-colors"
                          >
                            <Minus className="h-4 w-4 text-theme opacity-60" />
                          </button>
                          <span className="text-theme w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, item.quantity + 1, item.variant?.id)
                            }
                            className="p-1 bg-[var(--color-border)] rounded hover:opacity-80 transition-colors"
                          >
                            <Plus className="h-4 w-4 text-theme opacity-60" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.product.id, item.variant?.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-[var(--color-border)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-theme opacity-60 text-base">Subtotal</span>
              <span className="text-theme font-bold text-xl">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-theme opacity-40 text-xs">Shipping calculated at checkout</p>
            <div className="space-y-2.5">
              <Link
                to="/checkout"
                onClick={closeCart}
                className="flex items-center justify-center w-full py-4 bg-[#1677FF] hover:bg-[#1060d0] text-white font-bold text-base rounded-2xl transition-colors shadow-lg shadow-[#1677FF]/25 btn-press"
              >
                Checkout — {formatPrice(subtotal)}
              </Link>
              <Button
                as={Link}
                to="/cart"
                onClick={closeCart}
                variant="outline"
                className="w-full"
              >
                View Cart
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
