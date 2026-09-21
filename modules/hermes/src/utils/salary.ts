import { CargaHoraria, Cargo, SalaryConfig } from '../types';

const SALARY_CONFIG_KEY = 'unicive_gestao_demandas_salarios_v2';

/**
 * FAIXAS SALARIAIS BASE (ATUALIZADA 4% - 2026/2027)
 * Valores de salário base atrelados à carga horária semanal (sem encargos):
 * Mediador: 10h (50h/mês) R$ *** | 20h (100h/mês) R$ *** | 40h (200h/mês) R$ ***
 * Professor: 10h (50h/mês) R$ *** | 20h (100h/mês) R$ *** | 40h (200h/mês) R$ ***
 */
export const DEFAULT_SALARY_CONFIG: SalaryConfig = {
  Professor: {
    '10h': ***,
    '20h': ***,
    '40h': ***,
  },
  Mediador: {
    '10h': ***,
    '20h': ***,
    '40h': ***,
  },
};

/**
 * PARÂMETROS E ALÍQUOTAS DE CUSTOS TRABALHISTAS E ENCARGOS DA FOLHA
 *
 * Provisões Trabalhistas:
 * - 13º Salário: *** (***...%)
 * - Férias Constitucionais: *** (***...%)
 * - Terço Constitucional de Férias: (***) * (1/3) = *** (***...%)
 * Subtotal Custos Trabalhistas: (***) + (***) + (***) = *** ≈ ***...%
 *
 * Encargos Sociais e Previdenciários:
 * - INSS Patronal: ***% (***)
 * - Encargos Adicionais da Folha: ***% (***)
 * Subtotal Encargos: *** + *** = ***% (***)
 *
 * Alíquota Total de Acréscimo: (***) + *** ≈ ***...%
 * Fator Multiplicador Final = 1 + (***) + *** ≈ ***...
 */
export const MESES_POR_ANO = 12;

// Alíquotas de Custos Trabalhistas
export const ALIQUOTA_DECIMO_TERCEIRO = ***;
export const ALIQUOTA_FERIAS = ***;
export const ADICIONAL_TERCO_FERIAS = 1 / 3;
export const ALIQUOTA_TERCO_FERIAS = ALIQUOTA_FERIAS * ADICIONAL_TERCO_FERIAS; // ***

export const ALIQUOTA_CUSTOS_TRABALHISTAS =
  ALIQUOTA_DECIMO_TERCEIRO + ALIQUOTA_FERIAS + ALIQUOTA_TERCO_FERIAS; // *** ≈ ***%

// Alíquotas de Encargos
export const ALIQUOTA_INSS_PATRONAL = ***; // ***%
export const ALIQUOTA_ENCARGOS_ADICIONAIS = ***; // ***%
export const ALIQUOTA_TOTAL_ENCARGOS =
  ALIQUOTA_INSS_PATRONAL + ALIQUOTA_ENCARGOS_ADICIONAIS; // ***%

// Fator consolidado de acréscimo
export const ALIQUOTA_TOTAL_ACRESCIMO =
  ALIQUOTA_CUSTOS_TRABALHISTAS + ALIQUOTA_TOTAL_ENCARGOS; // ***%

export const FATOR_CUSTO_TOTAL_DOCENTE = 1 + ALIQUOTA_TOTAL_ACRESCIMO; // ~***

export interface DetalhamentoCustoDocente {
  salarioBase: number;
  decimoTerceiro: number;
  ferias: number;
  tercoFerias: number;
  subtotalTrabalhista: number;
  inss: number;
  encargosAdicionais: number;
  subtotalEncargos: number;
  totalAcrescimos: number;
  salarioComEncargos: number;
}

/**
 * Decompõe e calcula todos os encargos e custos trabalhistas a partir do salário base
 */
