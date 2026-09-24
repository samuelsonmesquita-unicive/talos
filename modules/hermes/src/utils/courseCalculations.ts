import {
  CursoMestre,
  DisciplinaEstagio,
  Grau,
  RegistroItem,
  SectorStatus,
  ModuloAgregado,
  Setor,
  SetorAgregado,
  StatusGeral,
} from '../types';

/** Cada módulo dura 3 meses (trimestral) */
export const MESES_POR_MODULO = 3;

/** Módulos por ano */
export const MODULOS_POR_ANO = 4;

/**
 * Normaliza a chave do curso: nome_curso + grau (seção 3)
 */
export function normalizeCourseKey(nome_curso: string, grau: Grau): string {
  return `${nome_curso.trim().toLowerCase()}___${grau.trim().toLowerCase()}`;
}

/**
 * Salário e custo de um registro são confidenciais: só o banco os calcula e
 * só o admin os recebe. Localmente ficam como NaN ("—" na tela) até o tempo
 * real trazer os valores oficiais — ou para sempre, para quem não é admin.
 */
export function calcularCustoRegistro(): { salario: number; custo: number } {
  return { salario: NaN, custo: NaN };
}

/** JSON não guarda NaN (vira null): ao ler o cache, custo nulo volta a ser NaN. */
function custoOuNaN(value: unknown): number {
  return typeof value === 'number' ? value : NaN;
}

/** Módulos que têm disciplina de estágio (em ordem). Só esses o setor Estágio pode editar. */
export function modulosComEstagio(disciplinas: DisciplinaEstagio[]): number[] {
  return Array.from(new Set(disciplinas.map((d) => d.modulo))).sort((a, b) => a - b);
}

/** Quantidade de disciplinas e carga horária de estágio por módulo e no curso inteiro. */
export function totaisEstagio(disciplinas: DisciplinaEstagio[]): {
  porModulo: Map<number, { qtd: number; ch: number }>;
  totalCh: number;
  modulos: number[];
} {
  const porModulo = new Map<number, { qtd: number; ch: number }>();
  let totalCh = 0;
  for (const d of disciplinas) {
    const atual = porModulo.get(d.modulo) ?? { qtd: 0, ch: 0 };
    porModulo.set(d.modulo, { qtd: atual.qtd + 1, ch: atual.ch + d.carga_horaria });
    totalCh += d.carga_horaria;
  }
  return { porModulo, totalCh, modulos: modulosComEstagio(disciplinas) };
}

/**
 * Agrega os módulos de um setor específico. modulosPermitidos (setor Estágio) limita
 * a contagem de status e custo aos módulos com disciplina de estágio.
 */
