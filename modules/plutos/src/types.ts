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
  ticket_medio: number | null; // confidencial (só admin) — nunca deve sair para o cliente
  investimento_disciplinas: number;
  ponto_equilibrio: number | null; // null até um admin definir o ticket médio
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
  quantidade_disciplinas: number;
  ponto_equilibrio: number | null;
  investimento_disciplinas: number;
  dados_hermes_parciais: boolean;
  // true quando quantidade_disciplinas já foi salva pelo colaborador
  disciplinasDefinidas: boolean;
  // true quando um admin já definiu o ticket médio (sem expor o valor)
  ticketDefinido: boolean;
}

// Linha do Relatório Executivo. Mostra TODOS os cursos com algum progresso no
// Hermes (não só os que já têm dados no Plutos), pra dar uma prévia mesmo com
// dados incompletos. Só visível para admin — é o único lugar onde o
// ticket_medio aparece.
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
  ticket_medio: number | null;
  ponto_equilibrio: number | null;
  dados_hermes_parciais: boolean;
  disciplinas_definidas: boolean;
  ticket_definido: boolean;
}
