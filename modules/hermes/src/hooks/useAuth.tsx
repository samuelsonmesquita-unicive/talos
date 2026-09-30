import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { clearLocalCache } from '../services/courseStore';

export type UserRole = 'admin' | 'staff';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Lê o erro devolvido pelo Supabase na URL (ex.: rejeição do Auth Hook de domínio) e limpa a URL. */
function consumeAuthErrorFromUrl(): string | null {
  const fromSearch = new URLSearchParams(window.location.search);
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const description =
    fromSearch.get('error_description') ?? fromHash.get('error_description');
  const hasError = fromSearch.has('error') || fromHash.has('error');

  if (!hasError) return null;

  window.history.replaceState({}, document.title, window.location.pathname);
  return description ?? 'Não foi possível concluir o login.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(() => consumeAuthErrorFromUrl());

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionLoading(false);
    });

    // Sem chamadas ao Supabase dentro do callback (evita deadlock do cliente).
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }

    let active = true;
    setProfileLoading(true);

    supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('Erro ao carregar perfil:', error.message);
          setProfile(null);
        } else {
          setProfile((data as UserProfile | null) ?? null);
        }
        setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
        queryParams: { hd: 'unicive.edu.br', prompt: 'select_account' },
      },
    });
    if (error) setAuthError(error.message);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    clearLocalCache();
    setProfile(null);
  }, []);

  const value: AuthContextValue = {
    session,
    profile,
    isAdmin: profile?.role === 'admin',
    loading: sessionLoading || profileLoading,
    authError,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  return ctx;
}
