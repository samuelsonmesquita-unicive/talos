import React, { useEffect, useState, useRef } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { CursoMestre, Setor } from './types';
import { Header } from './components/Header';
import { SalaryModal } from './components/SalaryModal';
import { Step1InitialEntry } from './components/Step1InitialEntry';
import { DemandRegistrationFlow } from './components/DemandRegistrationFlow';
import { ConsultRecordsView } from './components/ConsultRecordsView';
import { CourseReportView } from './components/CourseReportView';
import { GeneralReportDashboard } from './components/GeneralReportDashboard';
import { PlutosEmbedPanel } from './components/PlutosEmbedPanel';
import { initializeCloudDatabase, saveAllCourses, saveAllRegistros } from './services/courseStore';
import {
  subscribeToCourses,
  subscribeToRegistros,
  subscribeToSalaryConfig,
  setCloudErrorHandler,
} from './services/cloudSync';
import { saveStoredSalaryConfig } from './utils/salary';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'cadastro' | 'consulta' | 'relatorio-curso' | 'relatorio-geral'
  >('cadastro');

  // Estado do fluxo ativo de preenchimento de demandas (Seção 8 a 22)
  const [activeRegistration, setActiveRegistration] = useState<{
    curso: CursoMestre;
    setor: Setor;
    isRetomada: boolean;
  } | null>(null);

  // Curso selecionado para inspeção em relatórios ou consulta
  const [targetCourse, setTargetCourse] = useState<CursoMestre | null>(null);

  // Modal da tabela salarial
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);

  // Controle de confirmação ao tentar mudar de aba durante preenchimento ativo
  const [pendingTab, setPendingTab] = useState<
    'cadastro' | 'consulta' | 'relatorio-curso' | 'relatorio-geral' | null
  >(null);
  const [showInterruptionModal, setShowInterruptionModal] = useState(false);

  // Notificação rápida tipo popup/toast (ex: "Registro concluído")
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastKind, setToastKind] = useState<'ok' | 'error'>('ok');
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showQuickToast = (msg: string, kind: 'ok' | 'error' = 'ok') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastKind(kind);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, kind === 'error' ? 7000 : 3500);
  };

  const handleSelectTab = (tab: 'cadastro' | 'consulta' | 'relatorio-curso' | 'relatorio-geral') => {
    if (activeRegistration && tab !== 'cadastro') {
      setPendingTab(tab);
      setShowInterruptionModal(true);
      return;
    }
    setActiveTab(tab);
    if (tab !== 'cadastro') {
      setActiveRegistration(null);
    }
  };

  const handleConfirmInterruption = () => {
    setShowInterruptionModal(false);
    setActiveRegistration(null);
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  };

  const handleCancelInterruption = () => {
    setShowInterruptionModal(false);
    setPendingTab(null);
  };

  // Chave para forçar re-render após alterações de dados
  const [refreshKey, setRefreshKey] = useState(0);

  // Status de conexão com a nuvem (Supabase)
  const [cloudStatus, setCloudStatus] = useState<'conectando' | 'conectado' | 'offline'>('conectando');

  // Painel embutido do Plutos: aberto/fechado + curso de contexto (null = acesso
  // livre pela barra superior, sem curso pré-selecionado)
  const [plutosPanelOpen, setPlutosPanelOpen] = useState(false);
  const [plutosPromptCurso, setPlutosPromptCurso] = useState<CursoMestre | null>(null);

  // Inicialização e listeners em tempo real com o Supabase
  useEffect(() => {
    let isMounted = true;

    // Falhas de escrita (ex.: sem permissão): avisa o usuário e recarrega os dados oficiais
    setCloudErrorHandler((message) => {
      showQuickToast(message, 'error');
      initializeCloudDatabase()
        .then(() => {
          if (isMounted) setRefreshKey((k) => k + 1);
        })
        .catch(() => {});
    });

    async function init() {
      try {
        await initializeCloudDatabase();
        if (isMounted) setCloudStatus('conectado');
      } catch (e) {
        console.warn('Erro ao conectar ao Supabase:', e);
        if (isMounted) setCloudStatus('offline');
      }
    }

    init();

    // Subscrição em tempo real aos cursos (o banco é a fonte da verdade, mesmo lista vazia)
    const unsubCourses = subscribeToCourses((cloudCourses) => {
      saveAllCourses(cloudCourses);
      setRefreshKey((k) => k + 1);
      if (isMounted) setCloudStatus('conectado');
    });

    // Subscrição em tempo real aos registros
    const unsubRegistros = subscribeToRegistros((cloudRegs) => {
      saveAllRegistros(cloudRegs);
      setRefreshKey((k) => k + 1);
      if (isMounted) setCloudStatus('conectado');
    });

    // Subscrição em tempo real à tabela salarial
    const unsubSalary = subscribeToSalaryConfig((cloudSalary) => {
      if (cloudSalary) {
        saveStoredSalaryConfig(cloudSalary);
        setRefreshKey((k) => k + 1);
      }
    });

    return () => {
      isMounted = false;
      setCloudErrorHandler(null);
      unsubCourses();
      unsubRegistros();
      unsubSalary();
    };
  }, []);

  // Iniciar cadastro ou retomada (Seção 7)
  const handleStartRegistration = (
    curso: CursoMestre,
    setorAlvo: Setor,
    retomada: boolean
  ) => {
    setActiveRegistration({
      curso,
      setor: setorAlvo,
      isRetomada: retomada,
    });
    setTargetCourse(curso);
    setActiveTab('cadastro');
  };

  // Conclusão de um setor (ou do curso inteiro, quando cursoCompleto = true —
  // sinal que vem do próprio DemandRegistrationFlow, que sabe com certeza se
  // Pedagógico + Estágio ficaram completos nesta ação)
  const handleConcludeSector = (msg?: string, cursoCompleto?: boolean) => {
    const finishedRegistration = activeRegistration;
    setActiveRegistration(null);
    setActiveTab('cadastro');
    setRefreshKey((k) => k + 1);
    showQuickToast(msg || 'Registro concluído');

    if (cursoCompleto && finishedRegistration) {
      setPlutosPromptCurso(finishedRegistration.curso);
      setPlutosPanelOpen(true);
    }
  };

  // Cancelar ou voltar da tela de preenchimento
  const handleCancelRegistration = () => {
    setActiveRegistration(null);
    setRefreshKey((k) => k + 1);
  };

  // Navegar para consulta de registros
  const handleGoToConsult = (curso?: CursoMestre) => {
    if (curso) setTargetCourse(curso);
    setActiveRegistration(null);
    setActiveTab('consulta');
  };

  // Navegar para relatório do curso
  const handleGoToCourseReport = (curso: CursoMestre) => {
    setTargetCourse(curso);
    setActiveRegistration(null);
    setActiveTab('relatorio-curso');
  };

  return (
    <div className="min-h-screen bg-[#f5f8f6] text-[#212327] flex flex-col font-sans antialiased">
      {/* Barra de Navegação Superior com status da nuvem */}
      <Header
        activeTab={activeTab}
        cloudStatus={cloudStatus}
        onSelectTab={handleSelectTab}
        onOpenSalaryModal={() => setIsSalaryModalOpen(true)}
        onOpenPlutos={() => {
          setPlutosPromptCurso(null);
          setPlutosPanelOpen(true);
        }}
      />

      {/* Conteúdo Principal Dinâmico por Aba */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* ABA 1: NOVO CADASTRO / SELEÇÃO DE CURSO / FLUXO DE DEMANDAS */}
        {activeTab === 'cadastro' && (
          <>
            {activeRegistration ? (
              <DemandRegistrationFlow
                // Sem refreshKey: cada salvamento dispara um snapshot da nuvem, e remontar o
                // fluxo perderia o estado (popup de conclusão e módulo atual).
                key={`${activeRegistration.curso.id}_${activeRegistration.setor}`}
                curso={activeRegistration.curso}
                cursoInicial={activeRegistration.curso}
                initialSetor={activeRegistration.setor}
                setorInicial={activeRegistration.setor}
                isRetomada={activeRegistration.isRetomada}
                onConclude={handleConcludeSector}
                onConcludeSector={handleConcludeSector}
                onCancel={handleCancelRegistration}
                onGoToConsult={handleGoToConsult}
                onGoToReport={handleGoToCourseReport}
              />
            ) : (
              <Step1InitialEntry
                key={`step1_${refreshKey}`}
                onStartRegistration={handleStartRegistration}
                onStartDemandFlow={handleStartRegistration}
                onGoToConsult={handleGoToConsult}
                onConsultRecords={handleGoToConsult}
                onGoToReport={handleGoToCourseReport}
                onOpenReport={handleGoToCourseReport}
              />
            )}
          </>
        )}

        {/* ABA 2: CONSULTA DE REGISTROS DO CURSO (SEÇÃO 19) */}
        {activeTab === 'consulta' && (
          <ConsultRecordsView
            key={`consult_${refreshKey}`}
            initialCourse={targetCourse || undefined}
            onSelectCourseForFlow={handleStartRegistration}
            onGoToReport={handleGoToCourseReport}
            onDataChanged={() => setRefreshKey((k) => k + 1)}
          />
        )}

        {/* ABA 3: RELATÓRIO INDIVIDUAL POR CURSO (SEÇÃO 20) */}
        {activeTab === 'relatorio-curso' && (
          <CourseReportView
            key={`report_${refreshKey}`}
            initialCourse={targetCourse || undefined}
            onSelectCourseForFlow={handleStartRegistration}
            onGoToConsult={handleGoToConsult}
            onOpenPlutos={(curso) => {
              setPlutosPromptCurso(curso);
              setPlutosPanelOpen(true);
            }}
          />
        )}

        {/* ABA 4: PAINEL GERAL DE DEMANDAS & CONSOLIDAÇÃO (SEÇÃO 21) */}
        {activeTab === 'relatorio-geral' && (
          <GeneralReportDashboard
            key={`dashboard_${refreshKey}`}
            onSelectCourseForReport={handleGoToCourseReport}
            onSelectCourseForConsult={handleGoToConsult}
            onSelectCourseForContinue={(curso) => {
              const setorAlvo: Setor =
                curso.status_pedagogico !== 'completo' ? 'Pedagógico' : 'Estágio';
              handleStartRegistration(curso, setorAlvo, true);
            }}
            onNewCourse={() => {
              setActiveRegistration(null);
              setActiveTab('cadastro');
            }}
            onSelectCourseForFlow={handleStartRegistration}
            onGoToCourseReport={handleGoToCourseReport}
          />
        )}
      </main>

      {/* Rodapé Institucional Unicive */}
      <footer className="bg-white border-t border-[#e2e8e4] py-4 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            &copy; 2026 Unicive &bull; Centro Universitário Cidade Verde &bull; Gestão de Demandas Docentes EaD
          </span>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Base Centralizada na Nuvem (Supabase)</span>
            <span>&bull;</span>
            <span>Reajuste Salarial 4% Aplicado</span>
          </div>
        </div>
      </footer>

      {/* Modal de Alerta: Interromper preenchimento? */}
      {showInterruptionModal && activeRegistration && (
        <div
          id="modal-interromper-preenchimento"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Interromper preenchimento?
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Você está com o preenchimento de demandas em andamento para o curso{' '}
                  <strong className="text-slate-800">
                    {activeRegistration.curso.nome_curso} ({activeRegistration.curso.grau})
                  </strong>{' '}
                  no Setor <strong className="text-slate-800">{activeRegistration.setor}</strong>.
                </p>
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                  <span className="font-semibold text-slate-700 block mb-0.5">
                    Segurança dos seus dados:
                  </span>
                  Todos os módulos e etapas já salvos foram guardados com segurança e você poderá retomar este cadastro a qualquer momento.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                id="btn-cancelar-interrupcao"
                onClick={handleCancelInterruption}
                className="btn-unicive-outline text-xs py-2 px-3.5"
              >
                Continuar preenchendo
              </button>
              <button
                type="button"
                id="btn-confirmar-interrupcao"
                onClick={handleConfirmInterruption}
                className="btn-unicive-primary text-xs py-2 px-3.5 bg-amber-600 hover:bg-amber-700 text-white"
              >
                Sim, interromper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal da Tabela Salarial */}
      <SalaryModal
        isOpen={isSalaryModalOpen}
        onClose={() => setIsSalaryModalOpen(false)}
        onConfigUpdated={() => setRefreshKey((k) => k + 1)}
      />

      {/* Painel embutido do Plutos — próximo passo após concluir um curso, ou acesso
          livre pela barra superior */}
      {plutosPanelOpen && (
        <PlutosEmbedPanel
          curso={plutosPromptCurso}
          onClose={() => setPlutosPanelOpen(false)}
          onConcluded={() => {
            setPlutosPanelOpen(false);
            showQuickToast('Viabilidade financeira calculada no Plutos!');
          }}
        />
      )}

      {/* Popup Rápido de Notificação (Toast) */}
      {toastMessage && (
        <div
          id="toast-popup-conclusao"
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto transition-all duration-300 transform"
        >
          <div
            className={`flex items-center gap-3 text-white px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-semibold max-w-xl ${
              toastKind === 'error'
                ? 'bg-red-900 border-red-500/60'
                : 'bg-[#0d281e] border-emerald-500/50'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                toastKind === 'error'
                  ? 'bg-red-500/20 text-red-300 border-red-400/40'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              }`}
            >
              {toastKind === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-300" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <span
              className={`tracking-wide font-medium ${
                toastKind === 'error' ? 'text-red-100' : 'text-emerald-100'
              }`}
            >
              {toastMessage}
            </span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-2 text-emerald-400/70 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
