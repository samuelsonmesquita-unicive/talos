export interface CursoMestre {
  id: string;
  nome_curso: string;
  grau: string;
  duracao_curso: number;
  custo_total_curso: number;
  dados_parciais: boolean;
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

// Output seguro para a UI: nunca expõe ticket_medio nem configuração de evasão
export interface PlutosResultado {
  curso_id: string;
  ponto_equilibrio: number;
  investimento_disciplinas: number;
  dados_hermes_parciais: boolean;
}
