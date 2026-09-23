import { CargaHoraria, CursoMestre, Grau, RegistroItem, Setor } from '../types';
import {
  calcularCustoRegistro,
  migrarCursos,
  migrarRegistros,
  MODULOS_POR_ANO,
  normalizeCourseKey,
  recalcularCurso,
} from '../utils/courseCalculations';
import { clearStoredSalaryConfig } from '../utils/salary';
import {
  syncCourseToCloud,
  syncRegistroToCloud,
  deleteCourseFromCloud,
  deleteSingleRegistroFromCloud,
  resetSectorInCloud,
  fetchCoursesFromCloud,
  fetchRegistrosFromCloud,
} from './cloudSync';

// O localStorage é apenas um cache de leitura rápida/otimista. A fonte da verdade é o
// Supabase: o banco recalcula salário, custo, status e totais, e o tempo real (App.tsx)
// sobrescreve este cache com os valores oficiais.
const COURSES_STORAGE_KEY = 'unicive_demandas_cursos_v2';
const REGISTROS_STORAGE_KEY = 'unicive_demandas_registros_v2';

/** UUID v4 (funciona também em contextos não seguros, onde crypto.randomUUID não existe). */
function newId(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function getAllCourses(): CursoMestre[] {
  try {
    const raw = localStorage.getItem(COURSES_STORAGE_KEY);
    if (raw !== null) {
      return migrarCursos(JSON.parse(raw));
    }
  } catch (e) {
    console.error('Erro ao ler cursos do localStorage', e);
  }
  return [];
}

export function getAllRegistros(): RegistroItem[] {
  try {
    const raw = localStorage.getItem(REGISTROS_STORAGE_KEY);
    if (raw !== null) {
      return migrarRegistros(JSON.parse(raw));
    }
  } catch (e) {
    console.error('Erro ao ler registros do localStorage', e);
  }
  return [];
}

export function saveAllCourses(courses: CursoMestre[]): void {
  try {
    localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(migrarCursos(courses)));
  } catch (e) {
    console.error('Erro ao salvar cursos', e);
  }
}

export function saveAllRegistros(registros: RegistroItem[]): void {
  try {
    localStorage.setItem(REGISTROS_STORAGE_KEY, JSON.stringify(migrarRegistros(registros)));
  } catch (e) {
    console.error('Erro ao salvar registros', e);
  }
}

/** Remove os dados em cache deste navegador (ex.: ao sair da conta em computador compartilhado). */
export function clearLocalCache(): void {
  try {
    localStorage.removeItem(COURSES_STORAGE_KEY);
    localStorage.removeItem(REGISTROS_STORAGE_KEY);
  } catch (e) {
    console.error('Erro ao limpar cache local', e);
  }
}

/**
 * Carga inicial: substitui o cache local pelos dados oficiais do Supabase.
 * Lança erro se a nuvem estiver inacessível (o chamador mostra "offline").
 *
 * A tabela salarial NÃO é buscada aqui — é confidencial, sem SELECT liberado
 * pra ninguém autenticado (só funções internas do banco a leem).
 */
export async function initializeCloudDatabase(): Promise<void> {
  const [courses, registros] = await Promise.all([
    fetchCoursesFromCloud(),
    fetchRegistrosFromCloud(),
  ]);
  saveAllCourses(courses);
  saveAllRegistros(registros);
  // Purga qualquer cache salarial real que ainda esteja no navegador de antes
  // desta correção de segurança (dado confidencial não deve persistir aqui).
  clearStoredSalaryConfig();
}

export function findCourseByKey(nome_curso: string, grau: Grau): CursoMestre | undefined {
  const key = normalizeCourseKey(nome_curso, grau);
  const courses = getAllCourses();
  return courses.find((c) => c.id === key);
}

export function getRegistrosForCourse(nome_curso: string, grau: Grau): RegistroItem[] {
  const key = normalizeCourseKey(nome_curso, grau);
  const all = getAllRegistros();
  const filtered = all.filter(
    (r) => normalizeCourseKey(r.nome_curso, r.grau) === key
  );
  return filtered.sort((a, b) => {
    if (a.setor !== b.setor) return a.setor.localeCompare(b.setor);
    if (a.modulo !== b.modulo) return a.modulo - b.modulo;
    if (a.cargo !== b.cargo) return a.cargo === 'Professor' ? -1 : 1;
    return a.indice - b.indice;
  });
}

/**
 * Seção 3.2: Trava de duração ou criação de curso mestre
 */
