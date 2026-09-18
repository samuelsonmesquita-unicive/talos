import React, { useState } from 'react';
import { CursoMestre, Grau, Setor, StatusGeral } from '../types';
import { getAllCourses, deleteCourse } from '../services/courseStore';
import { formatCurrency } from '../utils/salary';
import {
  Filter,
  Search,
  Trash2,
  ExternalLink,
  PlusCircle,
  BookOpen,
  GraduationCap,
  TrendingUp,
  CheckCircle,
  Clock,
  Calculator,
  CheckSquare,
  Square,
  RotateCcw,
  Download,
  Printer,
  FileSpreadsheet,
  Layers,
  X,
  Sparkles,
} from 'lucide-react';

interface GeneralReportDashboardProps {
  onSelectCourseForReport?: (curso: CursoMestre) => void;
  onSelectCourseForConsult?: (curso: CursoMestre) => void;
  onSelectCourseForContinue?: (curso: CursoMestre) => void;
  onNewCourse?: () => void;
  onGoToCourseReport?: (curso: CursoMestre) => void;
  onSelectCourseForFlow?: (curso: CursoMestre, setor: any, retomada: boolean) => void;
}

export const GeneralReportDashboard: React.FC<GeneralReportDashboardProps> = ({
  onSelectCourseForReport,
  onSelectCourseForConsult,
  onSelectCourseForContinue,
  onNewCourse,
  onGoToCourseReport,
  onSelectCourseForFlow,
}) => {
  const handleOpenReport = (curso: CursoMestre) => {
    if (onSelectCourseForReport) {
      onSelectCourseForReport(curso);
    } else if (onGoToCourseReport) {
      onGoToCourseReport(curso);
    }
  };

  const handleOpenConsult = (curso: CursoMestre) => {
    if (onSelectCourseForConsult) {
      onSelectCourseForConsult(curso);
    }
  };

  const handleOpenContinue = (curso: CursoMestre) => {
    // Determine which sector is incomplete
    const targetSector: Setor = curso.status_pedagogico !== 'completo' ? 'Pedagógico' : 'Estágio';
    if (onSelectCourseForContinue) {
      onSelectCourseForContinue(curso);
    } else if (onSelectCourseForFlow) {
      onSelectCourseForFlow(curso, targetSector, true);
    }
  };

  const handleCreateNew = () => {
    if (onNewCourse) {
      onNewCourse();
    }
  };

  const [courses, setCourses] = useState<CursoMestre[]>(() => getAllCourses());
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(() => new Set());

  // Filtros da tabela interativa
  const [filterGrau, setFilterGrau] = useState<'Todos' | Grau>('Todos');
  const [filterStatus, setFilterStatus] = useState<'Todos' | StatusGeral>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'custo_desc' | 'custo_asc' | 'nome'>('custo_desc');

  // Modal de Exportação para Mesa Diretora
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFilterMode, setExportFilterMode] = useState<'somente_completos' | 'todos' | 'selecionados'>('somente_completos');

  const filteredCourses = courses.filter((c) => {
    if (filterGrau !== 'Todos' && c.grau !== filterGrau) return false;
    if (filterStatus !== 'Todos' && c.status_geral !== filterStatus) return false;
    if (
      searchTerm.trim() &&
      !c.nome_curso.toLowerCase().includes(searchTerm.toLowerCase().trim())
    ) {
      return false;
    }
    return true;
  });

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    if (sortBy === 'custo_desc') return b.custo_total_curso - a.custo_total_curso;
    if (sortBy === 'custo_asc') return a.custo_total_curso - b.custo_total_curso;
    return a.nome_curso.localeCompare(b.nome_curso);
  });

  const cursosCompletos = courses.filter((c) => c.status_geral === 'completo');
  const cursosParciais = courses.filter((c) => c.status_geral === 'parcial');

  const quantidade_cursos_completos = cursosCompletos.length;
  const quantidade_cursos_parciais = cursosParciais.length;

  const custo_total_geral = cursosCompletos.reduce(
    (acc, curr) => acc + curr.custo_total_curso,
    0
  );

  const custo_mensal_medio_geral =
    quantidade_cursos_completos > 0
      ? cursosCompletos.reduce(
          (acc, curr) => acc + curr.custo_mensal_medio_curso,
          0
        ) / quantidade_cursos_completos
      : 0;

  // Lógica de Seleção de Cursos para Somatório
  const handleToggleSelectCourse = (courseId: string) => {
    setSelectedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const allVisibleSelected = sortedCourses.length > 0 && sortedCourses.every((c) => selectedCourseIds.has(c.id));
    if (allVisibleSelected) {
      setSelectedCourseIds((prev) => {
        const next = new Set(prev);
        sortedCourses.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      setSelectedCourseIds((prev) => {
        const next = new Set(prev);
        sortedCourses.forEach((c) => next.add(c.id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedCourseIds(new Set());
  };

  const selectedCoursesList = courses.filter((c) => selectedCourseIds.has(c.id));
  const somatorioCustoMensalSelecionados = selectedCoursesList.reduce(
    (acc, curr) => acc + (curr.custo_mensal_medio_curso || 0),
    0
  );
  const somatorioCustoTotalSelecionados = selectedCoursesList.reduce(
    (acc, curr) => acc + (curr.custo_total_curso || 0),
    0
  );

  const isAllVisibleSelected =
    sortedCourses.length > 0 && sortedCourses.every((c) => selectedCourseIds.has(c.id));

  const handleDeleteCourse = (c: CursoMestre) => {
    if (
      window.confirm(
        `Tem certeza que deseja excluir o curso inteiro "${c.nome_curso} (${c.grau})" e todos os seus registros associados da aplicação e da nuvem Firestore?`
      )
    ) {
      deleteCourse(c.nome_curso, c.grau);
      setCourses(getAllCourses());
      setSelectedCourseIds((prev) => {
        const next = new Set(prev);
        next.delete(c.id);
        return next;
      });
    }
  };

  // Cursos preparados para o dossiê da Mesa Diretora (sem expor pendências internas)
  const getBoardCourses = () => {
    if (exportFilterMode === 'somente_completos') {
      return courses.filter((c) => c.status_geral === 'completo');
    }
    if (exportFilterMode === 'selecionados') {
      return courses.filter((c) => selectedCourseIds.has(c.id));
    }
    return courses;
  };

  const boardCourses = getBoardCourses();
  const boardTotalMensalPedagogico = boardCourses.reduce((sum, c) => sum + (c.custo_mensal_medio_pedagogico || 0), 0);
  const boardTotalMensalEstagio = boardCourses.reduce((sum, c) => sum + (c.custo_mensal_medio_estagio || 0), 0);
  const boardTotalMensalGeral = boardCourses.reduce((sum, c) => sum + (c.custo_mensal_medio_curso || 0), 0);
  const boardTotalAnualGeral = boardTotalMensalGeral * 12;
  const boardTotalGeralCurso = boardCourses.reduce((sum, c) => sum + (c.custo_total_curso || 0), 0);

  // Exportação CSV formatada para Excel / Apresentação Executiva
  const handleExportCSV = () => {
    const headers = [
      'Curso',
      'Grau',
      'Duração (Anos)',
      'Semestres',
      'Mensal Pedagógico (R$)',
      'Mensal Estágio (R$)',
      'Custo Mensal Total (R$)',
      'Impacto Anual Estimado (R$)',
      'Custo Total do Curso (R$)',
    ];

    const rows = boardCourses.map((c) => [
      `"${c.nome_curso.replace(/"/g, '""')}"`,
      `"${c.grau}"`,
      c.duracao_curso.toString().replace('.', ','),
      c.quantidade_semestres,
      (c.custo_mensal_medio_pedagogico || 0).toFixed(2).replace('.', ','),
      (c.custo_mensal_medio_estagio || 0).toFixed(2).replace('.', ','),
      (c.custo_mensal_medio_curso || 0).toFixed(2).replace('.', ','),
      ((c.custo_mensal_medio_curso || 0) * 12).toFixed(2).replace('.', ','),
      (c.custo_total_curso || 0).toFixed(2).replace('.', ','),
    ]);

    // Linha de totalização
    rows.push([
      '"Custo total mão-de-obra"',
      '""',
      '""',
      '""',
      boardTotalMensalPedagogico.toFixed(2).replace('.', ','),
      boardTotalMensalEstagio.toFixed(2).replace('.', ','),
      boardTotalMensalGeral.toFixed(2).replace('.', ','),
      boardTotalAnualGeral.toFixed(2).replace('.', ','),
      boardTotalGeralCurso.toFixed(2).replace('.', ','),
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `UNICIVE_Mesa_Diretora_Orcamento_Docente_${exportFilterMode}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Impressão / Salvar em PDF executivo (modo limpo sem status incompleto)
  const handlePrintBoard = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Top Header Unicive com Botões de Ação */}
      <div className="card-unicive p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#ebf7f2] text-[#239371] font-bold text-sm flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">
              Painel Geral de Cursos &bull; Orçamento Institucional
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Matriz de custos docentes e gerenciais consolidados dos cursos EaD do Unicive.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* BOTÃO EXPORTAR PENSANDO NA MESA DIRETORA */}
          <button
            id="btn-exportar-mesa-diretora"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0d281e] hover:bg-[#143529] text-white text-xs font-bold rounded-lg shadow-sm transition-all border border-emerald-800 cursor-pointer"
            title="Exportar apresentação e relatório executivo para a Mesa Diretora"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar dashboard</span>
          </button>

          <button
            onClick={handleCreateNew}
            className="btn-unicive-primary text-xs font-bold"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            <span>Cadastrar Novo Curso</span>
          </button>
        </div>
      </div>

      {/* TOTAIS AGREGADOS NO TOPO (OCULTOS NA IMPRESSÃO SE PREFERIR) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="card-unicive p-5 border border-slate-200 bg-white">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>CUSTO TOTAL GERAL</span>
            <TrendingUp className="w-4 h-4 text-[#239371]" />
          </div>
          <span className="text-2xl font-bold font-mono text-slate-900 tabular block">
            {formatCurrency(custo_total_geral)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Apenas cursos com status completo
          </span>
        </div>

        <div className="card-unicive p-5 border border-slate-200 bg-white">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>MENSAL MÉDIO GERAL</span>
            <TrendingUp className="w-4 h-4 text-[#e7972a]" />
          </div>
          <span className="text-2xl font-bold font-mono text-[#239371] tabular block">
            {formatCurrency(custo_mensal_medio_geral)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Média mensal dos cursos completos
          </span>
        </div>

        <div className="card-unicive p-5 border border-slate-200 bg-white">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>CURSOS CADASTRADOS</span>
            <CheckCircle className="w-4 h-4 text-[#239371]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular">
              {courses.length}
            </span>
            <span className="text-xs text-[#239371] font-semibold">
              ({quantidade_cursos_completos} completos)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {quantidade_cursos_parciais} com preenchimento parcial
          </span>
        </div>

        <div className="card-unicive p-5 border border-slate-200 bg-white">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>TAXA DE CONCLUSÃO</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-2xl font-bold text-slate-900 tabular block">
            {courses.length > 0
              ? `${Math.round((quantidade_cursos_completos / courses.length) * 100)}%`
              : '0%'}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {quantidade_cursos_completos} de {courses.length} cursos finalizados
          </span>
        </div>
      </div>

      {/* CARD DINÂMICO DE SELEÇÃO: SOMATÓRIO DO CUSTO MENSAL DOS CURSOS SELECIONADOS */}
      <div className={`card-unicive p-4.5 border transition-all print:hidden ${
        selectedCourseIds.size > 0
          ? 'border-[#239371] bg-gradient-to-r from-emerald-50/90 via-white to-emerald-50/50 shadow-md ring-1 ring-[#239371]/20'
          : 'border-slate-200 bg-slate-50/80'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              selectedCourseIds.size > 0
                ? 'bg-[#239371] text-white shadow-xs'
                : 'bg-slate-200 text-slate-500'
            }`}>
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Somatório dos Cursos Selecionados
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  selectedCourseIds.size > 0
                    ? 'bg-[#239371] text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {selectedCourseIds.size} de {courses.length} selecionado{selectedCourseIds.size !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedCourseIds.size === 0
                  ? 'Marque as caixas de seleção na tabela abaixo para somar o custo mensal de cursos específicos.'
                  : `Total calculado em tempo real para os ${selectedCourseIds.size} cursos marcados:`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:text-right">
            <div className="border-l-2 border-emerald-300 pl-4 sm:border-l-0 sm:pl-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                Somatório Custo Mensal
              </span>
              <span className="text-2xl font-extrabold font-mono text-[#117d5d] tabular block leading-tight">
                {formatCurrency(somatorioCustoMensalSelecionados)}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Custo Total dos selecionados: <strong className="text-slate-800">{formatCurrency(somatorioCustoTotalSelecionados)}</strong>
              </span>
            </div>

            {selectedCourseIds.size > 0 && (
              <button
                onClick={handleClearSelection}
                className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                title="Limpar seleção de cursos"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="card-unicive p-4 border border-slate-200 space-y-3 print:hidden">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          <Filter className="w-3.5 h-3.5 text-[#239371]" />
          <span>Filtros de Pesquisa:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar curso por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#239371] font-medium"
            />
          </div>

          <div>
            <select
              value={filterGrau}
              onChange={(e) => setFilterGrau(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 font-medium cursor-pointer"
            >
              <option value="Todos">Grau: Todos</option>
              <option value="Bacharel">Grau: Bacharel</option>
              <option value="Tecnólogo">Grau: Tecnólogo</option>
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 font-medium cursor-pointer"
            >
              <option value="Todos">Status: Todos</option>
              <option value="completo">Status: Completo</option>
              <option value="parcial">Status: Parcial (Incompleto)</option>
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 font-medium cursor-pointer"
            >
              <option value="custo_desc">Custo Total (&darr; Maior)</option>
              <option value="custo_asc">Custo Total (&uarr; Menor)</option>
              <option value="nome">Nome do Curso (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela Consolidada com Checkbox, Custos Mensais e Linha de Somatório */}
      <div className="card-unicive overflow-hidden border border-slate-200 shadow-sm print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0d281e] text-white font-bold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-3 text-center w-12">
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    title={isAllVisibleSelected ? 'Desmarcar todos os visíveis' : 'Selecionar todos os visíveis'}
                    className="p-1 hover:bg-white/10 rounded transition-colors inline-flex items-center justify-center cursor-pointer"
                  >
                    {isAllVisibleSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4 text-white/70 hover:text-white" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4">Nome do Curso</th>
                <th className="py-3.5 px-4">Grau</th>
                <th className="py-3.5 px-4">Duração</th>
                <th className="py-3.5 px-4">Pedagógico</th>
                <th className="py-3.5 px-4">Estágio</th>
                <th className="py-3.5 px-4">Status Geral</th>
                <th className="py-3.5 px-4 text-right">Mensal Pedagógico</th>
                <th className="py-3.5 px-4 text-right">Mensal Estágio</th>
                <th className="py-3.5 px-4 text-right bg-emerald-950/80">Mensal Total</th>
                <th className="py-3.5 px-4 text-right">Custo Total</th>
                <th className="py-3.5 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedCourses.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500">
                    Nenhum curso encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                sortedCourses.map((c) => {
                  const isCompleto = c.status_geral === 'completo';
                  const isSelected = selectedCourseIds.has(c.id);

                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleToggleSelectCourse(c.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-emerald-50/80 hover:bg-emerald-100/70 border-l-4 border-l-[#239371]'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td
                        className="py-3.5 px-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectCourse(c.id)}
                          className="w-4 h-4 rounded text-[#239371] border-slate-300 focus:ring-[#239371] cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{c.nome_curso}</span>
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#239371]"></span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {c.grau}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 tabular">
                        {c.duracao_curso} anos ({c.quantidade_semestres}S)
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            c.status_pedagogico === 'completo'
                              ? 'bg-emerald-100 text-[#117d5d]'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {c.status_pedagogico}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            c.status_estagio === 'completo'
                              ? 'bg-emerald-100 text-[#117d5d]'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {c.status_estagio}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded uppercase ${
                            isCompleto
                              ? 'bg-[#239371] text-white'
                              : 'bg-[#e7972a] text-white'
                          }`}
                        >
                          {isCompleto ? 'Completo' : 'Parcial'}
                        </span>
                      </td>

                      {/* Mensal Pedagógico */}
                      <td className="py-3.5 px-4 text-right text-slate-700 font-medium tabular">
                        {formatCurrency(c.custo_mensal_medio_pedagogico || 0)}
                      </td>

                      {/* Mensal Estágio */}
                      <td className="py-3.5 px-4 text-right text-slate-700 font-medium tabular">
                        {formatCurrency(c.custo_mensal_medio_estagio || 0)}
                      </td>

                      {/* Mensal Total */}
                      <td className="py-3.5 px-4 text-right font-extrabold text-[#117d5d] tabular bg-emerald-50/50">
                        {formatCurrency(c.custo_mensal_medio_curso || 0)}
                      </td>

                      {/* Custo Total */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 tabular">
                        {formatCurrency(c.custo_total_curso)}
                        {!isCompleto && (
                          <span className="block text-[9px] text-amber-700 font-bold uppercase">
                            (Parcial)
                          </span>
                        )}
                      </td>

                      <td
                        className="py-3.5 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenReport(c)}
                            title="Ver Relatório do Curso"
                            className="p-1.5 text-slate-600 hover:text-[#239371] hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <BookOpen className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenConsult(c)}
                            title="Consultar Registros"
                            className="p-1.5 text-slate-600 hover:text-[#239371] hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                          {!isCompleto && (
                            <button
                              onClick={() => handleOpenContinue(c)}
                              title="Continuar Cadastro"
                              className="p-1.5 text-[#e7972a] hover:text-[#d28117] hover:bg-amber-50 rounded-md transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteCourse(c)}
                            title="Excluir Curso"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* LINHA DE SOMATÓRIO DO CUSTO MENSAL DOS CURSOS SELECIONADOS NO RODAPÉ */}
            <tfoot className="border-t-2 border-slate-300">
              <tr className="bg-emerald-50/90 text-slate-900 font-bold">
                <td className="py-4 px-3 text-center">
                  <span className="w-6 h-6 rounded-full bg-[#239371] text-white flex items-center justify-center mx-auto text-xs font-bold">
                    &Sigma;
                  </span>
                </td>
                <td colSpan={6} className="py-4 px-4 text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="uppercase tracking-wider text-[#117d5d]">
                      SOMATÓRIO DOS CURSOS SELECIONADOS:
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-emerald-300 text-xs font-semibold text-slate-700">
                      {selectedCourseIds.size} de {courses.length} curso{selectedCourseIds.size !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {selectedCourseIds.size === 0 && (
                    <span className="text-[11px] text-slate-500 font-normal block mt-0.5">
                      (Nenhum curso marcado. Marque nas caixas de seleção na primeira coluna para somar)
                    </span>
                  )}
                </td>
                {/* Somatório Mensal Pedagógico */}
                <td className="py-4 px-4 text-right font-bold text-xs font-mono text-slate-800 tabular">
                  {formatCurrency(selectedCoursesList.reduce((s, c) => s + (c.custo_mensal_medio_pedagogico || 0), 0))}
                </td>
                {/* Somatório Mensal Estágio */}
                <td className="py-4 px-4 text-right font-bold text-xs font-mono text-slate-800 tabular">
                  {formatCurrency(selectedCoursesList.reduce((s, c) => s + (c.custo_mensal_medio_estagio || 0), 0))}
                </td>
                {/* SOMATÓRIO CUSTO MENSAL TOTAL SELECIONADOS */}
                <td className="py-4 px-4 text-right font-extrabold text-base font-mono text-[#117d5d] tabular bg-emerald-100/80">
                  {formatCurrency(somatorioCustoMensalSelecionados)}
                  <span className="block text-[10px] text-[#117d5d] font-bold uppercase tracking-wider">
                    Soma Mensal
                  </span>
                </td>
                {/* Total Acumulado */}
                <td className="py-4 px-4 text-right font-extrabold text-sm font-mono text-slate-900 tabular">
                  {formatCurrency(somatorioCustoTotalSelecionados)}
                  <span className="block text-[10px] text-slate-500 font-normal">
                    Total Acumulado
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  {selectedCourseIds.size > 0 && (
                    <button
                      onClick={handleClearSelection}
                      className="text-[11px] text-[#117d5d] hover:text-emerald-900 underline font-semibold cursor-pointer"
                    >
                      Desmarcar
                    </button>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* MODAL DE EXPORTAÇÃO EXECUTIVA PARA A MESA DIRETORA */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full p-6 sm:p-7 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:p-0">
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4 print:pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0d281e] text-emerald-400 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#239371] block">
                    DOSSIÊ EXECUTIVO &bull; MESA DIRETORA
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    Projeção Orçamentária Docente EaD
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer print:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Controle de Modo de Exportação (Pensado para a Mesa Diretora) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 print:hidden">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Filtro de Apresentação Executiva:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => setExportFilterMode('somente_completos')}
                  className={`p-3 rounded-lg border font-semibold text-left transition-all cursor-pointer ${
                    exportFilterMode === 'somente_completos'
                      ? 'bg-emerald-50 border-[#239371] text-[#117d5d] shadow-xs'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold block text-slate-900">Apenas Cursos Consolidados</span>
                  <span className="text-[11px] text-slate-500">
                    Exporta somente os {quantidade_cursos_completos} cursos 100% finalizados (Ideal para Diretoria).
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFilterMode('selecionados')}
                  disabled={selectedCourseIds.size === 0}
                  className={`p-3 rounded-lg border font-semibold text-left transition-all cursor-pointer ${
                    selectedCourseIds.size === 0 ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    exportFilterMode === 'selecionados'
                      ? 'bg-emerald-50 border-[#239371] text-[#117d5d] shadow-xs'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold block text-slate-900">
                    Cursos Marcados na Tabela ({selectedCourseIds.size})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Exporta exatamente a seleção personalizada que você fez no painel.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFilterMode('todos')}
                  className={`p-3 rounded-lg border font-semibold text-left transition-all cursor-pointer ${
                    exportFilterMode === 'todos'
                      ? 'bg-emerald-50 border-[#239371] text-[#117d5d] shadow-xs'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold block text-slate-900">Todos os Cursos ({courses.length})</span>
                  <span className="text-[11px] text-slate-500">
                    Mostra todos os cursos com valores oficiais sem exibir rótulos de incompleto.
                  </span>
                </button>
              </div>
            </div>

            {/* Resumo Executivo para a Diretoria */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-br from-slate-900 to-[#0d281e] p-4 rounded-xl text-white">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-300 block">Cursos no Relatório</span>
                <span className="text-xl font-bold font-mono">{boardCourses.length}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-300 block">Custo Mensal Consolidado</span>
                <span className="text-xl font-bold font-mono text-emerald-400">{formatCurrency(boardTotalMensalGeral)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-300 block">Projeção Anual (12 Meses)</span>
                <span className="text-xl font-bold font-mono">{formatCurrency(boardTotalAnualGeral)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-300 block">Custo Integral Ciclo</span>
                <span className="text-xl font-bold font-mono">{formatCurrency(boardTotalGeralCurso)}</span>
              </div>
            </div>

            {/* Prévia da Tabela Executiva (LIMPA: sem status completo/incompleto) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="p-2.5 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700 flex justify-between items-center">
                <span>Demonstrativo Orçamentário de Folha Docente</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Valores oficiais aprovados &bull; Unicive EaD
                </span>
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-800 text-white text-[11px] uppercase tracking-wider font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Curso</th>
                      <th className="py-2.5 px-3">Grau</th>
                      <th className="py-2.5 px-3">Duração</th>
                      <th className="py-2.5 px-3 text-right">Mensal Pedagógico</th>
                      <th className="py-2.5 px-3 text-right">Mensal Estágio</th>
                      <th className="py-2.5 px-3 text-right bg-slate-900">Custo Mensal Total</th>
                      <th className="py-2.5 px-3 text-right">Impacto Anual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {boardCourses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          Nenhum curso selecionado para este critério.
                        </td>
                      </tr>
                    ) : (
                      boardCourses.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{c.nome_curso}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">{c.grau}</td>
                          <td className="py-2.5 px-3 text-slate-600">{c.duracao_curso} anos</td>
                          <td className="py-2.5 px-3 text-right text-slate-700 tabular">
                            {formatCurrency(c.custo_mensal_medio_pedagogico || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700 tabular">
                            {formatCurrency(c.custo_mensal_medio_estagio || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-[#117d5d] tabular bg-emerald-50/50">
                            {formatCurrency(c.custo_mensal_medio_curso || 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular">
                            {formatCurrency((c.custo_mensal_medio_curso || 0) * 12)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-emerald-50/90 font-bold border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={3} className="py-3 px-3 uppercase text-[#117d5d] font-extrabold">
                        Custos totais:
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular">
                        {formatCurrency(boardTotalMensalPedagogico)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular">
                        {formatCurrency(boardTotalMensalEstagio)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-base font-extrabold text-[#117d5d] tabular bg-emerald-100">
                        {formatCurrency(boardTotalMensalGeral)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900 tabular">
                        {formatCurrency(boardTotalAnualGeral)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Ações de Download e Impressão */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-200 print:hidden">
              <span className="text-xs text-slate-500">
                Formatado para apresentações e relatórios de diretoria.
              </span>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="btn-unicive-outline text-xs flex-1 sm:flex-initial"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-xs flex-1 sm:flex-initial"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Planilha Excel (CSV)</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintBoard}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0d281e] hover:bg-[#143529] text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-xs flex-1 sm:flex-initial"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
