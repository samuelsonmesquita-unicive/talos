import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { CursoMestre, RegistroItem, SalaryConfig } from '../types';
import { DEFAULT_SALARY_CONFIG } from '../utils/salary';

// Coleções Firestore
const COURSES_COLLECTION = 'cursos_unicive';
const REGISTROS_COLLECTION = 'registros_demandas_unicive';
const CONFIG_COLLECTION = 'configuracoes_unicive';
const SALARY_DOC_ID = 'tabela_salarial';

/**
 * Salva ou atualiza um curso no Firestore
 */
export async function syncCourseToCloud(curso: CursoMestre): Promise<void> {
  try {
    const docRef = doc(db, COURSES_COLLECTION, curso.id);
    await setDoc(docRef, curso, { merge: true });
  } catch (error) {
    console.error('Erro ao sincronizar curso com a nuvem:', error);
  }
}

/**
 * Remove um curso e seus registros do Firestore
 */
export async function deleteCourseFromCloud(cursoId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COURSES_COLLECTION, cursoId));
    // Remove registros associados
    const regsSnap = await getDocs(collection(db, REGISTROS_COLLECTION));
    const batch = writeBatch(db);
    regsSnap.docs.forEach((d) => {
      const data = d.data() as Partial<RegistroItem>;
      const matchByNameAndGrau =
        data.nome_curso && data.grau
          ? `${data.nome_curso.trim().toLowerCase()}___${data.grau.trim().toLowerCase()}` === cursoId
          : false;

      if (d.id.startsWith(cursoId) || d.id.includes(cursoId) || matchByNameAndGrau) {
        batch.delete(d.ref);
      }
    });
    await batch.commit();
  } catch (error) {
    console.error('Erro ao excluir curso da nuvem:', error);
  }
}

/**
 * Limpa todos os registros de um curso específico na nuvem
 */
export async function clearCourseRecordsFromCloud(cursoId: string): Promise<void> {
  try {
    const regsSnap = await getDocs(collection(db, REGISTROS_COLLECTION));
    const batch = writeBatch(db);
    regsSnap.docs.forEach((d) => {
      if (d.id.startsWith(cursoId)) {
        batch.delete(d.ref);
      }
    });
    await batch.commit();
  } catch (error) {
    console.error('Erro ao limpar registros do curso na nuvem:', error);
  }
}

/**
 * Remove um único registro no Firestore
 */
export async function deleteSingleRegistroFromCloud(registroId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, REGISTROS_COLLECTION, registroId));
  } catch (error) {
    console.error('Erro ao excluir registro individual da nuvem:', error);
  }
}

/**
 * Salva ou atualiza um registro de demanda no Firestore
 */
export async function syncRegistroToCloud(registro: RegistroItem): Promise<void> {
  try {
    const docRef = doc(db, REGISTROS_COLLECTION, registro.id);
    await setDoc(docRef, registro, { merge: true });
  } catch (error) {
    console.error('Erro ao sincronizar registro com a nuvem:', error);
  }
}

/**
 * Salva lote de cursos e registros no Firestore (ex.: migração inicial ou recálculo)
 */
export async function syncAllToCloud(
  courses: CursoMestre[],
  registros: RegistroItem[]
): Promise<void> {
  try {
    const batch = writeBatch(db);
    courses.forEach((c) => {
      const docRef = doc(db, COURSES_COLLECTION, c.id);
      batch.set(docRef, c, { merge: true });
    });
    registros.forEach((r) => {
      const docRef = doc(db, REGISTROS_COLLECTION, r.id);
      batch.set(docRef, r, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    console.error('Erro na sincronização em lote com Firestore:', error);
  }
}

/**
 * Salva a tabela salarial na nuvem
 */
export async function saveSalaryConfigToCloud(config: SalaryConfig): Promise<void> {
  try {
    const docRef = doc(db, CONFIG_COLLECTION, SALARY_DOC_ID);
    await setDoc(docRef, { ...config, atualizado_em: new Date().toISOString() });
  } catch (error) {
    console.error('Erro ao salvar tabela salarial na nuvem:', error);
  }
}

/**
 * Carrega todos os cursos da nuvem
 */
export async function fetchCoursesFromCloud(): Promise<CursoMestre[]> {
  try {
    const snap = await getDocs(collection(db, COURSES_COLLECTION));
    return snap.docs.map((doc) => doc.data() as CursoMestre);
  } catch (error) {
    console.error('Erro ao buscar cursos da nuvem:', error);
    return [];
  }
}

/**
 * Carrega todos os registros da nuvem
 */
export async function fetchRegistrosFromCloud(): Promise<RegistroItem[]> {
  try {
    const snap = await getDocs(collection(db, REGISTROS_COLLECTION));
    return snap.docs.map((doc) => doc.data() as RegistroItem);
  } catch (error) {
    console.error('Erro ao buscar registros da nuvem:', error);
    return [];
  }
}

/**
 * Escuta atualizações de cursos em tempo real
 */
export function subscribeToCourses(callback: (courses: CursoMestre[]) => void): () => void {
  return onSnapshot(
    collection(db, COURSES_COLLECTION),
    (snap) => {
      const courses = snap.docs.map((d) => d.data() as CursoMestre);
      callback(courses);
    },
    (error) => {
      console.warn('Erro na sincronização em tempo real de cursos:', error);
    }
  );
}

/**
 * Escuta atualizações de registros em tempo real
 */
export function subscribeToRegistros(callback: (regs: RegistroItem[]) => void): () => void {
  return onSnapshot(
    collection(db, REGISTROS_COLLECTION),
    (snap) => {
      const regs = snap.docs.map((d) => d.data() as RegistroItem);
      callback(regs);
    },
    (error) => {
      console.warn('Erro na sincronização em tempo real de registros:', error);
    }
  );
}

/**
 * Escuta atualização da tabela salarial na nuvem
 */
export function subscribeToSalaryConfig(callback: (config: SalaryConfig) => void): () => void {
  return onSnapshot(
    doc(db, CONFIG_COLLECTION, SALARY_DOC_ID),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.Professor && data.Mediador) {
          callback({
            Professor: data.Professor,
            Mediador: data.Mediador,
          });
        }
      }
    },
    (error) => {
      console.warn('Erro na sincronização da tabela salarial:', error);
    }
  );
}
