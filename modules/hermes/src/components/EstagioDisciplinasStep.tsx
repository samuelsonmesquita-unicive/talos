import React, { useState } from 'react';
import { AlertCircle, Briefcase, FileText, Lock, Plus, Save, Trash2, X } from 'lucide-react';
import { CursoMestre, DisciplinaEstagio, MatrizCurso, RegistroItem } from '../types';
import { getMatriz, saveEstagio } from '../services/courseStore';
import { modulosComEstagio, totaisEstagio } from '../utils/courseCalculations';
import { useAuth } from '../hooks/useAuth';
import { MatrizCurricular } from './MatrizCurricular';

/* Etapa final do Pedagógico: informa se o curso tem estágio e quais são as
   disciplinas de estágio da matriz (nome, módulo e carga horária) e envia a
   matriz curricular (obrigatória). Só os módulos com disciplina de estágio ficam
   liberados para o setor Estágio.
   Trava: depois de salva a etapa, o usuário comum só consulta (disciplinas e
   matriz); só o admin altera. A mesma regra vale no banco (Bloco 22). */

interface LinhaDisciplina {
  key: string;
  nome: string;
  modulo: string;
  ch: string;
}

interface EstagioDisciplinasStepProps {
  curso: CursoMestre;
  disciplinas: DisciplinaEstagio[];
  registros: RegistroItem[];
  /** true = reabrindo a etapa depois do Pedagógico concluído (texto do botão muda) */
  edicao: boolean;
  onSaved: (curso: CursoMestre, disciplinas: DisciplinaEstagio[]) => void;
  /** Matriz enviada/substituída (inclusive no modo travado, em curso antigo sem matriz) */
  onMatrizEnviada?: (matriz: MatrizCurso) => void;
  onCancel?: () => void;
}

let seq = 0;
const novaLinha = (d?: DisciplinaEstagio): LinhaDisciplina => ({
  key: d?.id ?? `nova_${++seq}`,
  nome: d?.nome ?? '',
  modulo: d ? String(d.modulo) : '',
  ch: d ? String(d.carga_horaria) : '',
});

