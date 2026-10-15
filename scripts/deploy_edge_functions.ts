import * as fs from 'fs';
import { execSync } from 'child_process';

function getAccessToken(): string | null {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  if (fs.existsSync('C:/Projetos/projetos-teste/.env')) {
    const content = fs.readFileSync('C:/Projetos/projetos-teste/.env', 'utf8');
    const match = content.match(/SUPABASE_ACCESS_TOKEN=["']?([^"'\r\n]+)/);
    if (match) return match[1];
  }
  return null;
}

const FUNCTIONS_TO_DEPLOY = [
  'admin-create-user',
  'admin-delete-user',
  'admin-reset-password'
];

async function main() {
  const token = getAccessToken();
  if (!token) {
    console.error('ERRO: SUPABASE_ACCESS_TOKEN não encontrado.');
    process.exit(1);
  }

  const projectRef = 'ebixhddonbiqtrsyvdry';
  console.log('====================================================');
  console.log(`Iniciando deploy seguro de Edge Functions`);
  console.log(`Projeto: ${projectRef}`);
  console.log(`Funções: ${FUNCTIONS_TO_DEPLOY.join(', ')}`);
  console.log('====================================================\n');

  for (const fnName of FUNCTIONS_TO_DEPLOY) {
    console.log(`>>> Realizando deploy de '${fnName}'...`);
    try {
      const cmd = `npx supabase functions deploy ${fnName} --project-ref ${projectRef} --no-verify-jwt`;
      const stdout = execSync(cmd, {
        env: {
          ...process.env,
          SUPABASE_ACCESS_TOKEN: token
        },
        encoding: 'utf8',
        stdio: 'pipe'
      });
      console.log(`[SUCESSO] ${fnName}:`);
      console.log(stdout);
    } catch (err: any) {
      console.error(`[FALHA] Erro ao publicar ${fnName}:`, err.stdout || err.stderr || err.message);
      process.exit(1);
    }
  }

  console.log('\n====================================================');
  console.log('Todas as 3 Edge Functions foram publicadas com sucesso!');
  console.log('====================================================');
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
