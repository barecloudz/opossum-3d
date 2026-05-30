import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Users, DollarSign, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

function generateCode(name: string): string {
  const base = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const suffix = Math.floor(Math.random() * 90 + 10);
  return `${base}${suffix}`;
}

export default function AffiliateApply() {
  const { user } = useAuthStore();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: user?.email || '',
    phone: '',
    business_name: '',
    promo_plan: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;

    setLoading(true);
    setError('');

    try {
      // Check if email already applied
      const { data: existing } = await supabase
        .from('affiliates')
        .select('id, status')
        .eq('email', form.email.toLowerCase().trim())
        .single();

      if (existing) {
        if (existing.status === 'approved') {
          setError('This email already has an approved affiliate account. Please log in to access your dashboard.');
        } else if (existing.status === 'pending') {
          setError('An application with this email is already pending review.');
        } else {
          setError('An application with this email already exists.');
        }
        return;
      }

      // Generate a unique code
      let code = generateCode(form.name);
      let attempts = 0;
      while (attempts < 5) {
        const { data: codeCheck } = await supabase
          .from('affiliates')
          .select('id')
          .eq('code', code)
          .single();
        if (!codeCheck) break;
        code = generateCode(form.name);
        attempts++;
      }

      const { error: insertError } = await supabase
        .from('affiliates')
        .insert({
          name: form.name.trim(),
          email: form.email.toLowerCase().trim(),
          phone: form.phone.trim() || null,
          business_name: form.business_name.trim() || null,
          promo_plan: form.promo_plan.trim() || null,
          code,
          user_id: user?.id || null,
          status: 'pending',
        });

      if (insertError) throw insertError;

      // Notify admin — fire and forget, don't block the success screen
      fetch('/.netlify/functions/send-affiliate-application-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.toLowerCase().trim(),
          phone: form.phone.trim() || undefined,
          business_name: form.business_name.trim() || undefined,
          promo_plan: form.promo_plan.trim() || undefined,
          code,
        }),
      }).catch(err => console.error('[AffiliateApply] Notification failed:', err));

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#0D1B2A] mb-3">Application Submitted!</h1>
          <p className="text-[#6B7280] mb-8">
            Thank you for applying to the Nexalon Creations Affiliate Program. We'll review your application and notify you by email within 1–2 business days.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white font-semibold rounded-2xl hover:opacity-90 transition-opacity"
          >
            Back to Home <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#0D1B2A] mb-3">Join the Affiliate Program</h1>
          <p className="text-[#6B7280] text-lg">
            Earn commissions by referring customers to Nexalon Creations.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: DollarSign, title: 'Earn Commission', desc: 'On every qualifying sale you refer' },
            { icon: TrendingUp, title: 'Track Performance', desc: 'Real-time clicks & conversion data' },
            { icon: Users, title: 'Monthly Payouts', desc: 'Paid during the first week of each month' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="text-center p-4 glass rounded-2xl border border-[var(--color-border)]">
              <Icon className="h-6 w-6 text-[var(--color-primary)] mx-auto mb-2" />
              <p className="font-semibold text-[#0D1B2A] text-sm">{title}</p>
              <p className="text-xs text-[#6B7280] mt-1">{desc}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass rounded-3xl border border-[var(--color-border)] p-8 space-y-5">
          <h2 className="font-bold text-[#0D1B2A] text-lg mb-2">Your Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0D1B2A] mb-1.5">Full Name *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Jordan Smith"
                className="w-full px-4 py-3 bg-white border border-[var(--color-border)] rounded-xl text-[#0D1B2A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0D1B2A] mb-1.5">Email Address *</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-white border border-[var(--color-border)] rounded-xl text-[#0D1B2A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0D1B2A] mb-1.5">Phone Number</label>
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="828-555-0100"
                className="w-full px-4 py-3 bg-white border border-[var(--color-border)] rounded-xl text-[#0D1B2A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0D1B2A] mb-1.5">Business / Club Name</label>
              <input
                name="business_name"
                value={form.business_name}
                onChange={handleChange}
                placeholder="Best Life Nutrition Club"
                className="w-full px-4 py-3 bg-white border border-[var(--color-border)] rounded-xl text-[#0D1B2A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0D1B2A] mb-1.5">How do you plan to promote Nexalon products?</label>
            <textarea
              name="promo_plan"
              value={form.promo_plan}
              onChange={handleChange}
              rows={4}
              placeholder="e.g. Social media posts, nutrition club promotion, customer referrals, team recommendations..."
              className="w-full px-4 py-3 bg-white border border-[var(--color-border)] rounded-xl text-[#0D1B2A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !form.name.trim() || !form.email.trim()}
            className="w-full py-3.5 bg-[var(--color-primary)] text-white font-semibold rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>Submit Application <ArrowRight className="h-4 w-4" /></>
            )}
          </button>

          <p className="text-center text-xs text-[#6B7280]">
            Already approved?{' '}
            <Link to="/affiliate/dashboard" className="text-[var(--color-primary)] hover:underline">
              Go to your dashboard
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
