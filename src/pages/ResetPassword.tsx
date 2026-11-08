import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { AuthCard } from '@/pages/ForgotPassword';

const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

export function ResetPassword() {
  const { user, loading, updatePassword, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const navState = location.state as { demoEmail?: string; verifiedByCode?: boolean } | null;
  const demoEmail = navState?.demoEmail;

  // Supabase puts the reason in the URL when a link fails (e.g. it expired or was already used).
  const [linkError] = useState(() => {
    const params = new URLSearchParams(
      (window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '') + '&' + window.location.search.slice(1)
    );
    const code = params.get('error_code') || '';
    if (!params.get('error') && !code) return '';
    if (code === 'otp_expired') return 'This reset link has expired or was already used.';
    return (params.get('error_description') || 'This reset link could not be opened.').replace(/\+/g, ' ');
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Supabase signs the user in from the emailed link; demo mode passes the email along.
  const hasValidLink = isSupabaseConfigured() ? !!user || !!navState?.verifiedByCode : !!demoEmail;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!STRONG_PASSWORD.test(password)) {
      setError('Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    const result = await updatePassword(password, demoEmail);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error || 'Could not update your password. Please try again.');
      return;
    }
    // Make the user sign in again with the new password.
    await logout();
    setDone(true);
  };

  if (loading && isSupabaseConfigured()) {
    return (
      <AuthCard title="Set a new password" subtitle="Checking your reset link...">
        <div />
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set a new password" subtitle="Choose a strong password you haven't used before.">
      {done ? (
        <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> Password updated
          </p>
          <p className="mt-1.5">You can now sign in with your new password.</p>
          <Button variant="gold" className="mt-4 w-full" onClick={() => navigate('/login')}>
            Go to Sign In
          </Button>
        </div>
      ) : !hasValidLink ? (
        <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">{linkError || 'This reset link is invalid or has expired.'}</p>
          <p className="mt-1.5">
            You can still reset your password with the 6-digit code from the same email, or request a new one.
          </p>
          <Link to="/forgot-password" className="mt-3 inline-block font-bold underline">
            Enter a reset code
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div role="alert" className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="reset-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
                New Password
              </label>
              <PasswordInput
                id="reset-password"
                required
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum of 8 characters: A-Z, a-z, 0-9, and a symbol."
              />
            </div>
            <div>
              <label htmlFor="reset-confirm-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
                Confirm New Password
              </label>
              <PasswordInput
                id="reset-confirm-password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
            </div>
            <Button type="submit" variant="gold" className="h-11 w-full text-base" disabled={submitting}>
              {submitting ? 'Saving...' : 'Update Password'}
            </Button>
          </form>
        </>
      )}
    </AuthCard>
  );
}

export default ResetPassword;