export function agregarModulosSetor(
  setor: Setor,
  quantidade_modulos: number,
  registros: RegistroItem[],
  modulosPermitidos?: Set<number>
): {
  modulos: ModuloAgregado[];
  modulos_salvos: number;
  custo_total: number;
  custo_mensal_medio: number;
  status: SectorStatus;
} {
  const setorRegistros = registros.filter(
    (r) => r.setor === setor && (!modulosPermitidos || modulosPermitidos.has(r.modulo))
  );
  const esperados = modulosPermitidos ? modulosPermitidos.size : quantidade_modulos;
  const modulos: ModuloAgregado[] = [];

  let modulosSalvosContagem = 0;
  let somaCustoModulo = 0;
  let somaCustoMensal = 0;

  for (let s = 1; s <= quantidade_modulos; s++) {
    if (modulosPermitidos && !modulosPermitidos.has(s)) {
      modulos.push({
        modulo: s,
        custo_professor: 0,
        custo_mediador: 0,
        custo_modulo: 0,
        custo_mensal_modulo: 0,
        professor_salvo: false,
        mediador_salvo: false,
        concluido: false,
        sem_estagio: true,
      });
      continue;
    }
    const regProf = setorRegistros.find((r) => r.modulo === s && r.cargo === 'Professor');
    const regMed = setorRegistros.find((r) => r.modulo === s && r.cargo === 'Mediador');

    const profSalvo = Boolean(regProf);
    const medSalvo = Boolean(regMed);
    const concluido = profSalvo && medSalvo; // Seção 3.1: só conta como salvo quando ambos salvos

    const custoProf = regProf ? regProf.custo : 0;
    const custoMed = regMed ? regMed.custo : 0;
    const custoModulo = custoProf + custoMed;
    const custoMensal = custoModulo / MESES_POR_MODULO;

    if (concluido) {
      modulosSalvosContagem++;
    }

    somaCustoModulo += custoModulo;
    somaCustoMensal += custoMensal;

    modulos.push({
      modulo: s,
      custo_professor: custoProf,
      custo_mediador: custoMed,
      custo_modulo: custoModulo,
      custo_mensal_modulo: custoMensal,
      professor_salvo: profSalvo,
      mediador_salvo: medSalvo,
      concluido,
      registro_professor: regProf,
      registro_mediador: regMed,
    });
  }

  // Status do setor segundo Seção 3.1:
  // 0 -> não iniciado
  // 1 a quantidade_modulos - 1 -> incompleto
  // = quantidade_modulos -> completo (no Estágio: = módulos com disciplina de estágio)
  let status: SectorStatus = 'não iniciado';
  if (modulosSalvosContagem === 0) {
    // Atenção: se tiver professor salvo mas não mediador, modulosSalvosContagem é 0 mas há dados pendentes
    const temAlgumRegistro = setorRegistros.length > 0;
    status = temAlgumRegistro ? 'incompleto' : 'não iniciado';
  } else if (modulosSalvosContagem < esperados) {
    status = 'incompleto';
  } else {
    status = 'completo';
  }

  // Custo mensal médio do setor = soma do custo mensal dos módulos ÷ quantidade_modulos (Seção 6.2 e 15)
  const custo_mensal_medio =
    quantidade_modulos > 0 ? somaCustoMensal / quantidade_modulos : 0;

  return {
    modulos,
    modulos_salvos: modulosSalvosContagem,
    custo_total: somaCustoModulo,
    custo_mensal_medio,
    status,
  };
}

/**
 * Realiza o recálculo em cascata completo do curso (seção 6.2)
 * Atualiza registros -> módulos -> setores -> curso
 *
 * Espelha as regras do banco (hermes_fn_recalcular_curso):
 *   - Pedagógico só fica completo depois de informar o estágio (tem_estagio != null).
 *   - Estágio: null -> não iniciado; false -> completo com custo zero;
 *     true -> conta só os módulos com disciplina de estágio.
 */
export function recalcularCurso(
  cursoAtual: CursoMestre,
  registros: RegistroItem[],
  disciplinas: DisciplinaEstagio[]
): {
  curso: CursoMestre;
  setorPedagogico: SetorAgregado;
  setorEstagio: SetorAgregado;
} {
  const qtdModulos = cursoAtual.quantidade_modulos;

  // 1 e 2 e 3. Agrega Pedagógico
  const pedData = agregarModulosSetor('Pedagógico', qtdModulos, registros);
  if (pedData.status === 'completo' && cursoAtual.tem_estagio == null) {
    pedData.status = 'incompleto';
  }
  const setorPedagogico: SetorAgregado = {
    setor: 'Pedagógico',
    status: pedData.status,
    modulos_salvos: pedData.modulos_salvos,
    custo_total: pedData.custo_total,
    custo_mensal_medio: pedData.custo_mensal_medio,
    modulos: pedData.modulos,
  };

  // 1 e 2 e 3. Agrega Estágio
  const permitidos = new Set(cursoAtual.tem_estagio ? modulosComEstagio(disciplinas) : []);
  const estData = agregarModulosSetor('Estágio', qtdModulos, registros, permitidos);
  if (cursoAtual.tem_estagio == null) {
    estData.status = 'não iniciado';
  } else if (!cursoAtual.tem_estagio) {
    estData.status = 'completo';
  }
  const setorEstagio: SetorAgregado = {
    setor: 'Estágio',
    status: estData.status,
    modulos_salvos: estData.modulos_salvos,
    custo_total: estData.custo_total,
    custo_mensal_medio: estData.custo_mensal_medio,
    modulos: estData.modulos,
  };

  // 4. Curso (ambos os setores)
  const custo_total_curso = pedData.custo_total + estData.custo_total;
  const custo_mensal_medio_curso =
    pedData.custo_mensal_medio + estData.custo_mensal_medio;

  const status_geral: StatusGeral =
    pedData.status === 'completo' && estData.status === 'completo'
      ? 'completo'
      : 'parcial';

  const dados_parciais =
    pedData.status !== 'completo' || estData.status !== 'completo';

  const curso: CursoMestre = {
    ...cursoAtual,
    status_pedagogico: pedData.status,
    status_estagio: estData.status,
    status_geral,
    custo_total_pedagogico: pedData.custo_total,
    custo_mensal_medio_pedagogico: pedData.custo_mensal_medio,
    custo_total_estagio: estData.custo_total,
    custo_mensal_medio_estagio: estData.custo_mensal_medio,
    custo_total_curso,
    custo_mensal_medio_curso,
    dados_parciais,
    atualizado_em: new Date().toISOString(),
  };

  return {
    curso,
    setorPedagogico,
    setorEstagio,
  };
}

