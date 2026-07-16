import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from './require-admin';

const generateHtml = (name: string, code: string, magicLink: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1677FF,#0D3B8C);padding:36px 32px 28px;">
      <p style="margin:0 0 6px;color:rgba(255,255,255,0.7);font-size:13px;text-transform:uppercase;letter-spacing:1px;">Nexalon Creations</p>
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Access Your Dashboard</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;color:#374151;font-size:16px;">Hi ${name},</p>
      <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
        Here's your updated link to access your Nexalon Creations affiliate dashboard.
      </p>
      <div style="background:#eff6ff;border:2px solid #bfdbfe;border-radius:12px;padding:20px;text-align:center;margin-bottom:28px;">
        <p style="margin:0 0 6px;color:#6b7280;font-size:13px;">Your affiliate code</p>
        <p style="margin:0;color:#1677FF;font-family:monospace;font-size:28px;font-weight:800;letter-spacing:4px;">${code}</p>
      </div>
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${magicLink}" style="display:inline-block;background:#1677FF;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 36px;border-radius:12px;">
          Access My Dashboard →
        </a>
      </div>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;">
        <p style="margin:0 0 6px;color:#6b7280;font-size:13px;font-weight:600;">YOUR REFERRAL LINK</p>
        <p style="margin:0;color:#1677FF;font-size:14px;word-break:break-all;">https://nexaloncreations.com?ref=${code}</p>
      </div>
    </div>
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

  const authResult = await requireAdmin(event.headers as Record<string, string>);
  if ('error' in authResult) return authResult.error;

  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'Nexalon Creations <orders@resend.dev>';
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!resendApiKey || !supabaseUrl || !supabaseServiceKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration missing' }) };
  }

  try {
    const { affiliateId, email, name, code } = JSON.parse(event.body || '{}');
    if (!affiliateId || !email || !name || !code) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if they already have an account
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    );

    let magicLink: string;

    if (existingUser) {
      // Has account — send magic link
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: 'https://nexaloncreations.com/affiliate/dashboard' },
      });
      magicLink = (!linkError && linkData?.properties?.action_link)
        ? linkData.properties.action_link
        : 'https://nexaloncreations.com/login';
    } else {
      // No account — send invite
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'invite',
        email,
        options: { redirectTo: 'https://nexaloncreations.com/affiliate/dashboard' },
      });
      if (!linkError && linkData?.properties?.action_link) {
        magicLink = linkData.properties.action_link;
        // Link user_id if created
        if (linkData.user?.id) {
          await supabase.from('affiliates').update({ user_id: linkData.user.id }).eq('id', affiliateId);
        }
      } else {
        magicLink = 'https://nexaloncreations.com/register';
      }
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [email],
        subject: `Your Nexalon affiliate dashboard link`,
        html: generateHtml(name, code, magicLink),
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      console.error('[resend-affiliate-invite] Resend error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send email' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err: any) {
    console.error('[resend-affiliate-invite] Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Internal error' }) };
  }
};

export { handler };
