import {
  CargaHoraria,
  Cargo,
  CursoMestre,
  Grau,
  RegistroItem,
  SectorStatus,
  SemestreAgregado,
  Setor,
  SetorAgregado,
  StatusGeral,
} from '../types';
import { buscar_salario } from './salary';

/**
 * Normaliza a chave do curso: nome_curso + grau (seção 3)
 */
export function normalizeCourseKey(nome_curso: string, grau: Grau): string {
  return `${nome_curso.trim().toLowerCase()}___${grau.trim().toLowerCase()}`;
}

/**
 * Calcula o custo individual de um registro (seção 6.2 - passo 1)
 * custo = quantidade * salario * 6
 */
export function calcularCustoRegistro(
  quantidade: number,
  carga_horaria: CargaHoraria,
  cargo: Cargo = 'Professor'
): { salario: number; custo: number } {
  const salario = buscar_salario(carga_horaria, cargo);
  const custo = quantidade * salario * 6;
  return { salario, custo };
}

/**
 * Agrega os semestres de um setor específico
 */
export function agregarSemestresSetor(
  setor: Setor,
  quantidade_semestres: number,
  registros: RegistroItem[]
): {
  semestres: SemestreAgregado[];
  semestres_salvos: number;
  custo_total: number;
  custo_mensal_medio: number;
  status: SectorStatus;
} {
  const setorRegistros = registros.filter((r) => r.setor === setor);
  const semestres: SemestreAgregado[] = [];

  let semestresSalvosContagem = 0;
  let somaCustoSemestral = 0;
  let somaCustoMensal = 0;

  for (let s = 1; s <= quantidade_semestres; s++) {
    const regProf = setorRegistros.find((r) => r.semestre === s && r.cargo === 'Professor');
    const regMed = setorRegistros.find((r) => r.semestre === s && r.cargo === 'Mediador');

    const profSalvo = Boolean(regProf);
    const medSalvo = Boolean(regMed);
    const concluido = profSalvo && medSalvo; // Seção 3.1: só conta como salvo quando ambos salvos

    const custoProf = regProf ? regProf.custo : 0;
    const custoMed = regMed ? regMed.custo : 0;
    const custoSemestral = custoProf + custoMed;
    const custoMensal = custoSemestral / 6;

    if (concluido) {
      semestresSalvosContagem++;
    }

    somaCustoSemestral += custoSemestral;
    somaCustoMensal += custoMensal;

    semestres.push({
      semestre: s,
      custo_professor: custoProf,
      custo_mediador: custoMed,
      custo_semestral: custoSemestral,
      custo_mensal_semestre: custoMensal,
      professor_salvo: profSalvo,
      mediador_salvo: medSalvo,
      concluido,
      registro_professor: regProf,
      registro_mediador: regMed,
    });
  }

  // Status do setor segundo Seção 3.1:
  // 0 -> não iniciado
  // 1 a quantidade_semestres - 1 -> incompleto
  // = quantidade_semestres -> completo
  let status: SectorStatus = 'não iniciado';
  if (semestresSalvosContagem === 0) {
    // Atenção: se tiver professor salvo mas não mediador, semestresSalvosContagem é 0 mas há dados pendentes
    const temAlgumRegistro = setorRegistros.length > 0;
    status = temAlgumRegistro ? 'incompleto' : 'não iniciado';
  } else if (semestresSalvosContagem < quantidade_semestres) {
    status = 'incompleto';
  } else {
    status = 'completo';
  }

  // Custo mensal médio do setor = soma do custo mensal dos semestres ÷ quantidade_semestres (Seção 6.2 e 15)
  const custo_mensal_medio =
    quantidade_semestres > 0 ? somaCustoMensal / quantidade_semestres : 0;

  return {
    semestres,
    semestres_salvos: semestresSalvosContagem,
    custo_total: somaCustoSemestral,
    custo_mensal_medio,
    status,
  };
}

/**
 * Realiza o recálculo em cascata completo do curso (seção 6.2)
 * Atualiza registros -> semestres -> setores -> curso
 */
export function recalcularCurso(
  cursoAtual: CursoMestre,
  registros: RegistroItem[]
): {
  curso: CursoMestre;
  setorPedagogico: SetorAgregado;
  setorEstagio: SetorAgregado;
} {
  const qtdSemestres = cursoAtual.quantidade_semestres;

  // 1 e 2 e 3. Agrega Pedagógico
  const pedData = agregarSemestresSetor('Pedagógico', qtdSemestres, registros);
  const setorPedagogico: SetorAgregado = {
    setor: 'Pedagógico',
    status: pedData.status,
    semestres_salvos: pedData.semestres_salvos,
    custo_total: pedData.custo_total,
    custo_mensal_medio: pedData.custo_mensal_medio,
    semestres: pedData.semestres,
  };

  // 1 e 2 e 3. Agrega Estágio
  const estData = agregarSemestresSetor('Estágio', qtdSemestres, registros);
  const setorEstagio: SetorAgregado = {
    setor: 'Estágio',
    status: estData.status,
    semestres_salvos: estData.semestres_salvos,
    custo_total: estData.custo_total,
    custo_mensal_medio: estData.custo_mensal_medio,
    semestres: estData.semestres,
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
