import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { LoginScreen } from './LoginScreen';

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f8f6] flex items-center justify-center text-sm text-slate-500">
        Carregando...
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#f5f8f6] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#e2e8e4] shadow-md max-w-md w-full p-6 space-y-3 text-center">
          <h1 className="text-base font-bold text-slate-900">Perfil não encontrado</h1>
          <p className="text-sm text-slate-600">
            Sua conta autenticou, mas não possui perfil de acesso. Entre em contato com o
            Departamento de Novos Negócios.
          </p>
          <button
            type="button"
            onClick={signOut}
            className="btn-unicive-outline text-xs py-2 px-3.5"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
