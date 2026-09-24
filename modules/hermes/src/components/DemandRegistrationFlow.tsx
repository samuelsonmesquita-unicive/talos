import React, { useState, useEffect, useRef } from 'react';
import { CursoMestre, Setor, CargaHoraria, RegistroItem, DisciplinaEstagio } from '../types';
import {
  saveOrUpdateRegistro,
  getRegistrosForCourse,
  getNextPendingModule,
  findCourseByKey,
  getDisciplinasEstagio,
} from '../services/courseStore';
import { formatCurrency } from '../utils/salary';
import { MESES_POR_MODULO, MODULOS_POR_ANO, totaisEstagio } from '../utils/courseCalculations';
import { EstagioDisciplinasStep } from './EstagioDisciplinasStep';
import { SemEstagioAviso } from './SemEstagioAviso';
import {
  Briefcase,
  Pencil,
  CheckCircle2,
  ChevronRight,
  Save,
  FileCheck,
  Search,
  ArrowLeft,
  GraduationCap,
  Sparkles,
  BookOpen,
  Lock,
  AlertCircle,
  Copy,
  ListChecks,
} from 'lucide-react';

const CARGAS: CargaHoraria[] = ['10h', '20h', '40h'];
const MAX_QTD = 10;

interface DemandRegistrationFlowProps {
  // Supports both curso and cursoInicial
  curso?: CursoMestre;
  cursoInicial?: CursoMestre;
  // Supports both initialSetor and setorInicial
  initialSetor?: Setor;
  setorInicial?: Setor;
  isRetomada?: boolean;
  // Pedagógico: abre direto na etapa "Disciplinas de estágio" (ex.: "Editar disciplinas de estágio")
  abrirEtapaEstagio?: boolean;
  // Supports onConcludeSector and onConclude with optional toast message.
  // cursoCompleto = true quando ESTE ato de conclusão deixou o curso 100% completo
  // (Pedagógico + Estágio). setorConcluido = qual setor acabou de ser concluído nesta
  // ação — o app-shell usa isso pra decidir se abre o próximo passo (Plutos/Disciplinas),
  // que hoje dispara assim que o Pedagógico fica completo (não precisa esperar Estágio).
  onConcludeSector?: (toastMsg?: string, cursoCompleto?: boolean, setorConcluido?: Setor) => void;
  onConclude?: (toastMsg?: string, cursoCompleto?: boolean, setorConcluido?: Setor) => void;
  onCancel?: () => void;
  onGoToConsult?: () => void;
  onGoToReport?: (curso: CursoMestre) => void;
}

/* ───────────── Campo compacto de um cargo (quantidade + carga horária) ───────────── */

interface RoleFieldsProps {
  cargo: 'Professor' | 'Mediador';
  icon: React.ReactNode;
  qtd: string;
  ch: CargaHoraria | null;
  onQtd: (v: string) => void;
  onCh: (v: CargaHoraria) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onEnter: () => void;
}

