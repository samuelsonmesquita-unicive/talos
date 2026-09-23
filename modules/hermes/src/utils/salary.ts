import { CargaHoraria, Cargo, SalaryConfig } from '../types';

const SALARY_CONFIG_KEY = 'unicive_gestao_demandas_salarios_v2';

/**
 * DADO CONFIDENCIAL — os valores reais da tabela salarial NUNCA ficam no
 * código-fonte (visível a qualquer pessoa que inspecione o bundle JS público)
 * nem em cache local. A tabela salarial só existe no banco (Supabase), sem
 * nenhum SELECT liberado pra clientes — só funções internas (security
 * definer) a leem, ao computar o custo com encargos no servidor.
 * Este objeto zerado é só um esqueleto de tipo/fallback seguro.
 */
export const DEFAULT_SALARY_CONFIG: SalaryConfig = {
  Professor: {
    '10h': 0,
    '20h': 0,
    '40h': 0,
  },
  Mediador: {
    '10h': 0,
    '20h': 0,
    '40h': 0,
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

/**
 * Nenhum dado salarial fica em cache no navegador (localStorage) — a tabela é
 * confidencial e só existe no banco. Esta função apaga qualquer valor real
 * que ainda esteja em cache de antes dessa correção de segurança.
 */
export function clearStoredSalaryConfig(): void {
  try {
    localStorage.removeItem(SALARY_CONFIG_KEY);
  } catch (e) {
    console.error('Falha ao limpar configuração salarial', e);
  }
}

/**
 * Sempre retorna o esqueleto zerado — não há mais fonte de verdade acessível
 * no cliente para a tabela salarial. O custo real só é conhecido pelo
 * servidor (calculado com security definer) e mostrado após salvar.
 */
export function buscar_salario_base(
  _carga_horaria: CargaHoraria,
  _cargo: Cargo = 'Professor'
): number {
  return 0;
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

