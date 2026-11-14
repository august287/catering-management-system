import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { AlertCircle } from 'lucide-react';
import logo from '/public/images/natalielogo.jpg';

export function Register() {
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Name Validation (Last name, First name)
    const namePattern = /^\p{L}[\p{L}\s.'-]*$/u;
    const cleanLast = lastName.trim().replace(/\s+/g, ' ');
    const cleanFirst = firstName.trim().replace(/\s+/g, ' ');
    if (cleanLast.length < 2 || !namePattern.test(cleanLast)) {
      setError('Please provide a valid last name (at least 2 letters).');
      return;
    }
    if (cleanFirst.length < 2 || !namePattern.test(cleanFirst)) {
      setError('Please provide a valid first name (at least 2 letters).');
      return;
    }
    // Stored as "Last, First" so it reads the same everywhere it is shown.
    const name = `${cleanLast}, ${cleanFirst}`;

    // Phone Number Validation: 11 digits, numbers only (e.g. 09181234567)
    if (!phone) {
      setError('Please provide a contact number.');
      return;
    }
    if (!/^09\d{9}$/.test(phone)) {
      setError('Please provide a valid 11-digit mobile number starting with 09 (e.g. 09181234567).');
      return;
    }

    // 4. Password Validation
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    
    if (!strongRegex.test(password)) {
      setError('Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character.');
      return;
    }

    // 5. Confirm Password Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const result = await register(email, password, name, phone);
    setSubmitting(false);

    if (result.success) {
      if (result.requiresConfirmation || result.message) {
        setSuccessMessage(
          result.message || 'Registration successful! Please check your email inbox to confirm your account.'
        );
      } else {
        navigate('/customer/menu');
      }
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
           <Link to="/" className="absolute top-6 left-6 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gold p-1 shadow-md">
            <img src={logo} alt="Natalie's Catering" className="h-full w-full object-cover rounded-lg" />
          </div>
          <span className="font-serif text-2xl font-bold tracking-tight text-white">
            Natalie's Catering
          </span>
           </Link>
        </div>

        <div className="max-w-md">
          <p className="font-serif text-3xl font-light italic leading-snug text-gold-light">
            "Your journey to an unforgettable celebration starts here. Reserve bespoke themes, exquisite menus, and elegant rentals."
          </p>
        </div>

        <div className="text-xs text-cream/60">
          © {new Date().getFullYear()} Natalie's Catering System.
        </div>
      </div>

      {/* Right Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 bg-cream">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Brand Logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gold p-1 shadow-sm">
              <img src={logo} alt="Natalie's Catering" className="h-full w-full object-cover rounded-lg" />
            </div>
            <span className="font-serif text-xl font-bold text-ink">Natalie's Catering</span>
          </div>

          <h2 className="font-serif text-3xl font-bold tracking-tight text-ink">Create an Account</h2>
          <p className="mt-2 text-sm text-text-muted">Register to book catering packages and track reservations.</p>

          {error && (
            <div role="alert" className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-semibold">{successMessage}</p>
              <div className="mt-3">
                <Link to="/login" className="font-bold text-emerald-900 underline hover:text-emerald-700">
                  Proceed to Sign In &rarr;
                </Link>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="reg-last-name" className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                  Last Name
                </label>
                <Input id="reg-last-name"
                  type="text"
                  required
                  autoComplete="family-name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="e.g. Santos"
                />
              </div>
              <div>
                <label htmlFor="reg-first-name" className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                  First Name
                </label>
                <Input id="reg-first-name"
                  type="text"
                  required
                  autoComplete="given-name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="e.g. Maria"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-contact-phone" className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Contact Phone
              </label>
              <Input id="reg-contact-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                required
                maxLength={11}
                value={phone}
                // Numbers only: hyphens, spaces and other characters are stripped as you type or paste.
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="09181234567"
              />
              <span className="mt-1 block text-[11px] text-text-muted">11 digits, numbers only (no hyphens).</span>
            </div>

            <div>
              <label htmlFor="reg-email-address" className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Email Address
              </label>
              <Input id="reg-email-address"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Password
              </label>
              <PasswordInput id="reg-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum of 8 characters: A-Z, a-z, 0-9, and a symbol."
              />
            </div>

            <div>
              <label htmlFor="reg-confirm-password" className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Confirm Password
              </label>
              <PasswordInput id="reg-confirm-password"
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