const RoleFields: React.FC<RoleFieldsProps> = ({ cargo, icon, qtd, ch, onQtd, onCh, inputRef, onEnter }) => {
  const num = Number(qtd);
  const qtdOk = qtd.trim() !== '' && Number.isInteger(num) && num >= 0 && num <= MAX_QTD;
  const chLiberada = qtdOk && num > 0;
  const prefix = cargo.slice(0, 4).toLowerCase();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
          {icon}
          {cargo}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          id={`input-quantidade-${cargo.toLowerCase()}`}
          type="number"
          min={0}
          max={MAX_QTD}
          inputMode="numeric"
          aria-label={`Quantidade de ${cargo}`}
          value={qtd}
          onChange={(e) => onQtd(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onEnter();
            }
          }}
          placeholder="Qtd"
          className="w-16 shrink-0 px-2 py-2 rounded-lg border border-slate-300 text-sm font-bold text-center tabular focus:outline-none focus:ring-2 focus:ring-[#239371]"
        />
        <div className="grid grid-cols-3 gap-1.5 flex-1">
          {CARGAS.map((c) => {
            const selected = ch === c && chLiberada;
            return (
              <button
                key={c}
                type="button"
                id={`btn-ch-${prefix}-${c}`}
                disabled={!chLiberada}
                onClick={() => onCh(c)}
                className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                  !chLiberada
                    ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                    : selected
                    ? 'bg-[#239371] text-white border-[#239371] shadow-xs cursor-pointer'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 cursor-pointer'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-1.5 text-[11px] text-slate-500 leading-tight">
        {!qtdOk
          ? `Qtd. de 0 a ${MAX_QTD} (0 = sem ${cargo.toLowerCase()})`
          : num === 0
          ? 'Sem ' + cargo.toLowerCase() + ' neste módulo'
          : !ch
          ? 'Escolha a carga horária semanal'
          : `${num} ${cargo.toLowerCase()}(es) · carga ${ch} · custo calculado ao salvar`}
      </p>
    </div>
  );
};

/* ───────────── Fluxo principal ───────────── */

export const DemandRegistrationFlow: React.FC<DemandRegistrationFlowProps> = (props) => {
  const curso = props.curso || props.cursoInicial;

  if (!curso) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-xl shadow-md border border-slate-200 text-center space-y-4">
        <p className="text-sm font-semibold text-slate-700">
          Nenhum curso foi selecionado para preenchimento.
        </p>
        <button onClick={props.onCancel} className="btn-unicive-primary text-xs py-2 px-4">
          Voltar ao Início
        </button>
      </div>
    );
  }

  return <FlowContent {...props} curso={curso} />;
};

