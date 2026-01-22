import type { Handler } from '@netlify/functions';
import { Resend } from 'resend';
import { getCorsHeaders, getRequestOrigin } from './cors-helper';

interface OrderItem {
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface ShippingAddress {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
}

interface OrderConfirmationRequest {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount?: number;
  total: number;
  shippingAddress: ShippingAddress;
}

const formatPrice = (cents: number) => {
  return `$${(cents / 100).toFixed(2)}`;
};

const generateEmailHtml = (order: OrderConfirmationRequest) => {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #2d2d2d;">
        <div style="font-weight: 500; color: #f5f5f5;">${item.product_name}</div>
        ${item.variant_name ? `<div style="font-size: 14px; color: #9ca3af;">${item.variant_name}</div>` : ''}
        <div style="font-size: 14px; color: #9ca3af;">Qty: ${item.quantity}</div>
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #2d2d2d; text-align: right; color: #f5f5f5;">
        ${formatPrice(item.total_price * 100)}
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: #00ff66; font-size: 28px; margin: 0 0 8px 0;">Opossum Works</h1>
      <p style="color: #9ca3af; margin: 0;">Custom 3D Printed Creations</p>
    </div>

    <!-- Success Message -->
    <div style="background-color: #1a1a1a; border-radius: 12px; padding: 32px; margin-bottom: 24px; border: 1px solid #2d2d2d;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="width: 64px; height: 64px; background-color: rgba(34, 197, 94, 0.2); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <span style="color: #22c55e; font-size: 32px;">&#10003;</span>
        </div>
        <h2 style="color: #f5f5f5; font-size: 24px; margin: 0 0 8px 0;">Thank you for your order!</h2>
        <p style="color: #9ca3af; margin: 0;">Hi ${order.customerName}, we've received your order and are getting it ready.</p>
      </div>

      <div style="background-color: #0a0a0a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #9ca3af;">Order Number</span>
          <span style="color: #00ff66; font-weight: 600;">#${order.orderNumber}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #9ca3af;">Order Date</span>
          <span style="color: #f5f5f5;">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      <!-- Order Items -->
      <h3 style="color: #f5f5f5; font-size: 16px; margin: 0 0 16px 0; padding-bottom: 12px; border-bottom: 1px solid #2d2d2d;">Order Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${itemsHtml}
      </table>

      <!-- Totals -->
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #2d2d2d;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #9ca3af;">Subtotal</span>
          <span style="color: #f5f5f5;">${formatPrice(order.subtotal * 100)}</span>
        </div>
        ${order.discount && order.discount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #22c55e;">Discount</span>
          <span style="color: #22c55e;">-${formatPrice(order.discount * 100)}</span>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span style="color: #9ca3af;">Shipping</span>
          <span style="color: #f5f5f5;">${formatPrice(order.shipping * 100)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #2d2d2d;">
          <span style="color: #f5f5f5; font-weight: 600; font-size: 18px;">Total</span>
          <span style="color: #00ff66; font-weight: 600; font-size: 18px;">${formatPrice(order.total * 100)}</span>
        </div>
      </div>
    </div>

    <!-- Shipping Address -->
    <div style="background-color: #1a1a1a; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #2d2d2d;">
      <h3 style="color: #f5f5f5; font-size: 16px; margin: 0 0 12px 0;">Shipping Address</h3>
      <p style="color: #9ca3af; margin: 0; line-height: 1.6;">
        ${order.customerName}<br>
        ${order.shippingAddress.address_line_1}<br>
        ${order.shippingAddress.address_line_2 ? `${order.shippingAddress.address_line_2}<br>` : ''}
        ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postal_code}
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding-top: 24px; border-top: 1px solid #2d2d2d;">
      <p style="color: #9ca3af; font-size: 14px; margin: 0 0 8px 0;">
        Questions about your order? Reply to this email or contact us.
      </p>
      <p style="color: #6b7280; font-size: 12px; margin: 0;">
        &copy; ${new Date().getFullYear()} Opossum Works. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

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

  // Check for Resend API key
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Email service not configured' }),
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const orderData: OrderConfirmationRequest = JSON.parse(event.body || '{}');

    if (!orderData.customerEmail || !orderData.orderId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Opossum Works <orders@resend.dev>',
      to: [orderData.customerEmail],
      subject: `Order Confirmed - #${orderData.orderNumber}`,
      html: generateEmailHtml(orderData),
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error(error.message);
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ success: true, emailId: data?.id }),
    };
  } catch (error: any) {
    console.error('Error sending email:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: error.message || 'Failed to send confirmation email'
      }),
    };
  }
};

export { handler };
