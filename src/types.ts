export type Grau = 'Bacharel' | 'Tecnólogo';
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
  semestre: number;
  cargo: Cargo;
  quantidade: number;
  carga_horaria: CargaHoraria;
  salario: number;
  custo: number; // quantidade * salario * 6
  criado_em: string;
  atualizado_em?: string;
}

export interface SemestreAgregado {
  semestre: number;
  custo_professor: number;
  custo_mediador: number;
  custo_semestral: number;
  custo_mensal_semestre: number;
  professor_salvo: boolean;
  mediador_salvo: boolean;
  concluido: boolean;
  // Detalhes dos registros existentes neste semestre
  registro_professor?: RegistroItem;
  registro_mediador?: RegistroItem;
}

export interface SetorAgregado {
  setor: Setor;
  status: SectorStatus;
  semestres_salvos: number;
  custo_total: number;
  custo_mensal_medio: number;
  semestres: SemestreAgregado[];
}

export interface CursoMestre {
  id: string; // Chave normalizada: nome_curso + "___" + grau
  nome_curso: string;
  grau: Grau;
  duracao_curso: number; // Decimal em anos, ex.: 2.5
  quantidade_semestres: number; // duracao_curso * 2
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
  criado_em: string;
  atualizado_em: string;
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
