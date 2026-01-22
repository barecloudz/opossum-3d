// USPS OAuth2 Authentication Module
// Handles token retrieval and caching for USPS API calls

interface USPSTokenCache {
  accessToken: string;
  expiresAt: number;
}

// In-memory cache (persists across invocations in same Lambda container)
let tokenCache: USPSTokenCache | null = null;

/**
 * Get the USPS API base URL based on environment
 * Set USPS_ENVIRONMENT=sandbox for testing, or production (default) for live
 */
export function getUSPSBaseUrl(): string {
  const env = process.env.USPS_ENVIRONMENT?.toLowerCase();
  if (env === 'sandbox' || env === 'test' || env === 'tem') {
    return 'https://apis-tem.usps.com';
  }
  return 'https://apis.usps.com';
}

/**
 * Get a valid USPS access token, using cache when available
 * Tokens are cached until 5 minutes before expiration
 */
export async function getUSPSAccessToken(): Promise<string> {
  // Check if cached token is still valid (with 5-minute buffer)
  if (tokenCache && tokenCache.expiresAt > Date.now() + 300000) {
    console.log('Using cached USPS token');
    return tokenCache.accessToken;
  }

  const baseUrl = getUSPSBaseUrl();
  const consumerKey = process.env.USPS_CONSUMER_KEY?.trim();
  const consumerSecret = process.env.USPS_CONSUMER_SECRET?.trim();

  if (!consumerKey || !consumerSecret) {
    throw new Error('USPS API credentials not configured');
  }

  // Log environment info (not secrets)
  console.log(`USPS OAuth Request:`);
  console.log(`  - Base URL: ${baseUrl}`);
  console.log(`  - Environment: ${process.env.USPS_ENVIRONMENT || 'production (default)'}`);
  console.log(`  - Consumer Key length: ${consumerKey.length} chars`);
  console.log(`  - Consumer Key prefix: ${consumerKey.substring(0, 8)}...`);

  // USPS OAuth2 requires Basic auth header with base64 encoded credentials
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  const tokenUrl = `${baseUrl}/oauth2/v3/token`;
  console.log(`  - Token URL: ${tokenUrl}`);

  // USPS requires scope parameter - request all needed API scopes
  const scopes = [
    'prices',
    'labels',
    'tracking',
    'addresses',
  ].join(' ');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: scopes,
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error('USPS OAuth error response:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
    });
    throw new Error(`USPS authentication failed: ${response.status} - ${responseText}`);
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    console.error('Failed to parse USPS token response:', responseText);
    throw new Error('Invalid response from USPS OAuth');
  }

  // Cache the token
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  console.log('USPS token obtained successfully, expires in', data.expires_in, 'seconds');

  return data.access_token;
}

/**
 * Clear the token cache (useful for testing or forced refresh)
 */
export function clearTokenCache(): void {
  tokenCache = null;
}
