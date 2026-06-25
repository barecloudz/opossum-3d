import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

interface OrderItem {
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  selected_colors?: string[];
  product_description?: string;
}

interface AdminNotificationRequest {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount?: number;
  total: number;
  shippingAddress: {
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code: string;
  };
}

const formatPrice = (dollars: number) => {
  return `$${dollars.toFixed(2)}`;
};

const generateAdminEmailHtml = (order: AdminNotificationRequest) => {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #111827;">
        ${item.product_name}${item.variant_name ? ` - ${item.variant_name}` : ''}
        ${item.selected_colors?.length ? `<div style="font-size: 11px; color: #6b7280; margin-top: 3px;">Colors: ${item.selected_colors.map(e => { const [c, p] = e.includes(':') ? e.split(':') : [e, null]; return p ? `${c} ${p}%` : c; }).join(', ')}</div>` : ''}
        ${item.product_description ? `<div style="font-size: 11px; color: #6b7280; margin-top: 2px; font-style: italic;">"${item.product_description}"</div>` : ''}
      </td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #111827;">${item.quantity}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #111827;">${formatPrice(item.total_price)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order Received</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="background-color: #16a34a; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; font-size: 24px; margin: 0;">New Order Received!</h1>
        <p style="color: #dcfce7; margin: 8px 0 0 0; font-size: 16px;">Order #${order.orderNumber}</p>
      </div>

      <div style="padding: 24px;">
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
          <span style="font-size: 32px; font-weight: 700; color: #16a34a;">${formatPrice(order.total)}</span>
        </div>

        <h3 style="color: #111827; font-size: 16px; margin: 0 0 12px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Customer Info</h3>
        <table style="width: 100%; margin-bottom: 24px;">
          <tr>
            <td style="padding: 4px 0; color: #6b7280; width: 100px;">Name</td>
            <td style="padding: 4px 0; color: #111827; font-weight: 500;">${order.customerName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #6b7280;">Email</td>
            <td style="padding: 4px 0; color: #111827;">${order.customerEmail}</td>
          </tr>
          ${order.customerPhone ? `
          <tr>
            <td style="padding: 4px 0; color: #6b7280;">Phone</td>
            <td style="padding: 4px 0; color: #111827;">${order.customerPhone}</td>
          </tr>
          ` : ''}
        </table>

        <h3 style="color: #111827; font-size: 16px; margin: 0 0 12px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Items Ordered</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 8px 12px; text-align: left; color: #6b7280; font-size: 12px; text-transform: uppercase;">Item</th>
              <th style="padding: 8px 12px; text-align: center; color: #6b7280; font-size: 12px; text-transform: uppercase;">Qty</th>
              <th style="padding: 8px 12px; text-align: right; color: #6b7280; font-size: 12px; text-transform: uppercase;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #6b7280;">Subtotal</span>
            <span style="color: #111827;">${formatPrice(order.subtotal)}</span>
          </div>
          ${order.discount && order.discount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #16a34a;">Discount</span>
            <span style="color: #16a34a;">-${formatPrice(order.discount)}</span>
          </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280;">Shipping</span>
            <span style="color: #111827;">${formatPrice(order.shipping)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid #e5e7eb;">
            <span style="color: #111827; font-weight: 700;">Total</span>
            <span style="color: #16a34a; font-weight: 700;">${formatPrice(order.total)}</span>
          </div>
        </div>

        <h3 style="color: #111827; font-size: 16px; margin: 0 0 12px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Ship To</h3>
        <p style="color: #111827; margin: 0; line-height: 1.6;">
          ${order.customerName}<br>
          ${order.shippingAddress.address_line_1}<br>
          ${order.shippingAddress.address_line_2 ? `${order.shippingAddress.address_line_2}<br>` : ''}
          ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postal_code}
        </p>
      </div>
    </div>

    <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">
      This is an automated notification from Nexalon Creations.
    </p>
  </div>
</body>
</html>`;
};

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'Nexalon Creations <orders@resend.dev>';

  if (!resendApiKey) {
    console.error('[admin-notify] RESEND_API_KEY not configured');
    return { statusCode: 500, body: JSON.stringify({ error: 'Email service not configured' }) };
  }

  try {
    const order: AdminNotificationRequest = JSON.parse(event.body || '{}');

    if (!order.orderNumber || !order.customerEmail) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    // Fetch admin email from store_settings (contact_email set in backend Settings page)
    let adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'thomasbraswell4@gmail.com';

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: settings } = await supabase
          .from('store_settings')
          .select('contact_email')
          .eq('id', 1)
          .single();

        if (settings?.contact_email) {
          adminEmail = settings.contact_email;
        }
      } catch (dbError) {
        console.error('[admin-notify] Failed to fetch settings, using default email:', dbError);
      }
    }

    console.log(`[admin-notify] Sending notification to: ${adminEmail}`);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [adminEmail],
        subject: `New Order #${order.orderNumber} - ${order.customerName} (${order.items.reduce((sum, i) => sum + i.quantity, 0)} items, $${order.total.toFixed(2)})`,
        html: generateAdminEmailHtml(order),
      }),
    });

    if (response.ok) {
      console.log('[admin-notify] Admin notification email sent');
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } else {
      const errText = await response.text();
      console.error('[admin-notify] Email send failed:', errText);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send notification' }) };
    }
  } catch (error: any) {
    console.error('[admin-notify] Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Failed to send admin notification' }) };
  }
};

export { handler };
