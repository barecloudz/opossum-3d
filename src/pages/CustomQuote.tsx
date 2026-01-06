import { useState } from 'react';
import { Send, CheckCircle, Upload } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { supabase } from '../lib/supabase';

export default function CustomQuote() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    description: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('quote_requests').insert({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        description: formData.description,
        reference_images: [],
      });

      if (error) throw error;

      setIsSubmitted(true);
    } catch (err) {
      console.error('Error submitting quote:', err);
      alert('There was an error submitting your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-brand-emerald-dark rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-brand-neon" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Quote Request Submitted!</h1>
        <p className="text-gray-400 mb-8">
          Thank you for your interest! We'll review your request and get back to you
          within 1-2 business days with a quote.
        </p>
        <Button onClick={() => setIsSubmitted(false)}>Submit Another Request</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-4">Request a Custom Quote</h1>
        <p className="text-gray-400 max-w-xl mx-auto">
          Have a unique project in mind? Tell us about it and we'll get back to you
          with a custom quote. From personalized signs to one-of-a-kind creations,
          we're here to help.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <Input
            label="Phone (optional)"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Project Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={5}
              required
              placeholder="Tell us about your project. Include details like dimensions, materials, colors, quantity, and any other relevant information..."
              className="w-full px-4 py-2 rounded-lg bg-brand-black border border-brand-gray text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-neon focus:border-transparent resize-none"
            />
          </div>

          {/* Image upload placeholder */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Reference Images (optional)
            </label>
            <div className="border-2 border-dashed border-brand-gray rounded-lg p-8 text-center hover:border-brand-neon/50 transition-colors">
              <Upload className="h-10 w-10 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">
                Image upload coming soon - for now, please describe your reference images
                in the description or email them to us after submitting.
              </p>
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
            <Send className="h-5 w-5 mr-2" />
            Submit Quote Request
          </Button>
        </form>
      </Card>
    </div>
  );
}
