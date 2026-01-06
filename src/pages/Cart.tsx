import { Link } from 'react-router-dom';
import { ShoppingBag, Minus, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { formatPrice } from '../lib/utils';
import Button from '../components/ui/Button';
import { DEFAULT_SHIPPING_COST } from '../lib/constants';

export default function Cart() {
  const { items, updateQuantity, removeItem, getSubtotal } = useCartStore();
  const subtotal = getSubtotal();
  const shipping = items.length > 0 ? DEFAULT_SHIPPING_COST : 0;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <ShoppingBag className="h-24 w-24 text-gray-600 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-white mb-4">Your cart is empty</h1>
        <p className="text-gray-400 mb-8">
          Looks like you haven't added any items to your cart yet.
        </p>
        <Button as={Link} to="/products">
          Start Shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link
        to="/products"
        className="inline-flex items-center text-gray-400 hover:text-brand-neon mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Continue Shopping
      </Link>

      <h1 className="text-3xl font-bold text-white mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const itemPrice = item.product.price + (item.variant?.price_adjustment || 0);
            return (
              <div
                key={`${item.product.id}-${item.variant?.id || 'default'}`}
                className="bg-brand-charcoal rounded-xl border border-brand-gray p-4 flex gap-4"
              >
                {/* Image */}
                <div className="w-24 h-24 bg-brand-gray rounded-lg flex-shrink-0 overflow-hidden">
                  {item.product.images?.[0]?.image_url ? (
                    <img
                      src={item.product.images[0].image_url}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="h-8 w-8 text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1">
                  <div className="flex justify-between">
                    <div>
                      <Link
                        to={`/products/${item.product.slug}`}
                        className="text-white font-medium hover:text-brand-neon transition-colors"
                      >
                        {item.product.name}
                      </Link>
                      {item.variant && (
                        <p className="text-gray-400 text-sm">{item.variant.name}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.product.id, item.variant?.id)}
                      className="text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    {/* Quantity controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1, item.variant?.id)
                        }
                        className="p-1 bg-brand-black border border-brand-gray rounded hover:border-brand-neon transition-colors"
                      >
                        <Minus className="h-4 w-4 text-gray-400" />
                      </button>
                      <span className="text-white w-10 text-center">{item.quantity}</span>
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1, item.variant?.id)
                        }
                        className="p-1 bg-brand-black border border-brand-gray rounded hover:border-brand-neon transition-colors"
                      >
                        <Plus className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>

                    {/* Price */}
                    <span className="text-brand-neon font-semibold">
                      {formatPrice(itemPrice * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-brand-charcoal rounded-xl border border-brand-gray p-6 sticky top-24">
            <h2 className="text-xl font-semibold text-white mb-6">Order Summary</h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Shipping</span>
                <span>{formatPrice(shipping)}</span>
              </div>
              <div className="border-t border-brand-gray pt-4 flex justify-between text-lg font-semibold">
                <span className="text-white">Total</span>
                <span className="text-brand-neon">{formatPrice(total)}</span>
              </div>
            </div>

            <Button as={Link} to="/checkout" className="w-full" size="lg">
              Proceed to Checkout
            </Button>

            <p className="text-gray-500 text-sm text-center mt-4">
              Secure checkout powered by Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
