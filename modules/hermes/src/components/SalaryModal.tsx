import React, { useState } from 'react';
import { CargaHoraria, Cargo, SalaryConfig } from '../types';
import { formatCurrency, aplicarEncargosAoSalario } from '../utils/salary';
import { saveSalaryConfigToCloud } from '../services/cloudSync';
import {
  X,
  Save,
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

type CampoStr = Record<Cargo, Record<CargaHoraria, string>>;

const CAMPOS_VAZIOS: CampoStr = {
  Professor: { '10h': '', '20h': '', '40h': '' },
  Mediador: { '10h': '', '20h': '', '40h': '' },
};

export const SalaryModal: React.FC<SalaryModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  // Formulário "às cegas": nunca pré-carrega os valores salvos (a tabela
  // salarial é confidencial — nem admin consulta o valor atual pelo
  // cliente). O admin digita os 6 valores novos do zero a cada edição.
  const [campos, setCampos] = useState<CampoStr>(CAMPOS_VAZIOS);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Privilégio vem do papel da conta (profiles.role), não de senha no front
  const { isAdmin } = useAuth();

  if (!isOpen) return null;

  const handleChange = (cargo: Cargo, ch: CargaHoraria, val: string) => {
    setCampos((prev) => ({
      ...prev,
      [cargo]: { ...prev[cargo], [ch]: val },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setErrorNotice(null);

    const cargos: Cargo[] = ['Professor', 'Mediador'];
    const chs: CargaHoraria[] = ['10h', '20h', '40h'];
    const config: SalaryConfig = { Professor: { '10h': 0, '20h': 0, '40h': 0 }, Mediador: { '10h': 0, '20h': 0, '40h': 0 } };

    for (const cargo of cargos) {
      for (const ch of chs) {
        const num = parseFloat(campos[cargo][ch]);
        if (isNaN(num) || num <= 0) {
          setErrorNotice(`O salário de ${cargo} (${ch}) deve ser um valor numérico positivo.`);
          return;
        }
        config[cargo][ch] = num;
      }
    }

    setSaving(true);
    try {
      await saveSalaryConfigToCloud(config);
    } catch (err) {
      setErrorNotice(
        `Não foi possível salvar a tabela salarial: ${err instanceof Error ? err.message : 'erro desconhecido'}`
      );
      setSaving(false);
      return;
    }
    setSaving(false);
    setCampos(CAMPOS_VAZIOS);

    setSuccessNotice(
      'Tabela salarial atualizada com sucesso! O servidor recalculou todos os cursos — a sincronização em tempo real atualiza a tela em instantes.'
    );
    onConfigUpdated();

    setTimeout(() => {
      setSuccessNotice(null);
      onClose();
    }, 1500);
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
              Dado confidencial &bull; Acesso e edição exclusivos de administradores
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SEM ACESSO PARA QUEM NÃO É ADMINISTRADOR — nenhum dado é mostrado */}
        {!isAdmin ? (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <Lock className="w-5 h-5 text-[#e7972a] shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <strong className="block font-bold mb-1">
                  Acesso Restrito: Somente Administradores
                </strong>
                A tabela salarial é um dado financeiro confidencial. Nem a visualização nem a edição
                estão disponíveis para o seu perfil.
              </div>
            </div>
          </div>
        ) : (
          /* MODO AUTORIZADO: FORMULÁRIO DE EDIÇÃO ÀS CEGAS (não mostra valores atuais) */
          <div className="space-y-6">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-[#117d5d]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#239371]" />
                <span className="font-bold">Modo de Edição Administrativa (perfil Admin)</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              Por confidencialidade, os valores atuais não são exibidos aqui. Preencha os 6 valores
              novos abaixo — eles substituem a tabela salarial vigente ao salvar.
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

                  {(['10h', '20h', '40h'] as CargaHoraria[]).map((ch) => {
                    const num = parseFloat(campos.Professor[ch]);
                    const valido = !isNaN(num) && num > 0;
                    return (
                      <div key={`prof-${ch}`}>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-bold text-slate-700">
                            Carga Horária {ch} (Base, novo valor)
                          </label>
                          {valido && (
                            <span className="text-[10px] text-[#117d5d] font-bold tabular">
                              c/ encargos (+***%): {formatCurrency(aplicarEncargosAoSalario(num))}
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          placeholder="Digite o novo valor"
                          value={campos.Professor[ch]}
                          onChange={(e) => handleChange('Professor', ch, e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm font-bold tabular focus:outline-none focus:ring-2 focus:ring-[#239371]"
                        />
                      </div>
                    );
                  })}
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

                  {(['10h', '20h', '40h'] as CargaHoraria[]).map((ch) => {
                    const num = parseFloat(campos.Mediador[ch]);
                    const valido = !isNaN(num) && num > 0;
                    return (
                      <div key={`med-${ch}`}>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-bold text-slate-700">
                            Carga Horária {ch} (Base, novo valor)
                          </label>
                          {valido && (
                            <span className="text-[10px] text-[#117d5d] font-bold tabular">
                              c/ encargos (+***%): {formatCurrency(aplicarEncargosAoSalario(num))}
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          placeholder="Digite o novo valor"
                          value={campos.Mediador[ch]}
                          onChange={(e) => handleChange('Mediador', ch, e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm font-bold tabular focus:outline-none focus:ring-2 focus:ring-[#239371]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-[#117d5d]">
                <strong>Sincronização em Nuvem:</strong> As alterações serão salvas imediatamente no Supabase e propagadas para todos os cursos em cascata.
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end pt-2 border-t border-slate-100">
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
                    disabled={saving}
                    className="btn-unicive-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {saving ? 'Salvando...' : 'Salvar e Sincronizar Nuvem'}
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
