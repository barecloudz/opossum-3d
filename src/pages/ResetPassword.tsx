import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase JS v2 with PKCE (default) redirects with ?code= in the query string.
    // Calling getSession() triggers the automatic code exchange.
    // Older implicit flow uses #access_token= in the hash — handle both.
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const hasPkceCode = params.has('code');
    const hasImplicitToken = hash.includes('access_token') || hash.includes('type=recovery');

    if (hasPkceCode || hasImplicitToken) {
      // getSession() triggers PKCE code exchange automatically
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setSessionReady(true);
      });
    }

    // Listen for PASSWORD_RECOVERY in case the exchange fires after mount
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate('/account'), 2500);
  };

  if (!sessionReady) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md text-center">
          <p className="text-theme opacity-60">Verifying reset link...</p>
          <p className="text-sm text-gray-500 mt-2">If nothing happens, your link may have expired. <a href="/login" className="text-[var(--color-primary)] hover:underline">Request a new one.</a></p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-theme">Set New Password</h1>
          <p className="text-theme opacity-60 mt-2">Choose a strong password for your account</p>
        </div>

        {success ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400 text-center">
            Password updated! Redirecting to your account...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <Input
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />

            <Input
              label="Confirm New Password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Update Password
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
