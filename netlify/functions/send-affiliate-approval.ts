import type { Handler } from '@netlify/functions';

interface ApprovalRequest {
  name: string;
  email: string;
  code: string;
}

const generateHtml = (name: string, code: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1677FF,#0D3B8C);padding:36px 32px 28px;">
      <p style="margin:0 0 6px;color:rgba(255,255,255,0.7);font-size:13px;text-transform:uppercase;letter-spacing:1px;">Nexalon Creations</p>
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">You're Approved! 🎉</h1>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="margin:0 0 16px;color:#374151;font-size:16px;">Hi ${name},</p>
      <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
        Welcome to the Nexalon Creations Affiliate Program! Your application has been approved and you're ready to start earning commissions.
      </p>

      <!-- Code box -->
      <div style="background:#eff6ff;border:2px solid #bfdbfe;border-radius:12px;padding:20px;text-align:center;margin-bottom:28px;">
        <p style="margin:0 0 6px;color:#6b7280;font-size:13px;">Your affiliate code</p>
        <p style="margin:0;color:#1677FF;font-family:monospace;font-size:28px;font-weight:800;letter-spacing:4px;">${code}</p>
      </div>

      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
        To access your affiliate dashboard and track your earnings, clicks, and commissions — create your account using the button below. <strong>Make sure to use this exact email address when registering.</strong>
      </p>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:28px;">
        <a href="https://nexaloncreations.com/register"
           style="display:inline-block;background:#1677FF;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 36px;border-radius:12px;">
          Create Your Account →
        </a>
      </div>

      <!-- Share link -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:8px;">
        <p style="margin:0 0 6px;color:#6b7280;font-size:13px;font-weight:600;">YOUR REFERRAL LINK</p>
        <p style="margin:0;color:#1677FF;font-size:14px;word-break:break-all;">https://nexaloncreations.com?ref=${code}</p>
        <p style="margin:8px 0 0;color:#9ca3af;font-size:12px;">Share this link — when customers use it or enter your code at checkout, you earn commission on their order.</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Nexalon Creations · Questions? Reply to this email.</p>
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
    return { statusCode: 500, body: JSON.stringify({ error: 'Email service not configured' }) };
  }

  try {
    const { name, email, code }: ApprovalRequest = JSON.parse(event.body || '{}');

    if (!name || !email || !code) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [email],
        subject: `You're approved! Welcome to the Nexalon Affiliate Program`,
        html: generateHtml(name, code),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[affiliate-approval] Resend error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send email' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err: any) {
    console.error('[affiliate-approval] Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Internal error' }) };
  }
};

export { handler };
