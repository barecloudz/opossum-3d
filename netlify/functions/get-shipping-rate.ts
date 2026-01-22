import type { Handler } from '@netlify/functions';
import { getUSPSAccessToken, getUSPSBaseUrl } from './usps-auth';
import { getCorsHeaders, getRequestOrigin } from './cors-helper';

// Origin address (Marietta, SC)
const ORIGIN_ZIP = '29661';

// Default flat rate shipping cost (fallback)
const DEFAULT_SHIPPING_RATE = 5.00;

// Valid US state codes
const VALID_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'AS', 'MP', // Territories
]);

interface ShippingRateRequest {
  destinationAddress: {
    streetAddress: string;
    secondaryAddress?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  totalWeightOz: number;
  enabledServiceCodes?: string[]; // Service codes enabled by admin
}

interface ExtraService {
  code: string;
  name: string;
  price: number;
}

interface ShippingRateResponse {
  rate: number;
  estimatedDeliveryDays: number;
  mailClass: string;
  fallbackUsed: boolean;
  extraServices?: ExtraService[]; // Available optional services
}

// Retry helper for transient failures
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      // Don't retry on client errors (4xx), only server errors (5xx) or network issues
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error: any) {
      lastError = error;
    }

    // Wait before retrying (exponential backoff: 500ms, 1000ms)
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      console.log(`Retrying USPS request (attempt ${attempt + 2}/${maxRetries + 1})`);
    }
  }

  throw lastError || new Error('Request failed after retries');
}

const handler: Handler = async (event) => {
  const origin = getRequestOrigin(event.headers as Record<string, string>);
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { destinationAddress, totalWeightOz, enabledServiceCodes } = JSON.parse(event.body || '{}') as ShippingRateRequest;

    // Validate required fields
    if (!destinationAddress?.zipCode) {
      console.error('Validation failed: Missing ZIP code');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Destination ZIP code is required' }),
      };
    }

    // Clean up and validate ZIP code (must be 5 digits)
    const destZip = destinationAddress.zipCode.replace(/\D/g, '').slice(0, 5);
    if (destZip.length !== 5) {
      console.error(`Validation failed: Invalid ZIP code format: ${destinationAddress.zipCode}`);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'ZIP code must be 5 digits' }),
      };
    }

    // Validate state code
    const stateCode = destinationAddress.state?.toUpperCase().trim();
    if (!stateCode || !VALID_STATES.has(stateCode)) {
      console.error(`Validation failed: Invalid state code: ${destinationAddress.state}`);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Valid US state code is required' }),
      };
    }

    // Validate and ensure minimum weight (default to 8oz if missing/invalid)
    const weightOz = (!totalWeightOz || totalWeightOz <= 0) ? 8 : totalWeightOz;
    if (!totalWeightOz || totalWeightOz <= 0) {
      console.warn(`Weight missing or invalid (${totalWeightOz}), using default 8oz`);
    }

    // Get USPS access token
    const accessToken = await getUSPSAccessToken();

    // Convert weight from oz to pounds (USPS API uses pounds)
    const weightLbs = Math.max(0.1, weightOz / 16); // Minimum 0.1 lbs

    const baseUrl = getUSPSBaseUrl();

    // Call USPS Prices API with retry logic
    const ratesResponse = await fetchWithRetry(`${baseUrl}/prices/v3/total-rates/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        originZIPCode: ORIGIN_ZIP,
        destinationZIPCode: destZip,
        weight: weightLbs,
        length: 12,
        width: 8,
        height: 6,
        mailClass: 'PRIORITY_MAIL',
        processingCategory: 'MACHINABLE',
        rateIndicator: 'DR',
        destinationEntryFacilityType: 'NONE',
        priceType: 'RETAIL',
      }),
    });

    if (!ratesResponse.ok) {
      const errorText = await ratesResponse.text();
      console.error('USPS Rates API error:', ratesResponse.status, errorText);

      // Return fallback rate on API error
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          rate: DEFAULT_SHIPPING_RATE,
          estimatedDeliveryDays: 5,
          mailClass: 'PRIORITY_MAIL',
          fallbackUsed: true,
        } as ShippingRateResponse),
      };
    }

    const ratesData = await ratesResponse.json();

    // Extract the rate from the response
    // USPS v3 API returns: { rateOptions: [{ totalBasePrice, rates: [{ price, ... }] }] }
    const rateOptions = ratesData.rateOptions || [];

    if (rateOptions.length === 0) {
      console.warn('No rate options returned from USPS, using fallback');
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          rate: DEFAULT_SHIPPING_RATE,
          estimatedDeliveryDays: 5,
          mailClass: 'PRIORITY_MAIL',
          fallbackUsed: true,
        } as ShippingRateResponse),
      };
    }

    // Find the cheapest rate option
    let cheapestRate = rateOptions[0];
    for (const option of rateOptions) {
      if (option.totalBasePrice < cheapestRate.totalBasePrice) {
        cheapestRate = option;
      }
    }

    const ratePrice = cheapestRate.totalBasePrice || cheapestRate.rates?.[0]?.price;

    if (!ratePrice) {
      console.warn('Could not extract price from USPS response, using fallback');
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          rate: DEFAULT_SHIPPING_RATE,
          estimatedDeliveryDays: 5,
          mailClass: 'PRIORITY_MAIL',
          fallbackUsed: true,
        } as ShippingRateResponse),
      };
    }

    // Get mail class from the rate details
    const rateDetails = cheapestRate.rates?.[0];
    const mailClass = rateDetails?.mailClass || 'PRIORITY_MAIL';

    // Calculate estimated delivery days
    let estimatedDays = 3; // Default Priority Mail estimate
    if (rateDetails?.commitment?.scheduledDeliveryDate) {
      const deliveryDate = new Date(rateDetails.commitment.scheduledDeliveryDate);
      const today = new Date();
      estimatedDays = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Extract enabled extra services from the USPS response
    const availableExtraServices: ExtraService[] = [];
    if (enabledServiceCodes && enabledServiceCodes.length > 0 && cheapestRate.extraServices) {
      for (const svc of cheapestRate.extraServices) {
        if (enabledServiceCodes.includes(svc.extraService) && svc.price > 0) {
          availableExtraServices.push({
            code: svc.extraService,
            name: svc.name,
            price: svc.price,
          });
        }
      }
    }

    const response: ShippingRateResponse = {
      rate: ratePrice,
      estimatedDeliveryDays: Math.max(1, estimatedDays),
      mailClass,
      fallbackUsed: false,
      extraServices: availableExtraServices.length > 0 ? availableExtraServices : undefined,
    };

    console.log(`USPS: ${ORIGIN_ZIP} -> ${destZip}, ${weightLbs.toFixed(2)}lbs = $${ratePrice} (${mailClass})`);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response),
    };

  } catch (error: any) {
    console.error('Shipping rate error:', error);

    // Always return fallback rate on any error (don't block checkout)
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        rate: DEFAULT_SHIPPING_RATE,
        estimatedDeliveryDays: 5,
        mailClass: 'PRIORITY_MAIL',
        fallbackUsed: true,
      } as ShippingRateResponse),
    };
  }
};

export { handler };
