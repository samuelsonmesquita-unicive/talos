import { CargaHoraria, CursoMestre, Grau, RegistroItem, Setor } from '../types';
import {
  calcularCustoRegistro,
  normalizeCourseKey,
  recalcularCurso,
} from '../utils/courseCalculations';
import {
  syncCourseToCloud,
  syncRegistroToCloud,
  deleteCourseFromCloud,
  deleteSingleRegistroFromCloud,
  clearCourseRecordsFromCloud,
  syncAllToCloud,
  fetchCoursesFromCloud,
  fetchRegistrosFromCloud,
} from './cloudSync';

const COURSES_STORAGE_KEY = 'unicive_demandas_cursos_v2';
const REGISTROS_STORAGE_KEY = 'unicive_demandas_registros_v2';

// Dados iniciais de demonstração
function getInitialData(): { courses: CursoMestre[]; registros: RegistroItem[] } {
  const agora = new Date().toISOString();
  let indiceCounter = 1;

  // 1. Curso Completo: Administração (Bacharel - 4 anos = 8 semestres)
  const admKey = normalizeCourseKey('Administração', 'Bacharel');
  const admRegistros: RegistroItem[] = [];

  for (let s = 1; s <= 8; s++) {
    // Pedagógico
    const { salario: sProfP, custo: cProfP } = calcularCustoRegistro(1, '20h', 'Professor');
    admRegistros.push({
      id: `${admKey}_ped_${s}_prof`,
      indice: indiceCounter++,
      nome_curso: 'Administração',
      grau: 'Bacharel',
      setor: 'Pedagógico',
      semestre: s,
      cargo: 'Professor',
      quantidade: 1,
      carga_horaria: '20h',
      salario: sProfP,
      custo: cProfP,
      criado_em: agora,
    });
    const { salario: sMedP, custo: cMedP } = calcularCustoRegistro(1, '10h', 'Mediador');
    admRegistros.push({
      id: `${admKey}_ped_${s}_med`,
      indice: indiceCounter++,
      nome_curso: 'Administração',
      grau: 'Bacharel',
      setor: 'Pedagógico',
      semestre: s,
      cargo: 'Mediador',
      quantidade: 1,
      carga_horaria: '10h',
      salario: sMedP,
      custo: cMedP,
      criado_em: agora,
    });

    // Estágio
    const { salario: sProfE, custo: cProfE } = calcularCustoRegistro(1, '10h', 'Professor');
    admRegistros.push({
      id: `${admKey}_est_${s}_prof`,
      indice: indiceCounter++,
      nome_curso: 'Administração',
      grau: 'Bacharel',
      setor: 'Estágio',
      semestre: s,
      cargo: 'Professor',
      quantidade: 1,
      carga_horaria: '10h',
      salario: sProfE,
      custo: cProfE,
      criado_em: agora,
    });
    const { salario: sMedE, custo: cMedE } = calcularCustoRegistro(1, '10h', 'Mediador');
    admRegistros.push({
      id: `${admKey}_est_${s}_med`,
      indice: indiceCounter++,
      nome_curso: 'Administração',
      grau: 'Bacharel',
      setor: 'Estágio',
      semestre: s,
      cargo: 'Mediador',
      quantidade: 1,
      carga_horaria: '10h',
      salario: sMedE,
      custo: cMedE,
      criado_em: agora,
    });
  }

  const cursoAdmBase: CursoMestre = {
    id: admKey,
    nome_curso: 'Administração',
    grau: 'Bacharel',
    duracao_curso: 4.0,
    quantidade_semestres: 8,
    status_pedagogico: 'completo',
    status_estagio: 'completo',
    status_geral: 'completo',
    custo_total_pedagogico: 0,
    custo_mensal_medio_pedagogico: 0,
    custo_total_estagio: 0,
    custo_mensal_medio_estagio: 0,
    custo_total_curso: 0,
    custo_mensal_medio_curso: 0,
    dados_parciais: false,
    criado_em: agora,
    atualizado_em: agora,
  };
  const { curso: cursoAdmRecalc } = recalcularCurso(cursoAdmBase, admRegistros);

  // 2. Curso Incompleto: ADS
  const adsKey = normalizeCourseKey('Análise e Desenvolvimento de Sistemas', 'Tecnólogo');
  const adsRegistros: RegistroItem[] = [];
  for (let s = 1; s <= 2; s++) {
    const { salario: sP, custo: cP } = calcularCustoRegistro(1, '20h', 'Professor');
    adsRegistros.push({
      id: `${adsKey}_ped_${s}_prof`,
      indice: indiceCounter++,
      nome_curso: 'Análise e Desenvolvimento de Sistemas',
      grau: 'Tecnólogo',
      setor: 'Pedagógico',
      semestre: s,
      cargo: 'Professor',
      quantidade: 1,
      carga_horaria: '20h',
      salario: sP,
      custo: cP,
      criado_em: agora,
    });
    const { salario: sM, custo: cM } = calcularCustoRegistro(1, '10h', 'Mediador');
    adsRegistros.push({
      id: `${adsKey}_ped_${s}_med`,
      indice: indiceCounter++,
      nome_curso: 'Análise e Desenvolvimento de Sistemas',
      grau: 'Tecnólogo',
      setor: 'Pedagógico',
      semestre: s,
      cargo: 'Mediador',
      quantidade: 1,
      carga_horaria: '10h',
      salario: sM,
      custo: cM,
      criado_em: agora,
    });
  }

  const cursoAdsBase: CursoMestre = {
    id: adsKey,
    nome_curso: 'Análise e Desenvolvimento de Sistemas',
    grau: 'Tecnólogo',
    duracao_curso: 2.5,
    quantidade_semestres: 5,
    status_pedagogico: 'incompleto',
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
  const { curso: cursoAdsRecalc } = recalcularCurso(cursoAdsBase, adsRegistros);

  // 3. Curso Pedagogia
  const pedKey = normalizeCourseKey('Pedagogia', 'Bacharel');
  const pedRegistros: RegistroItem[] = [];
  for (let s = 1; s <= 8; s++) {
    const { salario: sP, custo: cP } = calcularCustoRegistro(1, '20h', 'Professor');
    pedRegistros.push({
      id: `${pedKey}_ped_${s}_prof`,
      indice: indiceCounter++,
      nome_curso: 'Pedagogia',
      grau: 'Bacharel',
      setor: 'Pedagógico',
      semestre: s,
      cargo: 'Professor',
      quantidade: 1,
      carga_horaria: '20h',
      salario: sP,
      custo: cP,
      criado_em: agora,
    });
    const { salario: sM, custo: cM } = calcularCustoRegistro(1, '10h', 'Mediador');
    pedRegistros.push({
      id: `${pedKey}_ped_${s}_med`,
      indice: indiceCounter++,
      nome_curso: 'Pedagogia',
      grau: 'Bacharel',
      setor: 'Pedagógico',
      semestre: s,
      cargo: 'Mediador',
      quantidade: 1,
      carga_horaria: '10h',
      salario: sM,
      custo: cM,
      criado_em: agora,
    });
  }

  const cursoPedBase: CursoMestre = {
    id: pedKey,
    nome_curso: 'Pedagogia',
    grau: 'Bacharel',
    duracao_curso: 4.0,
    quantidade_semestres: 8,
    status_pedagogico: 'completo',
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
  const { curso: cursoPedRecalc } = recalcularCurso(cursoPedBase, pedRegistros);

  return {
    courses: [cursoAdmRecalc, cursoAdsRecalc, cursoPedRecalc],
    registros: [...admRegistros, ...adsRegistros, ...pedRegistros],
  };
}

export function getAllCourses(): CursoMestre[] {
  try {
    const raw = localStorage.getItem(COURSES_STORAGE_KEY);
    if (raw !== null) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Erro ao ler cursos do localStorage', e);
  }
  const initial = getInitialData();
  saveAllCourses(initial.courses);
  saveAllRegistros(initial.registros);
  return initial.courses;
}

export function getAllRegistros(): RegistroItem[] {
  try {
    const raw = localStorage.getItem(REGISTROS_STORAGE_KEY);
    if (raw !== null) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Erro ao ler registros do localStorage', e);
  }
  const initial = getInitialData();
  saveAllCourses(initial.courses);
  saveAllRegistros(initial.registros);
  return initial.registros;
}

export function saveAllCourses(courses: CursoMestre[]): void {
  try {
    localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(courses));
  } catch (e) {
    console.error('Erro ao salvar cursos', e);
  }
}

export function saveAllRegistros(registros: RegistroItem[]): void {
  try {
    localStorage.setItem(REGISTROS_STORAGE_KEY, JSON.stringify(registros));
  } catch (e) {
    console.error('Erro ao salvar registros', e);
  }
}

/**
 * Inicialização / Sincronização automática com a Nuvem (Firestore)
 */
export async function initializeCloudDatabase(): Promise<void> {
  try {
    const cloudCourses = await fetchCoursesFromCloud();
    const cloudRegistros = await fetchRegistrosFromCloud();

    if (cloudCourses.length > 0) {
      saveAllCourses(cloudCourses);
      saveAllRegistros(cloudRegistros);
    } else {
      const localCourses = getAllCourses();
      const localRegistros = getAllRegistros();
      if (localCourses.length > 0) {
        await syncAllToCloud(localCourses, localRegistros);
      }
    }

    // Migração/Atualização automática para a nova regra de encargos trabalhistas (+***%)
    const RULES_VERSION_KEY = 'unicive_rules_version';
    const CURRENT_RULES_VERSION = 'v2_encargos_folha_***';
    if (localStorage.getItem(RULES_VERSION_KEY) !== CURRENT_RULES_VERSION) {
      recalcularTodosOsCursos();
      localStorage.setItem(RULES_VERSION_KEY, CURRENT_RULES_VERSION);
    }
  } catch (err) {
    console.warn('Erro ao inicializar sincronização com Firestore:', err);
  }
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
    if (a.semestre !== b.semestre) return a.semestre - b.semestre;
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
    const qtdSemestres = Math.round(duracao_digitada * 2);
    const novo: CursoMestre = {
      id: key,
      nome_curso: nome_curso.trim(),
      grau,
      duracao_curso: duracao_digitada,
      quantidade_semestres: qtdSemestres,
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
    const qtdSemestres = Math.round(duracao_digitada * 2);
    const atualizado: CursoMestre = {
      ...existing,
      duracao_curso: duracao_digitada,
      quantidade_semestres: qtdSemestres,
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
 * Salva ou atualiza um registro e sincroniza com a nuvem
 */
export function saveOrUpdateRegistro(
  nome_curso: string,
  grau: Grau,
  setor: Setor,
  semestre: number,
  cargo: 'Professor' | 'Mediador',
  quantidade: number,
  carga_horaria: CargaHoraria
): { registro: RegistroItem; curso: CursoMestre } {
  const key = normalizeCourseKey(nome_curso, grau);
  const allRegistros = getAllRegistros();
  const allCourses = getAllCourses();

  let course = allCourses.find((c) => c.id === key);
  if (!course) {
    throw new Error('Curso não encontrado para salvar registro.');
  }

  const { salario, custo } = calcularCustoRegistro(quantidade, carga_horaria, cargo);
  const existingIndex = allRegistros.findIndex(
    (r) =>
      normalizeCourseKey(r.nome_curso, r.grau) === key &&
      r.setor === setor &&
      r.semestre === semestre &&
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
      id: `${key}_${setor.toLowerCase()}_${semestre}_${cargo.toLowerCase()}_${Date.now()}`,
      indice: maxIndice + 1,
      nome_curso: course.nome_curso,
      grau: course.grau,
      setor,
      semestre,
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

  // Recálculo em cascata imediato
  const registrosCurso = newRegistrosList.filter(
    (r) => normalizeCourseKey(r.nome_curso, r.grau) === key
  );
  const { curso: cursoRecalculado } = recalcularCurso(course, registrosCurso);

  const newCoursesList = allCourses.map((c) =>
    c.id === key ? cursoRecalculado : c
  );
  saveAllCourses(newCoursesList);
  syncCourseToCloud(cursoRecalculado);

  return { registro: updatedRegistro, curso: cursoRecalculado };
}

/**
 * Exclui um único registro individual e recalcula em cascata
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

  // Remove o registro selecionado
  const updatedRegistros = allRegistros.filter((r) => r.id !== registroId);
  saveAllRegistros(updatedRegistros);

  // Recalcula o curso
  const registrosRestantes = updatedRegistros.filter(
    (r) => normalizeCourseKey(r.nome_curso, r.grau) === key
  );
  const { curso: cursoRecalculado } = recalcularCurso(course, registrosRestantes);

  const updatedCourses = allCourses.map((c) =>
    c.id === key ? cursoRecalculado : c
  );
  saveAllCourses(updatedCourses);

  // Sincroniza exclusão no Firestore
  deleteSingleRegistroFromCloud(registroId);
  syncCourseToCloud(cursoRecalculado);

  return cursoRecalculado;
}

/**
 * Limpa todos os registros de um curso e zera suas métricas (Pedagógico e Estágio)
 */
export function clearAllRegistrosFromCourse(
  nome_curso: string,
  grau: Grau
): CursoMestre {
  const key = normalizeCourseKey(nome_curso, grau);
  const allRegistros = getAllRegistros();
  const allCourses = getAllCourses();

  const course = allCourses.find((c) => c.id === key);
  if (!course) {
    throw new Error('Curso não encontrado.');
  }

  // Remove todos os registros pertencentes a este curso
  const updatedRegistros = allRegistros.filter(
    (r) => normalizeCourseKey(r.nome_curso, r.grau) !== key
  );
  saveAllRegistros(updatedRegistros);

  // Zera métricas do curso
  const agora = new Date().toISOString();
  const cursoZerado: CursoMestre = {
    ...course,
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
    atualizado_em: agora,
  };

  const updatedCourses = allCourses.map((c) =>
    c.id === key ? cursoZerado : c
  );
  saveAllCourses(updatedCourses);

  // Limpa registros do curso na nuvem e atualiza status mestre
  clearCourseRecordsFromCloud(key);
  syncCourseToCloud(cursoZerado);

  return cursoZerado;
}

/**
 * Recalcula todos os registros e cursos existentes baseado na tabela salarial atual
 */
export function recalcularTodosOsCursos(): void {
  const allRegistros = getAllRegistros();
  const allCourses = getAllCourses();

  const registrosAtualizados = allRegistros.map((r) => {
    const { salario, custo } = calcularCustoRegistro(r.quantidade, r.carga_horaria, r.cargo);
    return {
      ...r,
      salario,
      custo,
    };
  });
  saveAllRegistros(registrosAtualizados);

  const cursosAtualizados = allCourses.map((curso) => {
    const registrosCurso = registrosAtualizados.filter(
      (r) => normalizeCourseKey(r.nome_curso, r.grau) === curso.id
    );
    const { curso: cursoRecalc } = recalcularCurso(curso, registrosCurso);
    return cursoRecalc;
  });
  saveAllCourses(cursosAtualizados);

  // Sincroniza todas as alterações na nuvem
  syncAllToCloud(cursosAtualizados, registrosAtualizados);
}

/**
 * Seção 4.4: Reiniciar setor do zero (Opção "Não")
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

  // Atualiza nuvem
  syncCourseToCloud(cursoRecalculado);

  return cursoRecalculado;
}

/**
 * Exclui um curso e todos os seus registros
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

  // Exclui da nuvem Firestore (curso e registros)
  deleteCourseFromCloud(key);
}

/**
 * Retorna o próximo semestre pendente
 */
export function getNextPendingSemester(
  nome_curso: string,
  grau: Grau,
  setor: Setor,
  totalSemestres: number
): number {
  const registros = getRegistrosForCourse(nome_curso, grau).filter(
    (r) => r.setor === setor
  );
  for (let s = 1; s <= totalSemestres; s++) {
    const hasProf = registros.some((r) => r.semestre === s && r.cargo === 'Professor');
    const hasMed = registros.some((r) => r.semestre === s && r.cargo === 'Mediador');
    if (!hasProf || !hasMed) {
      return s;
    }
  }
  return 1;
}

/**
 * Restaura dados padrões
 */
export function resetToDefaults(): void {
  localStorage.removeItem(COURSES_STORAGE_KEY);
  localStorage.removeItem(REGISTROS_STORAGE_KEY);
  const initial = getInitialData();
  saveAllCourses(initial.courses);
  saveAllRegistros(initial.registros);
  syncAllToCloud(initial.courses, initial.registros);
}
