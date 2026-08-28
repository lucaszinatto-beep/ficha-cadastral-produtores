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

export async function createProdutor(payload: {
  nome: string;
  municipio?: string | null;
  codigo_avicultor?: string | null;
  telefone?: string | null;
  email?: string | null;
  aviariosIniciais?: Array<{ numero: string; tecnico_id?: string | null }>;
}): Promise<Produtor> {
  const { data: produtor, error: prodError } = await supabase
    .from('produtores')
    .insert([{
      nome: payload.nome.trim(),
      municipio: payload.municipio?.trim() || null,
      codigo_avicultor: payload.codigo_avicultor?.trim() || null,
      telefone: payload.telefone?.trim() || null,
      email: payload.email?.trim() || null,
      status: 'Ativo'
    }])
    .select('*')
    .single();

  if (prodError) throw prodError;

  // Se houver aviários iniciais para cadastrar junto com o produtor
  if (payload.aviariosIniciais && payload.aviariosIniciais.length > 0) {
    const aviariosRows = payload.aviariosIniciais.map(a => ({
      produtor_id: produtor.id,
      numero_instalacao: a.numero.trim(),
      tecnico_id: a.tecnico_id || null,
      status: 'Ativo'
    }));

    const { error: avError } = await supabase
      .from('cadastro_aviarios')
      .insert(aviariosRows);

    if (avError) console.error('Erro ao cadastrar aviários iniciais:', avError);
  }

  return produtor as Produtor;
}

export async function updateProdutor(
  id: string,
  payload: {
    nome?: string;
    municipio?: string | null;
    codigo_avicultor?: string | null;
    telefone?: string | null;
    email?: string | null;
    status?: string;
  }
): Promise<Produtor> {
  const cleanPayload: Record<string, any> = {
    updated_at: new Date().toISOString()
  };

  if (payload.nome !== undefined) cleanPayload.nome = payload.nome.trim();
  if (payload.municipio !== undefined) cleanPayload.municipio = payload.municipio?.trim() || null;
  if (payload.codigo_avicultor !== undefined) cleanPayload.codigo_avicultor = payload.codigo_avicultor?.trim() || null;
  if (payload.telefone !== undefined) cleanPayload.telefone = payload.telefone?.trim() || null;
  if (payload.email !== undefined) cleanPayload.email = payload.email?.trim() || null;
  if (payload.status !== undefined) cleanPayload.status = payload.status;

  const { data, error } = await supabase
    .from('produtores')
    .update(cleanPayload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as Produtor;
}

export async function deleteProdutor(id: string): Promise<void> {
  const { error } = await supabase
    .from('produtores')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function deleteAviario(id: string): Promise<void> {
  const { error } = await supabase
    .from('cadastro_aviarios')
    .delete()
    .eq('id', id);

  if (error) throw error;
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

export async function createTecnico(payload: {
  nome: string;
  unidade?: string | null;
  telefone?: string | null;
  email?: string | null;
}): Promise<Tecnico> {
  const { data, error } = await supabase
    .from('tecnicos')
    .insert([{
      nome: payload.nome.trim(),
      unidade: payload.unidade?.trim() || 'Bello Alimentos',
      telefone: payload.telefone?.trim() || null,
      email: payload.email?.trim() || null,
      status: 'Ativo'
    }])
    .select('*')
    .single();

  if (error) throw error;
  return data as Tecnico;
}

export async function updateTecnico(
  id: string,
  payload: {
    nome?: string;
    unidade?: string | null;
    telefone?: string | null;
    email?: string | null;
    status?: string;
  }
): Promise<Tecnico> {
  const cleanPayload: Record<string, any> = {
    updated_at: new Date().toISOString()
  };

  if (payload.nome !== undefined) cleanPayload.nome = payload.nome.trim();
  if (payload.unidade !== undefined) cleanPayload.unidade = payload.unidade?.trim() || null;
  if (payload.telefone !== undefined) cleanPayload.telefone = payload.telefone?.trim() || null;
  if (payload.email !== undefined) cleanPayload.email = payload.email?.trim() || null;
  if (payload.status !== undefined) cleanPayload.status = payload.status;

  const { data, error } = await supabase
    .from('tecnicos')
    .update(cleanPayload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as Tecnico;
}

export async function deleteTecnico(id: string): Promise<void> {
  // Desvincula os aviários vinculados a este técnico antes de excluir
  await supabase
    .from('cadastro_aviarios')
    .update({ tecnico_id: null, updated_at: new Date().toISOString() })
    .eq('tecnico_id', id);

  const { error } = await supabase
    .from('tecnicos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
