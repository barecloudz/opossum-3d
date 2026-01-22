import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { getCorsHeaders, getRequestOrigin } from './cors-helper';

interface PaymentIntentRequest {
  amount: number; // in cents
  orderId: string;
  customerEmail: string;
}

// Timeout for Stripe API calls (15 seconds)
const STRIPE_TIMEOUT_MS = 15000;

const handler: Handler = async (event) => {
  const origin = getRequestOrigin(event.headers as Record<string, string>);
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Check for Stripe secret key
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY not configured');
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Payment service not configured' }),
    };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
    timeout: STRIPE_TIMEOUT_MS,
  });

  try {
    const { amount, orderId, customerEmail }: PaymentIntentRequest = JSON.parse(event.body || '{}');

    if (!amount || amount < 50) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid amount - minimum is $0.50' }),
      };
    }

    // Create a PaymentIntent with timeout
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: orderId || 'unknown',
      },
      receipt_email: customerEmail || undefined,
    });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
      }),
    };
  } catch (error: any) {
    console.error('Error creating payment intent:', error);

    // Check for timeout error
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return {
        statusCode: 504,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Payment service timed out. Please try again.',
        }),
      };
    }

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: error.message || 'Failed to create payment intent',
      }),
    };
  }
};

export { handler };
