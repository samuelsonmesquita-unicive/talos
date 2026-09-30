import React, { useEffect, useRef } from 'react';
import { X, TrendingUp } from 'lucide-react';
import { CursoMestre } from '../types';

interface PlutosEmbedPanelProps {
  // Sem curso: o painel abre com a própria seleção de curso do Plutos (acesso
  // livre via o botão da barra superior, não vinculado a um curso específico).
  curso: CursoMestre | null;
  onClose: () => void;
  onConcluded: () => void;
}

// URL do Plutos: em produção é o mesmo domínio (path absoluto), em dev local
// aponta para a porta do servidor de dev do Plutos (origens diferentes = sem
// sessão compartilhada localmente, aceitável só em desenvolvimento).
const PLUTOS_BASE_URL = import.meta.env.VITE_PLUTOS_URL || '/talos/plutos/';

export const PlutosEmbedPanel: React.FC<PlutosEmbedPanelProps> = ({ curso, onClose, onConcluded }) => {
  const iframeOriginRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      iframeOriginRef.current = new URL(PLUTOS_BASE_URL, window.location.href).origin;
    } catch {
      iframeOriginRef.current = null;
    }

    const handleMessage = (event: MessageEvent) => {
      // Validação básica: só aceita mensagens vindas da origem esperada do Plutos
      if (iframeOriginRef.current && event.origin !== iframeOriginRef.current) return;
      if (event.data?.type === 'plutos:done') {
        onConcluded();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onConcluded]);

  const iframeSrc = curso
    ? `${PLUTOS_BASE_URL}?curso_id=${encodeURIComponent(curso.id)}&embed=1`
    : `${PLUTOS_BASE_URL}?embed=1`;

  return (
    <div
      id="modal-plutos-embed"
      className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex-1 flex flex-col m-3 sm:m-6 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Cabeçalho do painel */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-[#0d281e] to-[#143529] text-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-[#e7972a]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#e7972a]">
                {curso ? 'Próximo passo' : 'Acesso direto'} &bull; Cadastro das Disciplinas
              </p>
              <h3 className="text-sm font-bold truncate">
                {curso
                  ? `Disciplinas a gravar: ${curso.nome_curso} (${curso.grau})`
                  : 'Quantas disciplinas precisam ser gravadas?'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              title="Concluir depois"
              className="text-xs font-semibold text-emerald-100/80 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
            >
              Concluir depois
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Fechar"
              className="w-8 h-8 rounded-md flex items-center justify-center text-emerald-100/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Iframe do Plutos */}
        <iframe
          title="Cadastro das Disciplinas"
          src={iframeSrc}
          className="flex-1 w-full border-0"
        />
      </div>
    </div>
  );
};
