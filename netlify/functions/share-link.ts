import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_IMAGE = 'https://res.cloudinary.com/dblvtidrh/image/upload/v1780196149/nexalon/banners/it9xqsyawgzke7colzh0.jpg';
const SITE_URL = 'https://nexaloncreations.netlify.app';

export const handler: Handler = async (event) => {
  // Extract affiliate code from path: /share/CODE
  const code = (event.path || '').replace(/^\/share\//i, '').split('?')[0].trim().toUpperCase();

  if (!code) {
    return { statusCode: 302, headers: { Location: '/' } };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let title = 'Nexalon Creations - Custom 3D Printing & Laser Engraving';
  let description = 'Precision crafted 3D printed creations and laser engraving. Custom orders welcome. Your vision, made real.';
  let image = DEFAULT_IMAGE;
  let discountRate = 0;

  if (supabaseUrl && supabaseServiceKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Fetch affiliate + global discount rate in parallel
      const [affiliateRes, settingsRes] = await Promise.all([
        supabase
          .from('affiliates')
          .select('name, code, share_title, share_description, share_image_url')
          .eq('code', code)
          .eq('status', 'approved')
          .maybeSingle(),
        supabase
          .from('affiliate_settings')
          .select('customer_discount_rate')
          .eq('id', 1)
          .single(),
      ]);

      discountRate = settingsRes.data?.customer_discount_rate ?? 0;
      const affiliate = affiliateRes.data;

      if (affiliate) {
        // Use custom fields if set, else auto-generate
        title = affiliate.share_title ||
          (discountRate > 0
            ? `Get ${discountRate}% off at Nexalon Creations!`
            : 'Shop Nexalon Creations - Custom 3D Printing & Laser Engraving');

        description = affiliate.share_description ||
          (discountRate > 0
            ? `${affiliate.name} is sharing an exclusive ${discountRate}% discount. Shop custom 3D printed and laser engraved products at Nexalon Creations.`
            : `${affiliate.name} is sharing a special link to Nexalon Creations. Custom 3D printing and laser engraving — your vision, made real.`);

        image = affiliate.share_image_url || DEFAULT_IMAGE;
      }
    } catch (err) {
      console.error('[share-link] Supabase error:', err);
    }
  }

  const referralUrl = `${SITE_URL}/?ref=${code}`;
  const shareUrl = `${SITE_URL}/share/${code}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <!-- OG / Social -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Nexalon Creations" />

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />

  <title>${escapeHtml(title)}</title>

  <!-- Instant redirect for real users -->
  <meta http-equiv="refresh" content="0;url=${referralUrl}" />
</head>
<body>
  <p>Redirecting... <a href="${referralUrl}">Click here if not redirected.</a></p>
  <script>window.location.replace("${referralUrl}");</script>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
    body: html,
  };
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
