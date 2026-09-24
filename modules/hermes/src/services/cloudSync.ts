import { supabase } from './supabaseClient';
import { CursoMestre, DisciplinaEstagio, RegistroItem, SalaryConfig } from '../types';

// ---------------------------------------------------------------------------
// Erros de nuvem: escritas são "fire-and-forget" (a interface é otimista), então
// falhas (ex.: RLS/perfil sem permissão) são reportadas por este handler.
// ---------------------------------------------------------------------------
type CloudErrorHandler = (message: string) => void;
let cloudErrorHandler: CloudErrorHandler | null = null;

export function setCloudErrorHandler(handler: CloudErrorHandler | null): void {
  cloudErrorHandler = handler;
}

function errorDetail(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

function reportCloudError(context: string, error: unknown): void {
  console.error(`${context}:`, error);
  if (cloudErrorHandler) cloudErrorHandler(`${context}: ${errorDetail(error)}`);
}

// Fila serial: garante que o curso seja gravado antes dos seus registros (FK).
let writeQueue: Promise<void> = Promise.resolve();

function enqueueWrite(
  context: string,
  task: () => PromiseLike<{ error: { message: string } | null }>
): Promise<void> {
  const run = writeQueue.then(async () => {
    try {
      const { error } = await task();
      if (error) reportCloudError(context, error);
    } catch (e) {
      reportCloudError(context, e);
    }
  });
  writeQueue = run;
  return run;
}

// ---------------------------------------------------------------------------
// Mapeamento banco <-> app
// ---------------------------------------------------------------------------
// Salário e custos são confidenciais: o banco não libera essas colunas para
// SELECT direto. Só o admin os recebe, pelas funções hermes_admin_custos_*
// (o papel é checado no banco). Para os demais, os campos ficam NaN ("—").
const CURSO_COLUMNS =
  'id, nome_curso, grau, duracao_curso, quantidade_modulos, status_pedagogico, status_estagio, ' +
  'status_geral, dados_parciais, tem_estagio, criado_em, atualizado_em';

const DISCIPLINA_ESTAGIO_COLUMNS = 'id, curso_id, modulo, nome, carga_horaria';

const REGISTRO_COLUMNS =
  'id, indice, curso_id, setor, modulo, cargo, quantidade, carga_horaria, ' +
  'criado_em, atualizado_em, hermes_cursos!inner(nome_curso, grau)';

let costAccess = false;

/** Liga a leitura dos custos (só para admin; o banco recusa os demais). */
export function setCostAccess(isAdmin: boolean): void {
  costAccess = isAdmin;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toCurso(row: any): CursoMestre {
  return {
    id: row.id,
    nome_curso: row.nome_curso,
    grau: row.grau,
    duracao_curso: Number(row.duracao_curso),
    quantidade_modulos: Number(row.quantidade_modulos),
    status_pedagogico: row.status_pedagogico,
    status_estagio: row.status_estagio,
    status_geral: row.status_geral,
    custo_total_pedagogico: Number(row.custo_total_pedagogico),
    custo_mensal_medio_pedagogico: Number(row.custo_mensal_medio_pedagogico),
    custo_total_estagio: Number(row.custo_total_estagio),
    custo_mensal_medio_estagio: Number(row.custo_mensal_medio_estagio),
    custo_total_curso: Number(row.custo_total_curso),
    custo_mensal_medio_curso: Number(row.custo_mensal_medio_curso),
    dados_parciais: Boolean(row.dados_parciais),
    tem_estagio: row.tem_estagio ?? null,
    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em,
  };
}

function toDisciplinaEstagio(row: any): DisciplinaEstagio {
  return {
    id: row.id,
    curso_id: row.curso_id,
    modulo: Number(row.modulo),
    nome: row.nome,
    carga_horaria: Number(row.carga_horaria),
  };
}

function toRegistro(row: any): RegistroItem {
  const registro: RegistroItem = {
    id: row.id,
    indice: Number(row.indice),
    nome_curso: row.hermes_cursos.nome_curso,
    grau: row.hermes_cursos.grau,
    setor: row.setor,
    modulo: Number(row.modulo),
    cargo: row.cargo,
    quantidade: Number(row.quantidade),
    carga_horaria: row.carga_horaria,
    salario: Number(row.salario),
    custo: Number(row.custo),
    criado_em: row.criado_em,
  };
  if (row.atualizado_em) registro.atualizado_em = row.atualizado_em;
  return registro;
}

// O PostgREST devolve no máximo 1000 linhas por requisição: paginar.
const PAGE_SIZE = 1000;

async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Escritas
// ---------------------------------------------------------------------------

/** Cria/atualiza os dados mestres do curso. Custos e status são calculados no banco. */
export function syncCourseToCloud(curso: CursoMestre): Promise<void> {
  return enqueueWrite('Erro ao salvar o curso na nuvem', () =>
    supabase.from('hermes_cursos').upsert(
      {
        id: curso.id,
        nome_curso: curso.nome_curso,
        grau: curso.grau,
        duracao_curso: curso.duracao_curso,
        quantidade_modulos: curso.quantidade_modulos,
      },
      { onConflict: 'id' }
    )
  );
}

/** Cria/atualiza um registro. Salário, custo e o recálculo do curso são feitos no banco. */
export function syncRegistroToCloud(registro: RegistroItem): Promise<void> {
  const cursoId = `${registro.nome_curso.trim().toLowerCase()}___${registro.grau.trim().toLowerCase()}`;
  return enqueueWrite('Erro ao salvar o registro na nuvem', () =>
    supabase.from('hermes_registros').upsert(
      {
        id: registro.id,
        curso_id: cursoId,
        setor: registro.setor,
        modulo: registro.modulo,
        cargo: registro.cargo,
        quantidade: registro.quantidade,
        carga_horaria: registro.carga_horaria,
      },
      { onConflict: 'curso_id,setor,modulo,cargo' }
    )
  );
}

/**
 * Pedagógico informa o estágio do curso (substitui a lista inteira). O banco apaga os
 * lançamentos do Estágio em módulos que ficaram sem disciplina e recalcula o curso.
 */
export function saveEstagioToCloud(
  cursoId: string,
  temEstagio: boolean,
  disciplinas: Pick<DisciplinaEstagio, 'nome' | 'modulo' | 'carga_horaria'>[]
): Promise<void> {
  return enqueueWrite('Erro ao salvar as disciplinas de estágio na nuvem', () =>
    supabase.rpc('hermes_set_estagio', {
      p_curso_id: cursoId,
      p_tem_estagio: temEstagio,
      p_disciplinas: temEstagio
        ? disciplinas.map((d) => ({ nome: d.nome, modulo: d.modulo, carga_horaria: d.carga_horaria }))
        : [],
    })
  );
}

/** Somente admin (validado no banco). */
export function deleteCourseFromCloud(cursoId: string): Promise<void> {
  return enqueueWrite('Erro ao excluir o curso na nuvem', () =>
    supabase.rpc('hermes_admin_delete_course', { p_curso_id: cursoId })
  );
}

/** Somente admin (validado no banco). */
export function deleteSingleRegistroFromCloud(registroId: string): Promise<void> {
  return enqueueWrite('Erro ao excluir o registro na nuvem', () =>
    supabase.rpc('hermes_admin_delete_registro', { p_registro_id: registroId })
  );
}

/** Reinicia um setor incompleto (qualquer funcionário; regra validada no banco). */
export function resetSectorInCloud(cursoId: string, setor: string): Promise<void> {
  return enqueueWrite('Erro ao reiniciar o setor na nuvem', () =>
    supabase.rpc('hermes_reset_sector_data', { p_curso_id: cursoId, p_setor: setor })
  );
}

/** Somente admin (validado no banco). Lança erro se falhar. O banco recalcula todos os custos. */
export async function saveSalaryConfigToCloud(config: SalaryConfig): Promise<void> {
  const { error } = await supabase.rpc('hermes_admin_update_salary_config', {
    p_professor_10h: config.Professor['10h'],
    p_professor_20h: config.Professor['20h'],
    p_professor_40h: config.Professor['40h'],
    p_mediador_10h: config.Mediador['10h'],
    p_mediador_20h: config.Mediador['20h'],
    p_mediador_40h: config.Mediador['40h'],
  });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Leituras (lançam erro em falha, para o chamador não apagar dados locais)
// ---------------------------------------------------------------------------
/**
 * Custos por id (só admin); vazio para os demais, e aí os campos ficam NaN.
 * Falha na função (ex.: migration 0018 ainda não aplicada) não derruba a
 * carga dos dados: os custos só ficam como "—".
 */
async function fetchCustos(fn: string): Promise<Map<string, any>> {
  if (!costAccess) return new Map();
  try {
    const rows = await fetchAllRows<any>((from, to) =>
      supabase.rpc(fn).order('id').range(from, to)
    );
    return new Map(rows.map((r) => [r.id, r]));
  } catch (e) {
    console.warn(`Falha ao carregar ${fn}:`, e);
    return new Map();
  }
}

export async function fetchCoursesFromCloud(): Promise<CursoMestre[]> {
  const [rows, custos] = await Promise.all([
    fetchAllRows<any>((from, to) =>
      supabase.from('hermes_cursos').select(CURSO_COLUMNS).order('id').range(from, to)
    ),
    fetchCustos('hermes_admin_custos_cursos'),
  ]);
  return rows.map((row) => toCurso({ ...row, ...custos.get(row.id) }));
}

export async function fetchRegistrosFromCloud(): Promise<RegistroItem[]> {
  const [rows, custos] = await Promise.all([
    fetchAllRows<any>((from, to) =>
      supabase.from('hermes_registros').select(REGISTRO_COLUMNS).order('id').range(from, to)
    ),
    fetchCustos('hermes_admin_custos_registros'),
  ]);
  return rows.map((row) => toRegistro({ ...row, ...custos.get(row.id) }));
}

export async function fetchDisciplinasEstagioFromCloud(): Promise<DisciplinaEstagio[]> {
  const rows = await fetchAllRows<any>((from, to) =>
    supabase
      .from('hermes_estagio_disciplinas')
      .select(DISCIPLINA_ESTAGIO_COLUMNS)
      .order('id')
      .range(from, to)
  );
  return rows.map(toDisciplinaEstagio);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Tempo real: busca inicial + nova busca (com debounce) a cada mudança na tabela
// ---------------------------------------------------------------------------
function subscribeToTable<T>(
  table: string,
  fetcher: () => Promise<T>,
  callback: (value: T) => void
): () => void {
  let active = true;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const refresh = async () => {
    try {
      const value = await fetcher();
      if (active) callback(value);
    } catch (e) {
      console.warn(`Erro na sincronização em tempo real (${table}):`, e);
    }
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(refresh, 300);
  };

  refresh();

  const channel = supabase
    .channel(`rt-${table}-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, schedule)
    .subscribe();

  return () => {
    active = false;
    if (timer) clearTimeout(timer);
    supabase.removeChannel(channel);
  };
}

export function subscribeToCourses(callback: (courses: CursoMestre[]) => void): () => void {
  return subscribeToTable('hermes_cursos', fetchCoursesFromCloud, callback);
}

export function subscribeToRegistros(callback: (regs: RegistroItem[]) => void): () => void {
  return subscribeToTable('hermes_registros', fetchRegistrosFromCloud, callback);
}

export function subscribeToDisciplinasEstagio(
  callback: (disciplinas: DisciplinaEstagio[]) => void
): () => void {
  return subscribeToTable('hermes_estagio_disciplinas', fetchDisciplinasEstagioFromCloud, callback);
}
