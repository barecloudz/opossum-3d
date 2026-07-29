import { X, ShoppingBag, Minus, Plus, Trash2, ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { formatPrice } from '../../lib/utils';
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
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="h-5 w-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-semibold text-theme">Your Cart</h2>
          </div>
          <button
            onClick={closeCart}
            className="text-theme opacity-60 hover:opacity-100 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="h-16 w-16 text-theme opacity-40 mb-4" />
              <p className="text-theme opacity-60 mb-4">Your cart is empty</p>
              <Button onClick={closeCart} as={Link} to="/products">
                Start Shopping
              </Button>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const basePrice = item.product.price + (item.variant?.price_adjustment || 0);
                const tiers = [...(item.product.price_tiers || [])].sort((a: any, b: any) => a.min_qty - b.min_qty);
                let tierPrice = basePrice;
                for (const tier of tiers) {
                  if (item.quantity >= tier.min_qty) tierPrice = tier.price_per_unit;
                }
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
                    <div className="w-20 h-20 bg-[var(--color-border)] rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.product.images?.[0]?.image_url ? (
                        <img
                          src={item.product.images[0].image_url}
                          alt={item.product.name}
                          className="w-full h-full object-cover rounded-lg"
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
                            const preset = [
                              { name: 'Black', hex: '#1a1a1a' }, { name: 'White', hex: '#ffffff' },
                              { name: 'Red', hex: '#ef4444' }, { name: 'Blue', hex: '#3b82f6' },
                              { name: 'Green', hex: '#22c55e' }, { name: 'Yellow', hex: '#eab308' },
                              { name: 'Purple', hex: '#a855f7' }, { name: 'Orange', hex: '#f97316' },
                              { name: 'Pink', hex: '#ec4899' }, { name: 'Gold', hex: '#d4af37' },
                              { name: 'Silver', hex: '#c0c0c0' }, { name: 'Wood Brown', hex: '#8B4513' },
                            ].find(p => p.name === c);
                            return (
                              <span key={c} className="flex items-center gap-1 text-xs text-theme opacity-60">
                                <span className="w-3 h-3 rounded-full border border-white/30 flex-shrink-0" style={{ backgroundColor: preset?.hex ?? '#ccc' }} />
                                {c}
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
          <div className="p-4 border-t border-[var(--color-border)] space-y-4">
            <div className="flex items-center justify-between text-lg">
              <span className="text-theme opacity-60">Subtotal</span>
              <span className="text-theme font-semibold">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-theme opacity-50 text-sm">Shipping calculated at checkout</p>
            <div className="space-y-2">
              <Button
                as={Link}
                to="/checkout"
                onClick={closeCart}
                className="w-full"
              >
                Checkout
              </Button>
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