/**
 * MIGRAÇÃO (semestre -> módulo trimestral)
 * Cada semestre legado vira 2 módulos com a mesma demanda: o custo total é preservado
 * (qtd * salário * 6 = 2 × qtd * salário * 3).
 */
type LegacyRegistro = Partial<RegistroItem> & { semestre?: number };
type LegacyCurso = Partial<CursoMestre> & { quantidade_semestres?: number };

export function isRegistroLegado(r: LegacyRegistro): boolean {
  return r.modulo === undefined && r.semestre !== undefined;
}

export function migrarRegistros(registros: LegacyRegistro[]): RegistroItem[] {
  const nativos = (registros.filter((r) => !isRegistroLegado(r)) as RegistroItem[]).map((r) => ({
    ...r,
    salario: custoOuNaN(r.salario),
    custo: custoOuNaN(r.custo),
  }));
  const ids = new Set(nativos.map((r) => r.id));
  const resultado = [...nativos];
  let maxIndice = nativos.reduce((m, r) => Math.max(m, r.indice || 0), 0);

  registros
    .filter(isRegistroLegado)
    .sort((a, b) => (a.indice || 0) - (b.indice || 0))
    .forEach((r) => {
      const { semestre, ...resto } = r;
      [1, 2].forEach((parte) => {
        const id = `${r.id}_m${parte}`;
        if (ids.has(id)) return;
        ids.add(id);
        const { custo } = calcularCustoRegistro();
        resultado.push({
          ...(resto as RegistroItem),
          id,
          indice: ++maxIndice,
          modulo: (semestre! - 1) * 2 + parte,
          custo,
        });
      });
    });

  return resultado;
}

export function migrarCursos(cursos: LegacyCurso[]): CursoMestre[] {
  return cursos.map((legado) => {
    const c = {
      ...legado,
      custo_total_pedagogico: custoOuNaN(legado.custo_total_pedagogico),
      custo_mensal_medio_pedagogico: custoOuNaN(legado.custo_mensal_medio_pedagogico),
      custo_total_estagio: custoOuNaN(legado.custo_total_estagio),
      custo_mensal_medio_estagio: custoOuNaN(legado.custo_mensal_medio_estagio),
      custo_total_curso: custoOuNaN(legado.custo_total_curso),
      custo_mensal_medio_curso: custoOuNaN(legado.custo_mensal_medio_curso),
    };
    const comEstagio = { ...c, tem_estagio: c.tem_estagio ?? null };
    if (comEstagio.quantidade_modulos !== undefined) return comEstagio as CursoMestre;
    const { quantidade_semestres, ...resto } = comEstagio;
    const semestres = quantidade_semestres ?? Math.round((c.duracao_curso || 0) * 2);
    return { ...(resto as CursoMestre), quantidade_modulos: semestres * 2 };
  });
}
