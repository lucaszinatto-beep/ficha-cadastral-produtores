import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ebixhddonbiqtrsyvdry.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Fgi4B-Ad1liJpTku0WD8DA_2eb5OXsC';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
