import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://evzmmdteliaupztfqepl.supabase.co';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_OooYawrnpBv0JRjkWxMHxQ_4K2m6T__';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
