import type { Handler } from '@netlify/functions';
import { Resend } from 'resend';
import { getCorsHeaders, getRequestOrigin } from './cors-helper';

interface ShippingAddress {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
}

interface ShippingConfirmationRequest {
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  trackingNumber: string;
  shippingAddress: ShippingAddress;
}

const generateEmailHtml = (data: ShippingConfirmationRequest) => {
  const trackingUrl = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${data.trackingNumber}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Order Has Shipped!</title>
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

        <!-- Shipped Banner -->
        <div style="background: linear-gradient(135deg, #18181b 0%, #27272a 50%, #18181b 100%); padding: 36px 24px; text-align: center;">
          <div style="width: 52px; height: 52px; background-color: rgba(255,255,255,0.12); border-radius: 50%; margin: 0 auto 16px; line-height: 52px;">
            <span style="color: #ffffff; font-size: 24px;">&#128230;</span>
          </div>
          <h2 style="color: #ffffff; font-size: 22px; margin: 0 0 6px 0; font-weight: 700;">Your Order Has Shipped</h2>
          <p style="color: #a1a1aa; margin: 0; font-size: 15px;">Hi ${data.customerName}, great news! Your order is on its way.</p>
        </div>

        <!-- Order & Tracking Info -->
        <div style="padding: 18px 24px; background-color: #fafafa; border-bottom: 1px solid #e5e7eb;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 3px 0;">
                <span style="color: #71717a; font-size: 13px;">Order Number</span>
              </td>
              <td style="padding: 3px 0; text-align: right;">
                <span style="color: #18181b; font-weight: 700; font-size: 14px; letter-spacing: 0.5px;">#${data.orderNumber}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 3px 0;">
                <span style="color: #71717a; font-size: 13px;">Tracking Number</span>
              </td>
              <td style="padding: 3px 0; text-align: right;">
                <span style="color: #18181b; font-weight: 600; font-size: 13px; font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;">${data.trackingNumber}</span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Track Button -->
        <div style="padding: 28px 24px; text-align: center;">
          <a href="${trackingUrl}" style="display: inline-block; background-color: #18181b; color: #ffffff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; letter-spacing: 0.3px;">
            Track Your Package
          </a>
          <p style="color: #a1a1aa; font-size: 13px; margin: 14px 0 0 0;">
            or visit <a href="https://www.usps.com/track" style="color: #18181b; font-weight: 500;">usps.com/track</a>
          </p>
        </div>

        <!-- Divider -->
        <div style="padding: 0 24px;">
          <div style="height: 1px; background-color: #e5e7eb;"></div>
        </div>

        <!-- Shipping Address -->
        <div style="padding: 20px 24px 28px;">
          <h3 style="color: #71717a; font-size: 11px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Delivering To</h3>
          <p style="color: #3f3f46; margin: 0; line-height: 1.7; font-size: 14px;">
            <strong style="color: #18181b;">${data.customerName}</strong><br>
            ${data.shippingAddress.address_line_1}<br>
            ${data.shippingAddress.address_line_2 ? `${data.shippingAddress.address_line_2}<br>` : ''}
            ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postal_code}
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding-top: 28px;">
        <p style="color: #a1a1aa; font-size: 13px; margin: 0 0 6px 0;">
          Questions about your shipment? Just reply to this email.
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
    const data: ShippingConfirmationRequest = JSON.parse(event.body || '{}');

    if (!data.customerEmail || !data.trackingNumber || !data.orderNumber) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const { data: emailData, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Nexalon Creations <orders@resend.dev>',
      to: [data.customerEmail],
      subject: `Your Order #${data.orderNumber} Has Shipped!`,
      html: generateEmailHtml(data),
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
      body: JSON.stringify({ success: true, emailId: emailData?.id }),
    };
  } catch (error: any) {
    console.error('Error sending shipping confirmation:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: error.message || 'Failed to send shipping confirmation email'
      }),
    };
  }
};

export { handler };
