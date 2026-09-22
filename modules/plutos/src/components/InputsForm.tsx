import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface InputsFormProps {
  quantidadeDisciplinas: number;
  ticketMedio: number;
  onQuantidadeChange: (qty: number) => void;
  onTicketChange: (ticket: number) => void;
  onSubmit: (quantidadeDisciplinas: number, ticketMedio: number) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
}

export const InputsForm: React.FC<InputsFormProps> = ({
  quantidadeDisciplinas,
  ticketMedio,
  onQuantidadeChange,
  onTicketChange,
  onSubmit,
  loading = false,
  error = null,
  disabled = false,
}) => {
  const [localQty, setLocalQty] = useState(quantidadeDisciplinas > 0 ? quantidadeDisciplinas.toString() : '');
  const [localTicket, setLocalTicket] = useState(ticketMedio > 0 ? ticketMedio.toString() : '');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setLocalQty(quantidadeDisciplinas > 0 ? quantidadeDisciplinas.toString() : '');
  }, [quantidadeDisciplinas]);

  useEffect(() => {
    setLocalTicket(ticketMedio > 0 ? ticketMedio.toString() : '');
  }, [ticketMedio]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const qty = parseInt(localQty, 10);
    const ticket = parseFloat(localTicket);

    if (isNaN(qty) || qty < 0) {
      setValidationError('Quantidade de disciplinas deve ser um número não-negativo.');
      return;
    }

    if (isNaN(ticket) || ticket <= 0) {
      setValidationError('Ticket médio deve ser um valor positivo.');
      return;
    }

    onQuantidadeChange(qty);
    onTicketChange(ticket);

    try {
      await onSubmit(qty, ticket);
    } catch (err) {
      // Erro é tratado pelo componente pai
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-unicive p-6 space-y-4">
      <h3 className="font-semibold text-slate-900 text-sm">Informações do Curso</h3>

      <div className="space-y-3">
        {/* Quantidade de Disciplinas */}
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

        {/* Ticket Médio */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Ticket médio (mensalidade) — R$
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={localTicket}
            onChange={(e) => setLocalTicket(e.target.value)}
            disabled={disabled || loading}
            className="w-full px-3 py-2 text-sm border border-[#e2e8e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#239371] focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
            placeholder="0,00"
          />
        </div>
      </div>

      {/* Erros */}
      {(error || validationError) && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error || validationError}</span>
        </div>
      )}

      {/* Botão Calcular */}
      <button
        type="submit"
        disabled={disabled || loading}
        className="w-full btn-unicive-primary text-sm font-semibold py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Calculando...' : 'Calcular Ponto de Equilíbrio'}
      </button>
    </form>
  );
};
