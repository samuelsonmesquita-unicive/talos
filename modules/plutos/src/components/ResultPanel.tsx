import React from 'react';
import { TrendingUp } from 'lucide-react';
import { PlutosResultado } from '../types';

interface ResultPanelProps {
  resultado: PlutosResultado | null;
  loading?: boolean;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({ resultado, loading = false }) => {
  if (!resultado && !loading) {
    return null;
  }

  if (loading) {
    return (
      <div className="card-unicive p-6 bg-slate-50">
        <p className="text-sm text-slate-500">Calculando...</p>
      </div>
    );
  }

  if (!resultado) {
    return null;
  }

  const pe = resultado.ponto_equilibrio;

  return (
    <div className="card-unicive overflow-hidden border-[#239371] border-2">
      <div className="card-unicive-header bg-gradient-to-r from-[#ebf7f2] to-[#f5f8f6] p-4 border-b-2 border-[#239371]">
        <h3 className="font-semibold text-[#117d5d] text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Resultado da Análise
        </h3>
      </div>

      <div className="p-6 space-y-6">
        {/* Aviso de dados parciais */}
        {resultado.dados_hermes_parciais && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span>
              Os custos do Hermes para este curso ainda são parciais. O ponto de equilíbrio será
              atualizado automaticamente quando todos os dados forem finalizados.
            </span>
          </div>
        )}

        {/* Ponto de Equilíbrio */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-600">
            <TrendingUp className="w-4 h-4 text-[#239371]" />
            <span className="text-xs font-semibold">Ponto de Equilíbrio</span>
          </div>
          <div className="text-4xl font-bold text-[#239371] font-mono">
            {Math.round(pe).toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-slate-600">
            Número de alunos necessários para cobrir os custos de Professor/Mediador e evasão.
          </p>
        </div>

        {/* Interpretação */}
        <div className="p-4 rounded-lg bg-[#ebf7f2] border border-[#c8dcd7] space-y-2">
          <p className="text-xs font-semibold text-[#117d5d]">Interpretação:</p>
          <p className="text-xs text-slate-700 leading-relaxed">
            Para cobrir os custos de docência (Professor e Mediador) deste curso, são necessários{' '}
            <strong className="text-[#239371]">{Math.round(pe).toLocaleString('pt-BR')} alunos matriculados</strong>{' '}
            considerando a taxa de evasão de 2026. Esse é o número mínimo para atingir a viabilidade financeira
            do módulo de custo docente.
          </p>
        </div>

        {/* Próximos passos */}
        <div className="text-xs text-slate-600 p-3 rounded-lg bg-slate-50 space-y-1">
          <p className="font-semibold text-slate-700">Próximas etapas:</p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-600">
            <li>Validar a viabilidade com base na demanda estimada pelo mercado (Atena).</li>
            <li>Calcular o payback do investimento em disciplinas.</li>
            <li>Projeta receita líquida com base no número esperado de alunos.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
