import type { Handler } from '@netlify/functions';
import { getShippoClient, FROM_ADDRESS, DEFAULT_PARCEL } from './shippo-client';
import { getCorsHeaders, getRequestOrigin } from './cors-helper';

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
}

interface ShippingRateResponse {
  rate: number;
  estimatedDeliveryDays: number;
  mailClass: string;
  fallbackUsed: boolean;
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
    const { destinationAddress, totalWeightOz } = JSON.parse(event.body || '{}') as ShippingRateRequest;

    // Validate required fields
    if (!destinationAddress?.zipCode) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Destination ZIP code is required' }),
      };
    }

    // Clean up and validate ZIP code (must be 5 digits)
    const destZip = destinationAddress.zipCode.replace(/\D/g, '').slice(0, 5);
    if (destZip.length !== 5) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'ZIP code must be 5 digits' }),
      };
    }

    // Validate state code
    const stateCode = destinationAddress.state?.toUpperCase().trim();
    if (!stateCode || !VALID_STATES.has(stateCode)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Valid US state code is required' }),
      };
    }

    // Validate and ensure minimum weight (default to 8oz if missing/invalid)
    const weightOz = (!totalWeightOz || totalWeightOz <= 0) ? 8 : totalWeightOz;

    const shippo = getShippoClient();

    // Create a shipment to get rates from Shippo
    const shipment = await shippo.shipments.create({
      addressFrom: FROM_ADDRESS,
      addressTo: {
        street1: destinationAddress.streetAddress,
        street2: destinationAddress.secondaryAddress,
        city: destinationAddress.city,
        state: stateCode,
        zip: destZip,
        country: 'US',
      },
      parcels: [{
        ...DEFAULT_PARCEL,
        weight: String(weightOz),
        massUnit: 'oz',
      }],
      async: false,
    });

    // Filter for USPS Priority Mail rates
    const uspsRates = shipment.rates.filter(r =>
      r.provider === 'USPS' && r.servicelevel?.token?.includes('priority')
    );

    // If no USPS Priority rates, try any USPS rate, then any rate
    let selectedRate = uspsRates[0];
    if (!selectedRate) {
      const anyUsps = shipment.rates.find(r => r.provider === 'USPS');
      selectedRate = anyUsps || shipment.rates[0];
    }

    if (!selectedRate) {
      console.warn('No rates returned from Shippo, using fallback');
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

    const ratePrice = parseFloat(selectedRate.amount);
    const estimatedDays = selectedRate.estimatedDays || 3;
    const serviceName = selectedRate.servicelevel?.name || 'Priority Mail';

    console.log(`Shippo rate: ${destZip}, ${weightOz}oz = $${ratePrice} (${selectedRate.provider} ${serviceName})`);

    const response: ShippingRateResponse = {
      rate: ratePrice,
      estimatedDeliveryDays: Math.max(1, estimatedDays),
      mailClass: serviceName,
      fallbackUsed: false,
    };

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
