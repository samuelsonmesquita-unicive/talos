import React, { useState } from 'react';
import {
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Search,
  BookOpen,
  HelpCircle,
  Clock,
  Layers,
  Pencil,
  Briefcase,
} from 'lucide-react';
import { CursoMestre, Grau, Setor } from '../types';
import { parseDurationInput } from '../utils/salary';
import {
  findCourseByKey,
  getAllCourses,
  getRegistrosForCourse,
  resetSectorData,
  upsertCourseMaster,
} from '../services/courseStore';
import { SemEstagioAviso } from './SemEstagioAviso';

const NOVO_CADASTRO = '__novo_cadastro__';

interface Step1InitialEntryProps {
  // Supports both onStartRegistration and onStartDemandFlow
  onStartRegistration?: (
    curso: CursoMestre,
    setorAlvo: Setor,
    retomada: boolean,
    abrirEtapaEstagio?: boolean
  ) => void;
  onStartDemandFlow?: (
    curso: CursoMestre,
    setorAlvo: Setor,
    retomada: boolean,
    abrirEtapaEstagio?: boolean
  ) => void;
  onConsultRecords?: (curso: CursoMestre) => void;
  onGoToConsult?: (curso?: CursoMestre) => void;
  onOpenReport?: (curso: CursoMestre) => void;
  onGoToReport?: (curso: CursoMestre) => void;
}

