// CORS helper for Netlify functions
// Validates origin against allowed list for security

/**
 * Get CORS headers for a request
 * In production, validates origin against ALLOWED_ORIGINS env var
 * In development, allows all origins for easier testing
 */
export function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const allowedOrigins = process.env.ALLOWED_ORIGINS;

  // If no ALLOWED_ORIGINS set, check if we're in production
  // Default to allowing the request origin in dev, or specific domain in prod
  if (!allowedOrigins) {
    // In Netlify, CONTEXT is set to 'production', 'deploy-preview', or 'branch-deploy'
    const isProduction = process.env.CONTEXT === 'production';

    if (isProduction) {
      // In production without explicit config, only allow same-site requests
      // The URL env var contains the primary site URL in Netlify
      const siteUrl = process.env.URL || '';
      return {
        'Access-Control-Allow-Origin': siteUrl || 'null',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      };
    }

    // In development/preview, allow the requesting origin
    return {
      'Access-Control-Allow-Origin': requestOrigin || '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
  }

  // Parse allowed origins (comma-separated)
  const origins = allowedOrigins.split(',').map(o => o.trim());

  // Check if request origin is in allowed list
  if (requestOrigin && origins.includes(requestOrigin)) {
    return {
      'Access-Control-Allow-Origin': requestOrigin,
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
  }

  // Origin not allowed - return first allowed origin (won't match, request will fail)
  return {
    'Access-Control-Allow-Origin': origins[0] || 'null',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

/**
 * Extract origin from request headers
 */
export function getRequestOrigin(headers: Record<string, string | undefined>): string | null {
  // Headers might be lowercase or mixed case depending on the source
  return headers.origin || headers.Origin || null;
}
