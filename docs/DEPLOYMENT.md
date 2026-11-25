# Configuração e implantação

O projeto Supabase hospedado já existe e as quatro migrações foram aplicadas pelo SQL Editor. Verificação em 25/11/2026: 17 tabelas da aplicação, RLS habilitada em todas, gatilho de provisionamento de conta, dois buckets privados e função de busca presentes. O histórico de migração do CLI ainda não existe. Vercel e deploy ainda não foram configurados. A escolha permanece Vercel + Supabase em São Paulo. Não usar Sites/Cloudflare Workers para hospedar este runtime Node sem uma decisão arquitetural separada.

## Serviços

1. Criar projetos Supabase de homologação e produção, com banco PostgreSQL 17. Confirmar plano, região e orçamento com a organização.
2. Aplicar migrações versionadas primeiro em homologação. Auditar grants/RLS, funções expostas e buckets privados.
3. Configurar Auth: confirmação de e-mail, senha mínima 12, expiração JWT 900s, TOTP habilitado, redirects exatos, sem curingas em produção.
4. Configurar SMTP Resend com domínio verificado, SPF, DKIM e DMARC; testar confirmação, recuperação e alteração de e-mail.
5. Manter CAPTCHA desativado no Supabase Auth enquanto essa proteção estiver fora do escopo. Confirmar limites nativos de Auth, confirmação de e-mail e redirects permitidos.
6. Configurar variáveis `.env.example` na Vercel e separar previews/homologação/produção. `SUPABASE_SECRET_KEY`, `ABUSE_HMAC_SECRET` e `CRON_SECRET` nunca recebem prefixo NEXT_PUBLIC.
7. Selecionar Node 24, instalar com pnpm e build `pnpm build`. Configurar domínio HTTPS e região de função próxima ao banco. Habilitar HSTS após validar o domínio e seus subdomínios.
8. Provisionar o primeiro administrador conforme DATABASE.md; validar MFA na UI e na Data API.
9. Configurar Sentry DSN, ambiente e release. O código envia apenas eventos sanitizados, sem replay, request, user, breadcrumbs ou parâmetros. Configurar alertas e retenção de 30 dias na conta Sentry; validar recebimento em homologação.
10. Agendar POST diário para `/api/rotinas/limpeza` com `Authorization: Bearer CRON_SECRET` por scheduler protegido. Não expor segredo na URL. A rotina retorna 503 se uma remoção falhar; configurar alerta e repetição. O scheduler não foi provisionado.

## Gate de publicação

Executar `node --env-file=.env.local scripts/check-release.mjs` no ambiente correspondente. Esse check só verifica presença/formato básico; não comprova serviços operantes. Ainda exigidos: testes completos Auth/Storage/SMTP, revisão jurídica, marca aprovada, backup e restauração, limites de consumo, canais de privacidade e denúncias.

`LEGAL_APPROVED=true` só após revisão real dos textos, identificação do controlador e definição de bases legais e operadores. Em outros ambientes, robots impede indexação; robots não é controle de acesso.

## Backup e recuperação

O banco e os bytes dos buckets precisam de cópias separadas. `scripts/backup.mjs` exporta PostgreSQL e objetos, cria arquivo criptografado com age e permite upload S3. Exige ferramentas externas pg_dump, tar, age e, para destino S3, AWS CLI. Essas ferramentas e destinos não foram configurados nem testados nesta máquina.

Variáveis do job: DATABASE_URL (somente ambiente técnico), NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, BACKUP_AGE_RECIPIENT, BACKUP_OUTPUT_DIR (volume protegido), BACKUP_S3_URI (opcional). Usar arquivo de credenciais/identidade de máquina para AWS, nunca argumentos de senha. Diretório temporário deve ter disco criptografado e controle de acesso. Retenção do destino: 30 dias.

Manter diário externo de exclusões, sem conteúdo dos usuários, para reaplicar remoções após restaurar um backup anterior. O job de cópia não torna backups transacionais com o Storage: para o primeiro ensaio, colocar o sistema em manutenção durante captura/restauração e conferir hashes e referências. Não prometer RPO 24h/RTO 8h até medir restauração completa.

Restaurar em projeto isolado, aplicar migrações compatíveis, restaurar objetos privados, reaplicar exclusões/revogações posteriores ao backup, verificar visibilidade, orçamentos e arquivos, trocar segredos conforme incidente, executar smoke tests e só então reabrir tráfego. Nunca restaurar diretamente sobre produção sem aprovação.

## Smoke tests

Cadastro real e confirmação → perfil com dois serviços e arquivos → revisão por outro administrador com MFA → busca anônima → orçamento real sujeito a honeypot e limites → leitura somente pelo destinatário → suspensão e bloqueio de novas leituras de arquivo → logout sem dados em caches → exclusão/limpeza em ambiente descartável.
