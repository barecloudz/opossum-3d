import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { getUSPSAccessToken, getUSPSBaseUrl } from './usps-auth';

// Origin address (same as create-shipping-label.ts)
const FROM_ADDRESS = {
  firstName: 'Opossum',
  lastName: 'Works',
  streetAddress: '32 HICKEY RD',
  city: 'MARIETTA',
  state: 'SC',
  ZIPCode: '29661',
  ZIPPlus4: '9340',
};

const handler: Handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[auto-label] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { orderId } = JSON.parse(event.body || '{}');

    if (!orderId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing orderId' }),
      };
    }

    console.log(`[auto-label] Starting label generation for order ${orderId}`);

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[auto-label] Order not found:', orderError);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Order not found' }),
      };
    }

    // Skip if local pickup
    if (order.shipping_address?.address_line_1 === 'Local Pickup') {
      console.log('[auto-label] Skipping local pickup order');
      return {
        statusCode: 200,
        body: JSON.stringify({ skipped: true, reason: 'Local pickup order' }),
      };
    }

    // Skip if label already generated
    if (order.shipping_label_pdf) {
      console.log('[auto-label] Label already exists for this order');
      return {
        statusCode: 200,
        body: JSON.stringify({ skipped: true, reason: 'Label already generated' }),
      };
    }

    // Fetch order items
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('[auto-label] Failed to fetch order items:', itemsError);
      throw new Error('Failed to fetch order items');
    }

    // Calculate total weight from product weights
    const productIds = (orderItems || []).map(item => item.product_id).filter(Boolean);
    let totalWeightOz = (orderItems || []).reduce((acc, item) => acc + (item.quantity * 8), 0); // Default 8oz per item

    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from('products')
        .select('id, weight_oz')
        .in('id', productIds);

      if (products && products.length > 0) {
        const weightMap = new Map(products.map(p => [p.id, p.weight_oz || 8]));
        totalWeightOz = (orderItems || []).reduce((total, item) => {
          const weight = item.product_id ? (weightMap.get(item.product_id) || 8) : 8;
          return total + (weight * item.quantity);
        }, 0);
      }
    }

    // Parse customer name
    const fullName = order.guest_name || '';
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || firstName;

    // Parse ZIP code
    const zipParts = (order.shipping_address.postal_code || '').replace(/\D/g, '');
    const destZip = zipParts.slice(0, 5);
    const destZipPlus4 = zipParts.slice(5, 9) || undefined;

    // Convert weight from oz to pounds
    const weightLbs = Math.max(0.1, totalWeightOz / 16);

    // Get USPS access token and create label
    const accessToken = await getUSPSAccessToken();
    const baseUrl = getUSPSBaseUrl();

    console.log(`[auto-label] Creating USPS label:`, {
      to: `${firstName} ${lastName}`,
      destination: `${order.shipping_address.city}, ${order.shipping_address.state} ${destZip}`,
      weight: weightLbs,
    });

    const labelResponse = await fetch(`${baseUrl}/labels/v3/label`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageInfo: {
          imageType: 'PDF',
          labelType: '4X6LABEL',
        },
        toAddress: {
          firstName: firstName.toUpperCase(),
          lastName: lastName.toUpperCase(),
          streetAddress: order.shipping_address.address_line_1.toUpperCase(),
          secondaryAddress: order.shipping_address.address_line_2?.toUpperCase(),
          city: order.shipping_address.city.toUpperCase(),
          state: order.shipping_address.state.toUpperCase(),
          ZIPCode: destZip,
          ZIPPlus4: destZipPlus4,
        },
        fromAddress: FROM_ADDRESS,
        packageDescription: {
          weight: weightLbs,
          length: 12,
          width: 8,
          height: 6,
          mailClass: 'PRIORITY_MAIL',
          processingCategory: 'MACHINABLE',
          rateIndicator: 'DR',
          destinationEntryFacilityType: 'NONE',
          priceType: 'RETAIL',
        },
        customsInfo: null,
      }),
    });

    if (!labelResponse.ok) {
      const errorText = await labelResponse.text();
      console.error('[auto-label] USPS Labels API error:', labelResponse.status, errorText);
      let errorMessage = 'Failed to create shipping label';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch {
        // Use default error message
      }
      throw new Error(errorMessage);
    }

    const labelData = await labelResponse.json();
    const trackingNumber = labelData.trackingNumber;
    const labelPdf = labelData.labelImage; // Base64 encoded PDF

    console.log(`[auto-label] Label created, tracking: ${trackingNumber}`);

    // Update the order with label data, tracking number, and status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        tracking_number: trackingNumber,
        shipping_label_pdf: labelPdf,
        shipping_label_generated_at: new Date().toISOString(),
        status: 'shipped',
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('[auto-label] Failed to update order:', updateError);
      throw new Error('Failed to save label data to order');
    }

    console.log(`[auto-label] Order updated with tracking and label`);

    // Send shipping confirmation email via Resend (inline, not through another function)
    const customerEmail = order.guest_email;
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'Opossum Works <orders@resend.dev>';

    if (customerEmail && resendApiKey) {
      try {
        const trackingUrl = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Order Has Shipped!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: #00ff66; font-size: 28px; margin: 0 0 8px 0;">Opossum Works</h1>
      <p style="color: #9ca3af; margin: 0;">Custom 3D Printed Creations</p>
    </div>
    <div style="background-color: #1a1a1a; border-radius: 12px; padding: 32px; margin-bottom: 24px; border: 1px solid #2d2d2d;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="width: 64px; height: 64px; background-color: rgba(59, 130, 246, 0.2); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <span style="color: #3b82f6; font-size: 32px;">&#128230;</span>
        </div>
        <h2 style="color: #f5f5f5; font-size: 24px; margin: 0 0 8px 0;">Your order is on its way!</h2>
        <p style="color: #9ca3af; margin: 0;">Hi ${fullName || 'there'}, great news! Your order has shipped via USPS Priority Mail.</p>
      </div>
      <div style="background-color: #0a0a0a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #9ca3af;">Order Number</span>
          <span style="color: #00ff66; font-weight: 600;">#${order.order_number}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #9ca3af;">Tracking Number</span>
          <span style="color: #f5f5f5; font-family: monospace;">${trackingNumber}</span>
        </div>
      </div>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${trackingUrl}" style="display: inline-block; background-color: #00ff66; color: #0a0a0a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Track Your Package
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 0;">
        You can also track your package at <a href="https://www.usps.com/track" style="color: #00ff66;">usps.com/track</a>
      </p>
    </div>
    <div style="background-color: #1a1a1a; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #2d2d2d;">
      <h3 style="color: #f5f5f5; font-size: 16px; margin: 0 0 12px 0;">Shipping To</h3>
      <p style="color: #9ca3af; margin: 0; line-height: 1.6;">
        ${fullName}<br>
        ${order.shipping_address.address_line_1}<br>
        ${order.shipping_address.address_line_2 ? `${order.shipping_address.address_line_2}<br>` : ''}
        ${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.postal_code}
      </p>
    </div>
    <div style="text-align: center; padding-top: 24px; border-top: 1px solid #2d2d2d;">
      <p style="color: #9ca3af; font-size: 14px; margin: 0 0 8px 0;">
        Questions about your shipment? Reply to this email or contact us.
      </p>
      <p style="color: #6b7280; font-size: 12px; margin: 0;">
        &copy; ${new Date().getFullYear()} Opossum Works. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: resendFromEmail,
            to: [customerEmail],
            subject: `Your Order #${order.order_number} Has Shipped!`,
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          console.log('[auto-label] Shipping confirmation email sent');
        } else {
          const emailErr = await emailResponse.text();
          console.error('[auto-label] Email send failed:', emailErr);
        }
      } catch (emailError) {
        console.error('[auto-label] Failed to send shipping email:', emailError);
        // Don't throw - label was generated successfully
      }
    } else {
      console.log('[auto-label] Skipping email - no customer email or Resend API key');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        trackingNumber,
        message: 'Shipping label generated and order updated',
      }),
    };

  } catch (error: any) {
    console.error('[auto-label] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || 'Failed to auto-generate shipping label',
      }),
    };
  }
};

export { handler };
