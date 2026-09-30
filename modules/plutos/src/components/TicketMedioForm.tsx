import React, { useState } from 'react';
import { AlertCircle, ShieldCheck, DollarSign } from 'lucide-react';

interface TicketMedioFormProps {
  ticketDefinido: boolean;
  onSubmit: (ticket: number) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
}

// Formulário admin-only: nunca pré-carrega o valor salvo (o back-end também
// não devolve ticket_medio pro cliente) — o admin só digita um novo valor.
export const TicketMedioForm: React.FC<TicketMedioFormProps> = ({
  ticketDefinido,
  onSubmit,
  loading = false,
  error = null,
  disabled = false,
}) => {
  const [localTicket, setLocalTicket] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const ticket = parseFloat(localTicket);

    if (isNaN(ticket) || ticket <= 0) {
      setValidationError('Ticket médio deve ser um valor positivo.');
      return;
    }

    try {
      await onSubmit(ticket);
      setLocalTicket('');
    } catch (err) {
      // Erro é tratado pelo componente pai
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-unicive p-6 space-y-4 border-[#e7972a]/30">
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-[#e7972a]" />
        <h3 className="font-semibold text-slate-900 text-sm">Ticket Médio</h3>
        <span className="ml-auto flex items-center gap-1 text-[10px] font-bold uppercase text-[#e7972a] bg-[#fef5ea] px-2 py-0.5 rounded-full">
          <ShieldCheck className="w-3 h-3" /> Somente Admin
        </span>
      </div>
      <p className="text-xs text-slate-500 -mt-2">
        {ticketDefinido
          ? 'Já existe um ticket médio salvo para este curso. Digite um novo valor para substituí-lo.'
          : 'Ainda não há ticket médio definido para este curso.'}
      </p>

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
          placeholder="0,00"
          className="w-full px-3 py-2 text-sm border border-[#e2e8e4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e7972a] focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
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
        className="w-full btn-unicive-orange text-sm font-semibold py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Salvando...' : ticketDefinido ? 'Atualizar Ticket Médio' : 'Salvar Ticket Médio'}
      </button>
    </form>
  );
};
