'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/auth-helpers-nextjs';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  error: null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getUser = async () => {
      try {
        // Get user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        setUser(user);

        if (user) {
          // Get or create profile
          const { data: existingProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            // Only throw if it's not a "not found" error
            throw profileError;
          }

          if (!existingProfile) {
            // Create profile if it doesn't exist
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert([
                {
                  id: user.id,
                  email: user.email,
                  role: 'user',
                  created_at: new Date().toISOString(),
                }
              ])
              .select()
              .single();

            if (createError) throw createError;
            setProfile(newProfile);
          } else {
            setProfile(existingProfile);
          }
        }
      } catch (err: any) {
        console.error('Auth error:', err);
        setError(err.message);
        // If there's an auth error, sign out
        if (err.status === 401) {
          await supabase.auth.signOut();
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        getUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        router.push('/login');
      }
    });

    // Initial check
    getUser();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 