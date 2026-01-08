import { loadStripe } from '@stripe/stripe-js';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.warn('Stripe publishable key not found. Set VITE_STRIPE_PUBLISHABLE_KEY in environment variables.');
}

export const stripePromise = loadStripe(stripePublishableKey || '');