export function calcularDetalhamentoCustoDocente(salarioBase: number): DetalhamentoCustoDocente {
  const decimoTerceiro = salarioBase * ALIQUOTA_DECIMO_TERCEIRO;
  const ferias = salarioBase * ALIQUOTA_FERIAS;
  const tercoFerias = salarioBase * ALIQUOTA_TERCO_FERIAS;
  const subtotalTrabalhista = decimoTerceiro + ferias + tercoFerias;

  const inss = salarioBase * ALIQUOTA_INSS_PATRONAL;
  const encargosAdicionais = salarioBase * ALIQUOTA_ENCARGOS_ADICIONAIS;
  const subtotalEncargos = inss + encargosAdicionais;

  const totalAcrescimos = subtotalTrabalhista + subtotalEncargos;
  const salarioComEncargos = salarioBase + totalAcrescimos;

  return {
    salarioBase,
    decimoTerceiro,
    ferias,
    tercoFerias,
    subtotalTrabalhista,
    inss,
    encargosAdicionais,
    subtotalEncargos,
    totalAcrescimos,
    salarioComEncargos,
  };
}

/**
 * Aplica a regra de custos trabalhistas e encargos sobre o salário base
 */
export function aplicarEncargosAoSalario(salarioBase: number): number {
  if (!salarioBase || salarioBase <= 0) return 0;
  return salarioBase * FATOR_CUSTO_TOTAL_DOCENTE;
}

export function getSalaryConfig(): SalaryConfig {
  try {
    const raw = localStorage.getItem(SALARY_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.Professor && parsed.Mediador) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Falha ao ler configuração salarial', e);
  }
  return DEFAULT_SALARY_CONFIG;
}

export function saveSalaryConfig(config: SalaryConfig): void {
  try {
    localStorage.setItem(SALARY_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Falha ao salvar configuração salarial', e);
  }
}

export function restoreDefaultSalaryConfig(): void {
  saveSalaryConfig(DEFAULT_SALARY_CONFIG);
}

export function clearStoredSalaryConfig(): void {
  try {
    localStorage.removeItem(SALARY_CONFIG_KEY);
  } catch (e) {
    console.error('Falha ao limpar configuração salarial', e);
  }
}

export const getStoredSalaryConfig = getSalaryConfig;
export const saveStoredSalaryConfig = saveSalaryConfig;

/**
 * Retorna o salário base puro da tabela salarial (sem encargos)
 */
export function buscar_salario_base(
  carga_horaria: CargaHoraria,
  cargo: Cargo = 'Professor'
): number {
  const config = getSalaryConfig();
  const cargoConfig = config[cargo] || DEFAULT_SALARY_CONFIG[cargo];
  return (
    cargoConfig[carga_horaria] ??
    DEFAULT_SALARY_CONFIG[cargo]?.[carga_horaria] ??
    0
  );
}

/**
 * Retorna o detalhamento completo dos custos do docente dado carga horária e cargo
 */
export function buscar_detalhamento_salario(
  carga_horaria: CargaHoraria,
  cargo: Cargo = 'Professor'
): DetalhamentoCustoDocente {
  const base = buscar_salario_base(carga_horaria, cargo);
  return calcularDetalhamentoCustoDocente(base);
}

/**
 * Seção 10 & Regra de Custos da Folha:
 * Retorna o salário mensal total correspondente à carga horária e cargo selecionados,
 * adicionando encargos patronais (INSS ***% + Adicionais ***%) e custos trabalhistas
 * (13º salário *** + Férias *** + 1/3 Férias).
 */
export function buscar_salario(
  carga_horaria: CargaHoraria,
  cargo: Cargo = 'Professor'
): number {
  const base = buscar_salario_base(carga_horaria, cargo);
  return aplicarEncargosAoSalario(base);
}

/**
 * Formatação padrão em Real Brasileiro
 */
export function formatCurrency(value: number): string {
  if (isNaN(value) || !isFinite(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Converte entrada de texto (ex.: "2,5", "2.5", "3") para número decimal (anos)
 */
export function parseDurationInput(input: string): number | null {
  if (!input) return null;
  const cleaned = input
    .toLowerCase()
    .replace('anos', '')
    .replace('ano', '')
    .trim()
    .replace(',', '.');
  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return null;
  return Math.round(num * 10) / 10; // Arredonda para 1 casa decimal se necessário
}

