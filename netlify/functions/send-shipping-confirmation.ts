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
        <div style="width: 64px; height: 64px; background-color: rgba(59, 130, 246, 0.2); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <span style="color: #3b82f6; font-size: 32px;">&#128230;</span>
        </div>
        <h2 style="color: #f5f5f5; font-size: 24px; margin: 0 0 8px 0;">Your order is on its way!</h2>
        <p style="color: #9ca3af; margin: 0;">Hi ${data.customerName}, great news! Your order has shipped!</p>
      </div>

      <div style="background-color: #0a0a0a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #9ca3af;">Order Number</span>
          <span style="color: #00ff66; font-weight: 600;">#${data.orderNumber}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #9ca3af;">Tracking Number</span>
          <span style="color: #f5f5f5; font-family: monospace;">${data.trackingNumber}</span>
        </div>
      </div>

      <!-- Track Button -->
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${trackingUrl}" style="display: inline-block; background-color: #00ff66; color: #0a0a0a; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Track Your Package
        </a>
      </div>

      <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 0;">
        You can also track your package at <a href="https://www.usps.com/track" style="color: #00ff66;">usps.com/track</a>
      </p>
    </div>

    <!-- Shipping Address -->
    <div style="background-color: #1a1a1a; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #2d2d2d;">
      <h3 style="color: #f5f5f5; font-size: 16px; margin: 0 0 12px 0;">Shipping To</h3>
      <p style="color: #9ca3af; margin: 0; line-height: 1.6;">
        ${data.customerName}<br>
        ${data.shippingAddress.address_line_1}<br>
        ${data.shippingAddress.address_line_2 ? `${data.shippingAddress.address_line_2}<br>` : ''}
        ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postal_code}
      </p>
    </div>

    <!-- Footer -->
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
      from: process.env.RESEND_FROM_EMAIL || 'Opossum Works <orders@resend.dev>',
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
