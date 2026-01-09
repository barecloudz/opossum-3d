import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';

interface PaymentIntentRequest {
  amount: number; // in cents
  orderId: string;
  customerEmail: string;
}

const handler: Handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Check for Stripe secret key
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY not configured');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Payment service not configured' }),
    };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });

  try {
    const { amount, orderId, customerEmail }: PaymentIntentRequest = JSON.parse(event.body || '{}');

    if (!amount || amount < 50) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid amount - minimum is $0.50' }),
      };
    }

    // Create a PaymentIntent
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
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
      }),
    };
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || 'Failed to create payment intent'
      }),
    };
  }
};

export { handler };
