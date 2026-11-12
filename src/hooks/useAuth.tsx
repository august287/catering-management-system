import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Profile, UserRole } from '@/types/database';
import { mockStore } from '@/lib/mockData';

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  register: (
    email: string,
    password: string,
    name: string,
    phone?: string
  ) => Promise<{ success: boolean; requiresConfirmation?: boolean; message?: string; error?: string }>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; demoReset?: boolean; error?: string }>;
  updatePassword: (newPassword: string, demoEmail?: string) => Promise<{ success: boolean; error?: string }>;
  verifyResetCode: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  setOwnDisplayName: (name: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Load session — onAuthStateChange is the single source of truth when Supabase
  // is configured, so we don't duplicate profile fetching in initializeAuth.
  useEffect(() => {
    let mounted = true;

    if (isSupabaseConfigured()) {
      // Safety timeout: if Supabase is unreachable, stop loading after 5s
      // so ProtectedRoute can redirect instead of showing an infinite spinner.
      const timeout = setTimeout(() => {
        if (mounted) setLoading(false);
      }, 5000);

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!mounted) return;
        clearTimeout(timeout);

        // A reset link that landed on another page (e.g. Supabase fell back to the
        // Site URL) must still open the new-password form, not the dashboard.
        if (_event === 'PASSWORD_RECOVERY' && window.location.pathname !== '/reset-password') {
          window.location.replace('/reset-password');
          return;
        }

        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email || '' });
          try {
            const { data: prof } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            if (mounted && prof) {
              setProfile(prof as Profile);
              setRole(prof.role as UserRole);
            } else if (mounted) {
              const safeRole: UserRole = 'customer'; // never guess admin without a profile row
              const metaName = session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';
              setProfile({ id: session.user.id, name: metaName, role: safeRole });
              setRole(safeRole);
            }
          } catch (err) {
            console.warn('Profile fetch failed:', err);
            if (mounted) {
              const safeRole: UserRole = 'customer'; // never guess admin without a profile row
              const metaName = session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User';
              setProfile({ id: session.user.id, name: metaName, role: safeRole });
              setRole(safeRole);
            }
          }
        } else {
          // Live site: an offline demo session must never sign anyone in. Clear any
          // left over from demo mode so it can't show fake data.
          localStorage.removeItem('caterpro_demo_session');
          setUser(null);
          setProfile(null);
          setRole(null);
        }
        if (mounted) setLoading(false);
      });

      return () => {
        mounted = false;
        clearTimeout(timeout);
        subscription.unsubscribe();
      };
    } else {
      // Demo mode: check local stored session
      try {
        const stored = localStorage.getItem('caterpro_demo_session');
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(parsed.user);
          setProfile(parsed.profile);
          setRole(parsed.profile.role);
        }
      } catch (err) {
        console.warn('Demo session restore failed:', err);
      }
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (isSupabaseConfigured()) {
        // Live site: only real Supabase accounts can sign in. Never fall back to the
        // offline demo accounts here, or demo passwords would open a fake session.
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error || !data.user) {
          const msg = error?.message || '';
          return {
            success: false,
            error: /confirm/i.test(msg)
              ? 'Please confirm your email address before signing in.'
              : 'Incorrect email or password. Please try again.',
          };
        }
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        // Without a profile row, treat the account as a customer (never guess admin).
        const safeRole: UserRole = (prof?.role as UserRole) || 'customer';
        const userProfile = (prof as Profile) || {
          id: data.user.id,
          name: data.user.user_metadata?.name || 'User',
          role: safeRole,
        };

        setUser({ id: data.user.id, email: data.user.email || cleanEmail });
        setProfile(userProfile);
        setRole(safeRole);
        return { success: true, role: safeRole };
      }

      // Demo Auth Mode: verify credentials against persistent accounts store
      const accounts = mockStore.getAccounts();
      const matchedAccount = accounts.find(
        a => a.email.toLowerCase() === cleanEmail && a.password === password
      );

      if (matchedAccount) {
        const profiles = mockStore.getProfiles();
        const prof = profiles.find(p => p.id === matchedAccount.profileId);
        const safeRole: UserRole = (prof?.role as UserRole) || (cleanEmail === 'admin@caterpro.ph' ? 'admin' : 'customer');
        const activeProf: Profile = prof || {
          id: matchedAccount.profileId,
          name: cleanEmail.split('@')[0],
          role: safeRole,
        };
        const u = { id: activeProf.id, email: cleanEmail };
        setUser(u);
        setProfile(activeProf);
        setRole(safeRole);
        localStorage.setItem('caterpro_demo_session', JSON.stringify({ user: u, profile: activeProf }));
        return { success: true, role: safeRole };
      }

      return { success: false, error: 'Incorrect email or password. Please try again.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed.' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    phone?: string
  ): Promise<{ success: boolean; requiresConfirmation?: boolean; message?: string; error?: string }> => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { name, phone, role: 'customer' },
            // Send the confirmation link back to the site the user signed up on.
            // Supabase only honors this if it's listed under Auth > URL Configuration > Redirect URLs.
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        if (data.user && data.session) {
          const newProfile: Profile = {
            id: data.user.id,
            name,
            phone: phone || null,
            role: 'customer',
          };
          setUser({ id: data.user.id, email: cleanEmail });
          setProfile(newProfile);
          setRole('customer');
          return { success: true };
        }
        if (data.user && !data.session) {
          return {
            success: true,
            requiresConfirmation: true,
            message: 'Registration successful! Please check your email inbox to confirm your account before signing in.',
          };
        }
        return {
          success: false,
          error: 'Registration failed. Could not create account.',
        };
      }

      // Demo registration with duplicate check and persistent account recording
      const accounts = mockStore.getAccounts();
      if (accounts.some(a => a.email.toLowerCase() === cleanEmail)) {
        return { success: false, error: 'An account with this email already exists.' };
      }

      const newId = 'cust-' + Date.now();
      const newProf: Profile = {
        id: newId,
        name,
        phone: phone || null,
        role: 'customer',
        created_at: new Date().toISOString(),
      };
      const profiles = mockStore.getProfiles();
      mockStore.saveProfiles([...profiles, newProf]);

      // Save new account credentials for repeat login
      const newAccount = { email: cleanEmail, password, profileId: newId };
      mockStore.saveAccounts([...accounts, newAccount]);

      const u = { id: newId, email: cleanEmail };
      setUser(u);
      setProfile(newProf);
      setRole('customer');
      localStorage.setItem('caterpro_demo_session', JSON.stringify({ user: u, profile: newProf }));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed.' };
    } finally {
      setLoading(false);
    }
  };

  // Sends a reset link by email. With Supabase the link opens /reset-password with a
  // recovery session. In offline demo mode there is no mail server, so the caller is
  // told to go straight to the reset form.
  const requestPasswordReset = async (
    email: string
  ): Promise<{ success: boolean; demoReset?: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (isSupabaseConfigured()) {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        // Must be listed under Auth > URL Configuration > Redirect URLs in Supabase.
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
    const exists = mockStore.getAccounts().some(a => a.email.toLowerCase() === cleanEmail);
    if (!exists) return { success: false, error: 'No account found with that email address.' };
    return { success: true, demoReset: true };
  };

  // Signs the user in with the 6-digit code from the reset email, so they can
  // then set a new password. Works even if the email link fails to open.
  const verifyResetCode = async (
    email: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const token = code.replace(/\D/g, '');
    if (token.length < 6) return { success: false, error: 'Enter the 6-digit code from the email.' };
    if (!isSupabaseConfigured()) return { success: false, error: 'Reset codes need the live Supabase backend.' };
    const { data, error } = await supabase.auth.verifyOtp({ email: cleanEmail, token, type: 'recovery' });
    if (error || !data.session) {
      return {
        success: false,
        error: /expired|invalid/i.test(error?.message || '')
          ? 'That code is wrong or has expired. Check the latest email, or send a new code.'
          : error?.message || 'Could not verify the code. Please try again.',
      };
    }
    setUser({ id: data.session.user.id, email: data.session.user.email || cleanEmail });
    return { success: true };
  };

  const updatePassword = async (
    newPassword: string,
    demoEmail?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
    const cleanEmail = (demoEmail || '').trim().toLowerCase();
    const accounts = mockStore.getAccounts();
    if (!accounts.some(a => a.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'This reset link is invalid. Please request a new one.' };
    }
    mockStore.saveAccounts(
      accounts.map(a => (a.email.toLowerCase() === cleanEmail ? { ...a, password: newPassword } : a))
    );
    return { success: true };
  };

  const logout = async (): Promise<void> => {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    localStorage.removeItem('caterpro_demo_session');
    setUser(null);
    setProfile(null);
    setRole(null);
  };

  // Updates the signed-in user's display name on screen after it was saved
  // (the database write happens in useCateringData.updateProfileName).
  const setOwnDisplayName = (name: string) => {
    setProfile(prev => {
      if (!prev) return prev;
      const next = { ...prev, name };
      if (!isSupabaseConfigured() && user) {
        localStorage.setItem('caterpro_demo_session', JSON.stringify({ user, profile: next }));
      }
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        login,
        register,
        logout,
        requestPasswordReset,
        updatePassword,
        verifyResetCode,
        setOwnDisplayName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
