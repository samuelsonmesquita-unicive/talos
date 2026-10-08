import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download, AlertCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { RelatorioLinha } from '../types';
import { fetchRelatorioExecutivo, exportRelatorioCSV } from '../services/plutosService';

interface RelatorioExecutivoProps {
  onVoltar: () => void;
  // Texto do botão de voltar (ex.: "Voltar ao Hermes"); padrão "Voltar"
  voltarLabel?: string;
  // Mensagem de contexto (ex.: "Você concluiu o último curso pendente!")
  mensagemContexto?: string;
}

const fmtMoeda = (n: number) =>
  `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Número compacto para a tabela (sem "R$"; inteiro por padrão)
const fmtNum = (n: number, casas = 0) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

// Classes das células (todo cabeçalho tem title explicando o termo e fica centralizado, quebrando ou não): espaçamento mínimo para caber tudo na largura da tela
const TH = 'px-1.5 py-1.5 font-semibold text-center cursor-help';
const GRUPO = 'border-b border-[#e2e8e4]';
const TD = 'px-1.5 py-1.5';
const NUM = `${TD} text-right tabular whitespace-nowrap`;

// Destaque das colunas agrupadas: linha vertical marcando o início de cada
// grupo e uma cor por grupo, só no cabeçalho (o corpo fica com a cor
// alternada das linhas)
const SEP = 'border-l-2 border-l-slate-400';
const COR_CUSTO = 'bg-sky-200! text-sky-900';
const COR_INVEST = 'bg-amber-200! text-amber-900';
const COR_PAYBACK = 'bg-[#bfe5d4]! text-[#0b5e45]';

/** Célula sem valor: traço, com o motivo no tooltip. */
const Vazio: React.FC<{ motivo: string }> = ({ motivo }) => (
  <span className="text-slate-400 font-normal" title={motivo}>
    —
  </span>
);

// Cenários de turma acima do PE usados no payback (calculados no banco).
// `fator` só serve para mostrar o tamanho da turma no tooltip: PE × fator,
// arredondado para cima (mesma regra do banco).
const CENARIOS_PAYBACK = [
  { rotulo: '+10%', campo: 'payback_meses_10', fator: 1.1 },
  { rotulo: '+20%', campo: 'payback_meses_20', fator: 1.2 },
  { rotulo: '+30%', campo: 'payback_meses_30', fator: 1.3 },
] as const;

/** Alunos da turma no cenário; o toFixed tira o erro de ponto flutuante (50 × 1.1 = 55.00000000000001 viraria 56). */
const alunosCenario = (pe: number, fator: number) => Math.ceil(Number((pe * fator).toFixed(6)));

/** O que falta preencher para este curso, em texto curto. */
function pendencias(l: RelatorioLinha): string[] {
  const itens: string[] = [];
  if (l.dados_hermes_parciais) itens.push('Setores incompletos (Hermes)');
  if (!l.disciplinas_definidas) itens.push('Sem disciplinas');
  if (!l.ticket_definido) itens.push('Sem ticket médio');
  return itens;
}

export const RelatorioExecutivo: React.FC<RelatorioExecutivoProps> = ({
  onVoltar,
  voltarLabel = 'Voltar',
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

  // Exportar só é permitido quando TODOS os cursos listados têm os dois
  // setores (Pedagógico + Estágio) completos no Hermes — a prévia na tela
  // pode mostrar dados parciais, mas o arquivo exportado não.
  const cursosIncompletos = linhas.filter((l) => l.dados_hermes_parciais);
  const podeExportar = linhas.length > 0 && cursosIncompletos.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={onVoltar}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#239371] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {voltarLabel}
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportRelatorioCSV(linhas)}
            disabled={!podeExportar}
            title={
              podeExportar
                ? undefined
                : 'Só é possível exportar quando todos os cursos listados tiverem os dois setores (Pedagógico e Estágio) completos no Hermes.'
            }
            className="btn-unicive-outline text-xs py-2 px-3.5 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV (Excel)
          </button>
        </div>
      </div>

      <div className="card-unicive p-4">
        <div className="flex items-center gap-2 mb-1">
          <FileSpreadsheet className="w-4 h-4 text-[#239371]" />
          <h2 className="text-sm font-bold text-slate-900">Relatório Executivo — Todos os Cursos</h2>
        </div>
        <p className="text-xs text-slate-500">
          Prévia de todos os cursos com algum progresso no Hermes — mesmo com dados incompletos, pra dar uma ideia
          dos valores. Custos de Professor/Mediador vêm do Hermes.
        </p>
        {mensagemContexto && (
          <p className="text-xs text-[#117d5d] bg-[#ebf7f2] border border-[#c8dcd7] rounded-lg px-3 py-2 mt-2">
            ✓ {mensagemContexto}
          </p>
        )}
        {linhas.length > 0 && !podeExportar && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2 mt-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Exportação bloqueada: {cursosIncompletos.length} curso{cursosIncompletos.length > 1 ? 's' : ''} ainda{' '}
              {cursosIncompletos.length > 1 ? 'têm' : 'tem'} setor incompleto no Hermes. A prévia na tela continua
              disponível, mas o CSV só libera quando todos os cursos listados estiverem com Pedagógico e Estágio completos.
            </span>
          </div>
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
          Nenhum curso com progresso registrado no Hermes ainda.
        </div>
      )}

      {!loading && !error && linhas.length > 0 && (
        // Tabela compacta: cabeçalhos agrupados e quebrando linha, valores sem
        // "R$" e sem centavos (a unidade está no cabeçalho; o valor exato fica
        // no tooltip). A rolagem horizontal só aparece em telas bem estreitas.
        <div className="card-unicive overflow-x-auto">
          <table className="w-full text-[11px] leading-tight">
            <thead className="text-slate-800 align-bottom">
              <tr className="bg-slate-300">
                <th rowSpan={2} className={`${TH} min-w-[150px]`} title="Nome do curso, com o grau (Bacharel, Licenciatura ou Tecnólogo) logo abaixo">Curso</th>
                <th rowSpan={2} className={TH} title="Duração do curso em anos (a) e quantidade de módulos; cada módulo dura 3 meses">Duração / Módulos</th>
                <th rowSpan={2} className={TH} title="Total de Professores e de Mediadores alocados no curso, somando todos os módulos">Prof. / Med.</th>
                <th colSpan={3} className={`${TH} ${GRUPO} ${SEP} ${COR_CUSTO}`} title="Custo de Professores e Mediadores, já com encargos e benefícios">Custo docente (R$)</th>
                <th colSpan={4} className={`${TH} ${GRUPO} ${SEP} ${COR_INVEST}`} title="Gasto para abrir o curso: produção das disciplinas mais a taxa de registro no MEC">Investimento (R$)</th>
                <th rowSpan={2} className={`${TH} ${SEP}`} title="Valor médio da mensalidade do curso, definido pela portaria de valores">Ticket Médio (R$)</th>
                <th rowSpan={2} className={TH} title="Ponto de equilíbrio: alunos matriculados para que a margem por aluno pague o custo docente do mês, considerando evasão 36%">PE (alunos)</th>
                <th
                  colSpan={CENARIOS_PAYBACK.length}
                  className={`${TH} ${GRUPO} ${SEP} ${COR_PAYBACK}`}
                  title="Meses para a sobra mensal de uma turma acima do ponto de equilíbrio devolver o investimento"
                >
                  Payback (meses) com turma acima do PE
                </th>
                <th rowSpan={2} className={`${TH} ${SEP}`} title="O que ainda falta preencher para o curso: disciplinas ou ticket médio">Pendências</th>
              </tr>
              <tr className="bg-slate-300 border-b border-slate-400">
                <th className={`${TH} ${SEP} ${COR_CUSTO}`} title="Custo docente médio por mês ao longo do curso">Mensal médio</th>
                <th className={`${TH} ${COR_CUSTO}`} title="Custo docente de todo o curso: cada Professor e Mediador pago do módulo em que entra até o fim">Total</th>
                <th className={`${TH} ${COR_CUSTO}`} title="Custo docente total dividido pela quantidade de módulos">Por módulo</th>
                <th className={`${TH} ${SEP} ${COR_INVEST}`} title="Quantidade de disciplinas a produzir para o curso, informado pelo pedagógico">Disciplinas (qtd)</th>
                <th className={`${TH} ${COR_INVEST}`} title="Investimento em produção de disciplinas: quantidade × custo por disciplina">Disciplinas</th>
                <th className={`${TH} ${COR_INVEST}`} title="Taxa paga ao MEC para reconhecimento do curso">Reconhecimento MEC</th>
                <th className={`${TH} ${COR_INVEST}`} title="Investimento total: disciplinas + reconhec. MEC">Total</th>
                {CENARIOS_PAYBACK.map(({ rotulo }, i) => (
                  <th
                    key={rotulo}
                    className={`${TH} ${i === 0 ? SEP : ''} ${COR_PAYBACK}`}
                    title={`Meses para recuperar o investimento com a turma ${rotulo} acima do ponto de equilíbrio`}
                  >
                    {rotulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const itensFaltantes = pendencias(l);
                const semTicket = l.ticket_medio === null;
                return (
                  <tr key={l.curso_id} className="border-b border-[#e2e8e4] last:border-0 odd:bg-white even:bg-slate-200/70 hover:bg-[#ebf7f2] text-slate-600">
                    <td className={`${TD} text-left`}>
                      <span className="font-semibold text-slate-900">{l.nome_curso}</span>
                      <span className="block text-[10px] text-slate-500">{l.grau}</span>
                    </td>
                    <td className={NUM}>
                      {fmtNum(l.duracao_curso, 1)} a / {l.quantidade_modulos}
                    </td>
                    <td className={NUM}>
                      {l.total_professores} / {l.total_mediadores}
                    </td>
                    <td className={`${NUM} ${SEP}`} title={fmtMoeda(l.custo_mensal_medio_curso)}>
                      {fmtNum(l.custo_mensal_medio_curso)}
                    </td>
                    <td className={`${NUM}`} title={fmtMoeda(l.custo_total_curso)}>
                      {fmtNum(l.custo_total_curso)}
                    </td>
                    <td className={`${NUM}`} title={fmtMoeda(l.custo_por_modulo)}>
                      {fmtNum(l.custo_por_modulo)}
                    </td>
                    <td className={`${NUM} ${SEP}`}>{l.quantidade_disciplinas}</td>
                    <td className={`${NUM}`} title={fmtMoeda(l.investimento_disciplinas)}>
                      {fmtNum(l.investimento_disciplinas)}
                    </td>
                    <td className={`${NUM}`} title={fmtMoeda(l.custo_registro_curso)}>
                      {fmtNum(l.custo_registro_curso)}
                    </td>
                    <td className={`${NUM}`} title={fmtMoeda(l.investimento_total)}>
                      {fmtNum(l.investimento_total)}
                    </td>
                    <td className={`${NUM} ${SEP}`}>
                      {semTicket ? <Vazio motivo="Aguardando ticket médio" /> : fmtNum(l.ticket_medio!, 2)}
                    </td>
                    <td className={`${NUM} font-bold text-[#239371]`}>
                      {l.ponto_equilibrio !== null ? l.ponto_equilibrio : <Vazio motivo="Aguardando ticket médio" />}
                    </td>
                    {CENARIOS_PAYBACK.map(({ rotulo, campo, fator }, i) => {
                      const meses = l[campo];
                      return (
                        <td
                          key={rotulo}
                          className={`${NUM} ${i === 0 ? SEP : ''} font-bold text-[#239371]`}
                          title={
                            meses !== null && l.ponto_equilibrio !== null
                              ? `${alunosCenario(l.ponto_equilibrio, fator)} alunos`
                              : undefined
                          }
                        >
                          {meses !== null ? (
                            meses
                          ) : (
                            <Vazio motivo={semTicket ? 'Aguardando ticket médio' : 'A turma deste cenário não gera sobra no mês'} />
                          )}
                        </td>
                      );
                    })}
                    <td className={`${TD} ${SEP} text-left`}>
                      {itensFaltantes.length === 0 ? (
                        <span className="badge-unicive-green text-[9px]">Completo</span>
                      ) : (
                        <div className="flex flex-wrap gap-0.5">
                          {itensFaltantes.map((item) => (
                            <span
                              key={item}
                              className="text-[9px] font-bold uppercase px-1 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300"
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
                <td className={`${TD} text-left`} colSpan={2}>TOTAL</td>
                <td className={NUM}>
                  {linhas.reduce((s, l) => s + l.total_professores, 0)} /{' '}
                  {linhas.reduce((s, l) => s + l.total_mediadores, 0)}
                </td>
                <td className={`${NUM} ${SEP}`}>{fmtNum(linhas.reduce((s, l) => s + l.custo_mensal_medio_curso, 0))}</td>
                <td className={NUM}>{fmtNum(linhas.reduce((s, l) => s + l.custo_total_curso, 0))}</td>
                <td className={TD}></td>
                <td className={`${NUM} ${SEP}`}>{linhas.reduce((s, l) => s + l.quantidade_disciplinas, 0)}</td>
                <td className={NUM}>{fmtNum(linhas.reduce((s, l) => s + l.investimento_disciplinas, 0))}</td>
                <td className={NUM}>{fmtNum(linhas.reduce((s, l) => s + l.custo_registro_curso, 0))}</td>
                <td className={NUM}>{fmtNum(linhas.reduce((s, l) => s + l.investimento_total, 0))}</td>
                <td className={`${TD} ${SEP}`}></td>
                <td className={`${NUM} text-[#239371]`}>
                  {linhas.reduce((s, l) => s + (l.ponto_equilibrio ?? 0), 0)}
                </td>
                {/* Payback em meses não soma entre cursos */}
                <td className={`${TD} ${SEP}`} colSpan={CENARIOS_PAYBACK.length + 1}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
