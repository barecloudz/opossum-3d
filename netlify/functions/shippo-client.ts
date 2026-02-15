import { Shippo } from 'shippo';

let shippoClient: Shippo | null = null;

/**
 * Get a Shippo client instance (reused across invocations in same Lambda container)
 */
export function getShippoClient(): Shippo {
  if (!shippoClient) {
    const apiKey = process.env.SHIPPO_API_KEY;
    if (!apiKey) {
      throw new Error('SHIPPO_API_KEY not configured');
    }
    shippoClient = new Shippo({ apiKeyHeader: apiKey });
  }
  return shippoClient;
}

// Origin address for all shipments
export const FROM_ADDRESS = {
  name: 'Opossum Works',
  street1: '32 Hickey Rd',
  city: 'Marietta',
  state: 'SC',
  zip: '29661',
  country: 'US',
  email: 'printsbythepossum@gmail.com',
  phone: '8283882151',
};

// Default parcel dimensions (inches)
export const DEFAULT_PARCEL = {
  length: '12',
  width: '8',
  height: '6',
  distanceUnit: 'in' as const,
};
