import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { getCorsHeaders, getRequestOrigin } from './cors-helper';

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

  try {
    const { subscriptionId } = JSON.parse(event.body || '{}');
    if (!subscriptionId) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'subscriptionId required' }) };
    }

    // Verify the subscription belongs to this user
    const { data: sub, error: fetchError } = await supabase
      .from('customer_subscriptions')
      .select('id, stripe_subscription_id, status')
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !sub) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Subscription not found' }) };
    }
    if (sub.status === 'canceled') {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Subscription already canceled' }) };
    }

    // Cancel in Stripe (at_period_end = true so they keep access until the billing period ends)
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    if (sub.stripe_subscription_id) {
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    }

    // Mark as canceled in DB — must succeed or the customer sees stale active status
    const { error: updateError } = await supabase
      .from('customer_subscriptions')
      .update({ status: 'canceled' })
      .eq('id', subscriptionId);

    if (updateError) {
      console.error('[cancel-subscription] DB update failed after Stripe cancel:', updateError);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Subscription canceled in Stripe but DB update failed. Please contact support.' }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    };
  } catch (error: any) {
    console.error('[cancel-subscription] Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message || 'Failed to cancel subscription' }),
    };
  }
};

export { handler };
