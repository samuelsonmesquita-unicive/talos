import {
  CursoMestre,
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

/**
 * Agrega os módulos de um setor específico
 */
export function agregarModulosSetor(
  setor: Setor,
  quantidade_modulos: number,
  registros: RegistroItem[]
): {
  modulos: ModuloAgregado[];
  modulos_salvos: number;
  custo_total: number;
  custo_mensal_medio: number;
  status: SectorStatus;
} {
  const setorRegistros = registros.filter((r) => r.setor === setor);
  const modulos: ModuloAgregado[] = [];

  let modulosSalvosContagem = 0;
  let somaCustoModulo = 0;
  let somaCustoMensal = 0;

  for (let s = 1; s <= quantidade_modulos; s++) {
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
  // = quantidade_modulos -> completo
  let status: SectorStatus = 'não iniciado';
  if (modulosSalvosContagem === 0) {
    // Atenção: se tiver professor salvo mas não mediador, modulosSalvosContagem é 0 mas há dados pendentes
    const temAlgumRegistro = setorRegistros.length > 0;
    status = temAlgumRegistro ? 'incompleto' : 'não iniciado';
  } else if (modulosSalvosContagem < quantidade_modulos) {
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
 */
export function recalcularCurso(
  cursoAtual: CursoMestre,
  registros: RegistroItem[]
): {
  curso: CursoMestre;
  setorPedagogico: SetorAgregado;
  setorEstagio: SetorAgregado;
} {
  const qtdModulos = cursoAtual.quantidade_modulos;

  // 1 e 2 e 3. Agrega Pedagógico
  const pedData = agregarModulosSetor('Pedagógico', qtdModulos, registros);
  const setorPedagogico: SetorAgregado = {
    setor: 'Pedagógico',
    status: pedData.status,
    modulos_salvos: pedData.modulos_salvos,
    custo_total: pedData.custo_total,
    custo_mensal_medio: pedData.custo_mensal_medio,
    modulos: pedData.modulos,
  };

  // 1 e 2 e 3. Agrega Estágio
  const estData = agregarModulosSetor('Estágio', qtdModulos, registros);
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
    if (c.quantidade_modulos !== undefined) return c as CursoMestre;
    const { quantidade_semestres, ...resto } = c;
    const semestres = quantidade_semestres ?? Math.round((c.duracao_curso || 0) * 2);
    return { ...(resto as CursoMestre), quantidade_modulos: semestres * 2 };
  });
}
