import { supabase } from './supabase';
import { Produtor, Tecnico, Aviario, SetupAviario } from '../types/database';

export async function validateSupabaseConnection(): Promise<{
  isValid: boolean;
  error?: string;
  counts?: { produtores: number; aviarios: number; tecnicos: number };
}> {
  try {
    const { count: prodCount, error: prodErr } = await supabase
      .from('produtores')
      .select('*', { count: 'exact', head: true });

    if (prodErr) {
      return { isValid: false, error: `Erro ao acessar tabela 'produtores': ${prodErr.message}` };
    }

    const { count: avCount, error: avErr } = await supabase
      .from('cadastro_aviarios')
      .select('*', { count: 'exact', head: true });

    if (avErr) {
      return { isValid: false, error: `Erro ao acessar tabela 'cadastro_aviarios': ${avErr.message}` };
    }

    const { count: tecCount, error: tecErr } = await supabase
      .from('tecnicos')
      .select('*', { count: 'exact', head: true });

    if (tecErr) {
      return { isValid: false, error: `Erro ao acessar tabela 'tecnicos': ${tecErr.message}` };
    }

    return {
      isValid: true,
      counts: {
        produtores: prodCount || 0,
        aviarios: avCount || 0,
        tecnicos: tecCount || 0
      }
    };
  } catch (err: any) {
    return { isValid: false, error: err?.message || 'Falha ao conectar no Supabase' };
  }
}

export async function fetchProdutores(): Promise<Produtor[]> {
  const { data, error } = await supabase
    .from('produtores')
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao buscar produtores:', error);
    throw error;
  }
  return data || [];
}

export async function fetchTecnicos(): Promise<Tecnico[]> {
  const { data, error } = await supabase
    .from('tecnicos')
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao buscar técnicos:', error);
    throw error;
  }
  return data || [];
}

export async function fetchAviarios(): Promise<Aviario[]> {
  const { data, error } = await supabase
    .from('cadastro_aviarios')
    .select(`
      *,
      produtor:produtores(*),
      tecnico:tecnicos(*),
      setup:setups_aviarios(*)
    `)
    .order('numero_instalacao', { ascending: true });

  if (error) {
    console.error('Erro ao buscar aviários:', error);
    throw error;
  }
  return (data || []) as Aviario[];
}

export async function fetchAviariosByProdutor(produtorId: string): Promise<Aviario[]> {
  const { data, error } = await supabase
    .from('cadastro_aviarios')
    .select(`
      *,
      produtor:produtores(*),
      tecnico:tecnicos(*),
      setup:setups_aviarios(*)
    `)
    .eq('produtor_id', produtorId)
    .order('numero_instalacao', { ascending: true });

  if (error) {
    console.error('Erro ao buscar aviários por produtor:', error);
    throw error;
  }
  return (data || []) as Aviario[];
}

export async function saveSetupData(aviarioId: string, payload: Partial<SetupAviario>): Promise<SetupAviario> {
  const { data: existing } = await supabase
    .from('setups_aviarios')
    .select('id')
    .eq('aviario_id', aviarioId)
    .maybeSingle();

  const cleanPayload = {
    ...payload,
    aviario_id: aviarioId,
    updated_at: new Date().toISOString()
  };

  if (existing) {
    const { data, error } = await supabase
      .from('setups_aviarios')
      .update(cleanPayload)
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('setups_aviarios')
      .insert([cleanPayload])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }
}

export async function updateAviarioTecnico(aviarioId: string, tecnicoId: string | null): Promise<void> {
  const { error } = await supabase
    .from('cadastro_aviarios')
    .update({
      tecnico_id: tecnicoId,
      updated_at: new Date().toISOString()
    })
    .eq('id', aviarioId);

  if (error) throw error;
}

export async function createProdutor(nome: string, municipio?: string): Promise<Produtor> {
  const { data, error } = await supabase
    .from('produtores')
    .insert([{ nome: nome.trim(), municipio: municipio?.trim() || null }])
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function createAviario(produtorId: string, numeroInstalacao: string, tecnicoId?: string | null): Promise<Aviario> {
  const { data, error } = await supabase
    .from('cadastro_aviarios')
    .insert([{
      produtor_id: produtorId,
      numero_instalacao: numeroInstalacao.trim(),
      tecnico_id: tecnicoId || null
    }])
    .select(`
      *,
      produtor:produtores(*),
      tecnico:tecnicos(*),
      setup:setups_aviarios(*)
    `)
    .single();

  if (error) throw error;
  return data as Aviario;
}
