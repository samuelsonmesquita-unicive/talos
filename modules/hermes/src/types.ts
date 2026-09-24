export type Grau = 'Bacharel' | 'Licenciatura' | 'Tecnólogo';
export type Setor = 'Pedagógico' | 'Estágio';
export type Cargo = 'Professor' | 'Mediador';
export type CargaHoraria = '10h' | '20h' | '40h';
export type SectorStatus = 'não iniciado' | 'incompleto' | 'completo';
export type StatusGeral = 'completo' | 'parcial';

export interface RegistroItem {
  id: string;
  indice: number; // Índice/número sequencial de exibição
  nome_curso: string;
  grau: Grau;
  setor: Setor;
  modulo: number; // Módulo trimestral (3 meses)
  cargo: Cargo;
  quantidade: number;
  carga_horaria: CargaHoraria;
  salario: number;
  custo: number; // quantidade * salario * 3
  criado_em: string;
  atualizado_em?: string;
}

export interface ModuloAgregado {
  modulo: number;
  custo_professor: number;
  custo_mediador: number;
  custo_modulo: number;
  custo_mensal_modulo: number;
  professor_salvo: boolean;
  mediador_salvo: boolean;
  concluido: boolean;
  // Setor Estágio: módulo sem disciplina de estágio (não entra no status nem no custo)
  sem_estagio?: boolean;
  // Detalhes dos registros existentes neste módulo
  registro_professor?: RegistroItem;
  registro_mediador?: RegistroItem;
}

export interface SetorAgregado {
  setor: Setor;
  status: SectorStatus;
  modulos_salvos: number;
  custo_total: number;
  custo_mensal_medio: number;
  modulos: ModuloAgregado[];
}

export interface CursoMestre {
  id: string; // Chave normalizada: nome_curso + "___" + grau
  nome_curso: string;
  grau: Grau;
  duracao_curso: number; // Decimal em anos, ex.: 2.5
  quantidade_modulos: number; // duracao_curso * 4 (módulos trimestrais)
  status_pedagogico: SectorStatus;
  status_estagio: SectorStatus;
  status_geral: StatusGeral;
  custo_total_pedagogico: number;
  custo_mensal_medio_pedagogico: number;
  custo_total_estagio: number;
  custo_mensal_medio_estagio: number;
  custo_total_curso: number;
  custo_mensal_medio_curso: number;
  dados_parciais: boolean;
  // Informado pelo Pedagógico na etapa de estágio: null = ainda não informado,
  // false = curso sem estágio, true = há disciplinas de estágio.
  tem_estagio: boolean | null;
  criado_em: string;
  atualizado_em: string;
}

/** Disciplina de estágio da matriz (informada pelo Pedagógico). Libera o módulo para o setor Estágio. */
export interface DisciplinaEstagio {
  id: string;
  curso_id: string;
  modulo: number;
  nome: string;
  carga_horaria: number; // horas
}

export interface CargoSalaryConfig {
  '10h': number;
  '20h': number;
  '40h': number;
}

export interface SalaryConfig {
  Professor: CargoSalaryConfig;
  Mediador: CargoSalaryConfig;
}
