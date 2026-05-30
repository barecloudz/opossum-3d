import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

interface AffiliateApplicationNotificationRequest {
  name: string;
  email: string;
  phone?: string;
  business_name?: string;
  promo_plan?: string;
  code: string;
}

const generateEmailHtml = (app: AffiliateApplicationNotificationRequest) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Affiliate Application</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1677FF,#0D3B8C);padding:32px 32px 24px;">
      <p style="margin:0 0 6px;color:rgba(255,255,255,0.75);font-size:13px;text-transform:uppercase;letter-spacing:1px;">Nexalon Creations</p>
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">New Affiliate Application</h1>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">
      <p style="margin:0 0 20px;color:#374151;font-size:15px;">
        A new affiliate application has been submitted and is waiting for your review.
      </p>

      <!-- Applicant details -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;width:40%;">Name</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;font-weight:600;">${app.name}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">Email</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;">${app.email}</td>
        </tr>
        ${app.phone ? `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">Phone</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;">${app.phone}</td>
        </tr>` : ''}
        ${app.business_name ? `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">Business / Club</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-size:14px;">${app.business_name}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:14px;">Assigned Code</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:14px;">
            <span style="background:#eff6ff;color:#1677FF;font-family:monospace;font-weight:700;padding:2px 8px;border-radius:6px;">${app.code}</span>
          </td>
        </tr>
        ${app.promo_plan ? `
        <tr>
          <td style="padding:10px 0;color:#6b7280;font-size:14px;vertical-align:top;">Promo Plan</td>
          <td style="padding:10px 0;color:#111827;font-size:14px;">${app.promo_plan}</td>
        </tr>` : ''}
      </table>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:8px;">
        <a href="https://nexaloncreations.com/admin/affiliates"
           style="display:inline-block;background:#1677FF;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 28px;border-radius:10px;">
          Review Application →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Nexalon Creations · Automated notification</p>
    </div>
  </div>
</body>
</html>`;

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'Nexalon Creations <orders@resend.dev>';

  if (!resendApiKey) {
    console.error('[affiliate-notify] RESEND_API_KEY not configured');
    return { statusCode: 500, body: JSON.stringify({ error: 'Email service not configured' }) };
  }

  try {
    const app: AffiliateApplicationNotificationRequest = JSON.parse(event.body || '{}');

    if (!app.name || !app.email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    // Fetch admin email from store_settings
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
      } catch {
        // Fall back to default
      }
    }

    console.log(`[affiliate-notify] Sending to: ${adminEmail}`);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [adminEmail],
        subject: `New Affiliate Application — ${app.name}`,
        html: generateEmailHtml(app),
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[affiliate-notify] Resend error:', errBody);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send email' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err: any) {
    console.error('[affiliate-notify] Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Internal error' }) };
  }
};

export { handler };
