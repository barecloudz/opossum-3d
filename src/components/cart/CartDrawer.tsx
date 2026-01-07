import { X, ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react';
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
                const itemPrice = item.product.price + (item.variant?.price_adjustment || 0);
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
                      <p className="text-[var(--color-primary)] font-semibold mt-1">
                        {formatPrice(itemPrice)}
                      </p>

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
