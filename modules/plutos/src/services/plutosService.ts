import { supabase } from './supabaseClient';
import { CursoMestre, PlutosInput, PlutosResultado } from '../types';

export async function fetchCursosComCusto(): Promise<CursoMestre[]> {
  const { data, error } = await supabase
    .from('hermes_cursos')
    .select('id, nome_curso, grau, duracao_curso, custo_total_curso, dados_parciais')
    .order('nome_curso');

  if (error) throw new Error(`Falha ao carregar cursos: ${error.message}`);
  return data || [];
}

export async function fetchInputsPorCurso(cursoId: string): Promise<PlutosInput | null> {
  const { data, error } = await supabase
    .from('plutos_inputs_curso')
    .select('*')
    .eq('curso_id', cursoId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Falha ao carregar inputs: ${error.message}`);
  }

  return data;
}

export async function upsertInputs(
  cursoId: string,
  quantidadeDisciplinas: number,
  ticketMedio: number
): Promise<PlutosResultado> {
  const { data, error } = await supabase
    .from('plutos_inputs_curso')
    .upsert(
      {
        curso_id: cursoId,
        quantidade_disciplinas: quantidadeDisciplinas,
        ticket_medio: ticketMedio,
      },
      { onConflict: 'curso_id' }
    )
    .select('curso_id, ponto_equilibrio, investimento_disciplinas, dados_hermes_parciais')
    .single();

  if (error) throw new Error(`Falha ao salvar inputs: ${error.message}`);

  return {
    curso_id: data.curso_id,
    ponto_equilibrio: data.ponto_equilibrio,
    investimento_disciplinas: data.investimento_disciplinas,
    dados_hermes_parciais: data.dados_hermes_parciais,
  };
}

export function subscribeToInputs(
  cursoId: string,
  callback: (data: PlutosResultado) => void
): () => void {
  const subscription = supabase
    .from(`plutos_inputs_curso:curso_id=eq.${cursoId}`)
    .on('*', (payload) => {
      if (payload.new) {
        callback({
          curso_id: payload.new.curso_id,
          ponto_equilibrio: payload.new.ponto_equilibrio,
          investimento_disciplinas: payload.new.investimento_disciplinas,
          dados_hermes_parciais: payload.new.dados_hermes_parciais,
        });
      }
    })
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}