const FlowContent: React.FC<DemandRegistrationFlowProps & { curso: CursoMestre }> = ({
  curso,
  initialSetor = 'Pedagógico',
  setorInicial,
  abrirEtapaEstagio = false,
  onConcludeSector,
  onConclude,
  onCancel,
  onGoToConsult,
  onGoToReport,
}) => {
  const total = curso.quantidade_modulos;
  // O fluxo fica preso ao setor escolhido na entrada (cada setor preenche só o seu)
  const currentSetor: Setor = setorInicial || initialSetor;

  const handleConclude = (toastMsg?: string, cursoCompleto?: boolean, setorConcluido?: Setor) => {
    if (onConcludeSector) onConcludeSector(toastMsg, cursoCompleto, setorConcluido);
    else if (onConclude) onConclude(toastMsg, cursoCompleto, setorConcluido);
  };

  // Versão mais recente do curso (tem_estagio pode ter mudado desde que o fluxo foi aberto)
  const [cursoAtual, setCursoAtual] = useState<CursoMestre>(
    () => findCourseByKey(curso.nome_curso, curso.grau) ?? curso
  );
  const [disciplinas, setDisciplinas] = useState<DisciplinaEstagio[]>(() =>
    getDisciplinasEstagio(curso.nome_curso, curso.grau)
  );

  // 'setor' = setor recém-concluído; 'curso' = ambos os setores concluídos
  const [showSetorCompletedPopup, setShowSetorCompletedPopup] = useState<{
    tipo: 'setor' | 'curso';
    setor: Setor;
  } | null>(null);

  const [registros, setRegistros] = useState<RegistroItem[]>(() =>
    getRegistrosForCourse(curso.nome_curso, curso.grau)
  );

  const [currentModulo, setCurrentModulo] = useState<number>(
    () =>
      getNextPendingModule(curso.nome_curso, curso.grau, currentSetor, total) || 1
  );

  const [qtdProf, setQtdProf] = useState('');
  const [chProf, setChProf] = useState<CargaHoraria | null>(null);
  const [qtdMed, setQtdMed] = useState('');
  const [chMed, setChMed] = useState<CargaHoraria | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);
  const profInputRef = useRef<HTMLInputElement>(null);
  const medInputRef = useRef<HTMLInputElement>(null);

  const focusProfessor = () => {
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      profInputRef.current?.focus();
    }, 120);
  };

  const registrosDoModulo = (mod: number, setor: Setor, lista = registros) => {
    const regs = lista.filter((r) => r.setor === setor && r.modulo === mod);
    return {
      prof: regs.find((r) => r.cargo === 'Professor'),
      med: regs.find((r) => r.cargo === 'Mediador'),
    };
  };

  const loadModuleData = (mod: number, setor: Setor) => {
    const { prof, med } = registrosDoModulo(mod, setor, getRegistrosForCourse(curso.nome_curso, curso.grau));
    setQtdProf(prof ? String(prof.quantidade) : '');
    setChProf(prof && prof.quantidade > 0 ? prof.carga_horaria : null);
    setQtdMed(med ? String(med.quantidade) : '');
    setChMed(med && med.quantidade > 0 ? med.carga_horaria : null);
    setFormError(null);
  };

  useEffect(() => {
    loadModuleData(currentModulo, currentSetor);
    focusProfessor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentModulo, currentSetor]);

  /* ── Estado de progresso do setor ativo ── */
  const isModuloConcluido = (mod: number, setor: Setor = currentSetor, lista = registros) => {
    const { prof, med } = registrosDoModulo(mod, setor, lista);
    return Boolean(prof && med);
  };

  const modulos = Array.from({ length: total }, (_, i) => i + 1);

  // Estágio: só os módulos com disciplina de estágio (informadas pelo Pedagógico) são editáveis
  const estagio = totaisEstagio(disciplinas);
  const modulosDoSetor = (setor: Setor): number[] =>
    setor === 'Estágio' ? (cursoAtual.tem_estagio ? estagio.modulos : []) : modulos;
  const modulosSetor = modulosDoSetor(currentSetor);
  const temModulo = (mod: number) => modulosSetor.includes(mod);

  const concluidos = new Set(modulosSetor.filter((m) => isModuloConcluido(m)));
  const primeiroPendente =
    modulosSetor.find((m) => !concluidos.has(m)) ?? modulosSetor[modulosSetor.length - 1] ?? 1;
  const setorConcluido = modulosSetor.length > 0 && concluidos.size >= modulosSetor.length;
  const proximoModulo = (mod: number) => modulosSetor.find((m) => m > mod);
  const moduloAnterior = (mod: number) => [...modulosSetor].reverse().find((m) => m < mod);

  // Pedagógico: todos os módulos salvos; o setor só conclui depois da etapa de estágio
  const pedagogicoModulosOk = (lista = registros) =>
    modulos.every((m) => isModuloConcluido(m, 'Pedagógico', lista));

  const [etapaEstagio, setEtapaEstagio] = useState<boolean>(
    () =>
      currentSetor === 'Pedagógico' &&
      (abrirEtapaEstagio || (cursoAtual.tem_estagio == null && pedagogicoModulosOk()))
  );

  // Só o primeiro módulo pendente é editável; com o setor completo, todos podem ser revisados
  const isModuloTravado = (mod: number) =>
    !temModulo(mod) || (setorConcluido ? false : mod !== primeiroPendente);

  /* ── Validação ── */
  const numProf = Number(qtdProf);
  const numMed = Number(qtdMed);
  const profQtdOk = qtdProf.trim() !== '' && Number.isInteger(numProf) && numProf >= 0 && numProf <= MAX_QTD;
  const medQtdOk = qtdMed.trim() !== '' && Number.isInteger(numMed) && numMed >= 0 && numMed <= MAX_QTD;
  const profOk = profQtdOk && (numProf === 0 || chProf !== null);
  const medOk = medQtdOk && (numMed === 0 || chMed !== null);
  const canSalvar = profOk && medOk;

  const mensagemPendencia = (): string | null => {
    if (!profQtdOk) return `Informe a quantidade de Professores (0 a ${MAX_QTD}).`;
    if (numProf > 0 && !chProf) return 'Selecione a carga horária do Professor.';
    if (!medQtdOk) return `Informe a quantidade de Mediadores (0 a ${MAX_QTD}).`;
    if (numMed > 0 && !chMed) return 'Selecione a carga horária do Mediador.';
    return null;
  };

  const gravarModulo = (mod: number) => {
    saveOrUpdateRegistro(curso.nome_curso, curso.grau, currentSetor, mod, 'Professor', numProf, chProf || '10h');
    saveOrUpdateRegistro(curso.nome_curso, curso.grau, currentSetor, mod, 'Mediador', numMed, chMed || '10h');
  };

  // Estágio concluído: o curso fica completo se o Pedagógico também estiver (módulos + etapa de estágio)
  const finalizarEstagio = () => {
    const atuais = getRegistrosForCourse(curso.nome_curso, curso.grau);
    const pedCompleto = pedagogicoModulosOk(atuais) && cursoAtual.tem_estagio != null;
    setShowSetorCompletedPopup({ tipo: pedCompleto ? 'curso' : 'setor', setor: 'Estágio' });
  };

  // Pedagógico: depois do último módulo vem a etapa "Disciplinas de estágio"
  const concluirModulosSetor = () => {
    if (currentSetor === 'Pedagógico') {
      setNotice(null);
      setEtapaEstagio(true);
    } else {
      finalizarEstagio();
    }
  };

  const handleEstagioSalvo = (cursoSalvo: CursoMestre, novas: DisciplinaEstagio[]) => {
    const primeiraVez = cursoAtual.tem_estagio == null;
    setCursoAtual(cursoSalvo);
    setDisciplinas(novas);
    setRegistros(getRegistrosForCourse(curso.nome_curso, curso.grau));
    setEtapaEstagio(false);
    if (primeiraVez) {
      setShowSetorCompletedPopup({
        tipo: cursoSalvo.status_estagio === 'completo' ? 'curso' : 'setor',
        setor: 'Pedagógico',
      });
    } else {
      setNotice('Disciplinas de estágio atualizadas.');
    }
  };

  const handleSalvar = () => {
    const pendencia = mensagemPendencia();
    if (pendencia) {
      setFormError(pendencia);
      return;
    }
    setFormError(null);

    const jaEstavaCompleto = setorConcluido;
    gravarModulo(currentModulo);
    setRegistros(getRegistrosForCourse(curso.nome_curso, curso.grau));

    if (jaEstavaCompleto) {
      setNotice(`Módulo ${currentModulo} atualizado.`);
      return;
    }

    const next = proximoModulo(currentModulo);
    if (next !== undefined) {
      setNotice(`Módulo ${currentModulo} salvo.`);
      setCurrentModulo(next);
    } else {
      concluirModulosSetor();
    }
  };

  /* ── Atalhos de produtividade ── */
  const anterior = moduloAnterior(currentModulo);
  const restantes = modulosSetor.filter((m) => m >= currentModulo);

  const copiarModuloAnterior = () => {
    if (anterior === undefined) return;
    const { prof, med } = registrosDoModulo(anterior, currentSetor);
    if (!prof || !med) return;
    setQtdProf(String(prof.quantidade));
    setChProf(prof.quantidade > 0 ? prof.carga_horaria : null);
    setQtdMed(String(med.quantidade));
    setChMed(med.quantidade > 0 ? med.carga_horaria : null);
    setFormError(null);
  };

  const aplicarNosRestantes = () => {
    const pendencia = mensagemPendencia();
    if (pendencia) {
      setFormError(pendencia);
      return;
    }
    const lista = restantes.map((m) => `M${m}`).join(', ');
    if (
      !window.confirm(
        `Aplicar estes valores aos ${restantes.length} módulo(s) restante(s) (${lista}) do Setor ${currentSetor}? Você poderá ajustar depois em Consultar Registros.`
      )
    ) {
      return;
    }
    for (const m of restantes) gravarModulo(m);
    setRegistros(getRegistrosForCourse(curso.nome_curso, curso.grau));
    concluirModulosSetor();
  };

  const podeCopiar =
    anterior !== undefined && isModuloConcluido(anterior) && !isModuloConcluido(currentModulo);
  const podeAplicarRestantes = !setorConcluido && restantes.length > 1;
  const proximo = proximoModulo(currentModulo);

  /* ── Resumo compacto por ano ── */
  const anos = Array.from({ length: Math.ceil(total / MODULOS_POR_ANO) }, (_, i) => i + 1);
  const totalSetor = registros
    .filter((r) => r.setor === currentSetor && temModulo(r.modulo))
    .reduce((s, r) => s + r.custo, 0);
  const percentual =
    modulosSetor.length > 0 ? Math.round((concluidos.size / modulosSetor.length) * 100) : 0;
  const disciplinasDoModulo = disciplinas.filter((d) => d.modulo === currentModulo);

  // Resumo de cada setor nas abas (só informativo: o setor é escolhido na entrada)
  const progressoSetor = (s: Setor): { texto: string; completo: boolean; parcial: boolean } => {
    if (s === 'Estágio' && cursoAtual.tem_estagio === false) {
      return { texto: 'sem estágio', completo: true, parcial: false };
    }
    if (s === 'Estágio' && cursoAtual.tem_estagio == null) {
      return { texto: 'aguarda Pedagógico', completo: false, parcial: false };
    }
    const lista = modulosDoSetor(s);
    const feitos = lista.filter((m) => isModuloConcluido(m, s)).length;
    const completo =
      feitos >= lista.length && (s === 'Estágio' || cursoAtual.tem_estagio != null);
    const texto =
      s === 'Pedagógico' && feitos >= lista.length && cursoAtual.tem_estagio == null
        ? 'falta estágio'
        : `${feitos}/${lista.length}`;
    return { texto, completo, parcial: feitos > 0 };
  };

  /* ── Estágio sem módulos liberados pelo Pedagógico ── */
  if (currentSetor === 'Estágio' && !cursoAtual.tem_estagio) {
    return (
      <div className="max-w-5xl mx-auto py-5 px-4 sm:px-6 space-y-3">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
          <button
            onClick={onCancel}
            className="p-2 text-slate-500 hover:text-[#239371] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Voltar ao início"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-500">
              {curso.grau} &bull; {curso.duracao_curso} anos &bull; {total} módulos trimestrais
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{curso.nome_curso}</h1>
          </div>
        </div>
        <SemEstagioAviso pendentePedagogico={cursoAtual.tem_estagio == null} onVoltar={onCancel} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-5 px-4 sm:px-6 space-y-3">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onCancel}
            className="p-2 text-slate-500 hover:text-[#239371] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Voltar ao início"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="badge-unicive-ead">EAD UNICIVE</span>
              <span className="text-xs font-semibold text-slate-500">
                {curso.grau} &bull; {curso.duracao_curso} anos &bull; {total} módulos trimestrais
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{curso.nome_curso}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onGoToReport && (
            <button onClick={() => onGoToReport(curso)} className="btn-unicive-outline text-xs py-1.5 px-3">
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              <span>Relatório</span>
            </button>
          )}
          <button onClick={onGoToConsult} className="btn-unicive-outline text-xs py-1.5 px-3">
            <Search className="w-3.5 h-3.5 mr-1.5" />
            <span>Consultar Registros</span>
          </button>
        </div>
      </div>

      {/* Setores + progresso */}
      <div className="card-unicive p-3 space-y-3">
        <div className="flex rounded-lg bg-slate-100 p-1 gap-1">
          {(['Pedagógico', 'Estágio'] as Setor[]).map((s) => {
            const isAtivo = currentSetor === s;
            const prog = progressoSetor(s);
            return (
              <div
                key={s}
                id={`btn-setor-${s.toLowerCase()}`}
                title={isAtivo ? `Você está preenchendo o Setor ${s}` : `Setor ${s} é preenchido pela própria equipe`}
                className={`flex-1 py-2 px-3 rounded-md text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 ${
                  isAtivo
                    ? 'bg-white text-[#239371] font-bold shadow-xs ring-1 ring-black/5'
                    : 'text-slate-400'
                }`}
              >
                {!isAtivo && <Lock className="w-3 h-3" />}
                <span>{s}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    prog.completo
                      ? 'bg-emerald-100 text-[#117d5d]'
                      : prog.parcial
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {prog.texto}
                </span>
              </div>
            );
          })}
        </div>

        {/* Barra de progresso */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-[#239371] transition-all" style={{ width: `${percentual}%` }} />
          </div>
          <span className="text-[11px] font-bold text-slate-600 tabular whitespace-nowrap">
            {concluidos.size}/{modulosSetor.length} módulos
            {currentSetor === 'Estágio' ? ' com estágio' : ''} &bull; {formatCurrency(totalSetor)}
          </span>
        </div>

        {/* Estágio: carga horária informada pelo Pedagógico */}
        {currentSetor === 'Estágio' && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="font-bold uppercase tracking-wide text-slate-500 mr-1">
              Estágio por módulo:
            </span>
            {estagio.modulos.map((m) => (
              <span
                key={m}
                className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 tabular"
              >
                M{m} &bull; {estagio.porModulo.get(m)!.ch} h
              </span>
            ))}
            <span className="px-2 py-0.5 rounded-full bg-[#ebf7f2] border border-[#239371]/40 text-[#117d5d] font-bold tabular">
              Total do curso &bull; {estagio.totalCh} h
            </span>
          </div>
        )}

        {/* Mapa de módulos agrupado por ano */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
          {anos.map((ano) => {
            const doAno = modulos.filter((m) => Math.ceil(m / MODULOS_POR_ANO) === ano);
            return (
              <div key={ano} className="flex items-center gap-2">
                <span className="w-9 shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Ano {ano}
                </span>
                <div className="flex-1 grid grid-cols-4 gap-1">
                  {doAno.map((mod) => {
                    const semEstagio = !temModulo(mod);
                    const ativo = mod === currentModulo && !etapaEstagio && !semEstagio;
                    const feito = concluidos.has(mod);
                    const travado = isModuloTravado(mod);
                    const chEstagio = estagio.porModulo.get(mod)?.ch;
                    return (
                      <button
                        key={mod}
                        type="button"
                        id={`btn-modulo-progressao-${mod}`}
                        disabled={travado || ativo}
                        title={
                          semEstagio
                            ? `Módulo ${mod} sem estágio cadastrado pelo Pedagógico`
                            : ativo
                            ? `Módulo ${mod} em edição`
                            : feito
                            ? `Módulo ${mod} concluído`
                            : travado
                            ? `Módulo ${mod} travado. Conclua o ${primeiroPendente}º primeiro.`
                            : `Ir para o módulo ${mod}`
                        }
                        onClick={() => {
                          setCurrentModulo(mod);
                          setEtapaEstagio(false);
                          setNotice(null);
                        }}
                        className={`h-7 rounded-md text-[11px] font-bold flex items-center justify-center gap-0.5 transition-all ${
                          semEstagio
                            ? 'bg-white text-slate-300 border border-dashed border-slate-200 line-through cursor-not-allowed'
                            : ativo
                            ? 'bg-amber-100 text-amber-900 border-2 border-amber-400 cursor-default'
                            : feito
                            ? `bg-[#ebf7f2] text-[#117d5d] border border-[#239371]/40 ${
                                travado ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-emerald-100'
                              }`
                            : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed'
                        }`}
                      >
                        {feito && !ativo ? <CheckCircle2 className="w-3 h-3" /> : null}
                        M{mod}
                        {currentSetor === 'Estágio' && chEstagio ? (
                          <span className="font-medium opacity-80">&nbsp;&bull; {chEstagio}h</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pedagógico: etapa final "Disciplinas de estágio" */}
      {etapaEstagio ? (
        <EstagioDisciplinasStep
          curso={cursoAtual}
          disciplinas={disciplinas}
          registros={registros}
          edicao={cursoAtual.tem_estagio != null}
          onSaved={handleEstagioSalvo}
          onCancel={() => setEtapaEstagio(false)}
        />
      ) : (
      /* Formulário do módulo ativo */
      <div
        ref={formRef}
        id="formulario-modulo-ativo"
        className="card-unicive p-4 border-l-4 border-l-amber-400 scroll-mt-4 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="min-w-9 h-9 px-2 rounded-lg bg-[#239371] text-white font-bold text-sm flex items-center justify-center">
              M{currentModulo}
            </span>
            <div className="leading-tight">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Módulo {currentModulo} de {total} &bull; Ano {Math.ceil(currentModulo / MODULOS_POR_ANO)} &bull; {currentSetor}
              </h3>
              <span className="text-[11px] text-slate-500">
                {MESES_POR_MODULO} meses &bull; custo calculado pelo servidor
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {currentSetor === 'Pedagógico' && setorConcluido && (
              <button
                type="button"
                id="btn-editar-disciplinas-estagio"
                onClick={() => {
                  setNotice(null);
                  setEtapaEstagio(true);
                }}
                className={`text-[11px] py-1.5 px-2.5 ${
                  cursoAtual.tem_estagio == null ? 'btn-unicive-orange' : 'btn-unicive-outline'
                }`}
              >
                <Pencil className="w-3 h-3 mr-1.5" />
                {cursoAtual.tem_estagio == null
                  ? 'Informar disciplinas de estágio (pendente)'
                  : 'Editar disciplinas de estágio'}
              </button>
            )}
            {podeCopiar && (
              <button
                type="button"
                id="btn-copiar-modulo-anterior"
                onClick={copiarModuloAnterior}
                className="btn-unicive-outline text-[11px] py-1.5 px-2.5"
                title="Copiar quantidades e cargas horárias do módulo anterior"
              >
                <Copy className="w-3 h-3 mr-1.5" />
                Repetir módulo {anterior}
              </button>
            )}
          </div>
        </div>

        {/* Estágio: disciplinas de estágio deste módulo (informadas pelo Pedagógico) */}
        {currentSetor === 'Estágio' && disciplinasDoModulo.length > 0 && (
          <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Briefcase className="w-3.5 h-3.5 text-[#239371]" />
              Estágio neste módulo &bull; {estagio.porModulo.get(currentModulo)?.ch ?? 0} h
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-0.5">
              {disciplinasDoModulo.map((d) => (
                <li key={d.id}>
                  {d.nome} <span className="text-slate-500 tabular">({d.carga_horaria} h)</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {notice && (
          <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 text-[#117d5d] text-xs font-semibold rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#239371] shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {formError && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSalvar();
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RoleFields
              cargo="Professor"
              icon={<GraduationCap className="w-4 h-4 text-[#239371]" />}
              qtd={qtdProf}
              ch={chProf}
              inputRef={profInputRef}
              onQtd={(v) => {
                setQtdProf(v);
                if (Number(v) === 0) setChProf(null);
                setFormError(null);
              }}
              onCh={(v) => {
                setChProf(v);
                setFormError(null);
              }}
              onEnter={() => (profOk ? medInputRef.current?.focus() : setFormError(mensagemPendencia()))}
            />
            <RoleFields
              cargo="Mediador"
              icon={<Sparkles className="w-4 h-4 text-[#e7972a]" />}
              qtd={qtdMed}
              ch={chMed}
              inputRef={medInputRef}
              onQtd={(v) => {
                setQtdMed(v);
                if (Number(v) === 0) setChMed(null);
                setFormError(null);
              }}
              onCh={(v) => {
                setChMed(v);
                setFormError(null);
              }}
              onEnter={handleSalvar}
            />
          </div>

          {/* Total + ações */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="leading-tight">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Demanda do módulo
              </span>
              <span className="text-sm font-bold text-[#117d5d]">
                {canSalvar
                  ? `${numProf} professor(es) · ${numMed} mediador(es)`
                  : '—'}
              </span>
              <span className="text-[11px] text-slate-500 ml-2">
                Custo calculado no servidor ao salvar
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="btn-unicive-outline text-xs py-2 px-3"
              >
                Cancelar
              </button>
              {podeAplicarRestantes && (
                <button
                  type="button"
                  id="btn-aplicar-restantes"
                  disabled={!canSalvar}
                  onClick={aplicarNosRestantes}
                  title="Salva estes valores neste módulo e em todos os módulos seguintes"
                  className={`text-xs font-bold px-3 py-2 rounded-lg border inline-flex items-center justify-center gap-1.5 transition-all ${
                    canSalvar
                      ? 'bg-white text-[#117d5d] border-[#239371] hover:bg-[#ebf7f2] cursor-pointer'
                      : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  }`}
                >
                  <ListChecks className="w-3.5 h-3.5" />
                  Aplicar aos {restantes.length} restantes
                </button>
              )}
              <button
                type="submit"
                id="btn-salvar-modulo"
                disabled={!canSalvar}
                className={`text-sm px-4 py-2 font-bold rounded-lg transition-all inline-flex items-center justify-center gap-2 shadow-xs ${
                  canSalvar
                    ? 'btn-unicive-primary cursor-pointer'
                    : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>
                  {setorConcluido
                    ? `Atualizar Módulo ${currentModulo}`
                    : proximo !== undefined
                    ? `Salvar e ir p/ Módulo ${proximo}`
                    : currentSetor === 'Pedagógico'
                    ? 'Salvar e informar estágio'
                    : 'Salvar e Concluir Setor'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
      )}

      {/* Módulos já preenchidos: uma linha por módulo */}
      {concluidos.size > 0 && (
        <div className="card-unicive overflow-hidden">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Módulos preenchidos &bull; {currentSetor}
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white text-[10px] uppercase text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-1.5 px-3 text-left">Módulo</th>
                  {currentSetor === 'Estágio' && <th className="py-1.5 px-2 text-left">CH estágio</th>}
                  <th className="py-1.5 px-2 text-left">Professor</th>
                  <th className="py-1.5 px-2 text-left">Mediador</th>
                  <th className="py-1.5 px-3 text-right">Custo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {modulos
                  .filter((m) => concluidos.has(m))
                  .map((m) => {
                    const { prof, med } = registrosDoModulo(m, currentSetor);
                    const fmt = (r?: RegistroItem) =>
                      !r ? '—' : r.quantidade === 0 ? '0' : `${r.quantidade} × ${r.carga_horaria}`;
                    return (
                      <tr key={m} className={m === currentModulo ? 'bg-amber-50/60' : 'hover:bg-slate-50'}>
                        <td className="py-1 px-3 font-bold text-slate-800">M{m}</td>
                        {currentSetor === 'Estágio' && (
                          <td className="py-1 px-2 tabular text-slate-700">
                            {estagio.porModulo.get(m)?.ch ?? 0} h
                          </td>
                        )}
                        <td className="py-1 px-2 tabular text-slate-700">{fmt(prof)}</td>
                        <td className="py-1 px-2 tabular text-slate-700">{fmt(med)}</td>
                        <td className="py-1 px-3 text-right font-bold tabular text-slate-900">
                          {formatCurrency((prof?.custo ?? 0) + (med?.custo ?? 0))}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Setor concluído / Curso concluído */}
      {showSetorCompletedPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-slate-200">
            <div className="w-16 h-16 bg-emerald-100 text-[#239371] rounded-2xl flex items-center justify-center mx-auto border border-emerald-300 shadow-md">
              <FileCheck className="w-8 h-8" />
            </div>

            <div className="text-center space-y-3">
              <span className="text-[12px] font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                ✓ Concluído
              </span>
              {showSetorCompletedPopup.tipo === 'curso' ? (
                <>
                  <h2 className="text-2xl font-bold text-slate-900">Curso concluído com sucesso!</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Os setores <strong>Pedagógico</strong> e <strong>Estágio</strong> de{' '}
                    <strong>{curso.nome_curso}</strong> estão completos.
                    {cursoAtual.tem_estagio === false && ' O curso não tem estágio, então não há custo de estágio.'}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Setor {showSetorCompletedPopup.setor} concluído!
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {showSetorCompletedPopup.setor === 'Pedagógico' ? (
                      <>
                        Todos os <strong>{total} módulos</strong> e as disciplinas de estágio foram
                        informados. O setor <strong>Estágio</strong> poderá preencher os{' '}
                        <strong>{estagio.modulos.length} módulo(s) com estágio</strong> (
                        {estagio.totalCh} h no curso).
                      </>
                    ) : (
                      <>
                        Todos os <strong>{modulosSetor.length} módulo(s) com estágio</strong> foram
                        preenchidos. O setor <strong>Pedagógico</strong> ainda tem pendências.
                      </>
                    )}
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              id="btn-concluir-setor"
              onClick={() => {
                const { tipo, setor } = showSetorCompletedPopup;
                setShowSetorCompletedPopup(null);
                handleConclude(
                  tipo === 'curso'
                    ? `Curso ${curso.nome_curso} concluído com sucesso`
                    : `Setor ${setor} preenchido com sucesso`,
                  tipo === 'curso',
                  setor
                );
              }}
              className="btn-unicive-primary w-full py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 shrink-0" />
              <span>
                {showSetorCompletedPopup.setor === 'Pedagógico'
                  ? 'Continuar para Quantidade de Disciplinas'
                  : 'Voltar ao início'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
