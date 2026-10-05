import React, { useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, Download, FileText, Loader2, Lock, Upload } from 'lucide-react';
import { CursoMestre, MatrizCurso } from '../types';
import { uploadMatriz } from '../services/courseStore';
import { getMatrizDownloadUrl, MATRIZ_MAX_BYTES, tipoMatriz } from '../services/cloudSync';
import { useAuth } from '../hooks/useAuth';

/* Matriz curricular do curso: o Pedagógico envia no fim do seu fluxo (obrigatória para
   concluir). Toda a equipe baixa. Usuário comum envia/substitui enquanto a etapa não foi
   concluída; depois disso só o admin substitui (regra também no banco e no Storage). */

interface MatrizCurricularProps {
  curso: CursoMestre;
  matriz: MatrizCurso | null;
  /** Pode enviar/substituir agora (admin, ou usuário comum com a matriz destravada) */
  podeEnviar: boolean;
  onEnviada: (matriz: MatrizCurso) => void;
}

const formatarTamanho = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export const MatrizCurricular: React.FC<MatrizCurricularProps> = ({ curso, matriz, podeEnviar, onEnviada }) => {
  const { isAdmin } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleArquivo = async (file: File | undefined) => {
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    setErro(null);

    if (!tipoMatriz(file)) {
      setErro('A matriz deve ser um arquivo PDF ou Word (.docx).');
      return;
    }
    if (file.size > MATRIZ_MAX_BYTES) {
      setErro('A matriz deve ter no máximo 10 MB.');
      return;
    }
    if (
      !window.confirm(
        `${matriz ? 'Substituir a matriz atual por' : 'Enviar'} "${file.name}"?` +
          (isAdmin
            ? ''
            : '\n\nAtenção: depois de concluir o Pedagógico, a matriz só pode ser alterada pelo administrador.')
      )
    ) {
      return;
    }

    setEnviando(true);
    try {
      onEnviada(await uploadMatriz(curso, file));
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setEnviando(false);
    }
  };

  const handleBaixar = async () => {
    if (!matriz) return;
    setErro(null);
    setBaixando(true);
    try {
      window.open(await getMatrizDownloadUrl(matriz), '_blank', 'noopener');
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setBaixando(false);
    }
  };

  return (
    <div className="space-y-2">
      {matriz ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/60">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-[#239371] shrink-0" />
            <div className="min-w-0 leading-tight">
              <span className="block text-sm font-semibold text-slate-900 truncate">{matriz.nome_arquivo}</span>
              <span className="text-[11px] text-slate-500">
                {formatarTamanho(matriz.tamanho)} &bull; enviada em{' '}
                {new Date(matriz.enviado_em).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
          <button
            type="button"
            id="btn-baixar-matriz"
            onClick={handleBaixar}
            disabled={baixando}
            className="btn-unicive-outline text-[11px] py-1.5 px-2.5"
          >
            {baixando ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Download className="w-3 h-3 mr-1.5" />}
            Baixar
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">Nenhuma matriz enviada ainda.</p>
      )}

      {podeEnviar ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => handleArquivo(e.target.files?.[0])}
          />
          <button
            type="button"
            id={matriz ? 'btn-substituir-matriz' : 'btn-enviar-matriz'}
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
            className={`${matriz ? 'btn-unicive-outline' : 'btn-unicive-primary'} text-xs py-2 px-3`}
          >
            {enviando ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1.5" />}
            {enviando ? 'Enviando…' : matriz ? 'Substituir matriz' : 'Enviar matriz (PDF ou Word)'}
          </button>
          {!isAdmin && (
            <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-300 text-[11px] text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
              <span>
                <strong>Atenção:</strong> depois de concluir o Pedagógico, a matriz e as disciplinas de estágio só
                poderão ser alteradas pelo administrador. Confira o arquivo antes de concluir.
              </span>
            </div>
          )}
        </>
      ) : (
        matriz && (
          <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Matriz enviada e etapa concluída. Para substituir, fale com o administrador.</span>
          </div>
        )
      )}

      {erro && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{erro}</span>
        </div>
      )}
    </div>
  );
};
