import { useState } from 'react';
import { Printer, Package, RefreshCw, ExternalLink, CheckCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import { formatPrice } from '../../lib/utils';
import { useToast } from '../../components/ui/Toast';

interface RateOption {
  serviceToken: string;
  serviceName: string;
  provider: string;
  rate: number;
  estimatedDays: number | null;
}

interface GeneratedLabel {
  trackingNumber: string;
  labelUrl: string;
  shippingCost: number;
}

const VALID_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC','PR','VI','GU','AS','MP',
]);

export default function AdminShippingLabel() {
  const { addToast } = useToast();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    zip: '',
    weightOz: '8',
  });

  const [rates, setRates] = useState<RateOption[]>([]);
  const [selectedRateIndex, setSelectedRateIndex] = useState(0);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [labelLoading, setLabelLoading] = useState(false);
  const [generatedLabel, setGeneratedLabel] = useState<GeneratedLabel | null>(null);

  const isValidState = !form.state || VALID_STATES.has(form.state.toUpperCase());
  const canGetRates = form.firstName && form.lastName && form.address &&
    form.city && form.state && form.zip.length >= 5 && isValidState &&
    parseFloat(form.weightOz) > 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'state' ? value.toUpperCase().slice(0, 2) : value,
    }));
    // Clear rates if address changes
    if (['address', 'city', 'state', 'zip'].includes(name)) {
      setRates([]);
      setGeneratedLabel(null);
    }
  };

  const getRates = async () => {
    setRatesLoading(true);
    setRates([]);
    setGeneratedLabel(null);

    try {
      const res = await fetch('/.netlify/functions/get-shipping-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationAddress: {
            streetAddress: form.address,
            secondaryAddress: form.apartment || undefined,
            city: form.city,
            state: form.state,
            zipCode: form.zip,
          },
          totalWeightOz: parseFloat(form.weightOz) || 8,
        }),
      });

      const data = await res.json();
      if (data.rates?.length > 0) {
        setRates(data.rates);
        setSelectedRateIndex(0);
      } else {
        addToast('No rates returned. Check the address and try again.', 'error');
      }
    } catch {
      addToast('Failed to fetch rates. Check your connection.', 'error');
    } finally {
      setRatesLoading(false);
    }
  };

  const generateLabel = async () => {
    if (!rates[selectedRateIndex]) return;
    setLabelLoading(true);

    try {
      const res = await fetch('/.netlify/functions/create-shipping-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: `manual-${Date.now()}`,
          orderNumber: `MANUAL`,
          recipientAddress: {
            firstName: form.firstName,
            lastName: form.lastName,
            streetAddress: form.address,
            secondaryAddress: form.apartment || undefined,
            city: form.city,
            state: form.state,
            zipCode: form.zip,
          },
          totalWeightOz: parseFloat(form.weightOz) || 8,
          serviceToken: rates[selectedRateIndex].serviceToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Label generation failed');

      setGeneratedLabel({
        trackingNumber: data.trackingNumber,
        labelUrl: data.labelUrl,
        shippingCost: data.shippingCost,
      });
      addToast('Label generated successfully!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to generate label', 'error');
    } finally {
      setLabelLoading(false);
    }
  };

  const reset = () => {
    setForm({ firstName: '', lastName: '', address: '', apartment: '', city: '', state: '', zip: '', weightOz: '8' });
    setRates([]);
    setGeneratedLabel(null);
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#0D1B2A]">Generate Shipping Label</h1>
          <p className="text-gray-500 mt-1">Create a label without a customer order</p>
        </div>
        {generatedLabel && (
          <Button variant="outline" size="sm" onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            New Label
          </Button>
        )}
      </div>

      {/* Success state */}
      {generatedLabel ? (
        <Card className="text-center py-10">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-[#0D1B2A] mb-1">Label Ready</h2>
          <p className="text-gray-500 mb-1">Cost: <span className="font-semibold text-[#0D1B2A]">{formatPrice(generatedLabel.shippingCost)}</span></p>
          <p className="text-gray-500 mb-6 font-mono text-sm">{generatedLabel.trackingNumber}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={generatedLabel.labelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1677FF] text-white rounded-xl font-semibold hover:bg-[#0a5fd9] transition-colors"
            >
              <Printer className="h-5 w-5" />
              Print / Download Label
            </a>
            <a
              href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${generatedLabel.trackingNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Track Package
            </a>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Recipient */}
          <Card>
            <h2 className="text-lg font-semibold text-[#0D1B2A] mb-4">Recipient</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="First Name" name="firstName" value={form.firstName} onChange={handleChange} required />
                <Input label="Last Name" name="lastName" value={form.lastName} onChange={handleChange} required />
              </div>
              <Input label="Street Address" name="address" value={form.address} onChange={handleChange} required />
              <Input label="Apt, Suite, etc. (optional)" name="apartment" value={form.apartment} onChange={handleChange} />
              <div className="grid grid-cols-3 gap-3">
                <Input label="City" name="city" value={form.city} onChange={handleChange} required />
                <Input label="State" name="state" value={form.state} onChange={handleChange} required maxLength={2} placeholder="NC" />
                <Input label="ZIP" name="zip" value={form.zip} onChange={handleChange} required maxLength={10} placeholder="28792" />
              </div>
              {form.state && !isValidState && (
                <p className="text-red-500 text-sm">Enter a valid US state code (e.g. NC, TX, CA)</p>
              )}
            </div>
          </Card>

          {/* Package */}
          <Card>
            <h2 className="text-lg font-semibold text-[#0D1B2A] mb-4">
              <span className="flex items-center gap-2"><Package className="h-5 w-5 text-[#1677FF]" />Package</span>
            </h2>
            <div className="max-w-xs">
              <Input
                label="Total Weight (oz)"
                type="number"
                name="weightOz"
                value={form.weightOz}
                onChange={handleChange}
                min="0.1"
                step="0.1"
                required
                helperText="16 oz = 1 lb"
              />
            </div>
          </Card>

          {/* Rates */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#0D1B2A]">Shipping Rate</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={getRates}
                isLoading={ratesLoading}
                disabled={!canGetRates || ratesLoading}
              >
                {rates.length > 0 ? 'Refresh Rates' : 'Get Rates'}
              </Button>
            </div>

            {!canGetRates && (
              <p className="text-gray-400 text-sm">Fill in the recipient address and weight above first.</p>
            )}

            {canGetRates && rates.length === 0 && !ratesLoading && (
              <p className="text-gray-400 text-sm">Click "Get Rates" to see shipping options.</p>
            )}

            {rates.length > 0 && (
              <div className="space-y-2">
                {rates.map((rate, index) => (
                  <label
                    key={rate.serviceToken}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                      selectedRateIndex === index
                        ? 'border-[#1677FF] bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rate"
                      checked={selectedRateIndex === index}
                      onChange={() => setSelectedRateIndex(index)}
                      className="w-4 h-4 text-[#1677FF]"
                    />
                    <div className="flex-1">
                      <span className="text-[#0D1B2A] font-medium text-sm">{rate.serviceName}</span>
                      {rate.estimatedDays && (
                        <span className="text-gray-400 text-xs ml-2">({rate.estimatedDays} day{rate.estimatedDays !== 1 ? 's' : ''})</span>
                      )}
                    </div>
                    <span className="text-[#1677FF] font-bold">{formatPrice(rate.rate)}</span>
                  </label>
                ))}
              </div>
            )}
          </Card>

          <Button
            onClick={generateLabel}
            className="w-full"
            size="lg"
            isLoading={labelLoading}
            disabled={rates.length === 0 || labelLoading}
          >
            <Printer className="h-5 w-5 mr-2" />
            Generate Label
          </Button>
        </div>
      )}
    </div>
  );
}
