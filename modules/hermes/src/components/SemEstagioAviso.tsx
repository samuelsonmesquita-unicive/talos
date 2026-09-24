import React from 'react';
import { Briefcase } from 'lucide-react';

/* Aviso mostrado ao setor Estágio quando o Pedagógico não registrou carga
   horária de estágio para o curso (curso sem estágio ou ainda não informado). */

interface SemEstagioAvisoProps {
  /** true = o Pedagógico ainda não informou as disciplinas de estágio do curso */
  pendentePedagogico: boolean;
  onVoltar?: () => void;
  children?: React.ReactNode;
}

export const SemEstagioAviso: React.FC<SemEstagioAvisoProps> = ({
  pendentePedagogico,
  onVoltar,
  children,
}) => (
  <div className="card-unicive p-6 text-center space-y-3 border border-slate-200">
    <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
      <Briefcase className="w-6 h-6" />
    </div>
    <h2 className="text-lg font-bold text-slate-900">Curso sem carga horária de estágio</h2>
    {pendentePedagogico && (
      <p className="text-xs text-slate-500">
        O Pedagógico ainda não concluiu o cadastro das disciplinas de estágio deste curso.
      </p>
    )}
    <div className="flex flex-wrap justify-center gap-2 pt-1">
      {children}
      {onVoltar && (
        <button type="button" onClick={onVoltar} className="btn-unicive-outline text-xs py-2 px-4">
          Voltar ao início
        </button>
      )}
    </div>
  </div>
);
