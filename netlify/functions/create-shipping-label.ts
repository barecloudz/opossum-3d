import type { Handler } from '@netlify/functions';
import { getShippoClient, FROM_ADDRESS, DEFAULT_PARCEL } from './shippo-client';
import { getCorsHeaders, getRequestOrigin } from './cors-helper';

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
  serviceToken?: string;
}

interface CreateLabelResponse {
  trackingNumber: string;
  labelUrl: string;
  shippingCost: number;
  shippoTransactionId: string;
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
    const { orderId, orderNumber, recipientAddress, totalWeightOz, serviceToken } = JSON.parse(event.body || '{}') as CreateLabelRequest;

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

    const shippo = getShippoClient();
    const recipientName = `${recipientAddress.firstName} ${recipientAddress.lastName}`;
    const destZip = recipientAddress.zipCode.replace(/\D/g, '').slice(0, 5);

    console.log(`Creating Shippo label for order ${orderId}:`, {
      to: recipientName,
      destination: `${recipientAddress.city}, ${recipientAddress.state} ${destZip}`,
      weight: totalWeightOz,
    });

    // Step 1: Create shipment to get rates
    const shipment = await shippo.shipments.create({
      addressFrom: FROM_ADDRESS,
      addressTo: {
        name: recipientName,
        street1: recipientAddress.streetAddress,
        street2: recipientAddress.secondaryAddress,
        city: recipientAddress.city,
        state: recipientAddress.state,
        zip: destZip,
        country: 'US',
      },
      parcels: [{
        ...DEFAULT_PARCEL,
        weight: String(totalWeightOz),
        massUnit: 'oz',
      }],
      async: false,
    });

    // Match the service level the customer selected at checkout
    let selectedRate = serviceToken
      ? shipment.rates.find(r => r.servicelevel?.token === serviceToken)
      : undefined;
    // Fallback: USPS Priority Mail, then any USPS, then cheapest
    if (!selectedRate) {
      selectedRate = shipment.rates.find(r =>
        r.provider === 'USPS' && r.servicelevel?.token?.includes('priority')
      );
    }
    if (!selectedRate) {
      selectedRate = shipment.rates.find(r => r.provider === 'USPS');
    }
    if (!selectedRate) {
      selectedRate = shipment.rates[0];
    }

    if (!selectedRate) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'No shipping rates available for this destination' }),
      };
    }

    // Step 2: Purchase label from selected rate
    const transaction = await shippo.transactions.create({
      rate: selectedRate.objectId,
      labelFileType: 'PDF_4x6',
      async: false,
    });

    if (transaction.status !== 'SUCCESS') {
      const errorMessages = transaction.messages?.map(m => m.text).join('; ') || 'Label purchase failed';
      console.error('Shippo transaction failed:', errorMessages);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: errorMessages }),
      };
    }

    console.log('Shippo label created:', {
      trackingNumber: transaction.trackingNumber,
      price: selectedRate.amount,
    });

    const response: CreateLabelResponse = {
      trackingNumber: transaction.trackingNumber || '',
      labelUrl: transaction.labelUrl || '',
      shippingCost: parseFloat(selectedRate.amount),
      shippoTransactionId: transaction.objectId || '',
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
