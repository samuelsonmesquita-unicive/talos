import React, { useEffect, useState } from 'react';
import {
  CursoMestre,
  RegistroItem,
  CargaHoraria,
  Setor,
} from '../types';
import {
  getAllCourses,
  getRegistrosForCourse,
  saveOrUpdateRegistro,
  deleteCourse,
  deleteSingleRegistro,
} from '../services/courseStore';
import { formatCurrency, buscar_salario, buscar_salario_base } from '../utils/salary';
import {
  Edit3,
  AlertTriangle,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Save,
  Lock,
  Search,
  Trash2,
  ShieldAlert,
  KeyRound,
} from 'lucide-react';

interface ConsultRecordsViewProps {
  initialCourse?: CursoMestre | null;
  onSelectCourseForFlow?: (curso: CursoMestre, setor: Setor, retomada: boolean) => void;
  onGoToReport?: (curso: CursoMestre) => void;
  onDataChanged?: () => void;
}

// Senha de privilégio para confirmação de exclusão
const ADMIN_PASSWORD_REQUIRED = 'Novosnegocios@123';

export const ConsultRecordsView: React.FC<ConsultRecordsViewProps> = ({
  initialCourse,
  onSelectCourseForFlow,
  onGoToReport,
  onDataChanged,
}) => {
  const [courses, setCourses] = useState<CursoMestre[]>(() => getAllCourses());
  const [selectedCourseKey, setSelectedCourseKey] = useState<string>(
    initialCourse ? initialCourse.id : (courses[0]?.id || '')
  );

  useEffect(() => {
    const fresh = getAllCourses();
    setCourses(fresh);
    if (initialCourse) {
      setSelectedCourseKey(initialCourse.id);
      setRegistros(getRegistrosForCourse(initialCourse.nome_curso, initialCourse.grau));
    } else if (fresh.length > 0 && !fresh.some((c) => c.id === selectedCourseKey)) {
      setSelectedCourseKey(fresh[0].id);
      setRegistros(getRegistrosForCourse(fresh[0].nome_curso, fresh[0].grau));
    }
  }, [initialCourse]);

  const activeCourse = courses.find((c) => c.id === selectedCourseKey) || courses[0];

  // Registros do curso selecionado (Seção 5)
  const [registros, setRegistros] = useState<RegistroItem[]>(() =>
    activeCourse
      ? getRegistrosForCourse(activeCourse.nome_curso, activeCourse.grau)
      : []
  );

  const handleSelectCourse = (key: string) => {
    setSelectedCourseKey(key);
    const course = courses.find((c) => c.id === key);
    if (course) {
      setRegistros(getRegistrosForCourse(course.nome_curso, course.grau));
    }
    setRecordBeingEdited(null);
    setConfirmEditRecord(null);
    setIsDeleteCourseModalOpen(false);
    setRecordToDelete(null);
  };

  // Seção 6: Alerta "Tem certeza?" para Edição
  const [confirmEditRecord, setConfirmEditRecord] = useState<RegistroItem | null>(null);

  // Seção 6.1: Fluxo de edição
  const [recordBeingEdited, setRecordBeingEdited] = useState<RegistroItem | null>(null);
  const [editQtd, setEditQtd] = useState<string>('1');
  const [editCarga, setEditCarga] = useState<CargaHoraria>('20h');
  const [editError, setEditError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Estados para EXCLUIR O CURSO INTEIRO (com senha)
  const [isDeleteCourseModalOpen, setIsDeleteCourseModalOpen] = useState(false);
  const [deleteCoursePasswordInput, setDeleteCoursePasswordInput] = useState('');
  const [deleteCourseError, setDeleteCourseError] = useState<string | null>(null);

  // Estados para APAGAR REGISTRO INDIVIDUAL (com senha)
  const [recordToDelete, setRecordToDelete] = useState<RegistroItem | null>(null);
  const [singleDeletePassword, setSingleDeletePassword] = useState('');
  const [singleDeleteError, setSingleDeleteError] = useState<string | null>(null);

  const handleClickEditar = (reg: RegistroItem) => {
    setSuccessNotice(null);
    setConfirmEditRecord(reg);
  };

  const handleConfirmEditSim = () => {
    if (!confirmEditRecord) return;
    setRecordBeingEdited(confirmEditRecord);
    setEditQtd(confirmEditRecord.quantidade.toString());
    setEditCarga(confirmEditRecord.carga_horaria);
    setEditError(null);
    setConfirmEditRecord(null);
  };

  const handleConfirmEditNao = () => {
    setConfirmEditRecord(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (!recordBeingEdited || !activeCourse) return;

    const num = Number(editQtd);
    if (!Number.isInteger(num) || num < 0 || num > 10) {
      setEditError('Quantidade deve ser um número inteiro entre 0 e 10');
      return;
    }

    const { registro: atualizado } = saveOrUpdateRegistro(
      recordBeingEdited.nome_curso,
      recordBeingEdited.grau,
      recordBeingEdited.setor,
      recordBeingEdited.modulo,
      recordBeingEdited.cargo,
      num,
      editCarga
    );

    const updatedList = getRegistrosForCourse(activeCourse.nome_curso, activeCourse.grau);
    setRegistros(updatedList);
    setRecordBeingEdited(null);

    setSuccessNotice(
      `Registro #${atualizado.indice} atualizado com sucesso. Recálculo em cascata concluído na nuvem.`
    );
    if (onDataChanged) onDataChanged();
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Executar exclusão do CURSO INTEIRO e de todos os seus registros
  const handleExecuteDeleteCourse = (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteCourseError(null);

    if (!activeCourse) return;

    if (deleteCoursePasswordInput !== ADMIN_PASSWORD_REQUIRED) {
      setDeleteCourseError('Senha de privilégio incorreta. Operação cancelada por segurança.');
      return;
    }

    const cursoNome = activeCourse.nome_curso;
    const cursoGrau = activeCourse.grau;

    deleteCourse(cursoNome, cursoGrau);

    const updatedCourses = getAllCourses();
    setCourses(updatedCourses);

    if (updatedCourses.length > 0) {
      const nextCourse = updatedCourses[0];
      setSelectedCourseKey(nextCourse.id);
      setRegistros(getRegistrosForCourse(nextCourse.nome_curso, nextCourse.grau));
    } else {
      setSelectedCourseKey('');
      setRegistros([]);
    }

    setIsDeleteCourseModalOpen(false);
    setDeleteCoursePasswordInput('');

    setSuccessNotice(
      `O curso "${cursoNome} (${cursoGrau})" e todos os seus registros foram excluídos com sucesso do sistema e da nuvem Firestore!`
    );
    if (onDataChanged) onDataChanged();
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  // Executar exclusão de um registro individual
  const handleExecuteDeleteSingle = (e: React.FormEvent) => {
    e.preventDefault();
    setSingleDeleteError(null);

    if (!activeCourse || !recordToDelete) return;

    if (singleDeletePassword !== ADMIN_PASSWORD_REQUIRED) {
      setSingleDeleteError('Senha de privilégio incorreta. Operação cancelada.');
      return;
    }

    deleteSingleRegistro(activeCourse.nome_curso, activeCourse.grau, recordToDelete.id);
    const updatedList = getRegistrosForCourse(activeCourse.nome_curso, activeCourse.grau);
    setRegistros(updatedList);

    setSuccessNotice(
      `Registro #${recordToDelete.indice} (${recordToDelete.setor} - ${recordToDelete.modulo}º mód.) foi excluído com sucesso e o curso recalculado.`
    );
    setRecordToDelete(null);
    setSingleDeletePassword('');
    if (onDataChanged) onDataChanged();
    setTimeout(() => setSuccessNotice(null), 4500);
  };

  if (courses.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="card-unicive p-8 border border-slate-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Nenhum curso cadastrado</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Todos os cursos foram excluídos ou ainda não foram cadastrados. Você pode criar um novo curso acessando a aba &quot;Cadastro&quot;.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Header com Seletor Unicive */}
      <div className="card-unicive p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#ebf7f2] text-[#239371] font-bold text-sm flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Registros de Demandas por Curso
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visualização, edição e gestão de registros centralizados na nuvem Firestore.
          </p>
        </div>

        {/* Seletor de Curso */}
        <div className="w-full md:w-80">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Selecionar Curso:
          </label>
          <select
            value={selectedCourseKey}
            onChange={(e) => handleSelectCourse(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#239371] cursor-pointer shadow-2xs"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome_curso} ({c.grau} &bull; {c.duracao_curso} anos)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alerta de sucesso */}
      {successNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-[#117d5d] text-xs font-semibold rounded-xl flex items-center gap-2 shadow-2xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#239371] shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* MODAL 1: Confirmação "Tem certeza?" para Edição */}
      {confirmEditRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                Tem certeza?
              </h3>
              <p className="text-xs text-slate-600 mt-2">
                Deseja abrir para edição o registro <strong>#{confirmEditRecord.indice}</strong> (
                {confirmEditRecord.setor} &bull; {confirmEditRecord.modulo}º mód. &bull; {confirmEditRecord.cargo})?
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                id="btn-confirmar-edicao-sim"
                onClick={handleConfirmEditSim}
                className="btn-unicive-primary flex-1 text-xs"
              >
                Sim
              </button>
              <button
                id="btn-confirmar-edicao-nao"
                onClick={handleConfirmEditNao}
                className="btn-unicive-outline flex-1 text-xs"
              >
                Não
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edição do Registro (Seção 6.1) */}
      {recordBeingEdited && activeCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 bg-[#239371] text-white rounded-md font-bold text-xs flex items-center justify-center">
                  #{recordBeingEdited.indice}
                </span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Editar Registro #{recordBeingEdited.indice}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {recordBeingEdited.setor} &bull; {recordBeingEdited.modulo}º Módulo &bull; {recordBeingEdited.cargo}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setRecordBeingEdited(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bloqueios obrigatórios da chave */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold uppercase text-[11px] text-slate-700">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Campos bloqueados (Chave Primária):</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1">
                <div>
                  Curso: <strong className="text-slate-900 block">{recordBeingEdited.nome_curso}</strong>
                </div>
                <div>
                  Grau: <strong className="text-slate-900 block">{recordBeingEdited.grau}</strong>
                </div>
                <div>
                  Módulo: <strong className="text-slate-900 block">{recordBeingEdited.modulo}º</strong>
                </div>
              </div>
            </div>

            {/* Campos Editáveis */}
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Quantidade (0 a 10)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  required
                  value={editQtd}
                  onChange={(e) => setEditQtd(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 font-bold tabular"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Carga Horária Semanal
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['10h', '20h', '40h'] as CargaHoraria[]).map((ch) => (
                    <button
                      type="button"
                      key={ch}
                      onClick={() => setEditCarga(ch)}
                      className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        editCarga === ch
                          ? 'bg-[#239371] text-white border-[#239371] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              {editError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-700">
                  {editError}
                </div>
              )}

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex justify-between items-center">
                <div>
                  <span className="text-emerald-900 block font-bold text-[11px] uppercase">
                    Novo Custo Semestral (com encargos +***%):
                  </span>
                  <span className="text-[11px] text-slate-600">
                    {editQtd} &times; {formatCurrency(buscar_salario(editCarga, recordBeingEdited.cargo))} &times; 6
                  </span>
                  <span className="block text-[10px] text-emerald-700">
                    Base: {formatCurrency(buscar_salario_base(editCarga, recordBeingEdited.cargo))} + 13º/Férias/1/3 + INSS ***% + Adicionais ***%
                  </span>
                </div>
                <span className="font-bold text-base text-[#117d5d] tabular">
                  {formatCurrency((Number(editQtd) || 0) * buscar_salario(editCarga, recordBeingEdited.cargo) * 3)}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRecordBeingEdited(null)}
                  className="btn-unicive-outline text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-salvar-edicao"
                  className="btn-unicive-primary text-xs"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EXCLUIR O CURSO INTEIRO COM SENHA */}
      {isDeleteCourseModalOpen && activeCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65">
          <div className="bg-white rounded-2xl border border-red-200 max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Excluir Curso Inteiro
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Exclusão permanente do curso e de todos os seus registros
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-red-50/80 border border-red-200 rounded-xl text-xs text-red-900 space-y-1.5">
              <p>
                Você está prestes a excluir <strong>permanentemente o curso inteiro</strong>:
              </p>
              <p className="font-bold text-slate-950 bg-white/80 p-2 rounded border border-red-200">
                {activeCourse.nome_curso} ({activeCourse.grau})
              </p>
              <p className="text-[11px] text-red-700">
                Esta ação apagará <strong>o curso por completo</strong> e todos os seus <strong>{registros.length} registros</strong> (Pedagógico e Estágio) tanto da aplicação quanto da nuvem Firestore. Não será possível recuperá-lo.
              </p>
            </div>

            {deleteCourseError && (
              <div className="p-3 bg-red-100/80 border border-red-300 text-red-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{deleteCourseError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteDeleteCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Digite a Senha de Privilégio para Confirmar:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    autoFocus
                    value={deleteCoursePasswordInput}
                    onChange={(e) => setDeleteCoursePasswordInput(e.target.value)}
                    placeholder="Digite a senha institucional"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteCourseModalOpen(false);
                    setDeleteCoursePasswordInput('');
                    setDeleteCourseError(null);
                  }}
                  className="btn-unicive-outline text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-confirmar-excluir-curso"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Confirmar e Excluir Curso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: EXCLUIR REGISTRO INDIVIDUAL COM SENHA */}
      {recordToDelete && activeCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65">
          <div className="bg-white rounded-2xl border border-red-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mx-auto text-red-600">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-900">
                Excluir Registro #{recordToDelete.indice}?
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                {recordToDelete.setor} &bull; {recordToDelete.modulo}º Módulo &bull; {recordToDelete.cargo} ({recordToDelete.carga_horaria})
              </p>
            </div>

            {singleDeleteError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
                {singleDeleteError}
              </div>
            )}

            <form onSubmit={handleExecuteDeleteSingle} className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Senha de privilégio:
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={singleDeletePassword}
                  onChange={(e) => setSingleDeletePassword(e.target.value)}
                  placeholder="Digite a senha institucional"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRecordToDelete(null);
                    setSingleDeletePassword('');
                    setSingleDeleteError(null);
                  }}
                  className="btn-unicive-outline flex-1 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex-1 cursor-pointer transition-colors"
                >
                  Excluir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabela de Registros Estilo Unicive */}
      <div className="card-unicive overflow-hidden border border-slate-200 shadow-sm">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              CURSO SELECIONADO
            </span>
            <h3 className="font-bold text-base text-slate-900">
              {activeCourse ? `${activeCourse.nome_curso} — ${activeCourse.grau}` : 'Nenhum curso'}
            </h3>
          </div>

          {activeCourse && (
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-700">
                {registros.length} registros
              </span>

              {/* BOTÃO PARA EXCLUIR O CURSO INTEIRO */}
              <button
                id="btn-excluir-curso-inteiro"
                onClick={() => {
                  setDeleteCourseError(null);
                  setDeleteCoursePasswordInput('');
                  setIsDeleteCourseModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg border border-red-200 transition-colors cursor-pointer text-xs"
                title="Excluir o curso inteiro e todos os seus registros do sistema e da nuvem com proteção de senha"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                <span>Excluir Curso</span>
              </button>

              {onGoToReport && (
                <button
                  onClick={() => onGoToReport(activeCourse)}
                  className="text-xs font-bold text-[#239371] hover:underline"
                >
                  Ver Relatório &rarr;
                </button>
              )}
            </div>
          )}
        </div>

        {registros.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm space-y-3">
            <p>Nenhum registro cadastrado para este curso no momento.</p>
            {onSelectCourseForFlow && activeCourse && (
              <button
                onClick={() => onSelectCourseForFlow(activeCourse, 'Pedagógico', false)}
                className="btn-unicive-primary text-xs mx-auto"
              >
                Cadastrar Demandas Agora
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0d281e] text-white font-bold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4"># Índice</th>
                  <th className="py-3 px-4">Setor</th>
                  <th className="py-3 px-4">Módulo</th>
                  <th className="py-3 px-4">Cargo</th>
                  <th className="py-3 px-4 text-center">Qtd</th>
                  <th className="py-3 px-4">Carga</th>
                  <th className="py-3 px-4">Salário Base</th>
                  <th className="py-3 px-4 text-right">Custo Semestral</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {registros.map((reg) => (
                  <tr
                    key={reg.id}
                    className="hover:bg-emerald-50/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-slate-900">
                      #{reg.indice}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {reg.setor}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {reg.modulo}º Módulo
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">
                        {reg.cargo}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                      {reg.quantidade}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#239371]">
                      {reg.carga_horaria}
                    </td>
                    <td className="py-3 px-4 text-slate-600 tabular">
                      {formatCurrency(reg.salario)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 tabular">
                      {formatCurrency(reg.custo)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleClickEditar(reg)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#239371] hover:text-[#117d5d] bg-[#ebf7f2] hover:bg-[#d8f0e5] px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                          title="Editar quantidade ou carga horária"
                        >
                          <Edit3 className="w-3 h-3" />
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            setSingleDeleteError(null);
                            setSingleDeletePassword('');
                            setRecordToDelete(reg);
                          }}
                          className="inline-flex items-center p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          title="Excluir este registro individualmente com senha"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
