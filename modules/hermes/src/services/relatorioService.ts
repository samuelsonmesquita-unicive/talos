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

export async function fetchRelatorioExecutivo(): Promise<RelatorioLinha[]> {
  const { data: inputs, error: errInputs } = await supabase
    .from('plutos_inputs_curso')
    .select('curso_id, ticket_medio, ponto_equilibrio, dados_hermes_parciais')
    .gt('quantidade_disciplinas', 0);

  if (errInputs) throw new Error(`Falha ao carregar relatório: ${errInputs.message}`);
  if (!inputs || inputs.length === 0) return [];

  const cursoIds = inputs.map((i) => i.curso_id);

  const { data: cursos, error: errCursos } = await supabase
    .from('hermes_cursos')
    .select('id, nome_curso, grau, duracao_curso, quantidade_modulos, custo_total_curso, custo_mensal_medio_curso')
    .in('id', cursoIds);

  if (errCursos) throw new Error(`Falha ao carregar cursos: ${errCursos.message}`);

  const { data: registros, error: errRegistros } = await supabase
    .from('hermes_registros')
    .select('curso_id, cargo, quantidade')
    .in('curso_id', cursoIds);

  if (errRegistros) throw new Error(`Falha ao carregar registros: ${errRegistros.message}`);

  const totaisPorCurso: Record<string, { professores: number; mediadores: number }> = {};
  for (const r of registros || []) {
    if (!totaisPorCurso[r.curso_id]) {
      totaisPorCurso[r.curso_id] = { professores: 0, mediadores: 0 };
    }
    if (r.cargo === 'Professor') totaisPorCurso[r.curso_id].professores += r.quantidade;
    else if (r.cargo === 'Mediador') totaisPorCurso[r.curso_id].mediadores += r.quantidade;
  }

  const linhas: RelatorioLinha[] = [];
  for (const input of inputs) {
    const curso = (cursos || []).find((c) => c.id === input.curso_id);
    if (!curso) continue;

    const totais = totaisPorCurso[input.curso_id] || { professores: 0, mediadores: 0 };

    linhas.push({
      curso_id: curso.id,
      nome_curso: curso.nome_curso,
      grau: curso.grau,
      duracao_curso: curso.duracao_curso,
      quantidade_modulos: curso.quantidade_modulos,
      total_professores: totais.professores,
      total_mediadores: totais.mediadores,
      custo_mensal_medio_curso: curso.custo_mensal_medio_curso,
      custo_total_curso: curso.custo_total_curso,
      custo_por_modulo: curso.quantidade_modulos > 0 ? curso.custo_total_curso / curso.quantidade_modulos : 0,
      ticket_medio: input.ticket_medio,
      ponto_equilibrio: input.ponto_equilibrio,
      dados_hermes_parciais: input.dados_hermes_parciais,
    });
  }

  return linhas.sort((a, b) => a.nome_curso.localeCompare(b.nome_curso));
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
