import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from './require-admin';

interface ApproveRequest {
  affiliateId: string;
  name: string;
  email: string;
  code: string;
}

const generateHtml = (name: string, code: string, magicLink: string, isExisting: boolean) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

    <div style="background:linear-gradient(135deg,#1677FF,#0D3B8C);padding:36px 32px 28px;">
      <p style="margin:0 0 6px;color:rgba(255,255,255,0.7);font-size:13px;text-transform:uppercase;letter-spacing:1px;">Nexalon Creations</p>
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">You're Approved! 🎉</h1>
    </div>

    <div style="padding:32px;">
      <p style="margin:0 0 16px;color:#374151;font-size:16px;">Hi ${name},</p>
      <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
        Welcome to the Nexalon Creations Affiliate Program! Your application has been approved and you're ready to start earning commissions.
      </p>

      <div style="background:#eff6ff;border:2px solid #bfdbfe;border-radius:12px;padding:20px;text-align:center;margin-bottom:28px;">
        <p style="margin:0 0 6px;color:#6b7280;font-size:13px;">Your affiliate code</p>
        <p style="margin:0;color:#1677FF;font-family:monospace;font-size:28px;font-weight:800;letter-spacing:4px;">${code}</p>
      </div>

      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
        ${isExisting
          ? 'Click below to go straight to your affiliate dashboard.'
          : 'Click the button below — it will log you in automatically and take you straight to your affiliate dashboard. No password needed.'}
      </p>

      <div style="text-align:center;margin-bottom:28px;">
        <a href="${magicLink}"
           style="display:inline-block;background:#1677FF;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 36px;border-radius:12px;">
          Access My Dashboard →
        </a>
      </div>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:8px;">
        <p style="margin:0 0 6px;color:#6b7280;font-size:13px;font-weight:600;">YOUR REFERRAL LINK</p>
        <p style="margin:0;color:#1677FF;font-size:14px;word-break:break-all;">https://nexaloncreations.com?ref=${code}</p>
        <p style="margin:8px 0 0;color:#9ca3af;font-size:12px;">Share this link — when customers use it or enter your code at checkout, you earn commission on their order.</p>
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
    const { affiliateId, name, email, code }: ApproveRequest = JSON.parse(event.body || '{}');
    if (!affiliateId || !name || !email || !code) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if user already has a Supabase account
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    );

    let magicLink: string;
    let isExisting = false;

    if (existingUser) {
      // Already has an account — generate a magic link login so they skip password
      isExisting = true;
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: 'https://nexaloncreations.com/affiliate/dashboard' },
      });
      if (linkError || !linkData?.properties?.action_link) {
        // Fallback: just send them to login page
        magicLink = 'https://nexaloncreations.com/login';
      } else {
        magicLink = linkData.properties.action_link;
      }

      // Link user_id on the affiliate record
      await supabase
        .from('affiliates')
        .update({ user_id: existingUser.id })
        .eq('id', affiliateId);
    } else {
      // No account yet — generate invite link (creates account + logs in on click)
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'invite',
        email,
        options: { redirectTo: 'https://nexaloncreations.com/affiliate/dashboard' },
      });
      if (linkError || !linkData?.properties?.action_link) {
        console.error('[approve-affiliate] generateLink error:', linkError);
        magicLink = 'https://nexaloncreations.com/register';
      } else {
        magicLink = linkData.properties.action_link;
        // generateLink with type:'invite' creates the auth user immediately —
        // link their user_id now so the dashboard works as soon as they click
        if (linkData.user?.id) {
          await supabase
            .from('affiliates')
            .update({ user_id: linkData.user.id })
            .eq('id', affiliateId);
        }
      }
    }

    // Send styled approval email via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [email],
        subject: `You're approved! Access your Nexalon affiliate dashboard`,
        html: generateHtml(name, code, magicLink, isExisting),
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      console.error('[approve-affiliate] Resend error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send email' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err: any) {
    console.error('[approve-affiliate] Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Internal error' }) };
  }
};

export { handler };
