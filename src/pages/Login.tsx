import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { error: signInError } = await signIn(formData.email, formData.password);

    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
      return;
    }

    navigate(from, { replace: true });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: 'https://nexaloncreations.com/reset-password',
    });

    setResetLoading(false);

    if (error) {
      setResetError(error.message);
      return;
    }

    setResetSent(true);
  };

  if (forgotMode) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-theme">Reset Password</h1>
            <p className="text-theme opacity-60 mt-2">We'll send you a reset link</p>
          </div>

          {resetSent ? (
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400 text-sm text-center">
                Check your email for a password reset link.
              </div>
              <button
                onClick={() => { setForgotMode(false); setResetSent(false); }}
                className="w-full text-center text-[var(--color-primary)] hover:opacity-80 transition-colors text-sm"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {resetError && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                  {resetError}
                </div>
              )}
              <Input
                label="Email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                autoFocus
              />
              <Button type="submit" className="w-full" isLoading={resetLoading}>
                Send Reset Link
              </Button>
              <button
                type="button"
                onClick={() => setForgotMode(false)}
                className="w-full text-center text-theme opacity-60 hover:opacity-80 transition-colors text-sm"
              >
                Back to sign in
              </button>
            </form>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-theme">Welcome Back</h1>
          <p className="text-theme opacity-60 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <div>
            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <div className="text-right mt-1">
              <button
                type="button"
                onClick={() => { setForgotMode(true); setResetEmail(formData.email); }}
                className="text-xs text-[var(--color-primary)] hover:opacity-80 transition-colors"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Sign In
          </Button>
        </form>

        <p className="text-center text-theme opacity-60 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-[var(--color-primary)] hover:opacity-80 transition-colors">
            Create one
          </Link>
        </p>
      </Card>
    </div>
  );
}
