import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

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

  // Handle charge.refunded — record refund amount on the order
  if (stripeEvent.type === 'charge.refunded') {
    const charge = stripeEvent.data.object as Stripe.Charge;
    const amountRefunded = charge.amount_refunded / 100; // convert cents to dollars
    const paymentIntentId = typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;

    if (!paymentIntentId) {
      console.warn('[stripe-webhook] charge.refunded has no payment_intent');
      return { statusCode: 200, body: 'OK (no payment_intent)' };
    }

    // Match order by stripe_payment_intent_id, fall back to stripe_charge_id
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number')
      .or(`stripe_payment_intent_id.eq.${paymentIntentId},stripe_charge_id.eq.${charge.id}`)
      .limit(1);

    if (!orders || orders.length === 0) {
      console.warn(`[stripe-webhook] No order found for payment_intent ${paymentIntentId}`);
      return { statusCode: 200, body: 'OK (order not found)' };
    }

    const order = orders[0];
    const { error } = await supabase
      .from('orders')
      .update({ refund_amount: amountRefunded })
      .eq('id', order.id);

    if (error) {
      console.error('[stripe-webhook] Failed to update refund_amount:', error);
      return { statusCode: 500, body: 'DB update failed' };
    }

    console.log(`[stripe-webhook] Order #${order.order_number} refund_amount set to $${amountRefunded}`);
  }

  // Handle subscription renewals — update next_billing_date
  if (stripeEvent.type === 'invoice.payment_succeeded') {
    const invoice = stripeEvent.data.object as Stripe.Invoice;
    const subscriptionId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

    if (subscriptionId) {
      // Get next billing date from Stripe subscription
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const nextBilling = new Date(sub.current_period_end * 1000).toISOString();

      await supabase
        .from('customer_subscriptions')
        .update({ status: 'active', next_billing_date: nextBilling })
        .eq('stripe_subscription_id', subscriptionId);

      console.log(`[stripe-webhook] Subscription ${subscriptionId} renewed, next billing: ${nextBilling}`);
    }
  }

  // Handle subscription payment failure
  if (stripeEvent.type === 'invoice.payment_failed') {
    const invoice = stripeEvent.data.object as Stripe.Invoice;
    const subscriptionId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

    if (subscriptionId) {
      await supabase
        .from('customer_subscriptions')
        .update({ status: 'past_due' })
        .eq('stripe_subscription_id', subscriptionId);

      console.log(`[stripe-webhook] Subscription ${subscriptionId} payment failed — marked past_due`);
    }
  }

  // Handle subscription cancellation
  if (stripeEvent.type === 'customer.subscription.deleted') {
    const sub = stripeEvent.data.object as Stripe.Subscription;
    await supabase
      .from('customer_subscriptions')
      .update({ status: 'canceled' })
      .eq('stripe_subscription_id', sub.id);

    console.log(`[stripe-webhook] Subscription ${sub.id} canceled`);
  }

  // Handle Stripe Checkout completion for subscriptions — store in DB + send confirmation email
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as Stripe.Checkout.Session;
    if (session.mode !== 'subscription') {
      return { statusCode: 200, body: 'OK' };
    }

    const meta = session.metadata || {};
    const userId = meta.supabase_user_id;
    const stripeSubscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

    if (!userId || !stripeSubscriptionId) {
      console.warn('[stripe-webhook] checkout.session.completed missing userId or subscriptionId');
      return { statusCode: 200, body: 'OK' };
    }

    // Get next billing date from Stripe subscription
    const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    const nextBilling = new Date(stripeSub.current_period_end * 1000).toISOString();

    // Parse metadata
    const interval = meta.interval || 'monthly';
    const quantity = parseInt(meta.quantity || '1', 10);
    const unitPrice = parseFloat(meta.unit_price || '0');
    const selectedColors = meta.selected_colors ? JSON.parse(meta.selected_colors) : null;
    const productDescription = meta.product_description || null;

    // Store subscription in DB — use upsert so duplicate webhook deliveries are handled gracefully
    const { error: dbError } = await supabase.from('customer_subscriptions').upsert({
      user_id: userId,
      product_id: meta.product_id || null,
      variant_id: meta.variant_id || null,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      interval,
      status: 'active',
      next_billing_date: nextBilling,
      selected_colors: selectedColors,
      product_description: productDescription,
      quantity,
      unit_price: unitPrice,
    }, { onConflict: 'stripe_subscription_id' });

    if (dbError) {
      console.error('[stripe-webhook] Failed to upsert customer_subscription:', dbError);
      // Return 500 so Stripe retries delivery — do NOT return 200 or the subscription
      // will be live in Stripe with no record in our DB and the customer can't see or cancel it.
      return { statusCode: 500, body: 'DB error — will retry' };
    }

    console.log(`[stripe-webhook] Subscription ${stripeSubscriptionId} stored for user ${userId}`);

    // Send branded confirmation email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Nexalon Creations <orders@resend.dev>';
    if (resendKey && session.customer_details?.email) {
      const resend = new Resend(resendKey);
      const intervalLabels: Record<string, string> = {
        weekly: 'every week',
        biweekly: 'every 2 weeks',
        monthly: 'every month',
        every2months: 'every 2 months',
        quarterly: 'every 3 months',
      };
      const customerName = session.customer_details.name || 'there';
      const nextDate = new Date(nextBilling).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const totalPrice = `$${(unitPrice * quantity).toFixed(2)}`;

      await resend.emails.send({
        from: fromEmail,
        to: [session.customer_details.email],
        subject: 'Your Nexalon Subscription is Active',
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="background:#f0f0f0;padding:40px 16px;">
    <div style="max-width:560px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="color:#111827;font-size:28px;margin:0;letter-spacing:2px;font-weight:800;">NEXALON CREATIONS</h1>
        <div style="width:60px;height:2px;background:#a3a3a3;margin:10px auto 0;"></div>
      </div>
      <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#18181b 0%,#27272a 50%,#18181b 100%);padding:36px 24px;text-align:center;">
          <div style="width:52px;height:52px;background:rgba(255,255,255,0.12);border-radius:50%;margin:0 auto 16px;line-height:52px;">
            <span style="color:#fff;font-size:26px;">&#10227;</span>
          </div>
          <h2 style="color:#fff;font-size:22px;margin:0 0 6px;font-weight:700;">Subscription Confirmed</h2>
          <p style="color:#a1a1aa;margin:0;font-size:15px;">Hi ${customerName}, your subscription is now active!</p>
        </div>
        <div style="padding:28px 24px;">
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <tr>
              <td style="padding:8px 0;color:#71717a;font-size:14px;">Billing frequency</td>
              <td style="padding:8px 0;color:#18181b;font-weight:600;font-size:14px;text-align:right;">${intervalLabels[interval] ?? interval}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#71717a;font-size:14px;">Amount per cycle</td>
              <td style="padding:8px 0;color:#18181b;font-weight:600;font-size:14px;text-align:right;">${totalPrice}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#71717a;font-size:14px;">Next billing date</td>
              <td style="padding:8px 0;color:#18181b;font-weight:600;font-size:14px;text-align:right;">${nextDate}</td>
            </tr>
          </table>
          <div style="background:#fafafa;border-radius:10px;padding:16px 20px;border:1px solid #e5e7eb;">
            <p style="color:#18181b;font-weight:600;margin:0 0 6px;font-size:14px;">Need to cancel?</p>
            <p style="color:#71717a;margin:0;font-size:13px;line-height:1.7;">
              You can cancel anytime from your <strong>Account → Subscriptions</strong> tab. Cancellations take effect after the current billing period ends.
            </p>
          </div>
        </div>
      </div>
      <div style="text-align:center;padding-top:28px;">
        <p style="color:#a1a1aa;font-size:13px;margin:0 0 6px;">Questions? Just reply to this email.</p>
        <p style="color:#d4d4d8;font-size:11px;margin:0;letter-spacing:0.5px;">&copy; ${new Date().getFullYear()} NEXALON CREATIONS</p>
      </div>
    </div>
  </div>
</body>
</html>`,
      });
      console.log(`[stripe-webhook] Subscription confirmation email sent to ${session.customer_details.email}`);
    }
  }

  return { statusCode: 200, body: 'OK' };
};

export { handler };
