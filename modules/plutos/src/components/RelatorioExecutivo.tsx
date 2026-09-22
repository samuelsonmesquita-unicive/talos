import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download, AlertCircle, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { RelatorioLinha } from '../types';
import { fetchRelatorioExecutivo, exportRelatorioCSV } from '../services/plutosService';

interface RelatorioExecutivoProps {
  onVoltar: () => void;
  // Presente quando estamos embutidos no Hermes: mostra um botão extra pra
  // concluir o fluxo e voltar (avisa o Hermes via postMessage).
  onConcluirHermes?: () => void;
  // Mensagem de contexto (ex.: "Você concluiu o último curso pendente!")
  mensagemContexto?: string;
}

const fmtMoeda = (n: number) =>
  `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const RelatorioExecutivo: React.FC<RelatorioExecutivoProps> = ({
  onVoltar,
  onConcluirHermes,
  mensagemContexto,
}) => {
  const [linhas, setLinhas] = useState<RelatorioLinha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchRelatorioExecutivo()
      .then(setLinhas)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar relatório.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={onVoltar}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#239371] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportRelatorioCSV(linhas)}
            disabled={linhas.length === 0}
            className="btn-unicive-outline text-xs py-2 px-3.5 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV (Excel)
          </button>

          {onConcluirHermes && (
            <button
              type="button"
              onClick={onConcluirHermes}
              className="btn-unicive-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Concluir e voltar ao Hermes
            </button>
          )}
        </div>
      </div>

      <div className="card-unicive p-4">
        <div className="flex items-center gap-2 mb-1">
          <FileSpreadsheet className="w-4 h-4 text-[#239371]" />
          <h2 className="text-sm font-bold text-slate-900">Relatório Executivo — Todos os Cursos</h2>
        </div>
        <p className="text-xs text-slate-500">
          Cursos com Ponto de Equilíbrio já calculado no Plutos. Custos de Professor/Mediador vêm do Hermes.
        </p>
        {mensagemContexto && (
          <p className="text-xs text-[#117d5d] bg-[#ebf7f2] border border-[#c8dcd7] rounded-lg px-3 py-2 mt-2">
            ✓ {mensagemContexto}
          </p>
        )}
      </div>

      {loading && (
        <div className="card-unicive p-6 text-center text-sm text-slate-500">Carregando relatório...</div>
      )}

      {error && (
        <div className="card-unicive p-4 border-red-200 bg-red-50 flex items-start gap-2 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && linhas.length === 0 && (
        <div className="card-unicive p-6 text-center text-sm text-slate-500">
          Nenhum curso com Ponto de Equilíbrio calculado ainda. Preencha os dados de pelo menos um curso no Plutos.
        </div>
      )}

      {!loading && !error && linhas.length > 0 && (
        <div className="card-unicive overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-[#e2e8e4] text-left text-slate-600">
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
            <tfoot>
              <tr className="bg-[#ebf7f2] border-t-2 border-[#239371] font-bold text-slate-900">
                <td className="p-3 whitespace-nowrap" colSpan={4}>TOTAL</td>
                <td className="p-3 text-right tabular">
                  {linhas.reduce((s, l) => s + l.total_professores, 0)}
                </td>
                <td className="p-3 text-right tabular">
                  {linhas.reduce((s, l) => s + l.total_mediadores, 0)}
                </td>
                <td className="p-3 text-right tabular whitespace-nowrap">
                  {fmtMoeda(linhas.reduce((s, l) => s + l.custo_mensal_medio_curso, 0))}
                </td>
                <td className="p-3 text-right tabular whitespace-nowrap">
                  {fmtMoeda(linhas.reduce((s, l) => s + l.custo_total_curso, 0))}
                </td>
                <td className="p-3" colSpan={2}></td>
                <td className="p-3 text-[#239371] text-right tabular whitespace-nowrap">
                  {linhas.reduce((s, l) => s + l.ponto_equilibrio, 0)} alunos
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
