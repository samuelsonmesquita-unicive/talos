import React from 'react';
import {
  GraduationCap,
  ClipboardList,
  FileSpreadsheet,
  BarChart3,
  Coins,
  Award,
  Cloud,
  CloudCheck,
  Lock,
  LogOut,
  TrendingUp,
  Download,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface HeaderProps {
  activeTab: 'cadastro' | 'consulta' | 'relatorio-curso' | 'relatorio-geral';
  cloudStatus?: 'conectando' | 'conectado' | 'offline';
  onSelectTab: (tab: 'cadastro' | 'consulta' | 'relatorio-curso' | 'relatorio-geral') => void;
  onOpenSalaryModal: () => void;
  onOpenPlutos: () => void;
  onDownloadRelatorio: () => void;
  downloadingRelatorio?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  cloudStatus = 'conectado',
  onSelectTab,
  onOpenSalaryModal,
  onOpenPlutos,
  onDownloadRelatorio,
  downloadingRelatorio = false,
}) => {
  const { profile, isAdmin, signOut } = useAuth();

  return (
    <header className="bg-white border-b border-[#e2e8e4] sticky top-0 z-40 shadow-xs">
      {/* Barra superior de identificação institucional */}
      <div className="bg-[#0d281e] text-white text-xs py-1 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-100">
            <span className="flex items-center gap-1 bg-[#239371] text-white px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
              <Award className="w-3 h-3" /> NOTA MÁXIMA NO MEC
            </span>
            <span className="hidden sm:inline text-emerald-200/80">|</span>
            <span className="hidden sm:inline">Centro Universitário Cidade Verde &bull; Educação a Distância (EaD)</span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            {/* Indicador de Nuvem Centralizada */}
            <div className="flex items-center gap-1.5 bg-[#143529] px-2.5 py-0.5 rounded-full border border-emerald-700/60 text-emerald-300">
              <CloudCheck className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="font-semibold text-[10px] tracking-wide whitespace-nowrap">
                NUVEM CENTRALIZADA &bull; SUPABASE
              </span>
            </div>

            <span className="text-emerald-400 font-bold bg-[#143529] px-2 py-0.5 rounded border border-emerald-700/50 hidden md:inline whitespace-nowrap">
              Setores Pedagógico &bull; Estágio
            </span>

            {profile && (
              <div className="flex items-center gap-2 bg-[#143529] px-2.5 py-0.5 rounded-full border border-emerald-700/60">
                <span className="text-[10px] text-emerald-100 max-w-[180px] truncate" title={profile.email}>
                  {profile.email}
                </span>
                <span
                  className={`text-[9px] font-bold uppercase px-1.5 rounded ${
                    isAdmin ? 'bg-[#e7972a] text-[#0d281e]' : 'bg-emerald-700/60 text-emerald-100'
                  }`}
                >
                  {isAdmin ? 'Admin' : 'Staff'}
                </span>
                <button
                  type="button"
                  id="btn-sair"
                  onClick={signOut}
                  title="Sair"
                  className="text-emerald-300 hover:text-white cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Header Principal com Logomarca Unicive e Navegação de Altura Total */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-stretch justify-between h-14 gap-4">
          {/* Logomarca + Ações Técnicas (aproveitando o espaço ao lado da logo) */}
          <div className="flex items-center gap-3 py-2 min-w-0">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onSelectTab('cadastro');
              }}
              className="flex items-center gap-3 group shrink-0"
            >
              <img
                src="https://unicive.com/wp-content/uploads/2020/12/LOGOMARCA-UNICIVE.webp"
                alt="Unicive - Centro Universitário Cidade Verde"
                className="h-8 sm:h-9 object-contain"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('.fallback-brand')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'fallback-brand flex items-center gap-2';
                    fallback.innerHTML = `
                      <span class="font-extrabold text-2xl tracking-tight text-[#239371]">UNICIVE</span>
                      <span class="text-[10px] font-semibold text-slate-500 uppercase leading-tight border-l pl-2 border-slate-300">
                        Centro Universitário<br>Cidade Verde
                      </span>
                    `;
                    parent.appendChild(fallback);
                  }
                }}
              />
            </a>

            {/* Ações Técnicas: usam o espaço livre ao lado da logo em vez de disputar com a navegação */}
            <div className="hidden md:flex items-center gap-2 pl-3 ml-1 border-l border-slate-200 min-w-0">
              <button
                id="btn-baixar-relatorio-executivo"
                onClick={onDownloadRelatorio}
                disabled={downloadingRelatorio}
                title="Baixar Relatório Executivo (CSV) — todos os cursos com Ponto de Equilíbrio calculado no Plutos"
                className="flex items-center gap-1.5 text-xs font-semibold text-[#e7972a] bg-[#fef5ea] hover:bg-[#fdecd4] disabled:opacity-50 disabled:cursor-not-allowed px-2.5 py-1.5 rounded-lg border border-[#e7972a]/25 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-[#e7972a] shrink-0" />
                <span className="whitespace-nowrap">
                  {downloadingRelatorio ? 'Gerando...' : 'Relatório'}
                </span>
              </button>

              <button
                id="btn-tabela-salarial"
                onClick={onOpenSalaryModal}
                title="Configuração das Faixas Salariais (Acesso Restrito a Privilégios)"
                className="flex items-center gap-1.5 text-xs font-semibold text-[#239371] bg-[#ebf7f2] hover:bg-[#d8f0e5] px-2.5 py-1.5 rounded-lg border border-[#239371]/25 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Coins className="w-3.5 h-3.5 text-[#239371] shrink-0" />
                <span className="whitespace-nowrap">Salários</span>
                <Lock className="w-3 h-3 text-amber-600 ml-0.5 shrink-0" />
              </button>
            </div>
          </div>

          {/* Abas de Navegação Estilo Barra Total (1 linha, clique em toda a altura) */}
          <nav className="hidden md:flex items-stretch h-full text-xs sm:text-sm font-semibold shrink-0">
            <button
              id="tab-btn-cadastro"
              onClick={() => onSelectTab('cadastro')}
              title="Novo Cadastro"
              className={`h-full flex items-center gap-2 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'cadastro'
                  ? 'border-[#239371] text-[#239371] font-bold bg-[#ebf7f2]/60'
                  : 'border-transparent text-slate-600 hover:text-[#239371] hover:bg-slate-50'
              }`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap hidden xl:inline">Novo Cadastro</span>
            </button>

            <button
              id="tab-btn-consulta"
              onClick={() => onSelectTab('consulta')}
              title="Registros do Curso"
              className={`h-full flex items-center gap-2 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'consulta'
                  ? 'border-[#239371] text-[#239371] font-bold bg-[#ebf7f2]/60'
                  : 'border-transparent text-slate-600 hover:text-[#239371] hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap hidden xl:inline">Registros</span>
            </button>

            <button
              id="tab-btn-relatorio-curso"
              onClick={() => onSelectTab('relatorio-curso')}
              title="Relatório por Curso"
              className={`h-full flex items-center gap-2 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'relatorio-curso'
                  ? 'border-[#239371] text-[#239371] font-bold bg-[#ebf7f2]/60'
                  : 'border-transparent text-slate-600 hover:text-[#239371] hover:bg-slate-50'
              }`}
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap hidden xl:inline">Por Curso</span>
            </button>

            <button
              id="tab-btn-relatorio-geral"
              onClick={() => onSelectTab('relatorio-geral')}
              title="Painel Geral"
              className={`h-full flex items-center gap-2 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'relatorio-geral'
                  ? 'border-[#239371] text-[#239371] font-bold bg-[#ebf7f2]/60'
                  : 'border-transparent text-slate-600 hover:text-[#239371] hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap hidden xl:inline">Painel Geral</span>
            </button>

            <button
              id="tab-btn-plutos"
              onClick={onOpenPlutos}
              title="Abrir módulo Plutos — Viabilidade & Custo"
              className="h-full flex items-center gap-2 px-3 border-b-2 border-transparent whitespace-nowrap transition-colors cursor-pointer text-[#e7972a] hover:text-[#d28117] hover:bg-[#fef5ea]"
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap hidden xl:inline">Plutos</span>
            </button>
          </nav>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex overflow-x-auto h-11 items-stretch border-t border-slate-100 scrollbar-none">
          <button
            onClick={() => onSelectTab('cadastro')}
            className={`h-full flex items-center gap-1.5 px-3 whitespace-nowrap text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'cadastro'
                ? 'border-[#239371] text-[#239371] bg-[#ebf7f2]/60 font-bold'
                : 'border-transparent text-slate-600 hover:text-[#239371]'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Novo Cadastro</span>
          </button>
          <button
            onClick={() => onSelectTab('consulta')}
            className={`h-full flex items-center gap-1.5 px-3 whitespace-nowrap text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'consulta'
                ? 'border-[#239371] text-[#239371] bg-[#ebf7f2]/60 font-bold'
                : 'border-transparent text-slate-600 hover:text-[#239371]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Registros</span>
          </button>
          <button
            onClick={() => onSelectTab('relatorio-curso')}
            className={`h-full flex items-center gap-1.5 px-3 whitespace-nowrap text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'relatorio-curso'
                ? 'border-[#239371] text-[#239371] bg-[#ebf7f2]/60 font-bold'
                : 'border-transparent text-slate-600 hover:text-[#239371]'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Por Curso</span>
          </button>
          <button
            onClick={() => onSelectTab('relatorio-geral')}
            className={`h-full flex items-center gap-1.5 px-3 whitespace-nowrap text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'relatorio-geral'
                ? 'border-[#239371] text-[#239371] bg-[#ebf7f2]/60 font-bold'
                : 'border-transparent text-slate-600 hover:text-[#239371]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Painel Geral</span>
          </button>
          <button
            onClick={onOpenPlutos}
            className="h-full flex items-center gap-1.5 px-3 whitespace-nowrap text-xs font-semibold border-b-2 border-transparent text-[#e7972a] hover:bg-[#fef5ea] transition-colors cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Plutos</span>
          </button>
          <button
            onClick={onDownloadRelatorio}
            disabled={downloadingRelatorio}
            title="Baixar Relatório Executivo (CSV)"
            className="h-full flex items-center gap-1.5 px-3 whitespace-nowrap text-xs font-semibold border-b-2 border-transparent text-[#e7972a] hover:bg-[#fef5ea] disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Relatório</span>
          </button>
          <button
            onClick={onOpenSalaryModal}
            title="Tabela Salarial"
            className="h-full flex items-center gap-1.5 px-3 whitespace-nowrap text-xs font-semibold border-b-2 border-transparent text-[#239371] hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Salários</span>
          </button>
        </div>
      </div>
    </header>
  );
};
