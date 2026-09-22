import React from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { CursoMestre } from '../types';

interface CourseSelectorProps {
  cursos: CursoMestre[];
  selectedCursoId: string | null;
  onSelect: (cursoId: string) => void;
  loading?: boolean;
  error?: string | null;
}

export const CourseSelector: React.FC<CourseSelectorProps> = ({
  cursos,
  selectedCursoId,
  onSelect,
  loading = false,
  error = null,
}) => {
  if (error) {
    return (
      <div className="card-unicive p-6 border-red-200 bg-red-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 text-sm">Erro ao carregar cursos</h3>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card-unicive p-6">
        <p className="text-sm text-slate-500">Carregando cursos...</p>
      </div>
    );
  }

  if (cursos.length === 0) {
    return (
      <div className="card-unicive p-6 bg-slate-50">
        <p className="text-sm text-slate-600">
          Nenhum curso cadastrado no Hermes. Crie um curso primeiro no módulo Hermes.
        </p>
      </div>
    );
  }

  return (
    <div className="card-unicive overflow-hidden">
      <div className="card-unicive-header p-4">
        <h3 className="font-semibold text-slate-900 text-sm">Selecione um curso</h3>
      </div>
      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
        {cursos.map((curso) => {
          const isSelected = selectedCursoId === curso.id;
          const hasCost = curso.custo_total_curso > 0;

          return (
            <button
              key={curso.id}
              onClick={() => onSelect(curso.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                isSelected
                  ? 'border-[#239371] bg-[#ebf7f2]'
                  : 'border-[#e2e8e4] bg-white hover:border-[#239371] hover:bg-[#f5f8f6]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isSelected
                      ? 'border-[#239371] bg-[#239371]'
                      : 'border-[#c8dcd7]'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900 text-sm">
                    {curso.nome_curso}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {curso.grau} • {curso.duracao_curso} anos
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-slate-700 font-mono">
                      Custo: R$ {curso.custo_total_curso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    {curso.dados_parciais && (
                      <span className="badge-unicive-green text-[10px]">Parcial</span>
                    )}
                    {!hasCost && (
                      <span className="text-xs text-amber-600 font-semibold">Sem custo</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