export function upsertCourseMaster(
  nome_curso: string,
  grau: Grau,
  duracao_digitada: number
): { curso: CursoMestre; duracao_bloqueada: boolean; duracao_original: number } {
  const key = normalizeCourseKey(nome_curso, grau);
  const courses = getAllCourses();
  const existing = courses.find((c) => c.id === key);

  const agora = new Date().toISOString();

  if (!existing) {
    const qtdModulos = Math.round(duracao_digitada * MODULOS_POR_ANO);
    const novo: CursoMestre = {
      id: key,
      nome_curso: nome_curso.trim(),
      grau,
      duracao_curso: duracao_digitada,
      quantidade_modulos: qtdModulos,
      status_pedagogico: 'não iniciado',
      status_estagio: 'não iniciado',
      status_geral: 'parcial',
      custo_total_pedagogico: 0,
      custo_mensal_medio_pedagogico: 0,
      custo_total_estagio: 0,
      custo_mensal_medio_estagio: 0,
      custo_total_curso: 0,
      custo_mensal_medio_curso: 0,
      dados_parciais: true,
      criado_em: agora,
      atualizado_em: agora,
    };
    saveAllCourses([...courses, novo]);
    syncCourseToCloud(novo);
    return { curso: novo, duracao_bloqueada: false, duracao_original: duracao_digitada };
  }

  const ambosNaoIniciados =
    existing.status_pedagogico === 'não iniciado' &&
    existing.status_estagio === 'não iniciado';

  if (ambosNaoIniciados) {
    const qtdModulos = Math.round(duracao_digitada * MODULOS_POR_ANO);
    const atualizado: CursoMestre = {
      ...existing,
      duracao_curso: duracao_digitada,
      quantidade_modulos: qtdModulos,
      atualizado_em: agora,
    };
    saveAllCourses(courses.map((c) => (c.id === key ? atualizado : c)));
    syncCourseToCloud(atualizado);
    return { curso: atualizado, duracao_bloqueada: false, duracao_original: duracao_digitada };
  }

  const duracaoOriginal = existing.duracao_curso;
  const duracaoBloqueada = duracao_digitada !== duracaoOriginal;

  return { curso: existing, duracao_bloqueada: duracaoBloqueada, duracao_original: duracaoOriginal };
}

/**
 * Salva ou atualiza um registro. O cálculo local é otimista; o banco recalcula salário,
 * custo e totais do curso e o tempo real devolve os valores oficiais.
 */
export function saveOrUpdateRegistro(
  nome_curso: string,
  grau: Grau,
  setor: Setor,
  modulo: number,
  cargo: 'Professor' | 'Mediador',
  quantidade: number,
  carga_horaria: CargaHoraria
): { registro: RegistroItem; curso: CursoMestre } {
  const key = normalizeCourseKey(nome_curso, grau);
  const allRegistros = getAllRegistros();
  const allCourses = getAllCourses();

  const course = allCourses.find((c) => c.id === key);
  if (!course) {
    throw new Error('Curso não encontrado para salvar registro.');
  }

  const { salario, custo } = calcularCustoRegistro(quantidade, carga_horaria, cargo);
  const existingIndex = allRegistros.findIndex(
    (r) =>
      normalizeCourseKey(r.nome_curso, r.grau) === key &&
      r.setor === setor &&
      r.modulo === modulo &&
      r.cargo === cargo
  );

  let updatedRegistro: RegistroItem;
  let newRegistrosList: RegistroItem[];

  if (existingIndex >= 0) {
    updatedRegistro = {
      ...allRegistros[existingIndex],
      quantidade,
      carga_horaria,
      salario,
      custo,
      atualizado_em: new Date().toISOString(),
    };
    newRegistrosList = [...allRegistros];
    newRegistrosList[existingIndex] = updatedRegistro;
  } else {
    const maxIndice = allRegistros.reduce((max, r) => Math.max(max, r.indice || 0), 0);
    updatedRegistro = {
      id: newId(),
      indice: maxIndice + 1,
      nome_curso: course.nome_curso,
      grau: course.grau,
      setor,
      modulo,
      cargo,
      quantidade,
      carga_horaria,
      salario,
      custo,
      criado_em: new Date().toISOString(),
    };
    newRegistrosList = [...allRegistros, updatedRegistro];
  }

  saveAllRegistros(newRegistrosList);
  syncRegistroToCloud(updatedRegistro);

  // Recálculo local imediato (otimista); o banco recalcula o curso de forma oficial.
  const registrosCurso = newRegistrosList.filter(
    (r) => normalizeCourseKey(r.nome_curso, r.grau) === key
  );
  const { curso: cursoRecalculado } = recalcularCurso(course, registrosCurso);

  const newCoursesList = allCourses.map((c) =>
    c.id === key ? cursoRecalculado : c
  );
  saveAllCourses(newCoursesList);

  return { registro: updatedRegistro, curso: cursoRecalculado };
}

