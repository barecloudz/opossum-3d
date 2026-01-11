import type { Handler } from '@netlify/functions';
import { getUSPSAccessToken } from './usps-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Origin address (Marietta, SC)
const ORIGIN_ZIP = '29661';

// Default flat rate shipping cost (fallback)
const DEFAULT_SHIPPING_RATE = 5.00;

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

    if (!totalWeightOz || totalWeightOz <= 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Valid package weight is required' }),
      };
    }

    // Get USPS access token
    const accessToken = await getUSPSAccessToken();

    // Clean up ZIP code (just first 5 digits)
    const destZip = destinationAddress.zipCode.replace(/\D/g, '').slice(0, 5);

    // Convert weight from oz to pounds (USPS API uses pounds)
    const weightLbs = totalWeightOz / 16;

    console.log(`Fetching USPS rate: ${ORIGIN_ZIP} -> ${destZip}, weight: ${weightLbs}lbs`);

    // Call USPS Prices API
    const ratesResponse = await fetch('https://api.usps.com/prices/v3/total-rates/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        originZIPCode: ORIGIN_ZIP,
        destinationZIPCode: destZip,
        weight: Math.max(0.1, weightLbs), // Minimum 0.1 lbs
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
    console.log('USPS rates response:', JSON.stringify(ratesData, null, 2));

    // Extract the rate from the response
    const rates = ratesData.rates || ratesData.rateOptions || [];
    const priorityRate = rates[0];

    if (!priorityRate) {
      console.warn('No rates returned from USPS, using fallback');
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

    // Calculate estimated delivery days from commitment
    let estimatedDays = 3; // Default Priority Mail estimate
    if (priorityRate.commitment?.scheduledDeliveryDate) {
      const deliveryDate = new Date(priorityRate.commitment.scheduledDeliveryDate);
      const today = new Date();
      estimatedDays = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    const response: ShippingRateResponse = {
      rate: priorityRate.totalPrice || priorityRate.price || DEFAULT_SHIPPING_RATE,
      estimatedDeliveryDays: Math.max(1, estimatedDays),
      mailClass: 'PRIORITY_MAIL',
      fallbackUsed: false,
    };

    console.log('Returning shipping rate:', response);

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
