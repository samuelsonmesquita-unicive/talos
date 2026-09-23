import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { CursoMestre, PlutosResultado } from './types';
import { CourseSelector } from './components/CourseSelector';
import { DisciplinasForm } from './components/DisciplinasForm';
import { TicketMedioForm } from './components/TicketMedioForm';
import { ResultPanel } from './components/ResultPanel';
import { RelatorioExecutivo } from './components/RelatorioExecutivo';
import { useAuth } from './hooks/useAuth';
import {
  fetchCursosComCusto,
  fetchStatusPorCurso,
  upsertQuantidadeDisciplinas,
  upsertTicketMedio,
  fetchRelatorioExecutivo,
} from './services/plutosService';

// Quando chamado de dentro de um <iframe> do Hermes: ?curso_id=<id>&embed=1
const urlParams = new URLSearchParams(window.location.search);
const PRESET_CURSO_ID = urlParams.get('curso_id');
const IS_EMBED = urlParams.get('embed') === '1';
const IS_IFRAMED = typeof window !== 'undefined' && window.self !== window.top;

export default function App() {
  const { isAdmin } = useAuth();

  const [view, setView] = useState<'form' | 'relatorio'>('form');
  const [mensagemRelatorio, setMensagemRelatorio] = useState<string | null>(null);

  const [cursos, setCursos] = useState<CursoMestre[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState<string | null>(PRESET_CURSO_ID);
  const [resultado, setResultado] = useState<PlutosResultado | null>(null);
  const [showConcluidoPopup, setShowConcluidoPopup] = useState(false);

  const [loadingCursos, setLoadingCursos] = useState(true);
  const [errorCursos, setErrorCursos] = useState<string | null>(null);
  const [loadingDisciplinas, setLoadingDisciplinas] = useState(false);
  const [errorDisciplinas, setErrorDisciplinas] = useState<string | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [errorTicket, setErrorTicket] = useState<string | null>(null);

  // Carregar cursos ao montar
  useEffect(() => {
    setLoadingCursos(true);
    setErrorCursos(null);
    fetchCursosComCusto()
      .then(setCursos)
      .catch((err) => {
        setErrorCursos(err.message);
        setCursos([]);
      })
      .finally(() => setLoadingCursos(false));
  }, []);

  const handleConcluirEVoltar = () => {
    if (IS_IFRAMED && selectedCursoId) {
      window.parent.postMessage({ type: 'plutos:done', curso_id: selectedCursoId }, '*');
    }
  };

  // Colaborador comum: depois do popup "Cadastro concluído", volta sozinho
  // pro Hermes (se estiver embutido) ou pra seleção de curso (se standalone).
  useEffect(() => {
    if (!showConcluidoPopup) return;
    const timer = setTimeout(() => {
      setShowConcluidoPopup(false);
      if (IS_IFRAMED) {
        handleConcluirEVoltar();
      } else {
        setSelectedCursoId(null);
      }
    }, 1800);
    return () => clearTimeout(timer);
  }, [showConcluidoPopup]);

  // Carregar status quando um curso é selecionado
  useEffect(() => {
    if (!selectedCursoId) {
      setResultado(null);
      return;
    }

    fetchStatusPorCurso(selectedCursoId)
      .then(setResultado)
      .catch((err) => {
        console.error('Erro ao carregar status:', err);
        setResultado(null);
      });
  }, [selectedCursoId]);

  const handleSaveDisciplinas = async (qty: number) => {
    if (!selectedCursoId) return;

    setLoadingDisciplinas(true);
    setErrorDisciplinas(null);

    try {
      const res = await upsertQuantidadeDisciplinas(selectedCursoId, qty);
      setResultado(res);

      // Colaborador comum: essa é a etapa inteira dele — mostra confirmação
      // e volta sozinho. Admin continua na tela (ainda precisa do ticket médio).
      if (!isAdmin) {
        setShowConcluidoPopup(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido ao salvar.';
      setErrorDisciplinas(message);
    } finally {
      setLoadingDisciplinas(false);
    }
  };

  const handleSaveTicket = async (ticket: number) => {
    if (!selectedCursoId) return;

    setLoadingTicket(true);
    setErrorTicket(null);

    try {
      const res = await upsertTicketMedio(selectedCursoId, ticket);
      setResultado(res);

      // Admin: se não sobra nenhum curso com disciplinas definidas e ainda sem
      // ticket médio, encerra o fluxo direto no relatório executivo.
      const linhas = await fetchRelatorioExecutivo();
      const pendentes = linhas.filter((l) => l.ticket_medio === null);
      if (pendentes.length === 0) {
        setMensagemRelatorio('Ticket médio atualizado — todos os cursos com disciplinas definidas já têm ticket médio.');
        setView('relatorio');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido ao salvar.';
      setErrorTicket(message);
    } finally {
      setLoadingTicket(false);
    }
  };

  const selectedCurso = cursos.find((c) => c.id === selectedCursoId);

  return (
    <div className="min-h-screen bg-[#f5f8f6] text-[#212327] flex flex-col font-sans antialiased">
      {/* Header institucional — escondido quando embutido no Hermes (o Hermes já mostra o próprio cabeçalho) */}
      {!IS_EMBED && (
        <header className="bg-gradient-to-r from-[#0d281e] to-[#143529] text-white p-4 sm:p-6">
          <div className="max-w-6xl mx-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#e7972a]">
              Projeto Talos &bull; Cadastro das Disciplinas
            </span>
            <h1 className="text-2xl font-bold mt-1">Disciplinas &amp; Viabilidade</h1>
            <p className="text-xs text-emerald-100/80 mt-1">
              Informe quantas disciplinas precisam ser gravadas para cada curso.
            </p>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={`flex-1 w-full mx-auto p-4 sm:p-6 lg:p-8 ${view === 'relatorio' ? 'max-w-6xl' : 'max-w-4xl'}`}>
        {view === 'relatorio' && isAdmin ? (
          <RelatorioExecutivo
            onVoltar={() => {
              setMensagemRelatorio(null);
              setView('form');
            }}
            onConcluirHermes={IS_IFRAMED ? handleConcluirEVoltar : undefined}
            mensagemContexto={mensagemRelatorio || undefined}
          />
        ) : (
          <div className="space-y-6">
            {/* Link de acesso ao relatório — só admin */}
            {isAdmin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setView('relatorio')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#239371] hover:text-[#117d5d] cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Ver Relatório Executivo (todos os cursos)
                </button>
              </div>
            )}

            {/* Seleção de Curso — colapsada quando já veio pré-selecionada do Hermes */}
            {IS_EMBED && PRESET_CURSO_ID && selectedCurso ? (
              <div className="text-xs text-slate-600 bg-slate-100 px-3 py-2 rounded-lg">
                Cadastro das disciplinas de: <strong className="text-slate-900">{selectedCurso.nome_curso} ({selectedCurso.grau})</strong>
              </div>
            ) : (
              <section>
                <h2 className="text-sm font-bold text-slate-900 mb-3">Passo 1: Selecione um Curso</h2>
                <CourseSelector
                  cursos={cursos}
                  selectedCursoId={selectedCursoId}
                  onSelect={setSelectedCursoId}
                  loading={loadingCursos}
                  error={errorCursos}
                />
              </section>
            )}

            {/* Formulário de Disciplinas — qualquer colaborador staff */}
            {selectedCurso && (
              <section className="space-y-4">
                <DisciplinasForm
                  quantidadeDisciplinas={resultado?.quantidade_disciplinas || 0}
                  onSubmit={handleSaveDisciplinas}
                  loading={loadingDisciplinas}
                  error={errorDisciplinas}
                  disabled={!selectedCurso}
                />
              </section>
            )}

            {/* Formulário de Ticket Médio — só admin */}
            {selectedCurso && isAdmin && (
              <section className="space-y-4">
                <TicketMedioForm
                  ticketDefinido={resultado?.ticketDefinido || false}
                  onSubmit={handleSaveTicket}
                  loading={loadingTicket}
                  error={errorTicket}
                  disabled={!selectedCurso}
                />
              </section>
            )}

            {/* Resultado — só admin. O colaborador comum só cadastra a quantidade de
                disciplinas; o Ponto de Equilíbrio não é da conta dele. */}
            {selectedCurso && resultado && isAdmin && (
              <section className="space-y-4">
                <ResultPanel resultado={resultado} loading={false} />

                {/* Botão de conclusão — só faz sentido quando embutido no fluxo do Hermes,
                    e só depois que as disciplinas já foram salvas (o objetivo desta etapa) */}
                {IS_EMBED && IS_IFRAMED && resultado.disciplinasDefinidas && (
                  <button
                    type="button"
                    onClick={handleConcluirEVoltar}
                    className="w-full btn-unicive-primary text-sm font-semibold py-2.5 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Concluir e voltar ao Hermes
                  </button>
                )}
              </section>
            )}

            {/* Hint quando nada selecionado */}
            {!selectedCurso && cursos.length > 0 && (
              <div className="p-6 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm">
                <p>
                  👆 Selecione um curso acima para cadastrar as disciplinas.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      {!IS_EMBED && (
        <footer className="bg-white border-t border-[#e2e8e4] py-4 text-center text-xs text-slate-500 mt-auto">
          <div className="max-w-6xl mx-auto px-4">
            <p>
              &copy; 2026 Unicive &bull; Centro Universitário Cidade Verde &bull; Cadastro das Disciplinas
            </p>
          </div>
        </footer>
      )}

      {/* Popup de conclusão — colaborador comum, ao salvar as disciplinas */}
      {showConcluidoPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-8 text-center space-y-3">
            <div className="w-14 h-14 bg-[#ebf7f2] text-[#239371] rounded-2xl flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Cadastro concluído!</h3>
            <p className="text-xs text-slate-500">
              {IS_IFRAMED ? 'Voltando ao Hermes...' : 'Redirecionando...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
