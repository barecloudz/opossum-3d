import type { Handler } from '@netlify/functions';
import * as crypto from 'crypto';
import { getCorsHeaders, getRequestOrigin } from './cors-helper';

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME as string;
const API_KEY = process.env.CLOUDINARY_API_KEY as string;
const API_SECRET = process.env.CLOUDINARY_API_SECRET as string;

function extractPublicId(url: string): string {
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return '';

  let path = url.substring(uploadIndex + 8);
  // Remove version segment (e.g. v1234567890/)
  path = path.replace(/^v\d+\//, '');
  // Remove file extension
  path = path.replace(/\.[^/.]+$/, '');

  return path;
}

async function destroyImage(publicId: string): Promise<{ result: string }> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signaturePayload = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
  const signature = crypto.createHash('sha1').update(signaturePayload).digest('hex');

  const body = new URLSearchParams({
    public_id: publicId,
    api_key: API_KEY,
    timestamp,
    signature,
  });

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`,
    { method: 'POST', body }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Cloudinary delete failed');
  }

  return res.json();
}

const handler: Handler = async (event) => {
  const origin = getRequestOrigin(event.headers as Record<string, string>);
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method not allowed' };
  }

  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Cloudinary credentials not configured' }),
    };
  }

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

  const results: { url: string; publicId: string; result: string; error?: string }[] = [];

  for (const url of urls) {
    const publicId = extractPublicId(url);
    if (!publicId) {
      results.push({ url, publicId: '', result: 'skipped', error: 'Could not extract public_id' });
      continue;
    }

    try {
      const res = await destroyImage(publicId);
      results.push({ url, publicId, result: res.result });
    } catch (err) {
      results.push({ url, publicId, result: 'error', error: (err as Error).message });
    }
  }

  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ deleted: results.filter(r => r.result === 'ok').length, results }),
  };
};

export { handler };
