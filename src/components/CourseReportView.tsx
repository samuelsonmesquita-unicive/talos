import React, { useState } from 'react';
import { CursoMestre } from '../types';
import {
  getAllCourses,
  getRegistrosForCourse,
} from '../services/courseStore';
import { formatCurrency } from '../utils/salary';
import { agregarSemestresSetor } from '../utils/courseCalculations';
import {
  AlertTriangle,
  Printer,
  ChevronRight,
  GraduationCap,
  Layers,
  FileSpreadsheet,
  Users,
  UserCheck,
} from 'lucide-react';

interface CourseReportViewProps {
  initialCourse?: CursoMestre | null;
  onContinueRegistration?: (curso: CursoMestre) => void;
  onSelectCourseForFlow?: (curso: CursoMestre, setor: any, retomada: boolean) => void;
  onGoToConsult?: (curso: CursoMestre) => void;
}

export const CourseReportView: React.FC<CourseReportViewProps> = ({
  initialCourse,
  onContinueRegistration,
  onSelectCourseForFlow,
  onGoToConsult,
}) => {
  const courses = getAllCourses();
  const [selectedCourseKey, setSelectedCourseKey] = useState<string>(
    initialCourse ? initialCourse.id : (courses[0]?.id || '')
  );

  const handleContinueFlow = (curso: CursoMestre) => {
    if (onContinueRegistration) {
      onContinueRegistration(curso);
    } else if (onSelectCourseForFlow) {
      const setorAlvo = curso.status_pedagogico !== 'completo' ? 'Pedagógico' : 'Estágio';
      onSelectCourseForFlow(curso, setorAlvo, true);
    }
  };

  const activeCourse = courses.find((c) => c.id === selectedCourseKey) || courses[0];

  if (!activeCourse) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-slate-500 text-sm">
        Nenhum curso cadastrado ainda.
      </div>
    );
  }

  const registros = getRegistrosForCourse(activeCourse.nome_curso, activeCourse.grau);

  const pedData = agregarSemestresSetor(
    'Pedagógico',
    activeCourse.quantidade_semestres,
    registros
  );
  const estData = agregarSemestresSetor(
    'Estágio',
    activeCourse.quantidade_semestres,
    registros
  );

  // Totais de docentes e mediadores alocados por setor
  const totalProfessoresPed = pedData.semestres.reduce(
    (sum, s) => sum + (s.registro_professor?.quantidade || 0),
    0
  );
  const totalMediadoresPed = pedData.semestres.reduce(
    (sum, s) => sum + (s.registro_mediador?.quantidade || 0),
    0
  );

  const totalProfessoresEst = estData.semestres.reduce(
    (sum, s) => sum + (s.registro_professor?.quantidade || 0),
    0
  );
  const totalMediadoresEst = estData.semestres.reduce(
    (sum, s) => sum + (s.registro_mediador?.quantidade || 0),
    0
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-6 print:py-0 print:px-0">
      {/* Top Header & Seletor de Curso Unicive */}
      <div className="card-unicive p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#ebf7f2] text-[#239371] font-bold text-sm flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Relatório Orçamentário por Curso
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Demonstrativo de folha orçamentária para setores Pedagógico e Estágio EaD com contagem de professores e mediadores.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-full sm:w-64">
            <select
              value={selectedCourseKey}
              onChange={(e) => setSelectedCourseKey(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#239371] cursor-pointer"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome_curso} ({c.grau})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handlePrint}
            title="Imprimir ou Salvar em PDF"
            className="btn-unicive-outline text-xs py-2.5 px-3 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
            <span className="hidden sm:inline">Imprimir Relatório</span>
          </button>
        </div>
      </div>

      {/* Seção 23: Aviso de dados parciais */}
      {activeCourse.dados_parciais && (
        <div className="p-4 bg-amber-50 border border-amber-300 text-amber-950 text-xs rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm text-amber-900">Aviso de Cadastro Parcial:</p>
            <p>
              &ldquo;Este curso ainda possui cadastro incompleto — valores calculados apenas com os semestres já registrados.&rdquo;
            </p>
            {(onContinueRegistration || onSelectCourseForFlow) && (
              <button
                onClick={() => handleContinueFlow(activeCourse)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-white bg-[#e7972a] hover:bg-[#d28117] px-3 py-1.5 rounded-md transition-colors cursor-pointer"
              >
                Continuar preenchimento dos semestres pendentes <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Informações Mestres do Curso */}
      <div className="card-unicive p-6 border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <span className="badge-unicive-ead mb-2 inline-block">
              CURSO DE GRADUAÇÃO UNICIVE
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {activeCourse.nome_curso}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-[#117d5d] border border-emerald-200 rounded-full">
              {activeCourse.grau}
            </span>
            <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full">
              {activeCourse.duracao_curso} anos &bull; {activeCourse.quantidade_semestres} semestres
            </span>
          </div>
        </div>

        {/* Status dos setores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold block">
                Status do Setor Pedagógico:
              </span>
              <span className="text-sm font-bold text-slate-900 uppercase">
                {activeCourse.status_pedagogico}
              </span>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-600">
                <span>Professores: <strong>{totalProfessoresPed}</strong></span>
                <span>&bull;</span>
                <span>Mediadores: <strong>{totalMediadoresPed}</strong></span>
              </div>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                activeCourse.status_pedagogico === 'completo'
                  ? 'bg-emerald-100 text-[#117d5d]'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {pedData.semestres_salvos} / {activeCourse.quantidade_semestres} semestres
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold block">
                Status do Setor de Estágio:
              </span>
              <span className="text-sm font-bold text-slate-900 uppercase">
                {activeCourse.status_estagio}
              </span>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-600">
                <span>Professores: <strong>{totalProfessoresEst}</strong></span>
                <span>&bull;</span>
                <span>Mediadores: <strong>{totalMediadoresEst}</strong></span>
              </div>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                activeCourse.status_estagio === 'completo'
                  ? 'bg-emerald-100 text-[#117d5d]'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {estData.semestres_salvos} / {activeCourse.quantidade_semestres} semestres
            </span>
          </div>
        </div>
      </div>

      {/* TABELAS POR SETOR (Pedagógico e Estágio) COM COLUNAS DE PROFESSORES E MEDIADORES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Setor Pedagógico */}
        <div className="card-unicive overflow-hidden border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#239371]"></span>
                Setor Pedagógico
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                {activeCourse.status_pedagogico}
              </span>
            </div>

            <div className="p-4 overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200 bg-slate-50/70">
                  <tr>
                    <th className="py-2.5 px-2">Semestre</th>
                    <th className="py-2.5 px-2 text-center" title="Quantidade de Professores e Carga Horária">
                      Professores
                    </th>
                    <th className="py-2.5 px-2 text-center" title="Quantidade de Mediadores e Carga Horária">
                      Mediadores
                    </th>
                    <th className="py-2.5 px-2 text-right">Custo Semestral</th>
                    <th className="py-2.5 px-2 text-right">Custo Mensal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pedData.semestres.map((s) => {
                    const profQtd = s.registro_professor?.quantidade ?? 0;
                    const profCh = s.registro_professor?.carga_horaria;
                    const medQtd = s.registro_mediador?.quantidade ?? 0;
                    const medCh = s.registro_mediador?.carga_horaria;

                    return (
                      <tr key={s.semestre} className={s.concluido ? 'hover:bg-slate-50/60' : 'opacity-50 italic hover:bg-slate-50/60'}>
                        <td className="py-2.5 px-2 font-semibold text-slate-900">
                          {s.semestre}º Semestre {!s.concluido && '(Pendente)'}
                        </td>

                        {/* Coluna Professores com Quantidade */}
                        <td className="py-2.5 px-2 text-center">
                          {s.professor_salvo ? (
                            <div className="inline-flex items-center gap-1 bg-emerald-50 text-[#117d5d] border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-bold">
                              <span>{profQtd}</span>
                              <span className="text-[9px] font-normal text-slate-500">({profCh})</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>

                        {/* Coluna Mediadores com Quantidade */}
                        <td className="py-2.5 px-2 text-center">
                          {s.mediador_salvo ? (
                            <div className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-bold">
                              <span>{medQtd}</span>
                              <span className="text-[9px] font-normal text-slate-500">({medCh})</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>

                        <td className="py-2.5 px-2 text-right font-bold text-slate-900 tabular">
                          {formatCurrency(s.custo_semestral)}
                        </td>
                        <td className="py-2.5 px-2 text-right text-slate-600 tabular">
                          {formatCurrency(s.custo_mensal_semestre)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50/50 font-semibold text-slate-700">
                  <tr>
                    <td className="py-2 px-2 text-slate-500">Total Vagas:</td>
                    <td className="py-2 px-2 text-center font-bold text-[#117d5d]">
                      {totalProfessoresPed} prof.
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-blue-700">
                      {totalMediadoresPed} med.
                    </td>
                    <td colSpan={2} className="py-2 px-2 text-right text-[11px] text-slate-400 font-normal">
                      Vagas do ciclo
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="bg-emerald-50/50 p-4 border-t border-emerald-100 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium">Custo Total Pedagógico:</span>
              <span className="font-bold text-base text-[#117d5d] tabular">
                {formatCurrency(activeCourse.custo_total_pedagogico)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium">Custo Mensal Médio:</span>
              <span className="font-bold text-sm text-slate-800 tabular">
                {formatCurrency(activeCourse.custo_mensal_medio_pedagogico)}
              </span>
            </div>
          </div>
        </div>

        {/* Setor Estágio */}
        <div className="card-unicive overflow-hidden border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#e7972a]"></span>
                Setor de Estágio
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                {activeCourse.status_estagio}
              </span>
            </div>

            <div className="p-4 overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200 bg-slate-50/70">
                  <tr>
                    <th className="py-2.5 px-2">Semestre</th>
                    <th className="py-2.5 px-2 text-center" title="Quantidade de Professores e Carga Horária">
                      Professores
                    </th>
                    <th className="py-2.5 px-2 text-center" title="Quantidade de Mediadores e Carga Horária">
                      Mediadores
                    </th>
                    <th className="py-2.5 px-2 text-right">Custo Semestral</th>
                    <th className="py-2.5 px-2 text-right">Custo Mensal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {estData.semestres.map((s) => {
                    const profQtd = s.registro_professor?.quantidade ?? 0;
                    const profCh = s.registro_professor?.carga_horaria;
                    const medQtd = s.registro_mediador?.quantidade ?? 0;
                    const medCh = s.registro_mediador?.carga_horaria;

                    return (
                      <tr key={s.semestre} className={s.concluido ? 'hover:bg-slate-50/60' : 'opacity-50 italic hover:bg-slate-50/60'}>
                        <td className="py-2.5 px-2 font-semibold text-slate-900">
                          {s.semestre}º Semestre {!s.concluido && '(Pendente)'}
                        </td>

                        {/* Coluna Professores com Quantidade */}
                        <td className="py-2.5 px-2 text-center">
                          {s.professor_salvo ? (
                            <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-bold">
                              <span>{profQtd}</span>
                              <span className="text-[9px] font-normal text-slate-500">({profCh})</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>

                        {/* Coluna Mediadores com Quantidade */}
                        <td className="py-2.5 px-2 text-center">
                          {s.mediador_salvo ? (
                            <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[11px] font-bold">
                              <span>{medQtd}</span>
                              <span className="text-[9px] font-normal text-slate-500">({medCh})</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>

                        <td className="py-2.5 px-2 text-right font-bold text-slate-900 tabular">
                          {formatCurrency(s.custo_semestral)}
                        </td>
                        <td className="py-2.5 px-2 text-right text-slate-600 tabular">
                          {formatCurrency(s.custo_mensal_semestre)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50/50 font-semibold text-slate-700">
                  <tr>
                    <td className="py-2 px-2 text-slate-500">Total Vagas:</td>
                    <td className="py-2 px-2 text-center font-bold text-amber-800">
                      {totalProfessoresEst} prof.
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-indigo-700">
                      {totalMediadoresEst} med.
                    </td>
                    <td colSpan={2} className="py-2 px-2 text-right text-[11px] text-slate-400 font-normal">
                      Vagas do ciclo
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="bg-amber-50/50 p-4 border-t border-amber-100 space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium">Custo Total Estágio:</span>
              <span className="font-bold text-base text-amber-900 tabular">
                {formatCurrency(activeCourse.custo_total_estagio)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium">Custo Mensal Médio:</span>
              <span className="font-bold text-sm text-slate-800 tabular">
                {formatCurrency(activeCourse.custo_mensal_medio_estagio)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CONSOLIDAÇÃO GERAL DO CURSO (Estilo Unicive Verde Escuro) */}
      <div className="bg-gradient-to-r from-[#0d281e] to-[#143529] text-white p-6 sm:p-8 rounded-2xl shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-800/80 pb-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#7ebd73] font-bold">
              CONSOLIDAÇÃO TOTAL DO CURSO
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
              {activeCourse.nome_curso} ({activeCourse.grau})
            </h3>
          </div>
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full uppercase self-start sm:self-auto ${
              activeCourse.status_geral === 'completo'
                ? 'bg-[#239371] text-white'
                : 'bg-amber-500 text-slate-950'
            }`}
          >
            Status Geral: {activeCourse.status_geral}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 bg-black/20 rounded-xl border border-emerald-900/50">
            <span className="text-xs text-emerald-200 uppercase font-semibold block mb-1">
              Custo Total do Curso (Pedagógico + Estágio):
            </span>
            <span className="text-2xl sm:text-3xl font-bold font-mono text-white tabular block">
              {formatCurrency(activeCourse.custo_total_curso)}
            </span>
          </div>

          <div className="p-5 bg-black/20 rounded-xl border border-emerald-900/50">
            <span className="text-xs text-emerald-200 uppercase font-semibold block mb-1">
              Custo Mensal Médio do Curso:
            </span>
            <span className="text-2xl sm:text-3xl font-bold font-mono text-[#7ebd73] tabular block">
              {formatCurrency(activeCourse.custo_mensal_medio_curso)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
