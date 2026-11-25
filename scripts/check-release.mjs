const required=['NEXT_PUBLIC_APP_URL','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','ABUSE_HMAC_SECRET','CRON_SECRET','PRIVACY_CONTACT_EMAIL','PRIVACY_CONTROLLER_NAME'];
const missing=required.filter(key=>!process.env[key]);
if(process.env.LEGAL_APPROVED!=='true')missing.push('LEGAL_APPROVED=true');
for(const key of ['ABUSE_HMAC_SECRET','CRON_SECRET'])if(process.env[key]&&process.env[key].length<32)missing.push(`${key}: mínimo 32 caracteres`);
if(process.env.NEXT_PUBLIC_APP_URL&&!process.env.NEXT_PUBLIC_APP_URL.startsWith('https://'))missing.push('NEXT_PUBLIC_APP_URL: HTTPS obrigatório em produção');
if(missing.length){console.error(`Publicação bloqueada. Configure: ${missing.join(', ')}`);process.exitCode=1;}else console.log('Configuração nominal presente. Ainda são obrigatórios testes integrados, revisão legal e ensaio de recuperação.');
