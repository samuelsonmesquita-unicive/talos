import { SalaryConfig } from '../types';

const SALARY_CONFIG_KEY = 'unicive_gestao_demandas_salarios_v2';

/**
 * DADO CONFIDENCIAL — a tabela salarial, o fator de encargos e qualquer
 * salário/custo calculado NUNCA ficam no código-fonte (visível a qualquer
 * pessoa que inspecione o bundle JS público) nem em cache local. Só existem
 * no banco (Supabase), sem SELECT liberado pra clientes — o custo é calculado
 * no servidor e só o admin o recebe, por funções que checam o papel no banco.
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
 * Formatação padrão em Real Brasileiro. Valor não numérico (NaN = custo sem
 * acesso para este usuário, ou ainda não calculado pelo servidor) vira "—".
 */
export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return '—';
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
