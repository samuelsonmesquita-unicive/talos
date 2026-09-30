import React, { useState, useEffect } from 'react';
import { AlertCircle, BookOpen } from 'lucide-react';

interface DisciplinasFormProps {
  quantidadeDisciplinas: number;
  onSubmit: (quantidade: number) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
}

export const DisciplinasForm: React.FC<DisciplinasFormProps> = ({
  quantidadeDisciplinas,
  onSubmit,
  loading = false,
  error = null,
  disabled = false,
}) => {
  const [localQty, setLocalQty] = useState(quantidadeDisciplinas > 0 ? quantidadeDisciplinas.toString() : '');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setLocalQty(quantidadeDisciplinas > 0 ? quantidadeDisciplinas.toString() : '');
  }, [quantidadeDisciplinas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const qty = parseInt(localQty, 10);

    if (isNaN(qty) || qty < 0) {
      setValidationError('Quantidade de disciplinas deve ser um número não-negativo.');
      return;
    }

    try {
      await onSubmit(qty);
    } catch (err) {
      // Erro é tratado pelo componente pai
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-unicive p-6 space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-[#239371]" />
        <h3 className="font-semibold text-slate-900 text-sm">Cadastro das Disciplinas</h3>
      </div>
      <p className="text-xs text-slate-500 -mt-2">
        Informe quantas disciplinas precisam ser gravadas para este curso.
      </p>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Quantidade de disciplinas a produzir
        </label>
        <input
          type="number"
          min="0"
          step="1"
          value={localQty}
          onChange={(e) => setLocalQty(e.target.value)}
          disabled={disabled || loading}
          placeholder="0"
          className="w-full px-3 py-2 text-sm border border-[#e2e8e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#239371] focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
        />
      </div>

      {(error || validationError) && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error || validationError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={disabled || loading}
        className="w-full btn-unicive-primary text-sm font-semibold py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Salvando...' : 'Salvar Quantidade de Disciplinas'}
      </button>
    </form>
  );
};
