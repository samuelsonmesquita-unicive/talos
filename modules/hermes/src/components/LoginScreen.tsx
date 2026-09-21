import React, { useState } from 'react';
import { AlertCircle, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const LoginScreen: React.FC = () => {
  const { signInWithGoogle, authError } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  const handleLogin = async () => {
    setRedirecting(true);
    await signInWithGoogle();
    setRedirecting(false);
  };

  return (
    <div className="min-h-screen bg-[#f5f8f6] flex items-center justify-center p-4 font-sans antialiased">
      <div className="bg-white rounded-2xl shadow-md border border-[#e2e8e4] max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-r from-[#0d281e] to-[#143529] text-white p-6">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#e7972a] block">
            Projeto Talos &bull; Módulo Hermes
          </span>
          <h1 className="text-xl font-bold mt-1">Gestão de Demandas Docentes</h1>
          <p className="text-xs text-emerald-100/80 mt-1">
            Centro Universitário Cidade Verde &bull; Unicive
          </p>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Acesso restrito a colaboradores. Entre com sua conta institucional do Google Workspace.
          </p>

          {authError && (
            <div
              role="alert"
              className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="button"
            id="btn-login-google"
            onClick={handleLogin}
            disabled={redirecting}
            className="w-full flex items-center justify-center gap-2 bg-[#239371] hover:bg-[#1c7a5e] disabled:opacity-60 text-white font-semibold text-sm py-3 rounded-lg transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            {redirecting ? 'Redirecionando...' : 'Entrar com Google Workspace'}
          </button>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 justify-center">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Somente contas @unicive.edu.br</span>
          </div>
        </div>
      </div>
    </div>
  );
};
