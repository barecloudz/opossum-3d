import { Link, useParams } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';

export default function OrderConfirmation() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 bg-brand-emerald-dark rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="h-10 w-10 text-brand-neon" />
      </div>

      <h1 className="text-3xl font-bold text-white mb-4">Thank you for your order!</h1>

      <p className="text-gray-400 mb-2">
        Your order has been placed successfully.
      </p>
      <p className="text-gray-400 mb-8">
        Order confirmation has been sent to your email.
      </p>

      <div className="bg-brand-charcoal rounded-xl border border-brand-gray p-6 mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Package className="h-5 w-5 text-brand-neon" />
          <span className="text-white font-medium">Order #{id?.slice(0, 8).toUpperCase()}</span>
        </div>
        <p className="text-gray-400 text-sm">
          We'll send you shipping updates via email as your order is processed.
        </p>
      </div>

      <div className="space-y-4">
        <Button as={Link} to="/products" size="lg">
          Continue Shopping <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <div>
          <Link
            to="/account"
            className="text-brand-neon hover:text-brand-emerald transition-colors"
          >
            View order history
          </Link>
        </div>
      </div>
    </div>
  );
}
