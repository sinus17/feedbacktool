import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  
  // Check if we're on a public route (skip auth for Instagram browser compatibility)
  const isPublicRoute = window.location.pathname.startsWith('/artist/') || 
                        window.location.pathname.startsWith('/preview/') ||
                        window.location.pathname.startsWith('/library');
  const isInstagramBrowser = /Instagram/i.test(navigator.userAgent);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    async function initializeAuth() {
      // Skip auth initialization for public routes in Instagram browser
      if (isPublicRoute && isInstagramBrowser) {
        console.log('📱 Skipping auth for public route in Instagram browser');
        if (mounted) {
          setCurrentUser(null);
          setAuthInitialized(true);
          setLoading(false);
        }
        return;
      }

      try {
        // Set a timeout to prevent infinite loading in Instagram browser
        const authPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Auth timeout')), 5000);
        });

        const { data: { session } } = await Promise.race([authPromise, timeoutPromise]) as any;
        
        if (mounted) {
          clearTimeout(timeoutId);
          setCurrentUser(session?.user ?? null);
          setAuthInitialized(true);
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          clearTimeout(timeoutId);
          // Continue without auth in case of timeout (e.g., Instagram browser)
          setCurrentUser(null);
          setAuthInitialized(true);
          setLoading(false);
        }
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setCurrentUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      console.error('Sign in error:', error);
      throw new Error('Failed to sign in. Please check your credentials and try again.');
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
      throw new Error('Failed to sign out. Please try again');
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Sign up error:', error);
      throw new Error('Failed to create account. Please try again');
    }
  };

  const value = {
    currentUser,
    loading,
    signIn,
    signOut,
    signUp,
  };

  if (!authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}