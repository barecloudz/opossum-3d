import type { Handler } from '@netlify/functions';
import { getUSPSAccessToken } from './usps-auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Origin address (your business address)
const FROM_ADDRESS = {
  firstName: 'Opossum',
  lastName: 'Works',
  streetAddress: '32 HICKEY RD',
  city: 'MARIETTA',
  state: 'SC',
  ZIPCode: '29661',
  ZIPPlus4: '9340',
};

interface CreateLabelRequest {
  orderId: string;
  orderNumber: string;
  recipientAddress: {
    firstName: string;
    lastName: string;
    streetAddress: string;
    secondaryAddress?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  totalWeightOz: number;
}

interface CreateLabelResponse {
  trackingNumber: string;
  labelPdf: string; // Base64 encoded PDF
  shippingCost: number;
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
    const { orderId, orderNumber, recipientAddress, totalWeightOz } = JSON.parse(event.body || '{}') as CreateLabelRequest;

    // Validate required fields
    if (!orderId || !recipientAddress || !totalWeightOz) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required fields: orderId, recipientAddress, totalWeightOz' }),
      };
    }

    if (!recipientAddress.firstName || !recipientAddress.lastName ||
        !recipientAddress.streetAddress || !recipientAddress.city ||
        !recipientAddress.state || !recipientAddress.zipCode) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Incomplete recipient address' }),
      };
    }

    // Get USPS access token
    const accessToken = await getUSPSAccessToken();

    // Parse ZIP code
    const zipParts = recipientAddress.zipCode.replace(/\D/g, '');
    const destZip = zipParts.slice(0, 5);
    const destZipPlus4 = zipParts.slice(5, 9) || undefined;

    // Convert weight from oz to pounds
    const weightLbs = Math.max(0.1, totalWeightOz / 16);

    console.log(`Creating USPS label for order ${orderId}:`, {
      to: `${recipientAddress.firstName} ${recipientAddress.lastName}`,
      destination: `${recipientAddress.city}, ${recipientAddress.state} ${destZip}`,
      weight: weightLbs,
    });

    // Call USPS Labels API
    const labelResponse = await fetch('https://api.usps.com/labels/v3/label', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageInfo: {
          imageType: 'PDF',
          labelType: '4X6LABEL',
        },
        toAddress: {
          firstName: recipientAddress.firstName.toUpperCase(),
          lastName: recipientAddress.lastName.toUpperCase(),
          streetAddress: recipientAddress.streetAddress.toUpperCase(),
          secondaryAddress: recipientAddress.secondaryAddress?.toUpperCase(),
          city: recipientAddress.city.toUpperCase(),
          state: recipientAddress.state.toUpperCase(),
          ZIPCode: destZip,
          ZIPPlus4: destZipPlus4,
        },
        fromAddress: FROM_ADDRESS,
        packageDescription: {
          weight: weightLbs,
          length: 12,
          width: 8,
          height: 6,
          mailClass: 'PRIORITY_MAIL',
          processingCategory: 'MACHINABLE',
          rateIndicator: 'DR',
          destinationEntryFacilityType: 'NONE',
          priceType: 'RETAIL',
        },
        customsInfo: null, // Domestic only
      }),
    });

    if (!labelResponse.ok) {
      const errorText = await labelResponse.text();
      console.error('USPS Labels API error:', labelResponse.status, errorText);

      // Try to parse error message
      let errorMessage = 'Failed to create shipping label';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch {
        // Use default error message
      }

      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: errorMessage }),
      };
    }

    const labelData = await labelResponse.json();
    console.log('USPS label created successfully:', {
      trackingNumber: labelData.trackingNumber,
      price: labelData.postage?.totalPrice,
    });

    const response: CreateLabelResponse = {
      trackingNumber: labelData.trackingNumber,
      labelPdf: labelData.labelImage, // Base64 encoded PDF
      shippingCost: labelData.postage?.totalPrice || 0,
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response),
    };

  } catch (error: any) {
    console.error('Create label error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: error.message || 'Failed to create shipping label'
      }),
    };
  }
};

export { handler };
