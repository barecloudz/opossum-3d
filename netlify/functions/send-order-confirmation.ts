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
  tax?: number;
  discount?: number;
  total: number;
  shippingAddress: ShippingAddress;
  shippingMethod?: string;
  estimatedDays?: number | null;
}

const formatPrice = (dollars: number) => {
  return `$${dollars.toFixed(2)}`;
};

const generateEmailHtml = (order: OrderConfirmationRequest) => {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 600; color: #111827; font-size: 15px;">${item.product_name}</div>
        ${item.variant_name ? `<div style="font-size: 13px; color: #6b7280; margin-top: 3px;">${item.variant_name}</div>` : ''}
        <div style="font-size: 13px; color: #9ca3af; margin-top: 3px;">Qty: ${item.quantity} &times; ${formatPrice(item.unit_price)}</div>
      </td>
      <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; text-align: right; vertical-align: top; color: #111827; font-weight: 600; font-size: 15px;">
        ${formatPrice(item.total_price)}
      </td>
    </tr>
  `).join('');

  const orderDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - Nexalon Creations</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f0f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="background-color: #f0f0f0; padding: 40px 16px;">
    <div style="max-width: 560px; margin: 0 auto;">

      <!-- Logo Header -->
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #111827; font-size: 28px; margin: 0; letter-spacing: 2px; font-weight: 800;">NEXALON CREATIONS</h1>
        <div style="width: 60px; height: 2px; background-color: #a3a3a3; margin: 10px auto 0;"></div>
      </div>

      <!-- Main Card -->
      <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04);">

        <!-- Success Banner -->
        <div style="background: linear-gradient(135deg, #18181b 0%, #27272a 50%, #18181b 100%); padding: 36px 24px; text-align: center;">
          <div style="width: 52px; height: 52px; background-color: rgba(255,255,255,0.12); border-radius: 50%; margin: 0 auto 16px; line-height: 52px;">
            <span style="color: #ffffff; font-size: 26px;">&#10003;</span>
          </div>
          <h2 style="color: #ffffff; font-size: 22px; margin: 0 0 6px 0; font-weight: 700;">Order Confirmed</h2>
          <p style="color: #a1a1aa; margin: 0; font-size: 15px;">Hi ${order.customerName}, thank you for your purchase.</p>
        </div>

        <!-- Order Info Bar -->
        <div style="padding: 18px 24px; background-color: #fafafa; border-bottom: 1px solid #e5e7eb;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 3px 0;">
                <span style="color: #71717a; font-size: 13px;">Order Number</span>
              </td>
              <td style="padding: 3px 0; text-align: right;">
                <span style="color: #18181b; font-weight: 700; font-size: 14px; letter-spacing: 0.5px;">#${order.orderNumber}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 3px 0;">
                <span style="color: #71717a; font-size: 13px;">Order Date</span>
              </td>
              <td style="padding: 3px 0; text-align: right;">
                <span style="color: #3f3f46; font-size: 13px;">${orderDate}</span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Items Section -->
        <div style="padding: 24px 0 0;">
          <h3 style="color: #71717a; font-size: 11px; margin: 0 0 0 24px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Items Ordered</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
            ${itemsHtml}
          </table>

          <!-- Price Breakdown -->
          <div style="padding: 20px 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 5px 0; color: #71717a; font-size: 14px;">Subtotal</td>
                <td style="padding: 5px 0; color: #3f3f46; font-size: 14px; text-align: right;">${formatPrice(order.subtotal)}</td>
              </tr>
              ${order.discount && order.discount > 0 ? `
              <tr>
                <td style="padding: 5px 0; color: #16a34a; font-size: 14px;">Discount</td>
                <td style="padding: 5px 0; color: #16a34a; font-size: 14px; text-align: right;">-${formatPrice(order.discount)}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 5px 0; color: #71717a; font-size: 14px;">
                  Shipping${order.shippingMethod ? ` <span style="color: #a1a1aa;">&middot;</span> ${order.shippingMethod}` : ''}
                </td>
                <td style="padding: 5px 0; color: #3f3f46; font-size: 14px; text-align: right;">${formatPrice(order.shipping)}</td>
              </tr>
              ${order.tax && order.tax > 0 ? `
              <tr>
                <td style="padding: 5px 0; color: #71717a; font-size: 14px;">Tax</td>
                <td style="padding: 5px 0; color: #3f3f46; font-size: 14px; text-align: right;">${formatPrice(order.tax)}</td>
              </tr>
              ` : ''}
            </table>

            <!-- Total -->
            <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #18181b;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; color: #18181b; font-size: 18px; font-weight: 700;">Total Paid</td>
                  <td style="padding: 4px 0; color: #18181b; font-size: 20px; font-weight: 800; text-align: right;">${formatPrice(order.total)}</td>
                </tr>
              </table>
            </div>
          </div>
        </div>

        <!-- Divider -->
        <div style="padding: 24px 24px 0;">
          <div style="height: 1px; background-color: #e5e7eb;"></div>
        </div>

        <!-- Shipping Address Section -->
        <div style="padding: 20px 24px;">
          <h3 style="color: #71717a; font-size: 11px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Shipping To</h3>
          <p style="color: #3f3f46; margin: 0; line-height: 1.7; font-size: 14px;">
            <strong style="color: #18181b;">${order.customerName}</strong><br>
            ${order.shippingAddress.address_line_1}<br>
            ${order.shippingAddress.address_line_2 ? `${order.shippingAddress.address_line_2}<br>` : ''}
            ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postal_code}
          </p>
        </div>

        <!-- What Happens Next -->
        <div style="padding: 0 24px 28px;">
          <div style="background-color: #fafafa; border-radius: 10px; padding: 20px; border: 1px solid #e5e7eb;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="vertical-align: top; padding-right: 14px; width: 28px;">
                  <span style="font-size: 20px;">&#128230;</span>
                </td>
                <td style="vertical-align: top;">
                  <p style="color: #18181b; font-weight: 600; margin: 0 0 6px 0; font-size: 14px;">What happens next?</p>
                  <p style="color: #71717a; margin: 0; font-size: 13px; line-height: 1.7;">
                    We're preparing your order now. Once we ship it, you'll receive another email with your tracking number so you can follow your package every step of the way.
                    ${order.estimatedDays ? `<br><br><strong style="color: #3f3f46;">Estimated delivery:</strong> ${order.estimatedDays} business day${order.estimatedDays !== 1 ? 's' : ''} after shipping.` : ''}
                  </p>
                </td>
              </tr>
            </table>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding-top: 28px;">
        <p style="color: #a1a1aa; font-size: 13px; margin: 0 0 6px 0;">
          Questions about your order? Just reply to this email.
        </p>
        <p style="color: #d4d4d8; font-size: 11px; margin: 0; letter-spacing: 0.5px;">
          &copy; ${new Date().getFullYear()} NEXALON CREATIONS
        </p>
      </div>

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
      from: process.env.RESEND_FROM_EMAIL || 'Nexalon Creations <orders@resend.dev>',
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
