import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { AlertCircle, ShieldCheck, ShieldPlus } from 'lucide-react';
import { homeForRole } from '@/components/ProtectedRoute';
import { UserRole } from '@/types/database';
import logo from '/public/images/natalielogo.jpg';

/** Which sign-in page this is. 'any' is the main /login page. */
export type LoginPortal = 'any' | 'admin' | 'super_admin';

const PORTALS: Record<
  LoginPortal,
  { path: string; linkLabel: string; title: string; subtitle: string; allowed: UserRole[] | null; deniedMessage: string }
> = {
  any: {
    path: '/login',
    linkLabel: 'Log in as customer',
    title: 'Welcome back',
    subtitle: 'Sign in to manage bookings, menus, and payments.',
    allowed: null,
    deniedMessage: '',
  },
  admin: {
    path: '/login/admin',
    linkLabel: 'Log in as admin',
    title: 'Admin sign in',
    subtitle: 'For staff managing reservations, menus, and payments.',
    allowed: ['admin', 'super_admin'],
    deniedMessage: "This account doesn't have admin access.",
  },
  super_admin: {
    path: '/login/superadmin',
    linkLabel: 'Log in as super admin',
    title: 'Super admin sign in',
    subtitle: 'Full access, including user and role management.',
    allowed: ['super_admin'],
    deniedMessage: "This account doesn't have super admin access.",
  },
};

export function Login({ portal = 'any' }: { portal?: LoginPortal }) {
  const config = PORTALS[portal];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Security State for Lockout Mechanism (persisted in sessionStorage across reload)
  const getStoredLockout = () => {
    try {
      const until = Number(sessionStorage.getItem('caterpro_lockout_until') || 0);
      const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      const storedAttempts = Number(sessionStorage.getItem('caterpro_login_attempts') || 0);
      return { remaining, storedAttempts };
    } catch {
      return { remaining: 0, storedAttempts: 0 };
    }
  };

  const initialLockout = getStoredLockout();
  const [attempts, setAttempts] = useState(initialLockout.storedAttempts);
  const [lockoutTime, setLockoutTime] = useState(initialLockout.remaining);
  
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 30; // seconds

  const { login, logout } = useAuth();

  // Clear the form when switching between the customer/admin/super admin pages.
  useEffect(() => {
    setEmail('');
    setPassword('');
    setError('');
  }, [portal]);
  const navigate = useNavigate();

  // Handle countdown timer for lockout
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>; 
    if (lockoutTime > 0) {
      timer = setTimeout(() => {
        setLockoutTime((time) => {
          const next = time - 1;
          if (next <= 0) {
            try {
              sessionStorage.removeItem('caterpro_lockout_until');
              sessionStorage.removeItem('caterpro_login_attempts');
            } catch {}
            setAttempts(0);
            setError('');
          }
          return next;
        });
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [lockoutTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (lockoutTime > 0) return;

    setError('');
    if (!email || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    let result = await login(email, password);

    // Staff pages only let in accounts with that role; sign anyone else back out.
    if (result.success && config.allowed && !(result.role && config.allowed.includes(result.role))) {
      await logout();
      result = { success: false, error: config.deniedMessage };
    }
    setSubmitting(false);

    if (result.success) {
      setAttempts(0);
      try {
        sessionStorage.removeItem('caterpro_lockout_until');
        sessionStorage.removeItem('caterpro_login_attempts');
      } catch {}
      navigate(homeForRole(result.role));
    } else {
      const newAttemptCount = attempts + 1;
      setAttempts(newAttemptCount);
      try {
        sessionStorage.setItem('caterpro_login_attempts', String(newAttemptCount));
      } catch {}

      if (newAttemptCount >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_DURATION * 1000;
        try {
          sessionStorage.setItem('caterpro_lockout_until', String(until));
        } catch {}
        setLockoutTime(LOCKOUT_DURATION);
        setError(`Too many failed attempts. Please try again in ${LOCKOUT_DURATION} seconds.`);
      } else {
        setError(result.error || `Authentication failed. ${MAX_ATTEMPTS - newAttemptCount} attempts remaining.`);
      }
    }
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
          {/* Logo Container - Sizing fixed */}
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
            "Crafting unforgettable banquets, exquisite flavors, and seamless celebrations across the Philippines."
          </p>
          <div className="mt-6 flex items-center gap-4">
            <div className="h-0.5 w-12 bg-gold" />
            <span className="text-xs uppercase tracking-widest text-cream/75 font-medium">
               Brgy. Marinig, Cabuyao City, Laguna
            </span>
          </div>
        </div>

        <div className="text-xs text-cream/60">
          © {new Date().getFullYear()} Natalie's Catering System.
        </div>
      </div>

      {/* Right Login Form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 bg-cream">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Brand Logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gold p-1 shadow-sm">
              <img src={logo} alt="Natalie's Catering" className="h-full w-full object-cover rounded-lg" />
            </div>
            <span className="font-serif text-xl font-bold text-ink">Natalie's Catering</span>
          </div>

          {portal !== 'any' && (
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold-light px-3 py-1 text-xs font-semibold text-gold-dark">
              {portal === 'super_admin' ? <ShieldPlus className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              {portal === 'super_admin' ? 'Super Admin Portal' : 'Admin Portal'}
            </div>
          )}
          <h2 className="font-serif text-3xl font-bold tracking-tight text-ink">{config.title}</h2>
          <p className="mt-2 text-sm text-text-muted">{config.subtitle}</p>

          {(error || lockoutTime > 0) && (
            <div role="alert" className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                {lockoutTime > 0 
                  ? `Too many failed attempts. Please try again in ${lockoutTime}s.` 
                  : error}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="login-email-address" className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Email Address
              </label>
              <Input id="login-email-address"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={lockoutTime > 0}
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs font-semibold text-gold hover:underline">
                  Forgot password?
                </Link>
              </div>
              <PasswordInput id="login-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={lockoutTime > 0}
              />
            </div>

            <Button 
              type="submit" 
              variant="gold" 
              className="w-full h-11 text-base" 
              disabled={submitting || lockoutTime > 0}
            >
              {lockoutTime > 0 
                ? `Locked (${lockoutTime}s)` 
                : submitting 
                  ? 'Authenticating...' 
                  : 'Sign In'}
            </Button>
          </form>

          {portal === 'any' && (
            <p className="mt-6 text-center text-sm text-text-muted">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-gold hover:underline">
                Register here
              </Link>
            </p>
          )}

          {/* Staff sign-in pages are not linked from the public page; staff open
              /login/admin or /login/superadmin directly (e.g. from a bookmark). */}
          {portal !== 'any' && (
            <p className="mt-6 text-center text-sm text-text-muted">
              Not staff?{' '}
              <Link to={PORTALS.any.path} className="font-semibold text-gold hover:underline">
                {PORTALS.any.linkLabel}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;