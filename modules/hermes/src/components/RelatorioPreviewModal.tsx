import React, { useEffect, useState } from 'react';
import { X, Download, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { fetchRelatorioExecutivo, exportRelatorioCSV, RelatorioLinha } from '../services/relatorioService';

interface RelatorioPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const fmtMoeda = (n: number) =>
  `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const RelatorioPreviewModal: React.FC<RelatorioPreviewModalProps> = ({ isOpen, onClose }) => {
  const [linhas, setLinhas] = useState<RelatorioLinha[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    fetchRelatorioExecutivo()
      .then(setLinhas)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar relatório.'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="modal-relatorio-preview"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-[#0d281e] to-[#143529] text-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4 text-[#e7972a]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#e7972a]">
                Pré-visualização &bull; Módulo Plutos
              </p>
              <h3 className="text-sm font-bold truncate">Relatório Executivo — Todos os Cursos</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            className="w-8 h-8 rounded-md flex items-center justify-center text-emerald-100/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo: tabela de pré-visualização */}
        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="p-6 text-center text-sm text-slate-500">Carregando relatório...</div>
          )}

          {error && (
            <div className="p-4 rounded-lg border border-red-200 bg-red-50 flex items-start gap-2 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && linhas.length === 0 && (
            <div className="p-6 text-center text-sm text-slate-500">
              Nenhum curso com Ponto de Equilíbrio calculado no Plutos ainda.
            </div>
          )}

          {!loading && !error && linhas.length > 0 && (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-[#e2e8e4] text-left text-slate-600 sticky top-0">
                  <th className="p-3 font-semibold whitespace-nowrap">Curso</th>
                  <th className="p-3 font-semibold whitespace-nowrap">Grau</th>
                  <th className="p-3 font-semibold whitespace-nowrap text-right">Duração</th>
                  <th className="p-3 font-semibold whitespace-nowrap text-right">Módulos</th>
                  <th className="p-3 font-semibold whitespace-nowrap text-right">Professores</th>
                  <th className="p-3 font-semibold whitespace-nowrap text-right">Mediadores</th>
                  <th className="p-3 font-semibold whitespace-nowrap text-right">Custo Mensal Médio</th>
                  <th className="p-3 font-semibold whitespace-nowrap text-right">Custo Total</th>
                  <th className="p-3 font-semibold whitespace-nowrap text-right">Custo/Módulo</th>
                  <th className="p-3 font-semibold whitespace-nowrap text-right">Ticket Médio</th>
                  <th className="p-3 font-semibold whitespace-nowrap text-right">Ponto de Equilíbrio</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.curso_id} className="border-b border-[#e2e8e4] last:border-0 hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                      {l.nome_curso}
                      {l.dados_hermes_parciais && (
                        <span className="ml-1.5 badge-unicive-green text-[9px]">Parcial</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{l.grau}</td>
                    <td className="p-3 text-slate-600 text-right tabular">{l.duracao_curso} anos</td>
                    <td className="p-3 text-slate-600 text-right tabular">{l.quantidade_modulos}</td>
                    <td className="p-3 text-slate-600 text-right tabular">{l.total_professores}</td>
                    <td className="p-3 text-slate-600 text-right tabular">{l.total_mediadores}</td>
                    <td className="p-3 text-slate-600 text-right tabular whitespace-nowrap">
                      {fmtMoeda(l.custo_mensal_medio_curso)}
                    </td>
                    <td className="p-3 text-slate-600 text-right tabular whitespace-nowrap">
                      {fmtMoeda(l.custo_total_curso)}
                    </td>
                    <td className="p-3 text-slate-600 text-right tabular whitespace-nowrap">
                      {fmtMoeda(l.custo_por_modulo)}
                    </td>
                    <td className="p-3 text-slate-600 text-right tabular whitespace-nowrap">
                      {fmtMoeda(l.ticket_medio)}
                    </td>
                    <td className="p-3 font-bold text-[#239371] text-right tabular whitespace-nowrap">
                      {l.ponto_equilibrio} alunos
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-[#e2e8e4] bg-slate-50 shrink-0">
          <span className="text-xs text-slate-500">
            {linhas.length > 0 && `${linhas.length} curso${linhas.length > 1 ? 's' : ''} no relatório`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-unicive-outline text-xs py-2 px-3.5"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={() => exportRelatorioCSV(linhas)}
              disabled={linhas.length === 0}
              className="btn-unicive-primary text-xs py-2 px-3.5 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar CSV (Excel)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
