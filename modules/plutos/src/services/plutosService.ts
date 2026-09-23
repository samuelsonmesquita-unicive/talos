import { supabase } from './supabaseClient';
import { CursoMestre, PlutosResultado, RelatorioLinha } from '../types';

export async function fetchCursosComCusto(): Promise<CursoMestre[]> {
  const { data, error } = await supabase
    .from('hermes_cursos')
    .select('id, nome_curso, grau, duracao_curso, custo_total_curso, dados_parciais, status_geral')
    .order('nome_curso');

  if (error) throw new Error(`Falha ao carregar cursos: ${error.message}`);
  return data || [];
}

const SELECT_SEGURO =
  'curso_id, quantidade_disciplinas, investimento_disciplinas, ponto_equilibrio, dados_hermes_parciais';

function mapResultadoSeguro(data: {
  curso_id: string;
  quantidade_disciplinas: number;
  investimento_disciplinas: number;
  ponto_equilibrio: number | null;
  dados_hermes_parciais: boolean;
}): PlutosResultado {
  return {
    curso_id: data.curso_id,
    quantidade_disciplinas: data.quantidade_disciplinas,
    ponto_equilibrio: data.ponto_equilibrio,
    investimento_disciplinas: data.investimento_disciplinas,
    dados_hermes_parciais: data.dados_hermes_parciais,
    disciplinasDefinidas: data.quantidade_disciplinas > 0,
    ticketDefinido: data.ponto_equilibrio !== null,
  };
}

/**
 * Status seguro do curso no Plutos — nunca inclui ticket_medio (confidencial,
 * só admin pode ler/escrever). `ticketDefinido` avisa que já foi preenchido,
 * sem revelar o valor.
 */
export async function fetchStatusPorCurso(cursoId: string): Promise<PlutosResultado | null> {
  const { data, error } = await supabase
    .from('plutos_inputs_curso')
    .select(SELECT_SEGURO)
    .eq('curso_id', cursoId)
    .maybeSingle();

  if (error) throw new Error(`Falha ao carregar dados: ${error.message}`);
  if (!data) return null;

  return mapResultadoSeguro(data);
}

/** Qualquer colaborador staff pode gravar a quantidade de disciplinas. */
export async function upsertQuantidadeDisciplinas(
  cursoId: string,
  quantidade: number
): Promise<PlutosResultado> {
  const { data, error } = await supabase
    .from('plutos_inputs_curso')
    .upsert({ curso_id: cursoId, quantidade_disciplinas: quantidade }, { onConflict: 'curso_id' })
    .select(SELECT_SEGURO)
    .single();

  if (error) throw new Error(`Falha ao salvar quantidade de disciplinas: ${error.message}`);
  return mapResultadoSeguro(data);
}

/**
 * Só admin pode gravar o ticket médio (checado no trigger do banco também).
 * Não lê o valor de volta — o formulário funciona "às cegas": o admin digita
 * o novo valor sem ver o que já estava salvo, mantendo o dado fora do cliente.
 */
export async function upsertTicketMedio(cursoId: string, ticketMedio: number): Promise<PlutosResultado> {
  const { error: rpcError } = await supabase.rpc('plutos_admin_set_ticket_medio', {
    p_curso_id: cursoId,
    p_ticket_medio: ticketMedio,
  });
  if (rpcError) throw new Error(`Falha ao salvar ticket médio: ${rpcError.message}`);

  const { data, error } = await supabase
    .from('plutos_inputs_curso')
    .select(SELECT_SEGURO)
    .eq('curso_id', cursoId)
    .single();

  if (error) throw new Error(`Falha ao recarregar dados: ${error.message}`);
  return mapResultadoSeguro(data);
}

/**
 * Relatório Executivo: uma linha por curso com quantidade de disciplinas
 * definida. Chama a função do banco (plutos_fn_relatorio_executivo), que
 * já valida is_admin() internamente — o ticket médio nunca passa por uma
 * tabela com SELECT liberado, só por essa função checada no servidor.
 *
 * A exportação (CSV hoje, .docx no futuro) é responsabilidade de outra
 * função, separada da busca dos dados.
 */