export const EstagioDisciplinasStep: React.FC<EstagioDisciplinasStepProps> = ({
  curso,
  disciplinas,
  registros,
  edicao,
  onSaved,
  onMatrizEnviada,
  onCancel,
}) => {
  const { isAdmin } = useAuth();
  const total = curso.quantidade_modulos;
  // Etapa já salva: só o admin altera as disciplinas de estágio
  const travado = !isAdmin && curso.tem_estagio != null;
  const [matriz, setMatriz] = useState<MatrizCurso | null>(() => getMatriz(curso.nome_curso, curso.grau));
  // Matriz: usuário comum envia/substitui até concluir a etapa (ou envia uma vez, se faltar)
  const podeEnviarMatriz = isAdmin || !(curso.tem_estagio != null && matriz);
  const modulos = Array.from({ length: total }, (_, i) => i + 1);

  const [temEstagio, setTemEstagio] = useState<boolean | null>(curso.tem_estagio);
  const [linhas, setLinhas] = useState<LinhaDisciplina[]>(() =>
    disciplinas.length > 0 ? disciplinas.map((d) => novaLinha(d)) : [novaLinha()]
  );
  const [erro, setErro] = useState<string | null>(null);

  const atualizar = (key: string, campo: keyof Omit<LinhaDisciplina, 'key'>, valor: string) => {
    setLinhas((ls) => ls.map((l) => (l.key === key ? { ...l, [campo]: valor } : l)));
    setErro(null);
  };

  // Linhas válidas viram disciplinas (para os totais e para salvar)
  const validas = linhas
    .map((l) => ({
      nome: l.nome.trim(),
      modulo: Number(l.modulo),
      carga_horaria: Number(l.ch),
    }))
    .filter(
      (d) =>
        d.nome !== '' &&
        Number.isInteger(d.modulo) && d.modulo >= 1 && d.modulo <= total &&
        Number.isInteger(d.carga_horaria) && d.carga_horaria > 0
    );
  const validasDisc: DisciplinaEstagio[] = validas.map((d, i) => ({ ...d, id: `local_${i}`, curso_id: curso.id }));
  const totais = totaisEstagio(validasDisc);

  const validar = (): string | null => {
    if (temEstagio === null) return 'Informe se o curso tem estágio.';
    if (!matriz) return 'Envie a matriz curricular (PDF ou Word) para concluir.';
    if (!temEstagio) return null;
    if (linhas.length === 0) return 'Adicione pelo menos uma disciplina de estágio.';
    for (const [i, l] of linhas.entries()) {
      const n = i + 1;
      if (!l.nome.trim()) return `Informe o nome da disciplina ${n}.`;
      const mod = Number(l.modulo);
      if (!l.modulo || !Number.isInteger(mod) || mod < 1 || mod > total)
        return `Escolha o módulo da disciplina ${n}.`;
      const ch = Number(l.ch);
      if (!l.ch.trim() || !Number.isInteger(ch) || ch <= 0)
        return `Informe a carga horária (horas inteiras, maior que zero) da disciplina ${n}.`;
    }
    return null;
  };

  const handleSalvar = () => {
    if (travado) return;
    const pendencia = validar();
    if (pendencia) {
      setErro(pendencia);
      return;
    }

    // Conclusão pelo Pedagógico: avisa que depois só o admin altera
    if (
      !edicao &&
      !window.confirm(
        'Concluir o Pedagógico?\n\n' +
          `Depois disso, a matriz ("${matriz?.nome_arquivo ?? ''}") e as disciplinas de estágio ` +
          'só poderão ser alteradas pelo administrador.'
      )
    ) {
      return;
    }

    // Módulos em que o Estágio já lançou e que ficariam sem estágio: os lançamentos são apagados
    const permitidos = new Set<number>(temEstagio ? modulosComEstagio(validasDisc) : []);
    const perdidos = Array.from(
      new Set<number>(
        registros.filter((r) => r.setor === 'Estágio' && !permitidos.has(r.modulo)).map((r) => r.modulo)
      )
    ).sort((a, b) => a - b);
    if (
      perdidos.length > 0 &&
      !window.confirm(
        `O setor Estágio já preencheu o(s) módulo(s) ${perdidos.map((m) => `M${m}`).join(', ')}, que ficarão sem estágio. ` +
          'Esses lançamentos do Estágio serão removidos e o custo será recalculado. Deseja continuar?'
      )
    ) {
      return;
    }

    try {
      const cursoAtualizado = saveEstagio(curso.nome_curso, curso.grau, Boolean(temEstagio), validas);
      onSaved(cursoAtualizado, temEstagio ? validasDisc : []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="card-unicive p-4 border-l-4 border-l-amber-400 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-[#239371] text-white flex items-center justify-center">
            <Briefcase className="w-4 h-4" />
          </span>
          <div className="leading-tight">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">Disciplinas de estágio da matriz</h3>
            <span className="text-[11px] text-slate-500">
              Etapa final do Pedagógico &bull; disciplinas de estágio e matriz curricular
            </span>
          </div>
        </div>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-unicive-outline text-[11px] py-1.5 px-2.5">
            <X className="w-3 h-3 mr-1.5" />
            Voltar aos módulos
          </button>
        )}
      </div>

      {travado && (
        <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
          <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Concluído. A matriz e as disciplinas de estágio só podem ser alteradas pelo administrador.
          </span>
        </div>
      )}

      {/* Tem estágio? */}
      <div>
        <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
          O curso tem estágio?
        </span>
        <div className="grid grid-cols-2 gap-2 max-w-sm">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              id={`btn-tem-estagio-${v ? 'sim' : 'nao'}`}
              disabled={travado}
              onClick={() => {
                setTemEstagio(v);
                setErro(null);
              }}
              className={`py-2 rounded-lg text-sm font-bold border transition-all ${
                travado ? 'cursor-not-allowed' : 'cursor-pointer'
              } ${
                temEstagio === v
                  ? 'bg-[#239371] text-white border-[#239371] shadow-xs'
                  : travado
                  ? 'bg-slate-50 text-slate-400 border-slate-200'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {v ? 'Sim' : 'Não'}
            </button>
          ))}
        </div>
        {temEstagio === false && (
          <p className="mt-2 text-[11px] text-slate-500">
            Curso sem estágio: o setor Estágio fica concluído automaticamente, sem custo.
          </p>
        )}
      </div>

      {/* Lista de disciplinas */}
      {temEstagio && (
        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-[1fr_7rem_7rem_2rem] gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1">
            <span>Disciplina</span>
            <span>Módulo</span>
            <span>Carga horária</span>
            <span />
          </div>
          {linhas.map((l, i) => (
            <div key={l.key} className="grid grid-cols-1 sm:grid-cols-[1fr_7rem_7rem_2rem] gap-2 items-center">
              <input
                type="text"
                disabled={travado}
                aria-label={`Nome da disciplina ${i + 1}`}
                value={l.nome}
                onChange={(e) => atualizar(l.key, 'nome', e.target.value)}
                placeholder="Nome da disciplina de estágio"
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#239371]"
              />
              <select
                disabled={travado}
                aria-label={`Módulo da disciplina ${i + 1}`}
                value={l.modulo}
                onChange={(e) => atualizar(l.key, 'modulo', e.target.value)}
                className="px-2 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#239371] cursor-pointer"
              >
                <option value="">Módulo</option>
                {modulos.map((m) => (
                  <option key={m} value={m}>
                    Módulo {m}
                  </option>
                ))}
              </select>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  disabled={travado}
                  aria-label={`Carga horária da disciplina ${i + 1}`}
                  value={l.ch}
                  onChange={(e) => atualizar(l.key, 'ch', e.target.value)}
                  placeholder="0"
                  className="w-full pl-3 pr-7 py-2 rounded-lg border border-slate-300 text-sm tabular focus:outline-none focus:ring-2 focus:ring-[#239371]"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">h</span>
              </div>
              {!travado && (
              <button
                type="button"
                title="Remover disciplina"
                onClick={() => setLinhas((ls) => ls.filter((x) => x.key !== l.key))}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer justify-self-start"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              )}
            </div>
          ))}
          {!travado && (
          <button
            type="button"
            id="btn-adicionar-disciplina-estagio"
            onClick={() => setLinhas((ls) => [...ls, novaLinha()])}
            className="btn-unicive-outline text-xs py-1.5 px-3"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Adicionar disciplina
          </button>
          )}

          {/* Totais */}
          {totais.modulos.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                  <tr>
                    <th className="py-1.5 px-3 text-left">Módulo</th>
                    <th className="py-1.5 px-2 text-left">Disciplinas</th>
                    <th className="py-1.5 px-3 text-right">Carga horária de estágio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {totais.modulos.map((m) => {
                    const t = totais.porModulo.get(m)!;
                    return (
                      <tr key={m}>
                        <td className="py-1 px-3 font-bold text-slate-800">M{m}</td>
                        <td className="py-1 px-2 tabular text-slate-700">{t.qtd}</td>
                        <td className="py-1 px-3 text-right font-bold tabular text-slate-900">{t.ch} h</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-[#ebf7f2]">
                    <td className="py-1.5 px-3 font-bold text-[#117d5d]" colSpan={2}>
                      Total do curso &bull; {totais.modulos.length} módulo(s) com estágio
                    </td>
                    <td className="py-1.5 px-3 text-right font-bold tabular text-[#117d5d]">{totais.totalCh} h</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Matriz curricular (obrigatória para concluir o Pedagógico) */}
      <div className="pt-3 border-t border-slate-100">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
          <FileText className="w-3.5 h-3.5 text-[#239371]" />
          Matriz curricular do curso
        </span>
        <MatrizCurricular
          curso={curso}
          matriz={matriz}
          podeEnviar={podeEnviarMatriz}
          onEnviada={(m) => {
            setMatriz(m);
            setErro(null);
            onMatrizEnviada?.(m);
          }}
        />
      </div>

      {erro && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {!travado && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 pt-3 border-t border-slate-100">
          {!matriz && (
            <span className="text-[11px] text-slate-500 sm:mr-auto">
              Envie a matriz curricular para concluir.
            </span>
          )}
          <button
            type="button"
            id="btn-salvar-estagio"
            onClick={handleSalvar}
            disabled={!matriz}
            className={`text-sm px-4 py-2 font-bold rounded-lg inline-flex items-center justify-center gap-2 ${
              matriz
                ? 'btn-unicive-primary cursor-pointer'
                : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            {edicao ? 'Salvar disciplinas de estágio' : 'Salvar e Concluir Pedagógico'}
          </button>
        </div>
      )}
    </div>
  );
};
