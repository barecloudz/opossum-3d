import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders, getRequestOrigin } from './cors-helper';

const INTERVAL_MAP: Record<string, { interval: 'week' | 'month'; interval_count: number }> = {
  weekly:       { interval: 'week',  interval_count: 1 },
  biweekly:     { interval: 'week',  interval_count: 2 },
  monthly:      { interval: 'month', interval_count: 1 },
  every2months: { interval: 'month', interval_count: 2 },
  quarterly:    { interval: 'month', interval_count: 3 },
};

const handler: Handler = async (event) => {
  const origin = getRequestOrigin(event.headers as Record<string, string>);
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeKey || !supabaseUrl || !serviceKey) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Service not configured' }) };
  }

  // Verify user auth
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Authentication required' }) };
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid session' }) };
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

  try {
    const {
      productId,
      variantId,
      interval,
      quantity = 1,
      unitPrice,
      selectedColors,
      productDescription,
      productName,
      productSlug,
    } = JSON.parse(event.body || '{}');

    if (!interval || !INTERVAL_MAP[interval]) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid interval' }) };
    }
    if (!unitPrice || unitPrice < 0.50) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid price' }) };
    }

    const stripeInterval = INTERVAL_MAP[interval];
    const amountCents = Math.round(unitPrice * quantity * 100);

    // Stripe metadata values are limited to 500 characters — truncate to be safe
    const safeDescription = (productDescription || '').slice(0, 490);

    // Get or create Stripe customer
    const existingCustomers = await stripe.customers.list({ email: user.email!, limit: 1 });
    let stripeCustomer = existingCustomers.data[0];
    if (!stripeCustomer) {
      stripeCustomer = await stripe.customers.create({
        email: user.email!,
        metadata: { supabase_user_id: user.id },
      });
    }

    // Create a one-off recurring price
    const price = await stripe.prices.create({
      unit_amount: amountCents,
      currency: 'usd',
      recurring: {
        interval: stripeInterval.interval,
        interval_count: stripeInterval.interval_count,
      },
      product_data: {
        name: productName ? `${productName} — Subscribe & Save` : 'Nexalon Subscription',
      },
    });

    // Build success/cancel URLs
    const siteUrl = origin || 'https://nexaloncreations.com';
    const successUrl = `${siteUrl}/account?tab=subscriptions&subscribed=1`;
    const cancelUrl = productSlug ? `${siteUrl}/products/${productSlug}` : `${siteUrl}/products`;

    // Create Stripe Checkout Session (handles card entry + sends Stripe receipt email)
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id,
      mode: 'subscription',
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        supabase_user_id: user.id,
        product_id: productId || '',
        variant_id: variantId || '',
        interval,
        quantity: String(quantity),
        unit_price: String(unitPrice),
        selected_colors: selectedColors ? JSON.stringify(selectedColors) : '',
        product_description: safeDescription,
      },
    });

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error: any) {
    console.error('[create-subscription] Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message || 'Failed to create subscription' }),
    };
  }
};

export { handler };
