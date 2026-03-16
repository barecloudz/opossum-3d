import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { getShippoClient } from './shippo-client';
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

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { orderId } = JSON.parse(event.body || '{}');

    if (!orderId) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing orderId' }) };
    }

    // Fetch order to get the Shippo transaction ID
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, shippo_transaction_id, tracking_number')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Order not found' }) };
    }

    if (!order.shippo_transaction_id) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'No Shippo transaction ID found for this order. Labels generated before this feature was added cannot be refunded from here.' }) };
    }

    const shippo = getShippoClient();

    console.log(`[refund-label] Requesting refund for order ${order.order_number}, transaction: ${order.shippo_transaction_id}`);

    const refund = await shippo.refunds.create({
      transaction: order.shippo_transaction_id,
      async: false,
    });

    console.log(`[refund-label] Refund status: ${refund.status}`);

    if (refund.status === 'ERROR') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Refund rejected - the label may have already been used or scanned by the carrier.' }),
      };
    }

    // Clear label data from order and record refund timestamp
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        shipping_label_pdf: null,
        shipping_label_generated_at: null,
        shippo_transaction_id: null,
        tracking_number: null,
        shipping_label_refunded_at: new Date().toISOString(),
        status: 'processing',
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('[refund-label] Failed to update order:', updateError);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        refundStatus: refund.status,
        message: refund.status === 'SUCCESS'
          ? 'Label refunded successfully. Credit will appear on your next Shippo invoice.'
          : 'Refund is being processed. It may take up to 14 business days.',
      }),
    };
  } catch (error: any) {
    console.error('[refund-label] Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message || 'Failed to refund shipping label' }),
    };
  }
};

export { handler };
