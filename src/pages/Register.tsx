import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { Mail, CheckCircle } from 'lucide-react';

export default function Register() {
  const { signUp } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    marketingOptIn: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    const { error: signUpError } = await signUp(formData.email, formData.password, {
      first_name: formData.firstName,
      last_name: formData.lastName,
      marketing_opt_in: formData.marketingOptIn,
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsLoading(false);
      return;
    }

    // Add to email subscribers if opted in
    if (formData.marketingOptIn) {
      try {
        const { data: existingSub } = await supabase
          .from('email_subscribers')
          .select('id')
          .eq('email', formData.email.toLowerCase())
          .maybeSingle();

        if (!existingSub) {
          await supabase.from('email_subscribers').insert({
            email: formData.email.toLowerCase(),
            first_name: formData.firstName || null,
            last_name: formData.lastName || null,
            source: 'register',
            is_subscribed: true,
            subscribed_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        // Non-critical error, continue
        console.error('Error adding email subscriber:', err);
      }
    }

    // Show confirmation modal instead of navigating
    setRegisteredEmail(formData.email);
    setShowConfirmModal(true);
    setIsLoading(false);
  };

  const handleVerifiedClick = () => {
    // Reload the page to check auth state
    window.location.href = '/account';
  };

  // Confirmation Modal
  if (showConfirmModal) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-[var(--color-primary)]/10 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-[var(--color-primary)]" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-theme mb-3">Check Your Email</h1>

          <p className="text-theme opacity-70 mb-2">
            We've sent a confirmation link to:
          </p>
          <p className="text-[var(--color-primary)] font-medium mb-6">
            {registeredEmail}
          </p>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4 mb-6">
            <p className="text-theme opacity-70 text-sm">
              Click the link in your email to verify your account.
              <span className="block mt-2 text-theme opacity-50">
                Don't see it? Check your spam or junk folder.
              </span>
            </p>
          </div>

          <Button onClick={handleVerifiedClick} className="w-full">
            <CheckCircle className="w-5 h-5 mr-2" />
            I've Verified My Email
          </Button>

          <p className="text-theme opacity-50 text-sm mt-4">
            Didn't receive the email?{' '}
            <button
              onClick={() => {
                setShowConfirmModal(false);
                setFormData({ ...formData, password: '', confirmPassword: '' });
              }}
              className="text-[var(--color-primary)] hover:opacity-80 transition-colors"
            >
              Try again
            </button>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-theme">Create Account</h1>
          <p className="text-theme opacity-60 mt-2">Join us to track orders and more</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
          />

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="marketingOptIn"
              checked={formData.marketingOptIn}
              onChange={(e) => setFormData({ ...formData, marketingOptIn: e.target.checked })}
              className="mt-1 w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            <label htmlFor="marketingOptIn" className="text-theme opacity-60 text-sm">
              Sign me up for exclusive offers, new product launches, and updates via email
            </label>
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Create Account
          </Button>
        </form>

        <p className="text-center text-theme opacity-60 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-[var(--color-primary)] hover:opacity-80 transition-colors">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
