import { createClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && (import.meta as any)?.env) || {};

export const supabaseUrl = env.VITE_SUPABASE_URL || 'https://ebixhddonbiqtrsyvdry.supabase.co';
export const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Fgi4B-Ad1liJpTku0WD8DA_2eb5OXsC';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
