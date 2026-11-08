import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, MailCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import logo from '/public/images/natalielogo.jpg';

/** Shared frame for the password reset pages (form on cream, brand on top). */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-cream px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gold p-1 shadow-sm">
            <img src={logo} alt="Natalie's Catering" className="h-full w-full rounded-lg object-cover" />
          </div>
          <span className="font-serif text-xl font-bold text-ink">Natalie's Catering</span>
        </Link>
        <div className="rounded-xl border border-border bg-white p-6 shadow-card sm:p-8">
          <h2 className="font-serif text-2xl font-bold tracking-tight text-ink">{title}</h2>
          <p className="mt-2 text-sm text-text-muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

const RESEND_COOLDOWN_SECONDS = 60;

export function ForgotPassword() {
  const { requestPasswordReset, verifyResetCode } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(searchParams.get('step') === 'code' && !!searchParams.get('email'));
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const sendCode = async () => {
    setError('');
    setSubmitting(true);
    const result = await requestPasswordReset(email);
    setSubmitting(false);
    if (!result.success) {
      setError(
        /rate limit|security purposes/i.test(result.error || '')
          ? 'Please wait a minute before requesting another code.'
          : result.error || 'Could not send the reset code. Please try again.'
      );
      return;
    }
    if (result.demoReset) {
      // Offline demo: no mail server, so open the reset form directly.
      navigate('/reset-password', { state: { demoEmail: email.trim().toLowerCase() } });
      return;
    }
    setCode('');
    setSent(true);
    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendCode();
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    sendCode();
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setVerifying(true);
    const result = await verifyResetCode(email, code);
    setVerifying(false);
    if (!result.success) {
      setError(result.error || 'Could not verify the code.');
      return;
    }
    navigate('/reset-password', { state: { verifiedByCode: true } });
  };

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter the email you registered with and we'll send you a code to set a new password."
    >
      {error && (
        <div role="alert" className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {sent ? (
        <>
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="flex items-center gap-2 font-semibold">
              <MailCheck className="h-4 w-4 shrink-0" /> Check your inbox
            </p>
            <p className="mt-1.5">
              If an account exists for <strong>{email.trim()}</strong>, we sent a <strong>6-digit code</strong> and a
              reset link. Enter the code below, or tap the link in the email. Check your spam folder if you don't see it.
            </p>
          </div>

          <form onSubmit={handleVerifyCode} className="mt-5 space-y-4">
            <div>
              <label htmlFor="reset-code" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
                Reset Code
              </label>
              <Input
                id="reset-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={10}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="123456"
                className="text-center font-mono text-lg tracking-[0.4em]"
              />
            </div>
            <Button type="submit" variant="gold" className="h-11 w-full text-base" disabled={verifying || code.length < 6}>
              {verifying ? 'Checking code...' : 'Verify Code'}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-text-muted">
            Didn't get it?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || submitting}
              className="font-semibold text-gold hover:underline disabled:cursor-not-allowed disabled:text-text-faint disabled:no-underline"
            >
              {cooldown > 0 ? `Send a new code in ${cooldown}s` : 'Send a new code'}
            </button>
            {' · '}
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setCode('');
                setError('');
              }}
              className="font-semibold text-gold hover:underline"
            >
              Use a different email
            </button>
          </p>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="forgot-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
              Email Address
            </label>
            <Input
              id="forgot-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <Button type="submit" variant="gold" className="h-11 w-full text-base" disabled={submitting}>
            {submitting ? 'Sending code...' : 'Send Reset Code'}
          </Button>
        </form>
      )}

      <Link to="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm font-semibold text-gold hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to Sign In
      </Link>
    </AuthCard>
  );
}

export default ForgotPassword;
