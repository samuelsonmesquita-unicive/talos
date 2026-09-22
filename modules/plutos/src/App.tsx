import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { CursoMestre, PlutosResultado } from './types';
import { CourseSelector } from './components/CourseSelector';
import { InputsForm } from './components/InputsForm';
import { ResultPanel } from './components/ResultPanel';
import { fetchCursosComCusto, fetchInputsPorCurso, upsertInputs } from './services/plutosService';

export default function App() {
  const [cursos, setCursos] = useState<CursoMestre[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState<string | null>(null);
  const [quantidadeDisciplinas, setQuantidadeDisciplinas] = useState(0);
  const [ticketMedio, setTicketMedio] = useState(0);
  const [resultado, setResultado] = useState<PlutosResultado | null>(null);

  const [loadingCursos, setLoadingCursos] = useState(true);
  const [errorCursos, setErrorCursos] = useState<string | null>(null);
  const [loadingCalc, setLoadingCalc] = useState(false);
  const [errorCalc, setErrorCalc] = useState<string | null>(null);

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

  // Carregar inputs quando cursos são selecionados
  useEffect(() => {
    if (!selectedCursoId) {
      setQuantidadeDisciplinas(0);
      setTicketMedio(0);
      setResultado(null);
      return;
    }

    fetchInputsPorCurso(selectedCursoId)
      .then((inputs) => {
        if (inputs) {
          setQuantidadeDisciplinas(inputs.quantidade_disciplinas);
          setTicketMedio(inputs.ticket_medio);
          setResultado({
            curso_id: inputs.curso_id,
            ponto_equilibrio: inputs.ponto_equilibrio,
            investimento_disciplinas: inputs.investimento_disciplinas,
            dados_hermes_parciais: inputs.dados_hermes_parciais,
          });
        } else {
          setQuantidadeDisciplinas(0);
          setTicketMedio(0);
          setResultado(null);
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar inputs:', err);
        setQuantidadeDisciplinas(0);
        setTicketMedio(0);
        setResultado(null);
      });
  }, [selectedCursoId]);

  const handleCalculate = async () => {
    if (!selectedCursoId) return;

    setLoadingCalc(true);
    setErrorCalc(null);

    try {
      const res = await upsertInputs(selectedCursoId, quantidadeDisciplinas, ticketMedio);
      setResultado(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido ao calcular.';
      setErrorCalc(message);
    } finally {
      setLoadingCalc(false);
    }
  };

  const selectedCurso = cursos.find((c) => c.id === selectedCursoId);

  return (
    <div className="min-h-screen bg-[#f5f8f6] text-[#212327] flex flex-col font-sans antialiased">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#0d281e] to-[#143529] text-white p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#e7972a]">
            Projeto Talos &bull; Módulo Plutos
          </span>
          <h1 className="text-2xl font-bold mt-1">Viabilidade &amp; Custo</h1>
          <p className="text-xs text-emerald-100/80 mt-1">
            Análise de Ponto de Equilíbrio e Viabilidade Financeira
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="space-y-6">
          {/* Seleção de Curso */}
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

          {/* Inputs e Cálculo */}
          {selectedCurso && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Passo 2: Preencha os Dados</h2>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                  {selectedCurso.nome_curso} ({selectedCurso.grau})
                </span>
              </div>
              <InputsForm
                quantidadeDisciplinas={quantidadeDisciplinas}
                ticketMedio={ticketMedio}
                onQuantidadeChange={setQuantidadeDisciplinas}
                onTicketChange={setTicketMedio}
                onSubmit={handleCalculate}
                loading={loadingCalc}
                error={errorCalc}
                disabled={!selectedCurso}
              />
            </section>
          )}

          {/* Resultado */}
          {selectedCurso && (
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900">Passo 3: Resultado</h2>
              <ResultPanel resultado={resultado} loading={loadingCalc} />
            </section>
          )}

          {/* Hint quando nada selecionado */}
          {!selectedCurso && cursos.length > 0 && (
            <div className="p-6 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm">
              <p>
                👆 Selecione um curso acima para começar a análise de viabilidade financeira.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#e2e8e4] py-4 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-6xl mx-auto px-4">
          <p>
            &copy; 2026 Unicive &bull; Centro Universitário Cidade Verde &bull; Análise de Viabilidade Financeira
          </p>
        </div>
      </footer>
    </div>
  );
}
