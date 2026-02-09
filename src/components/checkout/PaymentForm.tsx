import { useState, useEffect } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { AlertCircle } from 'lucide-react';
import Button from '../ui/Button';

interface PaymentFormProps {
  onSuccess: () => void;
  onError: (message: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

export default function PaymentForm({
  onSuccess,
  onError,
  isProcessing,
  setIsProcessing,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Timeout: if Stripe Elements hasn't loaded after 15 seconds, show error
  useEffect(() => {
    if (isReady) return;

    const timeout = setTimeout(() => {
      if (!isReady) {
        setLoadError(
          'Payment form is taking too long to load. Please check your internet connection and refresh the page.'
        );
      }
    }, 15000);

    return () => clearTimeout(timeout);
  }, [isReady]);

  // Detect if stripe itself failed to initialize
  useEffect(() => {
    if (!stripe && elements) {
      setLoadError('Payment system failed to initialize. Please refresh the page and try again.');
    }
  }, [stripe, elements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order-confirmation`,
      },
      redirect: 'if_required',
    });

    if (error) {
      if (error.type === 'card_error' || error.type === 'validation_error') {
        onError(error.message || 'Payment failed');
      } else {
        onError('An unexpected error occurred');
      }
      setIsProcessing(false);
    } else {
      onSuccess();
    }
  };

  if (loadError) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-red-400 font-medium">Payment Loading Error</p>
          <p className="text-gray-400 text-sm mt-1">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-[var(--color-primary)] text-sm hover:underline mt-2"
          >
            Refresh page
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {!isReady && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--color-primary)] border-t-transparent mr-3" />
          <span className="text-gray-400 text-sm">Loading payment form...</span>
        </div>
      )}
      <div className={!isReady ? 'opacity-0 h-0 overflow-hidden' : ''}>
        <PaymentElement
          onReady={() => setIsReady(true)}
          onLoadError={(event) => {
            console.error('[PaymentForm] Element load error:', event.error);
            setLoadError(event.error?.message || 'Failed to load payment form. Please refresh and try again.');
          }}
          options={{
            layout: 'tabs',
          }}
        />
      </div>
      <Button
        type="submit"
        className="w-full mt-6"
        size="lg"
        isLoading={isProcessing}
        disabled={!stripe || !elements || !isReady || isProcessing}
      >
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </Button>
    </form>
  );
}