/**
 * Exclui um único registro individual e recalcula em cascata (somente admin no banco)
 */
export function deleteSingleRegistro(
  nome_curso: string,
  grau: Grau,
  registroId: string
): CursoMestre {
  const key = normalizeCourseKey(nome_curso, grau);
  const allRegistros = getAllRegistros();
  const allCourses = getAllCourses();

  const course = allCourses.find((c) => c.id === key);
  if (!course) {
    throw new Error('Curso não encontrado.');
  }

  const updatedRegistros = allRegistros.filter((r) => r.id !== registroId);
  saveAllRegistros(updatedRegistros);

  const registrosRestantes = updatedRegistros.filter(
    (r) => normalizeCourseKey(r.nome_curso, r.grau) === key
  );
  const { curso: cursoRecalculado } = recalcularCurso(course, registrosRestantes);

  const updatedCourses = allCourses.map((c) =>
    c.id === key ? cursoRecalculado : c
  );
  saveAllCourses(updatedCourses);

  deleteSingleRegistroFromCloud(registroId);

  return cursoRecalculado;
}

/**
 * Seção 4.4: Reiniciar setor do zero (Opção "Não") — o banco só aceita setor incompleto
 */
export function resetSectorData(
  nome_curso: string,
  grau: Grau,
  setor: Setor
): CursoMestre {
  const key = normalizeCourseKey(nome_curso, grau);
  const allRegistros = getAllRegistros();
  const allCourses = getAllCourses();

  const course = allCourses.find((c) => c.id === key);
  if (!course) {
    throw new Error('Curso não encontrado.');
  }

  const updatedRegistros = allRegistros.filter(
    (r) =>
      !(
        normalizeCourseKey(r.nome_curso, r.grau) === key &&
        r.setor === setor
      )
  );
  saveAllRegistros(updatedRegistros);

  const registrosRestantes = updatedRegistros.filter(
    (r) => normalizeCourseKey(r.nome_curso, r.grau) === key
  );
  const { curso: cursoRecalculado } = recalcularCurso(course, registrosRestantes);

  const updatedCourses = allCourses.map((c) =>
    c.id === key ? cursoRecalculado : c
  );
  saveAllCourses(updatedCourses);

  resetSectorInCloud(key, setor);

  return cursoRecalculado;
}

/**
 * Exclui um curso e todos os seus registros (somente admin no banco)
 */
export function deleteCourse(nome_curso: string, grau: Grau): void {
  const key = normalizeCourseKey(nome_curso, grau);
  const allCourses = getAllCourses();
  const allRegistros = getAllRegistros();

  const normNome = nome_curso.trim().toLowerCase();
  const normGrau = grau.trim().toLowerCase();

  const filteredCourses = allCourses.filter(
    (c) => c.id !== key && !(c.nome_curso.trim().toLowerCase() === normNome && c.grau.trim().toLowerCase() === normGrau)
  );
  const filteredRegistros = allRegistros.filter(
    (r) =>
      normalizeCourseKey(r.nome_curso, r.grau) !== key &&
      !(r.nome_curso.trim().toLowerCase() === normNome && r.grau.trim().toLowerCase() === normGrau)
  );

  saveAllCourses(filteredCourses);
  saveAllRegistros(filteredRegistros);

  deleteCourseFromCloud(key);
}

/**
 * Retorna o próximo módulo pendente
 */
export function getNextPendingModule(
  nome_curso: string,
  grau: Grau,
  setor: Setor,
  totalModulos: number
): number {
  const registros = getRegistrosForCourse(nome_curso, grau).filter(
    (r) => r.setor === setor
  );
  for (let s = 1; s <= totalModulos; s++) {
    const hasProf = registros.some((r) => r.modulo === s && r.cargo === 'Professor');
    const hasMed = registros.some((r) => r.modulo === s && r.cargo === 'Mediador');
    if (!hasProf || !hasMed) {
      return s;
    }
  }
  return 1;
}
