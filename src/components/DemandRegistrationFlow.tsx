import React, { useState, useEffect, useRef } from 'react';
import {
  CursoMestre,
  Setor,
  CargaHoraria,
  Cargo,
  RegistroItem,
} from '../types';
import {
  saveOrUpdateRegistro,
  getRegistrosForCourse,
  getNextPendingSemester,
} from '../services/courseStore';
import {
  buscar_salario,
  buscar_salario_base,
  buscar_detalhamento_salario,
  formatCurrency,
} from '../utils/salary';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Save,
  FileCheck,
  Search,
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Sparkles,
  BookOpen,
  Lock,
  Unlock,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface DemandRegistrationFlowProps {
  // Supports both curso and cursoInicial
  curso?: CursoMestre;
  cursoInicial?: CursoMestre;
  // Supports both initialSetor and setorInicial
  initialSetor?: Setor;
  setorInicial?: Setor;
  isRetomada?: boolean;
  // Supports onConcludeSector and onConclude with optional toast message
  onConcludeSector?: (toastMsg?: string) => void;
  onConclude?: (toastMsg?: string) => void;
  onCancel?: () => void;
  onGoToConsult?: () => void;
  onGoToReport?: (curso: CursoMestre) => void;
}

export const DemandRegistrationFlow: React.FC<DemandRegistrationFlowProps> = (props) => {
  const {
    curso: cursoProp,
    cursoInicial,
    initialSetor = 'Pedagógico',
    setorInicial,
    isRetomada = false,
    onConcludeSector,
    onConclude,
    onCancel,
    onGoToConsult,
    onGoToReport,
  } = props;

  // Resolve active course defensively from either prop
  const curso = cursoProp || cursoInicial;

  const resolvedInitialSetor: Setor = setorInicial || initialSetor || 'Pedagógico';
  const handleConclude = (toastMsg?: string) => {
    if (onConcludeSector) onConcludeSector(toastMsg);
    else if (onConclude) onConclude(toastMsg);
  };

  if (!curso) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-xl shadow-md border border-slate-200 text-center space-y-4">
        <p className="text-sm font-semibold text-slate-700">
          Nenhum curso foi selecionado para preenchimento.
        </p>
        <button
          onClick={onCancel}
          className="btn-unicive-primary text-xs py-2 px-4"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  const [currentSetor, setCurrentSetor] = useState<Setor>(resolvedInitialSetor);

  // Registros já existentes no banco local
  const [registros, setRegistros] = useState<RegistroItem[]>(() =>
    getRegistrosForCourse(curso.nome_curso, curso.grau)
  );

  // Semestre ativo sendo preenchido (1 até quantidade_semestres)
  // Sempre inicia no primeiro semestre pendente
  const [currentSemestre, setCurrentSemestre] = useState<number>(() => {
    const nextSem = getNextPendingSemester(
      curso.nome_curso,
      curso.grau,
      initialSetor,
      curso.quantidade_semestres
    );
    return nextSem || 1;
  });

  // Estado dos campos de Professor
  const [quantidadeProf, setQuantidadeProf] = useState<string>('');
  const [cargaHorariaProf, setCargaHorariaProf] = useState<CargaHoraria | null>(null);

  // Estado dos campos de Mediador
  const [quantidadeMed, setQuantidadeMed] = useState<string>('');
  const [cargaHorariaMed, setCargaHorariaMed] = useState<CargaHoraria | null>(null);

  // Foco ativo no preenchimento: 'Professor' | 'Mediador'
  const [activeCargo, setActiveCargo] = useState<Cargo>('Professor');

  // Controle estrito de salvamento do Professor:
  // Mediador SÓ é desbloqueado após clicar em "Salvar e Continuar" nos dados do Professor!
  const [isProfessorSalvoNesteSemestre, setIsProfessorSalvoNesteSemestre] = useState<boolean>(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [savedSuccessNotice, setSavedSuccessNotice] = useState<string | null>(null);

  // Modal exibido ao concluir de preencher o último semestre do curso para o setor
  const [showSectorCompletionModal, setShowSectorCompletionModal] = useState<boolean>(false);
  const otherSetor: Setor = currentSetor === 'Pedagógico' ? 'Estágio' : 'Pedagógico';

  // Referências para rolagem e foco
  const formRef = useRef<HTMLDivElement>(null);
  const profInputRef = useRef<HTMLInputElement>(null);
  const medInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRegistros(getRegistrosForCourse(curso.nome_curso, curso.grau));
  }, [curso.nome_curso, curso.grau]);

  // Função para deslocar a tela e focar no campo do semestre e professor
  const scrollAndFocusProfessor = () => {
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      profInputRef.current?.focus();
    }, 150);
  };

  // Carrega os dados do semestre selecionado
  const loadSemesterData = (sem: number, setor: Setor) => {
    const regs = getRegistrosForCourse(curso.nome_curso, curso.grau).filter(
      (r) => r.setor === setor && r.semestre === sem
    );
    const regProf = regs.find((r) => r.cargo === 'Professor');
    const regMed = regs.find((r) => r.cargo === 'Mediador');

    if (regProf && regMed) {
      setQuantidadeProf(regProf.quantidade.toString());
      setCargaHorariaProf(regProf.carga_horaria);
      setQuantidadeMed(regMed.quantidade.toString());
      setCargaHorariaMed(regMed.carga_horaria);
      setActiveCargo('Professor');
      setIsProfessorSalvoNesteSemestre(true);
    } else if (regProf) {
      setQuantidadeProf(regProf.quantidade.toString());
      setCargaHorariaProf(regProf.carga_horaria);
      setQuantidadeMed('');
      setCargaHorariaMed(null);
      setActiveCargo('Mediador');
      setIsProfessorSalvoNesteSemestre(true);
    } else {
      // Novo semestre: quantidade vazia por padrão
      setQuantidadeProf('');
      setCargaHorariaProf(null);
      setQuantidadeMed('');
      setCargaHorariaMed(null);
      setActiveCargo('Professor');
      setIsProfessorSalvoNesteSemestre(false);
    }
  };

  // Executa scroll e foco inicial
  useEffect(() => {
    loadSemesterData(currentSemestre, currentSetor);
    scrollAndFocusProfessor();
  }, [currentSemestre, currentSetor]);

  // Registros do setor atual
  const registrosSetor = registros.filter((r) => r.setor === currentSetor);

  // Um semestre está concluído se possui ambos os registros (Professor e Mediador)
  const isSemestreConcluido = (sem: number) => {
    const regs = registrosSetor.filter((r) => r.semestre === sem);
    const hasProf = regs.some((r) => r.cargo === 'Professor');
    const hasMed = regs.some((r) => r.cargo === 'Mediador');
    return hasProf && hasMed;
  };

  // Conjunto de semestres concluídos
  const semestresConcluidos = new Set<number>();
  for (let s = 1; s <= curso.quantidade_semestres; s++) {
    if (isSemestreConcluido(s)) {
      semestresConcluidos.add(s);
    }
  }

  // O único semestre editável é o primeiro que tem informação faltando
  const activeEditableSemestre = (() => {
    for (let s = 1; s <= curso.quantidade_semestres; s++) {
      if (!semestresConcluidos.has(s)) {
        return s;
      }
    }
    return curso.quantidade_semestres; // todos concluídos
  })();

  const isSetorTotalmenteConcluido = semestresConcluidos.size >= curso.quantidade_semestres;

  // Regra obrigatória de travamento:
  // - Liberar para editar apenas 1 semestre por vez.
  // - Se um semestre é editável é porque tem informação faltando.
  // - Se já foi preenchido ou o semestre anterior ainda não foi preenchido travar edição.
  // - Ao terminar de editar e tornar completo, travar edição enquanto não acabar de preencher os semestres restantes.
  const isSemestreTravado = (sem: number) => {
    if (isSetorTotalmenteConcluido) {
      return false; // quando todo o setor estiver 100% completo, pode visualizar qualquer um
    }
    return sem !== activeEditableSemestre;
  };

  // Validação estrita do Professor:
  // - Quantidade: enquanto não digitar um número, não liberar para selecionar carga horária
  // - Carga horária: se escolher zero, torna facultativo e libera o botão de salvar e continuar para mediador
  // - Se for número diferente de zero (> 0), desbloquear carga horária e só desbloquear botão de salvar se escolhida a carga
  const numProf = Number(quantidadeProf);
  const isProfQuantidadeDigitada =
    quantidadeProf.trim() !== '' && !isNaN(numProf) && Number.isInteger(numProf) && numProf >= 0 && numProf <= 10;
  const isProfCargaLiberada =
    activeCargo === 'Professor' && isProfQuantidadeDigitada && numProf > 0;
  const canSalvarProfessor =
    activeCargo === 'Professor' &&
    isProfQuantidadeDigitada &&
    (numProf === 0 || cargaHorariaProf !== null);

  const isProfessorValid = canSalvarProfessor;

  // Validação estrita do Mediador:
  // - Segue exatamente o mesmo procedimento de travas do professor
  // - Enquanto não digitar um número, não liberar para selecionar carga horária
  // - Se escolher zero, carga horária facultativa e libera botão de salvar semestre
  // - Se for número diferente de zero (> 0), só desbloquear botão de salvar se for escolhida a carga horária
  const numMed = Number(quantidadeMed);
  const isMedQuantidadeDigitada =
    quantidadeMed.trim() !== '' && !isNaN(numMed) && Number.isInteger(numMed) && numMed >= 0 && numMed <= 10;
  const isMedCargaLiberada =
    activeCargo === 'Mediador' &&
    isProfessorSalvoNesteSemestre &&
    isMedQuantidadeDigitada &&
    numMed > 0;
  const canSalvarSemestre =
    isProfessorSalvoNesteSemestre &&
    activeCargo === 'Mediador' &&
    isMedQuantidadeDigitada &&
    (numMed === 0 || cargaHorariaMed !== null);

  const isMediadorValid = canSalvarSemestre;
  const isSemestreProntoParaSalvar = canSalvarSemestre;

  // Salários e custos calculados dinamicamente
  const salarioUnitarioProf = cargaHorariaProf ? buscar_salario(cargaHorariaProf, 'Professor') : 0;
  const salarioBaseProf = cargaHorariaProf ? buscar_salario_base(cargaHorariaProf, 'Professor') : 0;
  const detalhesProf = cargaHorariaProf ? buscar_detalhamento_salario(cargaHorariaProf, 'Professor') : null;
  const custoCalculadoProf = isProfQuantidadeDigitada ? (numProf === 0 ? 0 : numProf * salarioUnitarioProf * 6) : 0;

  const salarioUnitarioMed = cargaHorariaMed ? buscar_salario(cargaHorariaMed, 'Mediador') : 0;
  const salarioBaseMed = cargaHorariaMed ? buscar_salario_base(cargaHorariaMed, 'Mediador') : 0;
  const detalhesMed = cargaHorariaMed ? buscar_detalhamento_salario(cargaHorariaMed, 'Mediador') : null;
  const custoCalculadoMed = isMedQuantidadeDigitada ? (numMed === 0 ? 0 : numMed * salarioUnitarioMed * 6) : 0;

  const custoTotalSemestre = custoCalculadoProf + custoCalculadoMed;

  // Salva os dados do Professor e continua para o Mediador DENTRO DO MESMO SEMESTRE
  const handleSalvarProfessorEContinuar = () => {
    if (!canSalvarProfessor) {
      if (!isProfQuantidadeDigitada) {
        setFormError('Por favor, digite a quantidade de Professor (0 a 10).');
      } else if (numProf > 0 && !cargaHorariaProf) {
        setFormError('Para quantidade maior que zero, selecione a carga horária do Professor (10h, 20h ou 40h).');
      }
      return;
    }

    setFormError(null);
    const chProfToSave: CargaHoraria = cargaHorariaProf || '10h';

    // Salva ou atualiza no banco/storage o registro do Professor
    saveOrUpdateRegistro(
      curso.nome_curso,
      curso.grau,
      currentSetor,
      currentSemestre,
      'Professor',
      numProf,
      chProfToSave
    );

    const updatedRegistros = getRegistrosForCourse(curso.nome_curso, curso.grau);
    setRegistros(updatedRegistros);
    setIsProfessorSalvoNesteSemestre(true);
    setActiveCargo('Mediador');
    setQuantidadeMed('');
    setCargaHorariaMed(null);
    setSavedSuccessNotice(
      `Dados do Professor (${numProf === 0 ? '0 prof.' : `${numProf} prof. - ${chProfToSave}`}) salvos com sucesso! Agora preencha a quantidade de Mediadores do ${currentSemestre}º Semestre.`
    );
    setTimeout(() => {
      medInputRef.current?.focus();
    }, 100);
  };

  // Submissão do Semestre Inteiro:
  // SÓ PODE AVANÇAR DE SEMESTRE SE TIVER PREENCHIDO E SALVO O DE PROFESSOR E O DE MEDIADOR
  const handleSalvarSemestre = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    setFormError(null);
    setSavedSuccessNotice(null);

    if (!isProfessorSalvoNesteSemestre) {
      setFormError('Por favor, preencha e salve os dados do Professor antes de concluir o semestre.');
      setActiveCargo('Professor');
      return;
    }

    if (!canSalvarSemestre) {
      if (!isMedQuantidadeDigitada) {
        setFormError('O preenchimento do Mediador está incompleto. Digite a quantidade (0 a 10).');
      } else if (numMed > 0 && !cargaHorariaMed) {
        setFormError('Para quantidade de Mediador maior que zero, selecione a carga horária (10h, 20h ou 40h).');
      }
      return;
    }

    // 1. Garante salvamento do registro de Professor
    const chProfToSave: CargaHoraria = cargaHorariaProf || '10h';
    saveOrUpdateRegistro(
      curso.nome_curso,
      curso.grau,
      currentSetor,
      currentSemestre,
      'Professor',
      numProf,
      chProfToSave
    );

    // 2. Salva registro de Mediador
    const chMedToSave: CargaHoraria = cargaHorariaMed || '10h';
    saveOrUpdateRegistro(
      curso.nome_curso,
      curso.grau,
      currentSetor,
      currentSemestre,
      'Mediador',
      numMed,
      chMedToSave
    );

    const updatedRegistros = getRegistrosForCourse(curso.nome_curso, curso.grau);
    setRegistros(updatedRegistros);

    // REGRA CRÍTICA: Ao terminar de editar e tornar completo, travar edição enquanto não acabar de preencher os semestres restantes.
    if (currentSemestre < curso.quantidade_semestres) {
      const nextSem = currentSemestre + 1;
      setCurrentSemestre(nextSem);
      setQuantidadeProf('');
      setCargaHorariaProf(null);
      setQuantidadeMed('');
      setCargaHorariaMed(null);
      setIsProfessorSalvoNesteSemestre(false);
      setActiveCargo('Professor');
      setSavedSuccessNotice(
        `Semestre ${currentSemestre}º concluído e salvo com sucesso! Custo do semestre: ${formatCurrency(
          custoTotalSemestre
        )}. Preencha agora os dados do ${nextSem}º Semestre.`
      );
      scrollAndFocusProfessor();
    } else {
      setShowSectorCompletionModal(true);
    }
  };

  // Verifica se o outro setor já está 100% preenchido
  const outroSetorRegistros = registros.filter((r) => r.setor === otherSetor);
  const isOutroSetorCompleto =
    outroSetorRegistros.filter((r) => r.cargo === 'Professor').length >= curso.quantidade_semestres &&
    outroSetorRegistros.filter((r) => r.cargo === 'Mediador').length >= curso.quantidade_semestres;

  // Ação 1: Passar para o outro setor
  const handlePassarParaOutroSetor = () => {
    setShowSectorCompletionModal(false);
    setCurrentSetor(otherSetor);
    const nextSem = getNextPendingSemester(
      curso.nome_curso,
      curso.grau,
      otherSetor,
      curso.quantidade_semestres
    );
    const alvoSem = nextSem || 1;
    setCurrentSemestre(alvoSem);
    loadSemesterData(alvoSem, otherSetor);
    setSavedSuccessNotice(
      `Setor ${currentSetor} concluído com sucesso! Preencha agora os dados do setor ${otherSetor} (${alvoSem}º Semestre).`
    );
    scrollAndFocusProfessor();
  };

  // Ação 2: Concluir o registro deste setor (retorna à página inicial e exibe o popup)
  const handleConcluirRegistro = () => {
    setShowSectorCompletionModal(false);
    handleConclude('Registro concluído');
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Top Header & Breadcrumb Unicive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 text-slate-500 hover:text-[#239371] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Voltar ao início"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="badge-unicive-ead">EAD UNICIVE</span>
              <span className="text-xs font-semibold text-slate-500">
                {curso.grau} &bull; {curso.duracao_curso} anos &bull; {curso.quantidade_semestres} semestres
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
              {curso.nome_curso}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onGoToReport && (
            <button
              onClick={() => onGoToReport(curso)}
              className="btn-unicive-outline text-xs py-2 px-3"
              title="Ver Relatório deste Curso"
            >
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              <span>Ver Relatório</span>
            </button>
          )}
          <button
            onClick={onGoToConsult}
            className="btn-unicive-outline text-xs py-2 px-3"
          >
            <Search className="w-3.5 h-3.5 mr-1.5" />
            <span>Consultar Registros Salvos</span>
          </button>
        </div>
      </div>

      {/* SELETOR DE SETORES (Travado durante preenchimento ou inserção do mediador) */}
      <div className="flex rounded-xl bg-slate-100 p-1.5 gap-1.5 border border-slate-200">
        {(['Pedagógico', 'Estágio'] as Setor[]).map((s) => {
          const isAtivo = currentSetor === s;
          const regs = registros.filter((r) => r.setor === s);
          const completosCount = Array.from({ length: curso.quantidade_semestres }, (_, i) => i + 1).filter((sem) => {
            const hasP = regs.some((r) => r.semestre === sem && r.cargo === 'Professor');
            const hasM = regs.some((r) => r.semestre === sem && r.cargo === 'Mediador');
            return hasP && hasM;
          }).length;
          const isCompleto = completosCount >= curso.quantidade_semestres;
          // Setor travado enquanto não concluir todos os semestres deste setor ou durante mediador
          const isSetorBloqueado = (!isSetorTotalmenteConcluido && !isAtivo) || activeCargo === 'Mediador';

          return (
            <button
              key={s}
              type="button"
              id={`btn-setor-${s.toLowerCase()}`}
              disabled={isSetorBloqueado}
              title={
                isSetorBloqueado
                  ? `Setor ${s} travado: conclua todos os semestres do Setor ${currentSetor} primeiro.`
                  : `Alternar para Setor ${s}`
              }
              onClick={() => {
                if (!isSetorBloqueado && currentSetor !== s) {
                  setCurrentSetor(s);
                  const nextSem = getNextPendingSemester(
                    curso.nome_curso,
                    curso.grau,
                    s,
                    curso.quantidade_semestres
                  );
                  const alvoSem = nextSem || 1;
                  setCurrentSemestre(alvoSem);
                  loadSemesterData(alvoSem, s);
                  setSavedSuccessNotice(null);
                  scrollAndFocusProfessor();
                }
              }}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                isSetorBloqueado
                  ? 'text-slate-400 bg-slate-100 cursor-not-allowed opacity-60 border border-transparent'
                  : isAtivo
                  ? 'bg-white text-[#239371] font-bold shadow-xs border border-slate-200 ring-1 ring-black/5 cursor-default'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 cursor-pointer'
              }`}
            >
              {isSetorBloqueado && !isAtivo && <Lock className="w-3.5 h-3.5 text-slate-400" />}
              <span>Setor {s}</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isCompleto
                    ? 'bg-emerald-100 text-[#117d5d]'
                    : completosCount > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {completosCount} / {curso.quantidade_semestres} semestres
              </span>
            </button>
          );
        })}
      </div>

      {/* BLOCO DE PROGRESSÃO DOS SEMESTRES:
          Regras de cores solicitadas:
          - Registro concluído: VERDE (travado para edição enquanto houver semestres pendentes)
          - Em edição: AMARELO (habilitar somente a cor do semestre em edição)
          - Travado por ausência de dados no semestre anterior: CINZA (não sendo possível acessá-lo)
      */}
      <div className="card-unicive p-5 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 text-xs">
          <span className="font-bold text-slate-700 uppercase tracking-wider">
            PROGRESSÃO DOS SEMESTRES &bull; SETOR {currentSetor.toUpperCase()}
          </span>
          <div className="flex items-center gap-4 text-[11px] text-slate-600">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#239371]"></span> Concluído (Verde)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Em edição (Amarelo)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Travado (Cinza)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
          {Array.from({ length: curso.quantidade_semestres }, (_, i) => i + 1).map((sem) => {
            const isEmEdicao = sem === currentSemestre;
            const isConcluido = semestresConcluidos.has(sem);
            const isTravado = isSemestreTravado(sem) || (activeCargo === 'Mediador' && !isEmEdicao);

            // Determina as classes e estilos conforme regra estrita do usuário
            let buttonClasses = '';
            let statusLabel = '';
            let statusIcon = null;

            if (isEmEdicao) {
              // Em edição: AMARELO (habilitar somente a cor do semestre em edição)
              buttonClasses =
                'bg-amber-100 text-amber-950 border-2 border-amber-400 ring-2 ring-amber-300/80 shadow-md font-bold cursor-default';
              statusLabel = 'Em edição';
              statusIcon = <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>;
            } else if (isConcluido) {
              // Concluído: VERDE - travado para edição enquanto houver semestres pendentes
              buttonClasses =
                'bg-[#ebf7f2] text-[#117d5d] border border-[#239371]/50 font-semibold cursor-not-allowed opacity-90';
              statusLabel = 'Concluído';
              statusIcon = <CheckCircle2 className="w-3 h-3 text-[#239371]" />;
            } else {
              // Travado por ausência de dados no semestre anterior: CINZA
              buttonClasses =
                'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60';
              statusLabel = 'Travado';
              statusIcon = <Lock className="w-3 h-3 text-slate-400" />;
            }

            return (
              <button
                key={sem}
                type="button"
                id={`btn-semestre-progressao-${sem}`}
                disabled={isTravado || isEmEdicao}
                title={
                  isEmEdicao
                    ? `Semestre ${sem}º em edição ativa.`
                    : isConcluido
                    ? `Semestre ${sem}º concluído. Travado para edição enquanto os demais semestres não forem concluídos.`
                    : `Semestre ${sem}º travado. Conclua o ${activeEditableSemestre}º semestre primeiro.`
                }
                onClick={() => {
                  if (!isTravado) {
                    setCurrentSemestre(sem);
                    loadSemesterData(sem, currentSetor);
                    setSavedSuccessNotice(null);
                    scrollAndFocusProfessor();
                  }
                }}
                className={`p-3 rounded-xl text-center transition-all ${buttonClasses}`}
              >
                <div className="text-xs font-bold leading-tight">
                  {sem}º Semestre
                </div>
                <div className="mt-1 flex items-center justify-center gap-1 text-[10px]">
                  {statusIcon}
                  <span>{statusLabel}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* FORMULÁRIO DO SEMESTRE ATIVO (Ponto de ancoragem para rolagem e foco) */}
      <div
        ref={formRef}
        id="formulario-semestre-ativo"
        className="card-unicive p-6 sm:p-8 border border-slate-200 shadow-sm scroll-mt-24 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[#239371] text-white font-bold text-base flex items-center justify-center shadow-xs">
              {currentSemestre}º
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Preenchimento do {currentSemestre}º Semestre &bull; Setor {currentSetor}
              </h3>
              <span className="text-xs text-slate-500">
                Duração de 6 meses &bull; Preencha sequencialmente o Professor e o Mediador
              </span>
            </div>
          </div>

          <span className="badge-unicive-green self-start sm:self-auto text-[11px]">
            custo = quantidade &times; salário c/ encargos (+***%) &times; 6 meses
          </span>
        </div>

        {/* Aviso de sucesso após salvamento */}
        {savedSuccessNotice && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-[#117d5d] text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#239371] shrink-0" />
            <span>{savedSuccessNotice}</span>
          </div>
        )}

        {/* Aviso de erro */}
        {formError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* FLUXO CONTROLADO:
            1. PROFESSOR
            2. MEDIADOR
        */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (activeCargo === 'Professor') {
              if (canSalvarProfessor) {
                handleSalvarProfessorEContinuar();
              } else if (!isProfQuantidadeDigitada) {
                setFormError('Por favor, informe a quantidade de Professor (0 a 10).');
              } else if (numProf > 0 && !cargaHorariaProf) {
                setFormError('Para quantidade maior que zero, selecione a carga horária do Professor (10h, 20h ou 40h).');
              }
            } else {
              if (canSalvarSemestre) {
                handleSalvarSemestre(e);
              } else if (!isProfessorSalvoNesteSemestre) {
                setFormError('Por favor, preencha e salve os dados do Professor antes de preencher o mediador.');
              } else if (!isMedQuantidadeDigitada) {
                setFormError('Por favor, informe a quantidade de Mediador (0 a 10).');
              } else if (numMed > 0 && !cargaHorariaMed) {
                setFormError('Para quantidade maior que zero, selecione a carga horária do Mediador (10h, 20h ou 40h).');
              }
            }
          }}
          className="space-y-6"
        >
          {/* SELETOR/INDICADOR DE ETAPA INTERNA */}
          <div className="grid grid-cols-2 gap-3">
            {/* Indicador Professor */}
            <div
              id="tab-cargo-professor"
              className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                activeCargo === 'Professor'
                  ? 'bg-[#ebf7f2] border-[#239371] ring-2 ring-[#239371]/20 font-bold shadow-xs'
                  : isProfessorSalvoNesteSemestre
                  ? 'bg-slate-50 border-emerald-300 text-slate-700'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <GraduationCap
                  className={`w-5 h-5 ${
                    activeCargo === 'Professor' ? 'text-[#239371]' : 'text-slate-500'
                  }`}
                />
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider block">
                    1. Professor
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {isProfessorValid
                      ? numProf === 0
                        ? '0 prof. (sem professor) • R$ 0,00'
                        : `${numProf} prof. (${cargaHorariaProf || '10h'}) • ${formatCurrency(custoCalculadoProf)}`
                      : 'Etapa inicial obrigatória'}
                  </span>
                </div>
              </div>
              <div>
                {isProfessorSalvoNesteSemestre ? (
                  <span className="text-[10px] font-bold text-[#117d5d] bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Registrado
                  </span>
                ) : isProfessorValid ? (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    Pronto p/ Salvar
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    Pendente
                  </span>
                )}
              </div>
            </div>

            {/* Indicador Mediador:
                TRAVADO estritamente enquanto Professor não for SALVO (clique em "Salvar e Continuar")
            */}
            <div
              id="tab-cargo-mediador"
              className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                !isProfessorSalvoNesteSemestre
                  ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-60'
                  : activeCargo === 'Mediador'
                  ? 'bg-[#ebf7f2] border-[#239371] ring-2 ring-[#239371]/20 font-bold shadow-xs text-slate-900'
                  : isMediadorValid
                  ? 'bg-slate-50 border-emerald-300 text-slate-700'
                  : 'bg-white border-slate-300 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles
                  className={`w-5 h-5 ${
                    !isProfessorSalvoNesteSemestre
                      ? 'text-slate-400'
                      : activeCargo === 'Mediador'
                      ? 'text-[#e7972a]'
                      : 'text-slate-500'
                  }`}
                />
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider block">
                    2. Mediador
                  </span>
                  <span className="text-[11px]">
                    {!isProfessorSalvoNesteSemestre
                      ? 'Travado (Clique em Salvar no Professor)'
                      : isMediadorValid
                      ? numMed === 0
                        ? '0 med. (sem mediador) • R$ 0,00'
                        : `${numMed} med. (${cargaHorariaMed || '10h'}) • ${formatCurrency(custoCalculadoMed)}`
                      : 'Liberado para preenchimento'}
                  </span>
                </div>
              </div>
              <div>
                {!isProfessorSalvoNesteSemestre ? (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Travado
                  </span>
                ) : isMediadorValid ? (
                  <span className="text-[10px] font-bold text-[#117d5d] bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> OK
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    Pendente
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* CARD 1: FORMULÁRIO DO PROFESSOR
              Regra: Uma vez preenchido e salvo o de professor, ele fica travado e não pode ser editado enquanto se insere os dados do mediador.
          */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              activeCargo === 'Professor'
                ? 'bg-white border-[#239371]/40 shadow-xs'
                : 'bg-slate-50/80 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#239371]" />
                <h4 className="text-sm font-bold text-slate-900">
                  Dados do Professor (Titular)
                </h4>
              </div>

              {/* Trava visual quando estiver no mediador: não permite edição */}
              {activeCargo === 'Mediador' && isProfessorSalvoNesteSemestre && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-300 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-500" /> Preencher mediador
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Campo Quantidade de Professor: Vazio por padrão */}
              <div>
                <label
                  htmlFor="input-quantidade-professor"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
                >
                  Quantidade de Professores
                </label>
                <input
                  ref={profInputRef}
                  id="input-quantidade-professor"
                  type="number"
                  min="0"
                  max="10"
                  disabled={activeCargo === 'Mediador'}
                  value={quantidadeProf}
                  onChange={(e) => {
                    setQuantidadeProf(e.target.value);
                    setIsProfessorSalvoNesteSemestre(false);
                    setFormError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (canSalvarProfessor) {
                        handleSalvarProfessorEContinuar();
                      }
                    }
                  }}
                  placeholder="Digite a quantidade (0 a 10)"
                  className={`w-full px-4 py-3 rounded-lg border text-sm font-bold tabular transition-all focus:outline-none focus:ring-2 focus:ring-[#239371] ${
                    activeCargo === 'Mediador'
                      ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-slate-300'
                  }`}
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {quantidadeProf === ''
                    ? 'Campo obrigatório (inicia vazio). Digite 0 se não houver professor.'
                    : numProf === 0
                    ? 'Quantidade: 0 (sem professor) — carga horária dispensada e botão "Salvar e Continuar" destravado.'
                    : isProfQuantidadeDigitada
                    ? `Quantidade informada: ${numProf} prof. ${!cargaHorariaProf ? '(selecione a carga horária para destravar o botão)' : '— botão "Salvar e Continuar" destravado.'}`
                    : 'Informe um número inteiro válido entre 0 e 10.'}
                </span>
              </div>

              {/* Carga Horária de Professor:
                  - Enquanto não digitar um número, não liberar para selecionar carga horária
                  - Se escolher zero, carga horária facultativa
                  - Se diferente de zero, desbloquear carga horária
              */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Carga Horária Semanal (Professor)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['10h', '20h', '40h'] as CargaHoraria[]).map((ch) => {
                    const isSelected = cargaHorariaProf === ch;
                    const isDisabled = activeCargo === 'Mediador' || !isProfCargaLiberada;
                    return (
                      <button
                        type="button"
                        key={`prof-${ch}`}
                        id={`btn-ch-prof-${ch}`}
                        disabled={isDisabled}
                        onClick={() => {
                          if (!isDisabled) {
                            setCargaHorariaProf(ch);
                            setIsProfessorSalvoNesteSemestre(false);
                            setFormError(null);
                          }
                        }}
                        className={`py-3 px-2 rounded-lg text-xs font-bold transition-all border ${
                          isDisabled
                            ? isSelected
                              ? 'bg-slate-200 text-slate-500 border-slate-200 cursor-not-allowed opacity-60'
                              : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'bg-[#239371] text-white border-[#239371] shadow-xs cursor-pointer'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 cursor-pointer'
                        }`}
                      >
                        {ch}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {activeCargo === 'Mediador'
                    ? 'Travado durante edição do mediador.'
                    : !isProfQuantidadeDigitada
                    ? 'Bloqueado: digite a quantidade de professores para liberar a carga horária.'
                    : numProf === 0
                    ? 'Quantidade é zero: carga horária facultativa/dispensada (custo R$ 0,00).'
                    : cargaHorariaProf
                    ? `Salário c/ encargos (+***%): ${formatCurrency(salarioUnitarioProf)} / mês (Base: ${formatCurrency(salarioBaseProf)})`
                    : 'Selecione uma das cargas horárias (10h, 20h ou 40h) para liberar o botão de salvar.'}
                </span>
              </div>
            </div>

            {/* Demonstrativo Parcial do Professor & Botão de Avanço Salvar e Continuar */}
            <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-xs">
                <span className="text-slate-500 font-medium">Subtotal Professor: </span>
                <span className="font-bold text-slate-900 tabular">
                  {isProfQuantidadeDigitada
                    ? numProf === 0
                      ? '0 prof. (sem professor) = R$ 0,00'
                      : cargaHorariaProf
                      ? `${numProf} × ${formatCurrency(salarioUnitarioProf)} × 6 meses = ${formatCurrency(custoCalculadoProf)}`
                      : `${numProf} prof. (selecione a carga horária)`
                    : 'Aguardando digitação da quantidade (0 a 10)'}
                </span>
                {cargaHorariaProf && numProf > 0 && detalhesProf && (
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    Composição unitária: Base {formatCurrency(detalhesProf.salarioBase)} + Trabalhistas (13º/Férias/1/3) {formatCurrency(detalhesProf.subtotalTrabalhista)} + Encargos (INSS ***%/Adicionais ***%) {formatCurrency(detalhesProf.subtotalEncargos)}
                  </span>
                )}
              </div>

              {activeCargo === 'Professor' && (
                <button
                  type="button"
                  id="btn-confirmar-professor-ir-mediador"
                  disabled={!canSalvarProfessor}
                  onClick={handleSalvarProfessorEContinuar}
                  className={`text-xs font-bold px-4 py-2.5 rounded-lg transition-all inline-flex items-center gap-1.5 ${
                    canSalvarProfessor
                      ? 'bg-[#239371] hover:bg-[#117d5d] text-white shadow-xs cursor-pointer'
                      : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-75'
                  }`}
                  title={
                    !canSalvarProfessor
                      ? !isProfQuantidadeDigitada
                        ? 'Digite a quantidade para destravar'
                        : 'Selecione a carga horária para destravar este botão'
                      : 'Salvar dados do Professor e continuar para o Mediador deste semestre'
                  }
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar e Continuar para Mediador</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* CARD 2: FORMULÁRIO DO MEDIADOR
              Regra: Travado enquanto professor não for SALVO (clique em "Salvar e Continuar").
              Ao salvar o professor, libera apenas a quantidade de mediadores.
              Todos os outros botões ficam inativados.
              Segue o mesmo procedimento de travas do professor.
          */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              !isProfessorSalvoNesteSemestre
                ? 'bg-slate-100/60 border-slate-200 opacity-65'
                : activeCargo === 'Mediador'
                ? 'bg-white border-[#239371]/40 shadow-xs'
                : 'bg-slate-50/80 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#e7972a]" />
                <h4 className="text-sm font-bold text-slate-900">
                  Dados do Mediador (Tutor)
                </h4>
              </div>

              {!isProfessorSalvoNesteSemestre ? (
                <span className="text-[11px] font-bold text-slate-500 bg-slate-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Bloqueado: clique em "Salvar e Continuar" no Professor para liberar
                </span>
              ) : isMediadorValid ? (
                <span className="text-[11px] font-bold text-[#117d5d] bg-emerald-100 px-2.5 py-1 rounded-md flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Mediador Configurado
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md">
                  Liberado para preenchimento
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Campo Quantidade de Mediador: Vazio por padrão. Único liberado de início no passo 2 */}
              <div>
                <label
                  htmlFor="input-quantidade-mediador"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
                >
                  Quantidade de Mediadores
                </label>
                <input
                  ref={medInputRef}
                  id="input-quantidade-mediador"
                  type="number"
                  min="0"
                  max="10"
                  disabled={!isProfessorSalvoNesteSemestre || activeCargo !== 'Mediador'}
                  value={quantidadeMed}
                  onChange={(e) => {
                    setQuantidadeMed(e.target.value);
                    setFormError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (canSalvarSemestre) {
                        handleSalvarSemestre();
                      }
                    }
                  }}
                  placeholder="Digite a quantidade (0 a 10)"
                  className={`w-full px-4 py-3 rounded-lg border text-sm font-bold tabular transition-all focus:outline-none focus:ring-2 focus:ring-[#239371] ${
                    !isProfessorSalvoNesteSemestre || activeCargo !== 'Mediador'
                      ? 'bg-slate-200/60 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-slate-300'
                  }`}
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {!isProfessorSalvoNesteSemestre
                    ? 'Bloqueado: salve os dados do Professor para liberar.'
                    : quantidadeMed === ''
                    ? 'Campo obrigatório (inicia vazio). Digite 0 se não houver mediador.'
                    : numMed === 0
                    ? 'Quantidade 0 (sem mediador) — carga horária facultativa e botão de salvar liberado.'
                    : isMedQuantidadeDigitada
                    ? `Quantidade informada: ${numMed} med. ${!cargaHorariaMed ? '(selecione a carga horária para liberar o botão de salvar)' : '— botão de salvar liberado.'}`
                    : 'Informe um número inteiro válido entre 0 e 10.'}
                </span>
              </div>

              {/* Carga Horária de Mediador:
                  - Enquanto não digitar um número, não liberar para selecionar carga horária
                  - Se escolher zero, carga horária facultativa
                  - Se diferente de zero, desbloquear carga horária
              */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Carga Horária Semanal (Mediador)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['10h', '20h', '40h'] as CargaHoraria[]).map((ch) => {
                    const isSelected = cargaHorariaMed === ch;
                    const isDisabled =
                      !isProfessorSalvoNesteSemestre ||
                      activeCargo !== 'Mediador' ||
                      !isMedCargaLiberada;
                    return (
                      <button
                        type="button"
                        key={`med-${ch}`}
                        id={`btn-ch-med-${ch}`}
                        disabled={isDisabled}
                        onClick={() => {
                          if (!isDisabled) {
                            setCargaHorariaMed(ch);
                            setFormError(null);
                          }
                        }}
                        className={`py-3 px-2 rounded-lg text-xs font-bold transition-all border ${
                          isDisabled
                            ? isSelected
                              ? 'bg-slate-200 text-slate-500 border-slate-200 cursor-not-allowed opacity-60'
                              : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'bg-[#239371] text-white border-[#239371] shadow-xs cursor-pointer'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 cursor-pointer'
                        }`}
                      >
                        {ch}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {!isProfessorSalvoNesteSemestre
                    ? 'Bloqueado até salvar os dados do Professor.'
                    : !isMedQuantidadeDigitada
                    ? 'Bloqueado: digite a quantidade de mediadores para liberar a carga horária.'
                    : numMed === 0
                    ? 'Quantidade é zero: carga horária facultativa/dispensada (custo R$ 0,00).'
                    : cargaHorariaMed
                    ? `Salário c/ encargos (+***%): ${formatCurrency(salarioUnitarioMed)} / mês (Base: ${formatCurrency(salarioBaseMed)})`
                    : 'Selecione uma das cargas horárias (10h, 20h ou 40h) para liberar o botão de salvar.'}
                </span>
              </div>
            </div>

            {/* Demonstrativo Parcial do Mediador */}
            <div className="mt-4 pt-3 border-t border-slate-200/80 text-xs">
              <span className="text-slate-500 font-medium">Subtotal Mediador: </span>
              <span className="font-bold text-slate-900 tabular">
                {!isProfessorSalvoNesteSemestre
                  ? 'Bloqueado: aguardando salvar dados do Professor'
                  : isMedQuantidadeDigitada
                  ? numMed === 0
                    ? '0 med. (sem mediador) = R$ 0,00'
                    : cargaHorariaMed
                    ? `${numMed} × ${formatCurrency(salarioUnitarioMed)} × 6 meses = ${formatCurrency(custoCalculadoMed)}`
                    : `${numMed} med. (selecione a carga horária)`
                  : 'Aguardando digitação da quantidade (0 a 10)'}
              </span>
              {isProfessorSalvoNesteSemestre && cargaHorariaMed && numMed > 0 && detalhesMed && (
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  Composição unitária: Base {formatCurrency(detalhesMed.salarioBase)} + Trabalhistas (13º/Férias/1/3) {formatCurrency(detalhesMed.subtotalTrabalhista)} + Encargos (INSS ***%/Adicionais ***%) {formatCurrency(detalhesMed.subtotalEncargos)}
                </span>
              )}
            </div>
          </div>

          {/* DEMONSTRATIVO CONSOLIDADO DO SEMESTRE */}
          <div className="p-5 bg-gradient-to-r from-emerald-50 to-slate-50 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 block">
                Custo Total do {currentSemestre}º Semestre ({currentSetor}):
              </span>
              <span className="text-xs text-slate-600 font-medium">
                Professor ({formatCurrency(custoCalculadoProf)}) + Mediador ({formatCurrency(custoCalculadoMed)})
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold font-mono text-[#117d5d] tabular">
                {formatCurrency(custoTotalSemestre)}
              </span>
              <span className="text-[11px] text-slate-500 block">
                Custo mensal médio do semestre: {formatCurrency(custoTotalSemestre / 6)}
              </span>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO ADAPTATIVOS POR ETAPA:
              - Na etapa de Professor: "Salvar e Continuar para Mediador" (NUNCA pula de semestre).
              - Na etapa de Mediador: "Salvar Semestre Nº e Avançar" (SÓ PODE pular de semestre se ambos Professor e Mediador estiverem preenchidos e salvos).
          */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-3">
            {activeCargo === 'Professor' ? (
              <button
                type="button"
                onClick={onCancel}
                className="btn-unicive-outline text-xs w-full sm:w-auto"
              >
                Cancelar Fluxo
              </button>
            ) : (
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Dados do Professor salvos e travados durante inserção do Mediador</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              {activeCargo === 'Professor' ? (
                <>
                  <span className="text-[11px] text-slate-600 font-medium text-center sm:text-right">
                    {!isProfQuantidadeDigitada
                      ? 'Etapa 1/2: Digite a quantidade de Professor (ou 0 se não houver).'
                      : numProf > 0 && !cargaHorariaProf
                      ? 'Etapa 1/2: Selecione a carga horária do Professor.'
                      : 'Professor preenchido: clique para salvar e ir para o Mediador.'}
                  </span>

                  <button
                    type="button"
                    id="btn-salvar-professor-continuar"
                    disabled={!canSalvarProfessor}
                    onClick={handleSalvarProfessorEContinuar}
                    className={`text-sm px-6 py-3 font-bold rounded-lg transition-all inline-flex items-center justify-center gap-2 w-full sm:w-auto shadow-xs ${
                      canSalvarProfessor
                        ? 'btn-unicive-primary cursor-pointer'
                        : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-75'
                    }`}
                    title={
                      !canSalvarProfessor
                        ? 'Preencha a quantidade (0 a 10) e a carga horária para continuar'
                        : 'Salvar dados do Professor e avançar para o Mediador deste semestre'
                    }
                  >
                    <Save className="w-4 h-4" />
                    <span>Salvar e Continuar para Mediador</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="text-[11px] text-slate-600 font-medium text-center sm:text-right">
                    {!isMedQuantidadeDigitada
                      ? 'Etapa 2/2: Digite a quantidade de Mediador (ou 0 se não houver).'
                      : numMed > 0 && !cargaHorariaMed
                      ? 'Etapa 2/2: Selecione a carga horária do Mediador.'
                      : 'Ambos preenchidos! Pronto para salvar o semestre e avançar.'}
                  </span>

                  <button
                    type="button"
                    id="btn-salvar-semestre"
                    disabled={!canSalvarSemestre}
                    onClick={() => handleSalvarSemestre()}
                    className={`text-sm px-6 py-3 font-bold rounded-lg transition-all inline-flex items-center justify-center gap-2 w-full sm:w-auto shadow-xs ${
                      canSalvarSemestre
                        ? 'btn-unicive-primary cursor-pointer'
                        : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-75'
                    }`}
                    title={
                      !canSalvarSemestre
                        ? 'Preencha os dados do Mediador para destravar o salvamento do semestre'
                        : 'Salvar semestre completo e avançar'
                    }
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {currentSemestre < curso.quantidade_semestres
                        ? `Salvar Semestre ${currentSemestre}º e Avançar`
                        : `Salvar Semestre ${currentSemestre}º e Concluir Setor`}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* MODAL: Conclusão do Último Semestre do Setor */}
      {showSectorCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-100 text-[#239371] rounded-2xl flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
              <FileCheck className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {currentSetor} &bull; Último Semestre Concluído
              </span>
              <h3 className="text-xl font-bold text-slate-900">
                {isOutroSetorCompleto
                  ? 'Todos os semestres foram concluídos!'
                  : `Deseja passar para o setor de ${otherSetor} ou concluir o registro?`}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                {isOutroSetorCompleto ? (
                  <>
                    Todos os <strong>{curso.quantidade_semestres} semestres</strong> dos setores <strong>Pedagógico</strong> e <strong>Estágio</strong> foram devidamente preenchidos e salvos no sistema e na nuvem.
                  </>
                ) : (
                  <>
                    Você concluiu o preenchimento de todos os <strong>{curso.quantidade_semestres} semestres</strong> do setor <strong>{currentSetor}</strong>. Deseja passar para o preenchimento do setor <strong>{otherSetor}</strong> agora ou concluir o registro deste setor e retornar à página inicial?
                  </>
                )}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              {!isOutroSetorCompleto && (
                <button
                  type="button"
                  id="btn-passar-outro-setor"
                  onClick={handlePassarParaOutroSetor}
                  className="btn-unicive-orange flex-1 py-3 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs rounded-lg"
                >
                  <ArrowRight className="w-4 h-4 shrink-0" />
                  <span>Passar para {otherSetor}</span>
                </button>
              )}

              <button
                type="button"
                id="btn-concluir-registro-setor"
                onClick={handleConcluirRegistro}
                className="btn-unicive-primary flex-1 py-3 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs rounded-lg"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  {isOutroSetorCompleto ? 'Concluir Registro' : 'Concluir o Registro deste Setor'}
                </span>
              </button>
            </div>

            <div className="text-center pt-1 border-t border-slate-100">
              <button
                type="button"
                id="btn-revisar-semestre"
                onClick={() => setShowSectorCompletionModal(false)}
                className="text-xs text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer transition-colors"
              >
                Revisar dados deste semestre antes de sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
