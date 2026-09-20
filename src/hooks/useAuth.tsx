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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
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
            }
          } catch (err) {
            console.warn('Profile fetch failed:', err);
          }
        } else {
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

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const userProfile = prof as Profile || {
            id: data.user.id,
            name: data.user.user_metadata?.name || 'User',
            role: (data.user.user_metadata?.role as UserRole) || 'customer',
          };

          setUser({ id: data.user.id, email: data.user.email || email });
          setProfile(userProfile);
          setRole(userProfile.role);
          return { success: true };
        }
      }

      // Demo Auth Mode: verify credentials against persistent accounts store
      const cleanEmail = email.trim().toLowerCase();
      const accounts = mockStore.getAccounts();
      const matchedAccount = accounts.find(
        a => a.email.toLowerCase() === cleanEmail && a.password === password
      );

      if (matchedAccount) {
        const profiles = mockStore.getProfiles();
        const prof = profiles.find(p => p.id === matchedAccount.profileId) || {
          id: matchedAccount.profileId,
          name: cleanEmail.split('@')[0],
          role: (cleanEmail.includes('admin') ? 'admin' : 'customer') as UserRole,
        };
        const u = { id: prof.id, email: cleanEmail };
        setUser(u);
        setProfile(prof);
        setRole(prof.role);
        localStorage.setItem('caterpro_demo_session', JSON.stringify({ user: u, profile: prof }));
        return { success: true };
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
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { name, phone, role: 'customer' },
          },
        });
        if (error) throw error;
        if (data.user) {
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
