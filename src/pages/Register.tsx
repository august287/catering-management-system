import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Utensils, AlertCircle } from 'lucide-react';

export function Register() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Please provide a valid email and password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    const result = await register(email, password, name, phone);
    setSubmitting(false);

    if (result.success) {
      navigate('/customer/menu');
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Visual Hero */}
      <div
        className="relative hidden w-1/2 flex-col justify-between bg-cover bg-center p-12 text-white lg:flex"
        style={{
          backgroundImage:
            "linear-gradient(rgba(23, 20, 15, 0.65), rgba(23, 20, 15, 0.85)), url('/images/8.jpg')",
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
            "Your journey to an unforgettable celebration starts here. Reserve bespoke themes, exquisite menus, and elegant rentals."
          </p>
        </div>

        <div className="text-xs text-cream/60">
          © {new Date().getFullYear()} Natalie's Catering System. Capstone Defense Demo.
        </div>
      </div>

      {/* Right Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 bg-cream">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold text-white font-bold">
              <Utensils className="h-5 w-5" />
            </div>
            <span className="font-serif text-xl font-bold text-ink">Natalie's Catering</span>
          </div>

          <h2 className="font-serif text-3xl font-bold tracking-tight text-ink">Create an Account</h2>
          <p className="mt-2 text-sm text-text-muted">Register to book catering packages and track reservations.</p>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Full Name
              </label>
              <Input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Maria Santos"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Contact Phone
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0918-123-4567"
              />
            </div>

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
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Confirm Password
              </label>
              <Input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
              />
            </div>

            <Button type="submit" variant="gold" className="w-full h-11 text-base mt-2" disabled={submitting}>
              {submitting ? 'Creating Account...' : 'Register Customer Account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-gold hover:underline">
              Sign In here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
