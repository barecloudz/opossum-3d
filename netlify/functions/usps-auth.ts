// USPS OAuth2 Authentication Module
// Handles token retrieval and caching for USPS API calls

interface USPSTokenCache {
  accessToken: string;
  expiresAt: number;
}

// In-memory cache (persists across invocations in same Lambda container)
let tokenCache: USPSTokenCache | null = null;

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

  console.log('Requesting new USPS access token');

  const consumerKey = process.env.USPS_CONSUMER_KEY;
  const consumerSecret = process.env.USPS_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error('USPS API credentials not configured');
  }

  const response = await fetch('https://api.usps.com/oauth2/v3/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: consumerKey,
      client_secret: consumerSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('USPS OAuth error:', errorText);
    throw new Error(`USPS authentication failed: ${response.status}`);
  }

  const data = await response.json();

  // Cache the token
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  console.log('USPS token obtained, expires in', data.expires_in, 'seconds');

  return data.access_token;
}

/**
 * Clear the token cache (useful for testing or forced refresh)
 */
export function clearTokenCache(): void {
  tokenCache = null;
}
