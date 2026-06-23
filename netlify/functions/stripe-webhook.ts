import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
    console.error('[stripe-webhook] Missing environment variables');
    return { statusCode: 500, body: 'Server configuration error' };
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify the event came from Stripe
  const sig = event.headers['stripe-signature'];
  if (!sig) {
    return { statusCode: 400, body: 'Missing stripe-signature header' };
  }

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body || '',
      sig,
      webhookSecret
    );
  } catch (err: any) {
    console.error('[stripe-webhook] Signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook signature error: ${err.message}` };
  }

  // Handle payment_intent.succeeded — update order status to processing
  if (stripeEvent.type === 'payment_intent.succeeded') {
    const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata?.orderId;

    if (!orderId || orderId === 'unknown') {
      console.warn('[stripe-webhook] payment_intent.succeeded has no orderId in metadata');
      return { statusCode: 200, body: 'OK (no orderId)' };
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: 'processing' })
      .eq('id', orderId)
      .eq('status', 'pending'); // only update if still pending — don't downgrade

    if (error) {
      console.error('[stripe-webhook] Failed to update order status:', error);
      return { statusCode: 500, body: 'DB update failed' };
    }

    console.log(`[stripe-webhook] Order ${orderId} updated to processing`);
  }

  // Handle payment_intent.payment_failed — log only, order stays pending
  if (stripeEvent.type === 'payment_intent.payment_failed') {
    const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata?.orderId;
    console.log(`[stripe-webhook] Payment failed for order ${orderId}`);
  }

  return { statusCode: 200, body: 'OK' };
};

export { handler };