export async function fetchRelatorioExecutivo(): Promise<RelatorioLinha[]> {
  const { data, error } = await supabase.rpc('plutos_fn_relatorio_executivo');
  if (error) throw new Error(`Falha ao carregar relatório: ${error.message}`);
  return (data || []) as RelatorioLinha[];
}

/**
 * Exporta o Relatório Executivo como CSV (separador ";", decimal com vírgula,
 * BOM UTF-8) — mesmo padrão já usado no Dashboard Geral do Hermes, pra abrir
 * certo no Excel em pt-BR.
 */
export function exportRelatorioCSV(linhas: RelatorioLinha[]): void {
  const cabecalho = [
    'Curso',
    'Grau',
    'Duração (anos)',
    'Nº de Módulos',
    'Total Professores',
    'Total Mediadores',
    'Custo Mensal Médio (R$)',
    'Custo Total do Curso (R$)',
    'Custo por Módulo (R$)',
    'Qtd. Disciplinas',
    'Investimento em Disciplinas (R$)',
    'Ticket Médio (R$)',
    'Ponto de Equilíbrio (alunos)',
    'Setores Completos (Hermes)',
    'Disciplinas Definidas',
    'Ticket Médio Definido',
  ];

  const fmt = (n: number) => n.toFixed(2).replace('.', ',');

  const linhasCsv = linhas.map((l) =>
    [
      l.nome_curso,
      l.grau,
      fmt(l.duracao_curso),
      l.quantidade_modulos,
      l.total_professores,
      l.total_mediadores,
      fmt(l.custo_mensal_medio_curso),
      fmt(l.custo_total_curso),
      fmt(l.custo_por_modulo),
      l.quantidade_disciplinas,
      fmt(l.investimento_disciplinas),
      l.ticket_medio !== null ? fmt(l.ticket_medio) : '',
      l.ponto_equilibrio !== null ? l.ponto_equilibrio : 'Aguardando ticket médio',
      l.dados_hermes_parciais ? 'Não' : 'Sim',
      l.disciplinas_definidas ? 'Sim' : 'Não',
      l.ticket_definido ? 'Sim' : 'Não',
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(';')
  );

  // Linha final com a soma de professores, mediadores, custo mensal, custo total,
  // quantidade de disciplinas e investimento
  const totais = linhas.reduce(
    (acc, l) => ({
      professores: acc.professores + l.total_professores,
      mediadores: acc.mediadores + l.total_mediadores,
      custoMensal: acc.custoMensal + l.custo_mensal_medio_curso,
      custoTotal: acc.custoTotal + l.custo_total_curso,
      quantidadeDisciplinas: acc.quantidadeDisciplinas + l.quantidade_disciplinas,
      investimentoDisciplinas: acc.investimentoDisciplinas + l.investimento_disciplinas,
      pontoEquilibrio: acc.pontoEquilibrio + (l.ponto_equilibrio ?? 0),
    }),
    { professores: 0, mediadores: 0, custoMensal: 0, custoTotal: 0, quantidadeDisciplinas: 0, investimentoDisciplinas: 0, pontoEquilibrio: 0 }
  );

  const linhaTotal = [
    'TOTAL',
    '',
    '',
    '',
    totais.professores,
    totais.mediadores,
    fmt(totais.custoMensal),
    fmt(totais.custoTotal),
    '',
    totais.quantidadeDisciplinas,
    fmt(totais.investimentoDisciplinas),
    '',
    totais.pontoEquilibrio,
    '',
    '',
    '',
  ]
    .map((v) => `"${String(v).replace(/"/g, '""')}"`)
    .join(';');

  const csv = '﻿' + [cabecalho.join(';'), ...linhasCsv, linhaTotal].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `plutos_relatorio_executivo_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
