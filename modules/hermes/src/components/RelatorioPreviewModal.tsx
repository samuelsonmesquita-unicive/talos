import React, { useEffect, useState } from 'react';
import { X, Download, AlertCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { fetchRelatorioExecutivo, exportRelatorioCSV, RelatorioLinha } from '../services/relatorioService';

interface RelatorioPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const fmtMoeda = (n: number) =>
  `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** O que falta preencher para este curso, em texto curto. */
function pendencias(l: RelatorioLinha): string[] {
  const itens: string[] = [];
  if (l.dados_hermes_parciais) itens.push('Setores incompletos (Hermes)');
  if (!l.disciplinas_definidas) itens.push('Sem disciplinas');
  if (!l.ticket_definido) itens.push('Sem ticket médio');
  return itens;
}

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

  // Exportar só é permitido quando TODOS os cursos listados têm os dois
  // setores (Pedagógico + Estágio) completos no Hermes.
  const cursosIncompletos = linhas.filter((l) => l.dados_hermes_parciais);
  const podeExportar = linhas.length > 0 && cursosIncompletos.length === 0;

  return (
    <div
      id="modal-relatorio-preview"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[96vw] max-h-[92vh] flex flex-col overflow-hidden">
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
          {!loading && !error && linhas.length > 0 && !podeExportar && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2 mb-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Exportação bloqueada: {cursosIncompletos.length} curso{cursosIncompletos.length > 1 ? 's' : ''} ainda{' '}
                {cursosIncompletos.length > 1 ? 'têm' : 'tem'} setor incompleto no Hermes. A prévia abaixo é só pra
                dar uma ideia dos valores — o CSV só libera quando todos os cursos listados estiverem com
                Pedagógico e Estágio completos.
              </span>
            </div>
          )}

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
              Nenhum curso com progresso registrado no Hermes ainda.
            </div>
          )}

          {!loading && !error && linhas.length > 0 && (
            <table className="w-full text-xs">
              <thead>
                {/* Cabeçalhos podem quebrar linha para estreitar as colunas numéricas */}
                <tr className="bg-slate-50 border-b border-[#e2e8e4] text-left text-slate-600 sticky top-0 align-bottom">
                  <th className="px-2 py-2.5 font-semibold min-w-[160px]">Curso</th>
                  <th className="px-2 py-2.5 font-semibold">Grau</th>
                  <th className="px-2 py-2.5 font-semibold text-right">Duração</th>
                  <th className="px-2 py-2.5 font-semibold text-right">Módulos</th>
                  <th className="px-2 py-2.5 font-semibold text-right">Professores</th>
                  <th className="px-2 py-2.5 font-semibold text-right">Mediadores</th>
                  <th className="px-2 py-2.5 font-semibold text-right">Custo Mensal Médio</th>
                  <th className="px-2 py-2.5 font-semibold text-right">Custo Total</th>
                  <th className="px-2 py-2.5 font-semibold text-right">Custo/ Módulo</th>
                  <th className="px-2 py-2.5 font-semibold text-right">Ticket Médio</th>
                  <th className="px-2 py-2.5 font-semibold text-right">Ponto de Equilíbrio</th>
                  <th className="px-2 py-2.5 font-semibold min-w-[130px]">Pendências</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => {
                  const itensFaltantes = pendencias(l);
                  return (
                    <tr key={l.curso_id} className="border-b border-[#e2e8e4] last:border-0 hover:bg-slate-50">
                      <td className="px-2 py-2.5font-semibold text-slate-900 leading-snug">{l.nome_curso}</td>
                      <td className="px-2 py-2.5text-slate-600 whitespace-nowrap">{l.grau}</td>
                      <td className="px-2 py-2.5text-slate-600 text-right tabular">{l.duracao_curso} anos</td>
                      <td className="px-2 py-2.5text-slate-600 text-right tabular">{l.quantidade_modulos}</td>
                      <td className="px-2 py-2.5text-slate-600 text-right tabular">{l.total_professores}</td>
                      <td className="px-2 py-2.5text-slate-600 text-right tabular">{l.total_mediadores}</td>
                      <td className="px-2 py-2.5text-slate-600 text-right tabular whitespace-nowrap">
                        {fmtMoeda(l.custo_mensal_medio_curso)}
                      </td>
                      <td className="px-2 py-2.5text-slate-600 text-right tabular whitespace-nowrap">
                        {fmtMoeda(l.custo_total_curso)}
                      </td>
                      <td className="px-2 py-2.5text-slate-600 text-right tabular whitespace-nowrap">
                        {fmtMoeda(l.custo_por_modulo)}
                      </td>
                      <td className="px-2 py-2.5text-slate-600 text-right tabular whitespace-nowrap">
                        {l.ticket_medio !== null ? fmtMoeda(l.ticket_medio) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-2 py-2.5font-bold text-[#239371] text-right tabular whitespace-nowrap">
                        {l.ponto_equilibrio !== null ? (
                          `${l.ponto_equilibrio} alunos`
                        ) : (
                          <span className="text-slate-400 font-normal">aguardando ticket</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5">
                        {itensFaltantes.length === 0 ? (
                          <span className="badge-unicive-green text-[9px]">Completo</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {itensFaltantes.map((item) => (
                              <span
                                key={item}
                                className="text-[9px] font-bold uppercase whitespace-nowrap px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#ebf7f2] border-t-2 border-[#239371] font-bold text-slate-900">
                  <td className="px-2 py-2.5whitespace-nowrap" colSpan={4}>TOTAL</td>
                  <td className="px-2 py-2.5text-right tabular">
                    {linhas.reduce((s, l) => s + l.total_professores, 0)}
                  </td>
                  <td className="px-2 py-2.5text-right tabular">
                    {linhas.reduce((s, l) => s + l.total_mediadores, 0)}
                  </td>
                  <td className="px-2 py-2.5text-right tabular whitespace-nowrap">
                    {fmtMoeda(linhas.reduce((s, l) => s + l.custo_mensal_medio_curso, 0))}
                  </td>
                  <td className="px-2 py-2.5text-right tabular whitespace-nowrap">
                    {fmtMoeda(linhas.reduce((s, l) => s + l.custo_total_curso, 0))}
                  </td>
                  <td className="px-2 py-2.5" colSpan={2}></td>
                  <td className="px-2 py-2.5text-[#239371] text-right tabular whitespace-nowrap">
                    {linhas.reduce((s, l) => s + (l.ponto_equilibrio ?? 0), 0)} alunos
                  </td>
                  <td className="px-2 py-2.5"></td>
                </tr>
              </tfoot>
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
              disabled={!podeExportar}
              title={
                podeExportar
                  ? undefined
                  : 'Só é possível exportar quando todos os cursos listados tiverem os dois setores completos no Hermes.'
              }
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
