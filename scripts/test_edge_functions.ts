import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ebixhddonbiqtrsyvdry.supabase.co';
const supabaseAnonKey = 'sb_publishable_Fgi4B-Ad1liJpTku0WD8DA_2eb5OXsC';

const client = createClient(supabaseUrl, supabaseAnonKey);

async function testFunctions() {
  console.log('Testing Edge Functions deployment:');
  try {
    const resReset = await client.functions.invoke('admin-reset-password', {
      body: { target_user_id: 'test' }
    });
    console.log('admin-reset-password response:', resReset);
  } catch (err: any) {
    console.log('admin-reset-password error:', err?.message);
  }

  try {
    const resDel = await client.functions.invoke('admin-delete-user', {
      body: { target_user_id: 'test' }
    });
    console.log('admin-delete-user response:', resDel);
  } catch (err: any) {
    console.log('admin-delete-user error:', err?.message);
  }

  try {
    const resCreate = await client.functions.invoke('admin-create-user', {
      body: { email: 'test' }
    });
    console.log('admin-create-user response:', resCreate);
  } catch (err: any) {
    console.log('admin-create-user error:', err?.message);
  }
}

testFunctions().catch(console.error);
