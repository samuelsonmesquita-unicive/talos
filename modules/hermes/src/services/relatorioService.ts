import { supabase } from './supabaseClient';

// Espelha o Relatório Executivo do Plutos (modules/plutos/src/types.ts e
// plutosService.ts) — Hermes e Plutos não compartilham pacote, então essa
// consulta/exportação é uma cópia intencional, lendo o mesmo banco Supabase.
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
  ticket_medio: number | null;
  ponto_equilibrio: number | null;
  dados_hermes_parciais: boolean;
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
    'Ticket Médio (R$)',
    'Ponto de Equilíbrio (alunos)',
    'Dados do Hermes Parciais',
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
      l.ticket_medio !== null ? fmt(l.ticket_medio) : '',
      l.ponto_equilibrio !== null ? l.ponto_equilibrio : 'Aguardando ticket médio',
      l.dados_hermes_parciais ? 'Sim' : 'Não',
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(';')
  );

  // Linha final com a soma de professores, mediadores, custo mensal e custo total
  const totais = linhas.reduce(
    (acc, l) => ({
      professores: acc.professores + l.total_professores,
      mediadores: acc.mediadores + l.total_mediadores,
      custoMensal: acc.custoMensal + l.custo_mensal_medio_curso,
      custoTotal: acc.custoTotal + l.custo_total_curso,
      pontoEquilibrio: acc.pontoEquilibrio + (l.ponto_equilibrio ?? 0),
    }),
    { professores: 0, mediadores: 0, custoMensal: 0, custoTotal: 0, pontoEquilibrio: 0 }
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
    '',
    totais.pontoEquilibrio,
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
