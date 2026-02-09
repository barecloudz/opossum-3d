import { loadStripe } from '@stripe/stripe-js';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.warn('Stripe publishable key not found. Set VITE_STRIPE_PUBLISHABLE_KEY in environment variables.');
}

export const stripePromise = loadStripe(stripePublishableKey || '').then(stripe => {
  if (!stripe) {
    console.error('[Stripe] Failed to initialize Stripe. The publishable key may be invalid or missing.');
  }
  return stripe;
}).catch(err => {
  console.error('[Stripe] Error loading Stripe:', err);
  return null;
});
