export interface CursoMestre {
  id: string;
  nome_curso: string;
  grau: string;
  duracao_curso: number;
  custo_total_curso: number;
  dados_parciais: boolean;
  status_geral: 'completo' | 'parcial';
}

export interface PlutosInput {
  curso_id: string;
  quantidade_disciplinas: number;
  ticket_medio: number; // confidencial, nunca deve sair para o cliente
  investimento_disciplinas: number;
  ponto_equilibrio: number;
  dados_hermes_parciais: boolean;
  criado_em: string;
  criado_por: string | null;
  atualizado_em: string | null;
  atualizado_por: string | null;
}

// Output seguro para a UI de preenchimento: nunca expõe ticket_medio nem
// configuração de evasão (essa tela é usada por qualquer colaborador staff).
export interface PlutosResultado {
  curso_id: string;
  ponto_equilibrio: number;
  investimento_disciplinas: number;
  dados_hermes_parciais: boolean;
}

// Linha do Relatório Executivo (todos os cursos com PE calculado). Diferente
// do PlutosResultado, aqui o ticket_medio aparece — o relatório é o lugar
// certo pra essa informação, conforme definido pelo usuário.
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
  ticket_medio: number;
  ponto_equilibrio: number;
  dados_hermes_parciais: boolean;
}
