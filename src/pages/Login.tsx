import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Utensils, AlertCircle, Shield, User } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('admin@caterpro.ph');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result.success) {
      if (email.includes('admin')) {
        navigate('/admin/dashboard');
      } else {
        navigate('/customer/menu');
      }
    } else {
      setError(result.error || 'Authentication failed. Please check your credentials.');
    }
  };

  const autofill = (type: 'admin' | 'customer') => {
    if (type === 'admin') {
      setEmail('admin@caterpro.ph');
      setPassword('admin123');
    } else {
      setEmail('customer@test.ph');
      setPassword('pass123');
    }
    setError('');
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Visual Hero */}
      <div
        className="relative hidden w-1/2 flex-col justify-between bg-cover bg-center p-12 text-white lg:flex"
        style={{
          backgroundImage:
            "linear-gradient(rgba(23, 20, 15, 0.65), rgba(23, 20, 15, 0.85)), url('/images/7.jpg')",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold text-ink font-bold shadow-md">
            <Utensils className="h-6 w-6 text-white" />
          </div>
          <span className="font-serif text-2xl font-bold tracking-tight text-white">
            Natalie's Catering
          </span>
        </div>

        <div className="max-w-md">
          <p className="font-serif text-3xl font-light italic leading-snug text-gold-light">
            "Crafting unforgettable banquets, exquisite flavors, and seamless celebrations across the Philippines."
          </p>
          <div className="mt-6 flex items-center gap-4">
            <div className="h-0.5 w-12 bg-gold" />
            <span className="text-xs uppercase tracking-widest text-cream/75 font-medium">
              Manila · Taguig · Quezon City · Rizal
            </span>
          </div>
        </div>

        <div className="text-xs text-cream/60">
          © {new Date().getFullYear()} Natalie's Catering System. Capstone Defense Demo.
        </div>
      </div>

      {/* Right Login Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 bg-cream">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Brand */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold text-white font-bold">
              <Utensils className="h-5 w-5" />
            </div>
            <span className="font-serif text-xl font-bold text-ink">Natalie's Catering</span>
          </div>

          <h2 className="font-serif text-3xl font-bold tracking-tight text-ink">Welcome back</h2>
          <p className="mt-2 text-sm text-text-muted">Sign in to manage bookings, menus, and payments.</p>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Email Address
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Password
              </label>
              <Input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" variant="gold" className="w-full h-11 text-base" disabled={submitting}>
              {submitting ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-gold hover:underline">
              Register here
            </Link>
          </p>

          {/* Demo Credentials Quick Switcher */}
          <div className="mt-8 rounded-xl border border-border bg-white p-5 shadow-card">
            <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink">
                Demo Credentials (One-Click Auto-Fill)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => autofill('admin')}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-cream-dark/50 p-2.5 text-xs font-medium text-text hover:border-gold hover:bg-gold-light/40 transition-all text-left"
              >
                <Shield className="h-3.5 w-3.5 text-gold shrink-0" />
                <div>
                  <div className="font-bold text-ink">Admin Role</div>
                  <div className="text-[10px] text-text-muted">admin@caterpro.ph</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => autofill('customer')}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-cream-dark/50 p-2.5 text-xs font-medium text-text hover:border-gold hover:bg-gold-light/40 transition-all text-left"
              >
                <User className="h-3.5 w-3.5 text-gold shrink-0" />
                <div>
                  <div className="font-bold text-ink">Customer Role</div>
                  <div className="text-[10px] text-text-muted">customer@test.ph</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
