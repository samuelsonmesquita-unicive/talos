import { supabase } from './supabaseClient';

// Espelha o Relatório Executivo do Plutos (modules/plutos/src/types.ts e
// plutosService.ts) — Hermes e Plutos não compartilham pacote, então essa
// consulta/exportação é uma cópia intencional, lendo o mesmo banco Supabase.
// Mostra TODOS os cursos com algum progresso no Hermes (não só os que já têm
// dados no Plutos), pra dar uma prévia mesmo com dados incompletos.
export interface RelatorioLinha {
  curso_id: string;
  nome_curso: string;
  grau: string;
  duracao_curso: number;
  quantidade_modulos: number;
  total_professores: number;
  total_mediadores: number;
  custo_mensal_medio_curso: number;
  custo_total_curso: number;
  custo_por_modulo: number;
  quantidade_disciplinas: number;
  investimento_disciplinas: number;
  // Taxa MEC de registro de novo curso (parâmetro do banco), investimento padrão de todo curso
  custo_registro_curso: number;
  // investimento_disciplinas + custo_registro_curso
  investimento_total: number;
  ticket_medio: number | null;
  ponto_equilibrio: number | null;
  // Alunos por turma para pagar o curso e recuperar o investimento durante
  // uma turma completa; null até haver ticket médio
  payback_alunos: number | null;
  dados_hermes_parciais: boolean;
  disciplinas_definidas: boolean;
  ticket_definido: boolean;
}

/**
 * Chama a função do banco (plutos_fn_relatorio_executivo), que valida
 * is_admin() internamente — o ticket médio nunca passa por uma tabela com
 * SELECT liberado, só por essa função checada no servidor.
 */
export async function fetchRelatorioExecutivo(): Promise<RelatorioLinha[]> {
  const { data, error } = await supabase.rpc('plutos_fn_relatorio_executivo');
  if (error) throw new Error(`Falha ao carregar relatório: ${error.message}`);
  return (data || []) as RelatorioLinha[];
}

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
    'Registro do Curso - MEC (R$)',
    'Investimento Total (R$)',
    'Ticket Médio (R$)',
    'Ponto de Equilíbrio (alunos)',
    'Payback (alunos/turma)',
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
      fmt(l.custo_registro_curso),
      fmt(l.investimento_total),
      l.ticket_medio !== null ? fmt(l.ticket_medio) : '',
      l.ponto_equilibrio !== null ? l.ponto_equilibrio : 'Aguardando ticket médio',
      l.payback_alunos !== null ? l.payback_alunos : 'Aguardando ticket médio',
      l.dados_hermes_parciais ? 'Não' : 'Sim',
      l.disciplinas_definidas ? 'Sim' : 'Não',
      l.ticket_definido ? 'Sim' : 'Não',
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(';')
  );

  // Linha final com a soma de professores, mediadores, custo mensal, custo total,
  // quantidade de disciplinas, investimentos, PE e payback
  const totais = linhas.reduce(
    (acc, l) => ({
      professores: acc.professores + l.total_professores,
      mediadores: acc.mediadores + l.total_mediadores,
      custoMensal: acc.custoMensal + l.custo_mensal_medio_curso,
      custoTotal: acc.custoTotal + l.custo_total_curso,
      quantidadeDisciplinas: acc.quantidadeDisciplinas + l.quantidade_disciplinas,
      investimentoDisciplinas: acc.investimentoDisciplinas + l.investimento_disciplinas,
      registro: acc.registro + l.custo_registro_curso,
      investimentoTotal: acc.investimentoTotal + l.investimento_total,
      pontoEquilibrio: acc.pontoEquilibrio + (l.ponto_equilibrio ?? 0),
      payback: acc.payback + (l.payback_alunos ?? 0),
    }),
    {
      professores: 0,
      mediadores: 0,
      custoMensal: 0,
      custoTotal: 0,
      quantidadeDisciplinas: 0,
      investimentoDisciplinas: 0,
      registro: 0,
      investimentoTotal: 0,
      pontoEquilibrio: 0,
      payback: 0,
    }
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
    fmt(totais.registro),
    fmt(totais.investimentoTotal),
    '',
    totais.pontoEquilibrio,
    totais.payback,
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
