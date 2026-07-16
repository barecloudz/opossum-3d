import type { Handler } from '@netlify/functions';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getCorsHeaders, getRequestOrigin } from './cors-helper';
import { requireAuth } from './require-admin';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

function extractKey(url: string): string {
  // URL format: https://pub-xxxx.r2.dev/nexalon/products/uuid.jpg
  const match = url.match(/r2\.dev\/(.+)$/);
  return match?.[1] ?? '';
}

const handler: Handler = async (event) => {
  const origin = getRequestOrigin(event.headers as Record<string, string>);
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method not allowed' };

  const authResult = await requireAuth(event.headers as Record<string, string>);
  if ('error' in authResult) return { ...authResult.error, headers: corsHeaders };

  let urls: string[] = [];
  try {
    const body = JSON.parse(event.body || '{}');
    urls = Array.isArray(body.urls) ? body.urls : body.url ? [body.url] : [];
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  if (urls.length === 0) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'No URLs provided' }) };
  }

  const results = await Promise.all(
    urls.map(async (url) => {
      const key = extractKey(url);
      if (!key) return { url, result: 'skipped', error: 'Could not extract key' };
      try {
        await s3.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }));
        return { url, result: 'ok' };
      } catch (err) {
        return { url, result: 'error', error: (err as Error).message };
      }
    })
  );

  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ deleted: results.filter((r) => r.result === 'ok').length, results }),
  };
};

export { handler };