export const Step1InitialEntry: React.FC<Step1InitialEntryProps> = ({
  onStartRegistration,
  onStartDemandFlow,
  onConsultRecords,
  onGoToConsult,
  onOpenReport,
  onGoToReport,
}) => {
  const handleStartFlow = (
    curso: CursoMestre,
    setorAlvo: Setor,
    retomada: boolean,
    abrirEtapaEstagio = false
  ) => {
    if (onStartRegistration) {
      onStartRegistration(curso, setorAlvo, retomada, abrirEtapaEstagio);
    } else if (onStartDemandFlow) {
      onStartDemandFlow(curso, setorAlvo, retomada, abrirEtapaEstagio);
    }
  };

  const handleConsult = (curso: CursoMestre) => {
    if (onConsultRecords) onConsultRecords(curso);
    else if (onGoToConsult) onGoToConsult(curso);
  };

  const handleReport = (curso: CursoMestre) => {
    if (onOpenReport) onOpenReport(curso);
    else if (onGoToReport) onGoToReport(curso);
  };
  const [cursoSelecionadoDropdown, setCursoSelecionadoDropdown] = useState<string>(NOVO_CADASTRO);
  const [nomeCurso, setNomeCurso] = useState('');
  const [grau, setGrau] = useState<Grau>('Bacharel');
  const [duracaoInput, setDuracaoInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Setor de quem está preenchendo: cada setor segue só o seu fluxo
  const [setorUsuario, setSetorUsuario] = useState<Setor | null>(null);

  // Estados de verificação e cenários da Seção 4 (agora por setor)
  const [durationLockWarning, setDurationLockWarning] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<CursoMestre | null>(null);
  const [dialogScenario, setDialogScenario] = useState<
    '4.4' | 'pedagogico-completo' | 'estagio-completo' | 'sem-estagio' | null
  >(null);
  const [incompletedSectorName, setIncompletedSectorName] = useState<Setor>('Pedagógico');
  // Pedagógico com todos os módulos salvos, faltando só as disciplinas de estágio
  const [faltaSoEstagio, setFaltaSoEstagio] = useState(false);

  const nomesCadastrados = Array.from(
    new Set(getAllCourses().map((c) => c.nome_curso))
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  // Curso já cadastrado: sugere grau e duração registrados no banco.
  const preencherComDadosDoBanco = (curso: CursoMestre | undefined) => {
    if (!curso) return;
    setGrau(curso.grau);
    setDuracaoInput(curso.duracao_curso.toString().replace('.', ','));
  };

  const handleSelecionarCursoDropdown = (valor: string) => {
    setCursoSelecionadoDropdown(valor);
    if (valor === NOVO_CADASTRO) {
      setNomeCurso('');
      setDuracaoInput('');
      return;
    }
    setNomeCurso(valor);
    const cadastrados = getAllCourses().filter((c) => c.nome_curso === valor);
    preencherComDadosDoBanco(cadastrados.find((c) => c.grau === grau) ?? cadastrados[0]);
  };

  const handleSelecionarGrau = (novoGrau: Grau) => {
    setGrau(novoGrau);
    if (cursoSelecionadoDropdown !== NOVO_CADASTRO) {
      const curso = findCourseByKey(cursoSelecionadoDropdown, novoGrau);
      if (curso) setDuracaoInput(curso.duracao_curso.toString().replace('.', ','));
    }
  };

  const duracaoParsed = parseDurationInput(duracaoInput);
  const modulosCalculados = duracaoParsed ? Math.round(duracaoParsed * 4) : null;

  const handleVerificarEProsseguir = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setDurationLockWarning(null);
    setDialogScenario(null);
    setFaltaSoEstagio(false);

    if (!setorUsuario) {
      setValidationError('Informe o seu setor: Pedagógico ou Estágio.');
      return;
    }

    const nomeTrim = nomeCurso.trim();
    if (!nomeTrim) {
      setValidationError('Por favor, digite o nome do curso.');
      return;
    }

    const existing = findCourseByKey(nomeTrim, grau);

    // Estágio: nunca cria nem altera curso; só preenche os módulos com estágio
    // cadastrados pelo Pedagógico.
    if (setorUsuario === 'Estágio') {
      setActiveCourse(existing ?? null);
      if (!existing || !existing.tem_estagio) {
        setDialogScenario('sem-estagio');
        return;
      }
      if (existing.status_estagio === 'completo') {
        setDialogScenario('estagio-completo');
        return;
      }
      if (existing.status_estagio === 'incompleto') {
        setIncompletedSectorName('Estágio');
        setDialogScenario('4.4');
        return;
      }
      handleStartFlow(existing, 'Estágio', false);
      return;
    }

    const duracaoNum = parseDurationInput(duracaoInput);
    if (!duracaoNum || duracaoNum <= 0) {
      setValidationError('Por favor, informe uma duração válida em anos (Ex.: 2,5 anos ou 4 anos).');
      return;
    }

    // Seção 3.2: Trava de duração
    const { curso, duracao_bloqueada, duracao_original } = upsertCourseMaster(
      nomeTrim,
      grau,
      duracaoNum
    );

    if (duracao_bloqueada) {
      setDurationLockWarning(
        `Este curso já possui duração cadastrada (${duracao_original.toString().replace('.', ',')} anos). A duração digitada foi ajustada para a oficial.`
      );
    }

    setActiveCourse(curso);

    if (!existing || curso.status_pedagogico === 'não iniciado') {
      handleStartFlow(curso, 'Pedagógico', false);
      return;
    }

    if (curso.status_pedagogico === 'completo') {
      setDialogScenario('pedagogico-completo');
      return;
    }

    // Pedagógico incompleto: pode faltar só a etapa de estágio (ex.: cursos cadastrados
    // antes dessa etapa existir)
    const regsPed = getRegistrosForCourse(curso.nome_curso, curso.grau).filter(
      (r) => r.setor === 'Pedagógico'
    );
    const modulosOk = Array.from({ length: curso.quantidade_modulos }, (_, i) => i + 1).every(
      (m) =>
        regsPed.some((r) => r.modulo === m && r.cargo === 'Professor') &&
        regsPed.some((r) => r.modulo === m && r.cargo === 'Mediador')
    );
    setFaltaSoEstagio(modulosOk && curso.tem_estagio == null);
    setIncompletedSectorName('Pedagógico');
    setDialogScenario('4.4');
  };

  const handleRetomarSetorIncompleto = () => {
    if (!activeCourse) return;
    handleStartFlow(activeCourse, incompletedSectorName, true);
  };

  const handleReiniciarSetorDoZero = () => {
    if (!activeCourse) return;
    if (
      incompletedSectorName === 'Pedagógico' &&
      !window.confirm(
        'Reiniciar o Pedagógico apaga todos os módulos do Pedagógico, as disciplinas de estágio e os lançamentos do Estágio deste curso. Deseja continuar?'
      )
    ) {
      return;
    }
    const cursoRecalculado = resetSectorData(
      activeCourse.nome_curso,
      activeCourse.grau,
      incompletedSectorName
    );
    setActiveCourse(cursoRecalculado);
    setDialogScenario(null);
    handleStartFlow(cursoRecalculado, incompletedSectorName, false);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Banner de Boas-Vindas Institucional Unicive */}
      <div className="bg-gradient-to-r from-[#0d281e] to-[#143529] text-white p-6 sm:p-8 rounded-2xl shadow-md mb-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-end pr-6">
          <GraduationCap className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="badge-unicive-ead">
              EAD UNICIVE
            </span>
            <span className="text-xs text-emerald-200 font-medium">
              Centro Universitário Cidade Verde
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-snug">
            Gestão de Demandas &bull; Matriz de Custo Docente
          </h1>

          <p className="mt-2 text-sm text-emerald-100/90 font-medium leading-relaxed">
            &ldquo;Digite o nome do curso e informe o grau para começar.&rdquo;
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-emerald-200/80 pt-3 border-t border-emerald-800/60">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#e7972a]" /> Setor Pedagógico &bull; Estágio
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#7ebd73]" /> Módulo = 3 Meses (Trimestral)
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#e7972a]" /> Recálculo Automático
            </span>
          </div>
        </div>
      </div>

      {/* Formulário Principal Estilo Unicive */}
      <div className="card-unicive p-6 sm:p-8 border border-slate-200">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Identificação do Curso
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Informe os dados da matriz curricular para inicializar o fluxo de registros
            </p>
          </div>
          <span className="px-2.5 py-1 bg-emerald-50 text-[#239371] font-semibold text-xs rounded-full border border-emerald-200">
            Etapa 1 de 3
          </span>
        </div>

        <form onSubmit={handleVerificarEProsseguir} className="space-y-6">
          {/* Setor de quem está preenchendo */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Seu setor
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['Pedagógico', 'Estágio'] as Setor[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  id={`btn-setor-usuario-${s === 'Pedagógico' ? 'pedagogico' : 'estagio'}`}
                  onClick={() => {
                    setSetorUsuario(s);
                    setValidationError(null);
                    setDialogScenario(null);
                  }}
                  className={`py-3 px-4 rounded-lg text-sm font-semibold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    setorUsuario === s
                      ? 'bg-[#ebf7f2] text-[#239371] border-[#239371] ring-2 ring-[#239371]/20 font-bold shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {s === 'Pedagógico' ? (
                    <BookOpen className="w-4 h-4 text-[#239371]" />
                  ) : (
                    <Briefcase className="w-4 h-4 text-[#e7972a]" />
                  )}
                  <span>{s}</span>
                </button>
              ))}
            </div>
            {setorUsuario === 'Estágio' && (
              <p className="mt-2 text-[11px] text-slate-500">
                O Estágio preenche só os módulos em que o Pedagógico cadastrou disciplinas de estágio.
              </p>
            )}
          </div>

          {/* Nome do Curso */}
          <div>
            <label
              htmlFor="select-nome-curso"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2"
            >
              Nome do Curso
            </label>
            <select
              id="select-nome-curso"
              required
              value={cursoSelecionadoDropdown}
              onChange={(e) => handleSelecionarCursoDropdown(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#239371] focus:border-transparent text-sm font-medium transition-all cursor-pointer"
            >
              <option value={NOVO_CADASTRO}>+ Novo Cadastro (digitar nome novo)</option>
              {nomesCadastrados.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>

            {cursoSelecionadoDropdown === NOVO_CADASTRO && (
              <input
                id="input-nome-curso"
                type="text"
                required
                autoFocus
                value={nomeCurso}
                onChange={(e) => setNomeCurso(e.target.value)}
                placeholder="Ex.: Administração, Pedagogia, Análise e Desenvolvimento de Sistemas..."
                className="w-full mt-2 px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#239371] focus:border-transparent text-sm font-medium transition-all"
              />
            )}
          </div>

          {/* Grau do Curso */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Grau Acadêmico
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                id="btn-grau-bacharel"
                onClick={() => handleSelecionarGrau('Bacharel')}
                className={`py-3 px-4 rounded-lg text-sm font-semibold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  grau === 'Bacharel'
                    ? 'bg-[#ebf7f2] text-[#239371] border-[#239371] ring-2 ring-[#239371]/20 font-bold shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-[#239371]" />
                <span>Bacharel</span>
              </button>

              <button
                type="button"
                id="btn-grau-licenciatura"
                onClick={() => handleSelecionarGrau('Licenciatura')}
                className={`py-3 px-4 rounded-lg text-sm font-semibold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  grau === 'Licenciatura'
                    ? 'bg-[#ebf7f2] text-[#239371] border-[#239371] ring-2 ring-[#239371]/20 font-bold shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <BookOpen className="w-4 h-4 text-[#239371]" />
                <span>Licenciatura</span>
              </button>

              <button
                type="button"
                id="btn-grau-tecnologo"
                onClick={() => handleSelecionarGrau('Tecnólogo')}
                className={`py-3 px-4 rounded-lg text-sm font-semibold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  grau === 'Tecnólogo'
                    ? 'bg-[#ebf7f2] text-[#239371] border-[#239371] ring-2 ring-[#239371]/20 font-bold shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#e7972a]" />
                <span>Tecnólogo</span>
              </button>
            </div>
          </div>

          {/* Duração do Curso */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="input-duracao-curso"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Duração do Curso (em anos)
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Regra: 1 módulo = 3 meses (trimestral)
              </span>
            </div>

            <input
              id="input-duracao-curso"
              type="text"
              required={setorUsuario !== 'Estágio'}
              value={duracaoInput}
              onChange={(e) => setDuracaoInput(e.target.value)}
              placeholder="Ex.: 2,5 anos ou 4 anos"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#239371] focus:border-transparent text-sm font-medium transition-all"
            />

            {/* Caixa explicativa de cálculo */}
            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
              <span className="text-slate-600 font-medium">
                Cálculo: <strong className="text-slate-900">quantidade_modulos = duracao_curso &times; 4</strong>
              </span>
              <span className="px-2 py-0.5 rounded font-bold text-xs bg-emerald-100 text-[#117d5d] border border-emerald-300">
                {modulosCalculados !== null
                  ? `${modulosCalculados} módulos (${modulosCalculados * 3} meses)`
                  : 'Aguardando duração'}
              </span>
            </div>
          </div>

          {/* Mensagens de erro e avisos */}
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {durationLockWarning && (
            <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-0.5">Trava de Duração Ativada:</strong>
                <span>{durationLockWarning}</span>
              </div>
            </div>
          )}

          {/* Botão de envio com cor Unicive verde */}
          <div className="pt-2">
            <button
              type="submit"
              id="btn-verificar-prosseguir"
              className="btn-unicive-primary w-full py-3.5 text-sm font-bold tracking-wide"
            >
              <span>Verificar Registros e Prosseguir</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </form>
      </div>

      {/* Estágio: curso sem carga horária de estágio cadastrada pelo Pedagógico */}
      {dialogScenario === 'sem-estagio' && (
        <div className="mt-8">
          <SemEstagioAviso pendentePedagogico={!activeCourse || activeCourse.tem_estagio == null}>
            {activeCourse && (
              <>
                <button
                  type="button"
                  onClick={() => handleConsult(activeCourse)}
                  className="btn-unicive-outline text-xs py-2 px-4"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Consultar Registros
                </button>
                <button
                  type="button"
                  onClick={() => handleReport(activeCourse)}
                  className="btn-unicive-outline text-xs py-2 px-4"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Ver Relatório do Curso
                </button>
              </>
            )}
          </SemEstagioAviso>
        </div>
      )}

      {/* Cenários de Diálogo da Seção 4 (Registros Anteriores) */}
      {dialogScenario && dialogScenario !== 'sem-estagio' && activeCourse && (
        <div className="mt-8 card-unicive p-6 border-2 border-emerald-200 shadow-lg">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 bg-[#239371] text-white rounded-lg font-bold text-xs flex items-center justify-center">
                !
              </span>
              <h3 className="font-bold text-slate-900 text-base">
                Curso Identificado no Sistema
              </h3>
            </div>
            <span className="badge-unicive-green">
              {activeCourse.duracao_curso} anos &bull; {activeCourse.quantidade_modulos} módulos
            </span>
          </div>

          <p className="text-sm font-bold text-slate-800 mb-4">
            {activeCourse.nome_curso} ({activeCourse.grau})
          </p>

          {/* Setor do usuário já concluído */}
          {(dialogScenario === 'pedagogico-completo' || dialogScenario === 'estagio-completo') && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950">
                <div className="flex items-center gap-2 font-bold text-sm text-[#117d5d] mb-1">
                  <CheckCircle2 className="w-4 h-4 text-[#239371]" />
                  <span>{dialogScenario === 'pedagogico-completo' ? 'Pedagógico' : 'Estágio'} concluído</span>
                </div>
                <p>
                  {dialogScenario === 'pedagogico-completo'
                    ? activeCourse.tem_estagio
                      ? 'Todos os módulos e as disciplinas de estágio do Pedagógico já foram preenchidos.'
                      : 'Todos os módulos do Pedagógico já foram preenchidos. O curso foi informado como sem estágio.'
                    : 'Todos os módulos com estágio já foram preenchidos.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  id="btn-cenario-concluido-consultar"
                  onClick={() => handleConsult(activeCourse)}
                  className="btn-unicive-outline flex-1 text-xs"
                >
                  <Search className="w-4 h-4 mr-2 text-slate-600" />
                  Consultar Registros
                </button>
                <button
                  onClick={() => handleReport(activeCourse)}
                  className="btn-unicive-outline flex-1 text-xs"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Ver Relatório do Curso
                </button>
                {dialogScenario === 'pedagogico-completo' && (
                  <button
                    id="btn-cenario-editar-estagio"
                    onClick={() => handleStartFlow(activeCourse, 'Pedagógico', true, true)}
                    className="btn-unicive-primary flex-1 text-xs"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar disciplinas de estágio
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 4.4. Setor do usuário incompleto */}
          {dialogScenario === '4.4' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950">
                <div className="font-bold text-sm text-amber-900 mb-1">
                  Cadastro de {incompletedSectorName} incompleto. Deseja continuar de onde parou?
                </div>
                <p>
                  {faltaSoEstagio ? (
                    <>
                      Os módulos já foram preenchidos; <strong>faltam apenas as disciplinas de estágio</strong>.
                      Selecione <strong>Sim</strong> para informá-las agora.
                    </>
                  ) : (
                    <>
                      Selecione <strong>Sim</strong> para retomar a partir do próximo módulo pendente, ou <strong>Não</strong> para reiniciar e redefinir os dados deste setor.
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  id="btn-cenario-4-4-sim"
                  onClick={handleRetomarSetorIncompleto}
                  className="btn-unicive-orange flex-1 text-xs"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {faltaSoEstagio ? 'Sim (Informar disciplinas de estágio)' : 'Sim (Continuar de onde parou)'}
                </button>

                <button
                  id="btn-cenario-4-4-nao"
                  onClick={handleReiniciarSetorDoZero}
                  className="btn-unicive-outline flex-1 text-xs"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Não (Reiniciar do zero)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
