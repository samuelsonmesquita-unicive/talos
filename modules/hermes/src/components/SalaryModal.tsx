import React, { useState } from 'react';
import { CargaHoraria, Cargo, SalaryConfig } from '../types';
import {
  getStoredSalaryConfig,
  saveStoredSalaryConfig,
  formatCurrency,
  restoreDefaultSalaryConfig,
  aplicarEncargosAoSalario,
  DEFAULT_SALARY_CONFIG,
} from '../utils/salary';
import { recalcularTodosOsCursos } from '../services/courseStore';
import { saveSalaryConfigToCloud } from '../services/cloudSync';
import {
  X,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Coins,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface SalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const SalaryModal: React.FC<SalaryModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const [config, setConfig] = useState<SalaryConfig>(() => getStoredSalaryConfig());
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Privilégio vem do papel da conta (profiles.role), não de senha no front
  const { isAdmin } = useAuth();

  if (!isOpen) return null;

  const handleChange = (cargo: Cargo, ch: CargaHoraria, val: string) => {
    const num = parseFloat(val);
    setConfig((prev) => ({
      ...prev,
      [cargo]: {
        ...prev[cargo],
        [ch]: isNaN(num) ? 0 : num,
      },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setErrorNotice(null);

    const cargos: Cargo[] = ['Professor', 'Mediador'];
    const chs: CargaHoraria[] = ['10h', '20h', '40h'];

    for (const cargo of cargos) {
      for (const ch of chs) {
        const val = config[cargo]?.[ch];
        if (typeof val !== 'number' || val <= 0) {
          setErrorNotice(`O salário de ${cargo} (${ch}) deve ser um valor numérico positivo.`);
          return;
        }
      }
    }

    // O banco valida o perfil admin e recalcula todos os custos; só depois atualiza o cache local
    try {
      await saveSalaryConfigToCloud(config);
    } catch (err) {
      setErrorNotice(
        `Não foi possível salvar a tabela salarial: ${err instanceof Error ? err.message : 'erro desconhecido'}`
      );
      return;
    }
    saveStoredSalaryConfig(config);
    recalcularTodosOsCursos();

    setSuccessNotice(
      'Tabela salarial atualizada e sincronizada na nuvem com sucesso! Todos os cursos foram recalculados.'
    );
    onConfigUpdated();

    setTimeout(() => {
      setSuccessNotice(null);
      onClose();
    }, 1500);
  };

  const handleReset = async () => {
    if (!isAdmin) return;

    if (
      window.confirm(
        'Deseja restaurar a tabela salarial oficial com o reajuste padrão de 4% (2026/2027) na nuvem?'
      )
    ) {
      try {
        await saveSalaryConfigToCloud(DEFAULT_SALARY_CONFIG);
      } catch (err) {
        setErrorNotice(
          `Não foi possível restaurar a tabela salarial: ${err instanceof Error ? err.message : 'erro desconhecido'}`
        );
        return;
      }
      restoreDefaultSalaryConfig();
      const def = getStoredSalaryConfig();
      recalcularTodosOsCursos();
      setConfig(def);
      onConfigUpdated();
      setSuccessNotice('Valores padrão de 2026/2027 restaurados na nuvem!');
      setTimeout(() => setSuccessNotice(null), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#ebf7f2] text-[#239371] font-bold text-sm flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-lg text-slate-900">
                Tabela Salarial Docente &bull; Unicive EaD
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Valores base centralizados na nuvem &bull; Controle de Acesso Restrito
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SOMENTE LEITURA PARA QUEM NÃO É ADMINISTRADOR */}
        {!isAdmin ? (
          <div className="space-y-6">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <Lock className="w-5 h-5 text-[#e7972a] shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <strong className="block font-bold mb-1">
                  Acesso Restrito: Somente Usuários com Privilégios
                </strong>
                Por diretriz institucional, a edição dos valores da tabela salarial e a aplicação de reajustes requerem autenticação administrativa. Qualquer usuário pode visualizar a tabela abaixo em modo somente leitura.
              </div>
            </div>

            {/* Informações da Regra de Encargos */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1">
              <span className="font-bold block text-emerald-900">Regra de Custos da Folha e Encargos Institucionais (+***%):</span>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                • <strong>Custos Trabalhistas (***%):</strong> 13º Salário (***) + Férias (***) + 1/3 Constitucional de Férias (***)
                <br />
                • <strong>Encargos Patronais (***%):</strong> INSS Patronal (***%) + Encargos Adicionais da Folha (***%)
                <br />
                O custo mensal de cada docente aplica essa regra sobre o salário base da carga horária selecionada.
              </p>
            </div>

            {/* Visualização Somente Leitura dos Valores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold uppercase text-slate-700">Professor</span>
                  <span className="badge-unicive-green">Atual</span>
                </div>
                <div className="space-y-2 text-xs">
                  {(['10h', '20h', '40h'] as CargaHoraria[]).map((ch) => (
                    <div key={`view-prof-${ch}`} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                      <div>
                        <span className="text-slate-600 font-medium">{ch}:</span>
                        <span className="block text-[10px] text-slate-400">Base: {formatCurrency(config.Professor[ch])}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold tabular text-slate-900">{formatCurrency(aplicarEncargosAoSalario(config.Professor[ch]))}</span>
                        <span className="block text-[10px] text-[#117d5d] font-semibold">+***% folha</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold uppercase text-slate-700">Mediador</span>
                  <span className="badge-unicive-ead">Atual</span>
                </div>
                <div className="space-y-2 text-xs">
                  {(['10h', '20h', '40h'] as CargaHoraria[]).map((ch) => (
                    <div key={`view-med-${ch}`} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                      <div>
                        <span className="text-slate-600 font-medium">{ch}:</span>
                        <span className="block text-[10px] text-slate-400">Base: {formatCurrency(config.Mediador[ch])}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold tabular text-slate-900">{formatCurrency(aplicarEncargosAoSalario(config.Mediador[ch]))}</span>
                        <span className="block text-[10px] text-[#117d5d] font-semibold">+***% folha</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-[#239371] shrink-0" />
              <span>
                A edição da tabela salarial é exclusiva de contas com perfil de administrador.
              </span>
            </div>
          </div>
        ) : (
          /* MODO AUTORIZADO: FORMULÁRIO DE EDIÇÃO */
          <div className="space-y-6">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-[#117d5d]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#239371]" />
                <span className="font-bold">Modo de Edição Administrativa (perfil Admin)</span>
              </div>
            </div>

            {/* Avisos */}
            {successNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-[#117d5d] text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#239371]" />
                <span>{successNotice}</span>
              </div>
            )}

            {errorNotice && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorNotice}</span>
              </div>
            )}

            {/* Formulário com Grid Unicive */}
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Bloco Professor */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                      Professor (Titular)
                    </span>
                    <span className="badge-unicive-green">
                      DOCÊNCIA
                    </span>
                  </div>

                  {(['10h', '20h', '40h'] as CargaHoraria[]).map((ch) => (
                    <div key={`prof-${ch}`}>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-slate-700">
                          Carga Horária {ch} (Base)
                        </label>
                        <span className="text-[10px] text-[#117d5d] font-bold tabular">
                          c/ encargos (+***%): {formatCurrency(aplicarEncargosAoSalario(config.Professor[ch]))}
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        required
                        value={config.Professor[ch]}
                        onChange={(e) => handleChange('Professor', ch, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm font-bold tabular focus:outline-none focus:ring-2 focus:ring-[#239371]"
                      />
                    </div>
                  ))}
                </div>

                {/* Bloco Mediador */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                      Mediador (Tutor)
                    </span>
                    <span className="badge-unicive-ead">
                      MEDIAÇÃO
                    </span>
                  </div>

                  {(['10h', '20h', '40h'] as CargaHoraria[]).map((ch) => (
                    <div key={`med-${ch}`}>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-slate-700">
                          Carga Horária {ch} (Base)
                        </label>
                        <span className="text-[10px] text-[#117d5d] font-bold tabular">
                          c/ encargos (+***%): {formatCurrency(aplicarEncargosAoSalario(config.Mediador[ch]))}
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        required
                        value={config.Mediador[ch]}
                        onChange={(e) => handleChange('Mediador', ch, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm font-bold tabular focus:outline-none focus:ring-2 focus:ring-[#239371]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-[#117d5d]">
                <strong>Sincronização em Nuvem:</strong> As alterações serão salvas imediatamente no Supabase e propagadas para todos os cursos em cascata.
              </div>

              {/* Ações */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-unicive-outline text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Restaurar Padrão (+4%)
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-unicive-outline text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-unicive-primary text-xs"
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Salvar e Sincronizar Nuvem
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
