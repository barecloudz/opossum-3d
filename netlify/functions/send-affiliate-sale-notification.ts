import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

interface SaleRequest {
  affiliateId: string;
  orderNumber: number;
  commissionAmount: number;
  orderTotal: number;
}

const generateHtml = (
  name: string,
  orderNumber: number,
  commissionAmount: number,
  orderTotal: number,
  pendingBalance: number,
) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

    <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 28px 24px;">
      <p style="margin:0 0 4px;color:rgba(255,255,255,0.75);font-size:13px;text-transform:uppercase;letter-spacing:1px;">Nexalon Creations</p>
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">You made a sale! 🎉</h1>
    </div>

    <div style="padding:28px;">
      <p style="margin:0 0 20px;color:#374151;font-size:15px;">Hi ${name},</p>
      <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
        Someone just placed an order using your affiliate link or code. Here's your summary:
      </p>

      <div style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;">Order</td>
            <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;text-align:right;">#${orderNumber}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;">Order Total</td>
            <td style="padding:6px 0;color:#111827;font-size:14px;text-align:right;">$${orderTotal.toFixed(2)}</td>
          </tr>
          <tr style="border-top:1px solid #d1fae5;">
            <td style="padding:10px 0 6px;color:#15803d;font-size:16px;font-weight:700;">Your Commission</td>
            <td style="padding:10px 0 6px;color:#15803d;font-size:22px;font-weight:800;text-align:right;">+$${commissionAmount.toFixed(2)}</td>
          </tr>
          ${pendingBalance > 0 ? `
          <tr>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;">Pending Balance</td>
            <td style="padding:4px 0;color:#6b7280;font-size:13px;text-align:right;">$${pendingBalance.toFixed(2)}</td>
          </tr>` : ''}
        </table>
      </div>

      <p style="margin:0 0 20px;color:#6b7280;font-size:13px;line-height:1.6;">
        Your commission is marked <strong>pending</strong> until the order is confirmed. Once approved, it counts toward your next payout.
      </p>

      <div style="text-align:center;">
        <a href="https://nexaloncreations.com/affiliate/dashboard"
           style="display:inline-block;background:#1677FF;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 32px;border-radius:10px;">
          View My Dashboard →
        </a>
      </div>
    </div>

    <div style="padding:14px 28px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Nexalon Creations · Questions? Reply to this email.</p>
    </div>
  </div>
</body>
</html>`;

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: '' };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'Nexalon Creations <orders@resend.dev>';
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!resendApiKey || !supabaseUrl || !supabaseServiceKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Config missing' }) };
  }

  try {
    const { affiliateId, orderNumber, commissionAmount, orderTotal }: SaleRequest =
      JSON.parse(event.body || '{}');

    if (!affiliateId || !orderNumber || commissionAmount == null || orderTotal == null) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('name, email')
      .eq('id', affiliateId)
      .single();

    if (!affiliate) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Affiliate not found' }) };
    }

    // Get their pending balance so they can see progress
    const { data: conversions } = await supabase
      .from('affiliate_conversions')
      .select('commission_amount, status')
      .eq('affiliate_id', affiliateId)
      .in('status', ['pending', 'approved']);

    const pendingBalance = (conversions ?? []).reduce(
      (sum, c) => sum + c.commission_amount,
      0,
    );

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [affiliate.email],
        subject: `You made a sale! +$${commissionAmount.toFixed(2)} commission — Order #${orderNumber}`,
        html: generateHtml(
          affiliate.name.split(' ')[0],
          orderNumber,
          commissionAmount,
          orderTotal,
          pendingBalance,
        ),
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      console.error('[send-affiliate-sale-notification] Resend error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: 'Email failed' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err: any) {
    console.error('[send-affiliate-sale-notification] Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

export { handler };
