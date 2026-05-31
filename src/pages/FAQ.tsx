import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'Is there a minimum order?',
    answer: 'There is no minimum order. However, orders under $50 will have shipping charges applied. Pricing on custom pieces is determined by quantity; the more you order, the better the per-unit cost.',
  },
  {
    question: 'What materials do you work with?',
    answer: 'We work with a wide range of materials including PLA, PETG, and resin for 3D printing, as well as wood, acrylic, leather, and metal for laser engraving. If you have a specific material in mind, reach out and we\'ll let you know if it\'s compatible.',
  },
  {
    question: 'Can I get a custom design or logo on my order?',
    answer: 'Yes. We can engrave or print custom logos, text, and designs. Submit your artwork through the Custom Quote form and we\'ll confirm compatibility and pricing.',
  },
  {
    question: 'How long does production take?',
    answer: 'Turnaround time depends on the complexity and quantity of your order. Standard orders typically ship within 5-10 business days. Bulk or highly custom orders may take longer. We\'ll give you a timeline when you receive your quote.',
  },
  {
    question: 'What file formats do you accept for custom designs?',
    answer: 'We accept SVG, PNG, JPG, and PDF files. For laser engraving, vector files (SVG, PDF) give the best results. For 3D printing, STL files are preferred if you have them.',
  },
  {
    question: 'Do you offer bulk or team pricing?',
    answer: 'Yes. Pricing on custom pieces scales with quantity. Submit a Custom Quote request with your quantity and we\'ll provide accurate bulk pricing.',
  },
  {
    question: 'How do I place a custom order?',
    answer: 'Use the Custom Quote form on our site. Describe what you need, upload any reference images or files, and we\'ll follow up with pricing and a production timeline.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit and debit cards through our secure checkout. Payments are processed via Stripe.',
  },
  {
    question: 'What is your return or refund policy?',
    answer: 'Because most of our products are custom-made to order, we do not accept returns on custom pieces. If there is a defect or error on our end, we will remake or refund the order. Contact us within 7 days of receiving your order if there is an issue.',
  },
  {
    question: 'Do you ship nationally?',
    answer: 'Yes, we ship anywhere in the United States. Shipping costs are calculated at checkout based on your location and order weight.',
  },
];

function FAQRow({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--color-border)] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 px-1 text-left group"
      >
        <span className="font-semibold text-[#0D1B2A] group-hover:text-[var(--color-primary)] transition-colors pr-4">
          {item.question}
        </span>
        {open
          ? <ChevronUp className="h-5 w-5 text-[var(--color-primary)] flex-shrink-0" />
          : <ChevronDown className="h-5 w-5 text-[#9CA3AF] flex-shrink-0" />
        }
      </button>
      {open && (
        <p className="pb-5 px-1 text-[#6B7280] leading-relaxed">
          {item.answer}
        </p>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#0D1B2A] mb-3">Frequently Asked Questions</h1>
          <p className="text-[#6B7280]">
            Can't find your answer?{' '}
            <a href="mailto:NexalonCreations@gmail.com" className="text-[var(--color-primary)] hover:underline">
              Email us directly.
            </a>
          </p>
        </div>

        <div className="glass rounded-3xl border border-[var(--color-border)] px-6">
          {faqs.map((item) => (
            <FAQRow key={item.question} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
