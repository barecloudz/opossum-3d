import { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle,
  Upload,
  X,
  ChevronDown,
  MessageSquare,
  Palette,
  Clock,
  Package,
  FileCheck,
  Truck,
  Image as ImageIcon
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

// Project type options
const PROJECT_TYPES = [
  { value: 'sign', label: 'Custom Sign / Name Plate' },
  { value: 'figurine', label: 'Figurine / Character' },
  { value: 'home-decor', label: 'Home Decor' },
  { value: 'functional', label: 'Functional Part / Tool' },
  { value: 'gift', label: 'Personalized Gift' },
  { value: 'prototype', label: 'Prototype / Model' },
  { value: 'other', label: 'Other' },
];

// Size options
const SIZE_OPTIONS = [
  { value: 'small', label: 'Small (under 4 inches)', description: 'Keychains, small figurines' },
  { value: 'medium', label: 'Medium (4-8 inches)', description: 'Desk items, signs' },
  { value: 'large', label: 'Large (8-12 inches)', description: 'Wall art, larger decor' },
  { value: 'xl', label: 'Extra Large (12+ inches)', description: 'Statement pieces' },
  { value: 'custom', label: 'Custom Dimensions', description: 'Specify in description' },
];

// Timeline options
const TIMELINE_OPTIONS = [
  { value: 'no-rush', label: 'No Rush', description: '3-4 weeks', icon: '🐢' },
  { value: 'standard', label: 'Standard', description: '2-3 weeks', icon: '📦' },
  { value: 'rush', label: 'Rush Order', description: '1-2 weeks (+25%)', icon: '⚡' },
];

// Budget options
const BUDGET_OPTIONS = [
  { value: '25-50', label: '$25 - $50' },
  { value: '50-100', label: '$50 - $100' },
  { value: '100-200', label: '$100 - $200' },
  { value: '200-plus', label: '$200+' },
  { value: 'unsure', label: 'Not sure yet' },
];

// Color presets
const COLOR_PRESETS = [
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Gold', hex: '#d4af37' },
  { name: 'Silver', hex: '#c0c0c0' },
  { name: 'Wood Brown', hex: '#8B4513' },
];

// FAQ items
const FAQ_ITEMS = [
  {
    question: 'How long does a custom order take?',
    answer: 'Standard orders take 2-3 weeks from approval. Rush orders can be completed in 1-2 weeks for an additional 25%. Complex projects may take longer - we\'ll provide an accurate timeline with your quote.'
  },
  {
    question: 'What materials do you use?',
    answer: 'We primarily use PLA and PETG filaments. PLA is great for decorative items and has a smooth finish. PETG is more durable and heat-resistant, ideal for functional parts. We can discuss the best material for your project.'
  },
  {
    question: 'Can you match a specific color?',
    answer: 'We have a wide range of filament colors available. While we can get very close to most colors, exact matches depend on filament availability. Send us a reference and we\'ll let you know what\'s possible.'
  },
  {
    question: 'What file formats do you accept?',
    answer: 'We accept STL, OBJ, and 3MF files. If you don\'t have a 3D file, no problem! Describe your idea or send reference images and we can help design it for an additional fee.'
  },
  {
    question: 'Do you offer design services?',
    answer: 'Yes! If you have an idea but no 3D model, we can create one for you. Design fees vary based on complexity and are quoted separately. Simple modifications to existing designs are often included.'
  },
  {
    question: 'What\'s your minimum order?',
    answer: 'There\'s no minimum order for custom pieces. Whether you need one item or one hundred, we\'re happy to help. Bulk orders receive volume discounts.'
  },
];

interface ExampleWork {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
}

// FAQ Accordion Component
function FAQAccordion({ items }: { items: typeof FAQ_ITEMS }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={index}
          className="border border-[var(--color-border)] rounded-lg overflow-hidden"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full px-4 py-3 flex items-center justify-between text-left bg-[var(--color-surface)] hover:bg-[var(--color-border)]/20 transition-colors"
          >
            <span className="font-medium text-theme">{item.question}</span>
            <ChevronDown
              className={`h-5 w-5 text-theme opacity-60 transition-transform ${
                openIndex === index ? 'rotate-180' : ''
              }`}
            />
          </button>
          {openIndex === index && (
            <div className="px-4 py-3 bg-[var(--color-background)] border-t border-[var(--color-border)]">
              <p className="text-theme opacity-70 text-sm leading-relaxed">{item.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Process Timeline Component
function ProcessTimeline() {
  const steps = [
    { icon: MessageSquare, label: 'Submit Request', description: 'Tell us your idea' },
    { icon: FileCheck, label: 'Get Quote', description: 'We\'ll send pricing' },
    { icon: CheckCircle, label: 'Approve', description: 'Confirm & pay' },
    { icon: Package, label: 'Production', description: 'We create it' },
    { icon: Truck, label: 'Delivery', description: 'Ships to you' },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-2">
      {steps.map((step, index) => (
        <div key={index} className="flex sm:flex-col items-center gap-3 sm:gap-2 flex-1">
          <div className="relative">
            <div className="w-12 h-12 bg-[var(--color-primary)]/20 rounded-full flex items-center justify-center">
              <step.icon className="h-6 w-6 text-[var(--color-primary)]" />
            </div>
            {index < steps.length - 1 && (
              <div className="hidden sm:block absolute top-1/2 left-full w-full h-0.5 bg-[var(--color-border)]" />
            )}
          </div>
          <div className="sm:text-center">
            <p className="font-medium text-theme text-sm">{step.label}</p>
            <p className="text-theme opacity-50 text-xs">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CustomQuote() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [exampleWorks, setExampleWorks] = useState<ExampleWork[]>([]);
  const { addToast } = useToast();

  // Fetch example works from database
  useEffect(() => {
    const fetchExampleWorks = async () => {
      try {
        const { data, error } = await supabase
          .from('example_works')
          .select('id, title, description, image_url')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setExampleWorks(data || []);
      } catch (err) {
        console.error('Error fetching example works:', err);
      }
    };

    fetchExampleWorks();
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    projectType: '',
    quantity: '1',
    size: '',
    timeline: 'standard',
    budget: '',
    colors: [] as string[],
    description: '',
    images: [] as string[],
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleColor = (colorName: string) => {
    setFormData((prev) => ({
      ...prev,
      colors: prev.colors.includes(colorName)
        ? prev.colors.filter(c => c !== colorName)
        : [...prev.colors, colorName]
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        // Validate file
        if (!file.type.startsWith('image/')) {
          addToast(`${file.name} is not an image`, 'error');
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          addToast(`${file.name} is too large (max 5MB)`, 'error');
          continue;
        }

        // Upload to Supabase
        const fileName = `quote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${file.name.split('.').pop()}`;
        const { data, error } = await supabase.storage
          .from('quote-images')
          .upload(fileName, file);

        if (error) {
          console.error('Upload error:', error);
          addToast(`Failed to upload ${file.name}`, 'error');
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('quote-images')
          .getPublicUrl(data.path);

        uploadedUrls.push(publicUrl);
      }

      if (uploadedUrls.length > 0) {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...uploadedUrls]
        }));
        addToast(`${uploadedUrls.length} image(s) uploaded`, 'success');
      }
    } catch (err) {
      console.error('Upload error:', err);
      addToast('Failed to upload images', 'error');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Build description with all details
      const fullDescription = `
PROJECT TYPE: ${PROJECT_TYPES.find(t => t.value === formData.projectType)?.label || 'Not specified'}
QUANTITY: ${formData.quantity}
SIZE: ${SIZE_OPTIONS.find(s => s.value === formData.size)?.label || 'Not specified'}
TIMELINE: ${TIMELINE_OPTIONS.find(t => t.value === formData.timeline)?.label || 'Standard'}
BUDGET: ${BUDGET_OPTIONS.find(b => b.value === formData.budget)?.label || 'Not specified'}
COLORS: ${formData.colors.length > 0 ? formData.colors.join(', ') : 'Not specified'}

DESCRIPTION:
${formData.description}
      `.trim();

      const { error } = await supabase.from('quote_requests').insert({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        description: fullDescription,
        reference_images: formData.images,
      });

      if (error) throw error;

      setIsSubmitted(true);
    } catch (err) {
      console.error('Error submitting quote:', err);
      addToast('There was an error submitting your request. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-[var(--color-primary)]/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-[var(--color-primary)]" />
        </div>
        <h1 className="text-3xl font-bold text-theme mb-4">Quote Request Submitted!</h1>
        <p className="text-theme opacity-60 mb-8">
          Thank you for your interest! We'll review your request and get back to you
          within 1-2 business days with a custom quote.
        </p>
        <Button onClick={() => {
          setIsSubmitted(false);
          setFormData({
            name: '',
            email: '',
            phone: '',
            projectType: '',
            quantity: '1',
            size: '',
            timeline: 'standard',
            budget: '',
            colors: [],
            description: '',
            images: [],
          });
        }}>
          Submit Another Request
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-theme mb-4">Request a Custom Quote</h1>
        <p className="text-theme opacity-60 max-w-2xl mx-auto">
          Have a unique project in mind? From personalized signs to one-of-a-kind creations,
          tell us your idea and we'll bring it to life.
        </p>
      </div>

      {/* Process Timeline */}
      <Card className="mb-8">
        <h2 className="text-lg font-semibold text-theme mb-4 text-center">How It Works</h2>
        <ProcessTimeline />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Info */}
              <div>
                <h3 className="text-lg font-semibold text-theme mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[var(--color-primary)] text-[var(--color-background)] rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  Contact Information
                </h3>
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
                <div className="mt-4">
                  <Input
                    label="Phone (optional)"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Project Details */}
              <div>
                <h3 className="text-lg font-semibold text-theme mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[var(--color-primary)] text-[var(--color-background)] rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  Project Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Project Type */}
                  <div>
                    <label className="block text-sm font-medium text-theme opacity-80 mb-1">
                      Project Type
                    </label>
                    <select
                      name="projectType"
                      value={formData.projectType}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-theme focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option value="">Select type...</option>
                      {PROJECT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <Input
                    label="Quantity"
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="1"
                    required
                  />
                </div>

                {/* Size */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-theme opacity-80 mb-2">
                    Approximate Size
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {SIZE_OPTIONS.map(size => (
                      <button
                        key={size.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, size: size.value }))}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          formData.size === size.value
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                            : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                        }`}
                      >
                        <p className="font-medium text-theme text-sm">{size.label.split(' ')[0]}</p>
                        <p className="text-theme opacity-50 text-xs mt-0.5">{size.label.match(/\(([^)]+)\)/)?.[1]}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timeline & Budget */}
              <div>
                <h3 className="text-lg font-semibold text-theme mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[var(--color-primary)] text-[var(--color-background)] rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  Timeline & Budget
                </h3>

                {/* Timeline */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-theme opacity-80 mb-2">
                    <Clock className="h-4 w-4 inline mr-1" />
                    When do you need it?
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {TIMELINE_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, timeline: option.value }))}
                        className={`p-3 rounded-lg border text-center transition-all ${
                          formData.timeline === option.value
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                            : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                        }`}
                      >
                        <span className="text-2xl">{option.icon}</span>
                        <p className="font-medium text-theme text-sm mt-1">{option.label}</p>
                        <p className="text-theme opacity-50 text-xs">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget */}
                <div>
                  <label className="block text-sm font-medium text-theme opacity-80 mb-1">
                    Budget Range (optional)
                  </label>
                  <select
                    name="budget"
                    value={formData.budget}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-theme focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    <option value="">Select budget range...</option>
                    {BUDGET_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Colors */}
              <div>
                <h3 className="text-lg font-semibold text-theme mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[var(--color-primary)] text-[var(--color-background)] rounded-full flex items-center justify-center text-sm font-bold">4</span>
                  <Palette className="h-5 w-5" />
                  Color Preferences
                </h3>
                <p className="text-theme opacity-60 text-sm mb-3">Select any colors you'd like (optional)</p>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map(color => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => toggleColor(color.name)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                        formData.colors.includes(color.name)
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                          : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="text-theme text-sm">{color.name}</span>
                      {formData.colors.includes(color.name) && (
                        <CheckCircle className="h-4 w-4 text-[var(--color-primary)]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-theme mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[var(--color-primary)] text-[var(--color-background)] rounded-full flex items-center justify-center text-sm font-bold">5</span>
                  Project Description
                </h3>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={5}
                  required
                  placeholder="Tell us about your project! Include any specific details like text for signs, character references for figurines, exact dimensions if known, or anything else that will help us understand your vision..."
                  className="w-full px-4 py-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-theme placeholder-[var(--color-text)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                />
              </div>

              {/* Image Upload */}
              <div>
                <h3 className="text-lg font-semibold text-theme mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-[var(--color-primary)] text-[var(--color-background)] rounded-full flex items-center justify-center text-sm font-bold">6</span>
                  <ImageIcon className="h-5 w-5" />
                  Reference Images (optional)
                </h3>

                {/* Uploaded images preview */}
                {formData.images.length > 0 && (
                  <div className="flex flex-wrap gap-3 mb-4">
                    {formData.images.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Reference ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border border-[var(--color-border)]"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload area */}
                <label className="block">
                  <div className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    uploadingImages
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                      : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                  }`}>
                    {uploadingImages ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                        <span className="text-theme">Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-theme opacity-50 mx-auto mb-2" />
                        <p className="text-theme font-medium">Click to upload images</p>
                        <p className="text-theme opacity-50 text-sm">PNG, JPG up to 5MB each</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={uploadingImages}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Submit */}
              <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
                <Send className="h-5 w-5 mr-2" />
                Submit Quote Request
              </Button>
            </form>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Material Info */}
          <Card>
            <h3 className="font-semibold text-theme mb-3">About Our Materials</h3>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-[var(--color-background)] rounded-lg">
                <p className="font-medium text-theme">PLA (Standard)</p>
                <p className="text-theme opacity-60 mt-1">
                  Perfect for decorative items. Smooth finish, vibrant colors, eco-friendly.
                </p>
              </div>
              <div className="p-3 bg-[var(--color-background)] rounded-lg">
                <p className="font-medium text-theme">PETG (Durable)</p>
                <p className="text-theme opacity-60 mt-1">
                  Great for functional parts. Heat resistant, stronger, slightly flexible.
                </p>
              </div>
            </div>
          </Card>

          {/* Example Gallery */}
          {exampleWorks.length > 0 && (
            <Card>
              <h3 className="font-semibold text-theme mb-3">Example Work</h3>
              <div className="grid grid-cols-2 gap-2">
                {exampleWorks.map((item) => (
                  <div key={item.id} className="relative group overflow-hidden rounded-lg aspect-square bg-[var(--color-background)]">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-white text-xs font-medium">{item.title}</p>
                        {item.description && (
                          <p className="text-white/70 text-xs">{item.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-[var(--color-primary)]">24hr</p>
                <p className="text-theme opacity-60 text-sm">Quote Response</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--color-primary)]">100+</p>
                <p className="text-theme opacity-60 text-sm">Happy Customers</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-theme mb-6 text-center">Frequently Asked Questions</h2>
        <div className="max-w-3xl mx-auto">
          <FAQAccordion items={FAQ_ITEMS} />
        </div>
      </div>
    </div>
  );
}
