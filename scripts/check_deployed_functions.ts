import * as fs from 'fs';

function getAccessToken(): string | null {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  if (fs.existsSync('C:/Projetos/projetos-teste/.env')) {
    const content = fs.readFileSync('C:/Projetos/projetos-teste/.env', 'utf8');
    const match = content.match(/SUPABASE_ACCESS_TOKEN=["']?([^"'\r\n]+)/);
    if (match) return match[1];
  }
  return null;
}

async function main() {
  const token = getAccessToken();
  if (!token) {
    console.error('SUPABASE_ACCESS_TOKEN não encontrado.');
    process.exit(1);
  }

  const projectRef = 'ebixhddonbiqtrsyvdry';
  console.log(`Consultando Edge Functions publicadas no projeto ${projectRef}...`);
  
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/functions`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    console.error(`Erro na API (${res.status}):`, await res.text());
    process.exit(1);
  }

  const functions = await res.json();
  console.log(`Total de Edge Functions encontradas: ${functions.length}`);
  for (const fn of functions) {
    console.log('----------------------------------------------------');
    console.log(`Nome:        ${fn.name} (slug: ${fn.slug})`);
    console.log(`ID:          ${fn.id}`);
    console.log(`Status:      ${fn.status}`);
    console.log(`Versão:      ${fn.version}`);
    console.log(`Criada em:   ${fn.created_at}`);
    console.log(`Atualizada:  ${fn.updated_at}`);
    console.log(`Verify JWT:  ${fn.verify_jwt}`);
  }
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
