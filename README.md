# HUB da Fé

Diretório comunitário em Next.js e Supabase. Interface em português, publicação moderada com versões imutáveis e orçamentos privados.

## Estado

Implementação local, sem implantação pública. A aplicação **não simula persistência**: sem configuração, o catálogo e o cadastro informam indisponibilidade. O cadastro usa Supabase Auth com confirmação de e-mail e sessão persistida em cookies seguros. CAPTCHA externo está desativado no MVP; o endpoint de orçamentos mantém validação, honeypot, idempotência e limites de envio no banco. A verificação local do SQL usa PostgreSQL em WebAssembly (PGlite), com identidades de teste; isso não substitui testes reais do Supabase Auth, Storage e SMTP.

## Desenvolvimento

Pré-requisitos: Node 24 LTS, pnpm 12.21.0. Para o Supabase local completo: Docker e Supabase CLI.

1. `pnpm install --frozen-lockfile`
2. Copiar `.env.example` para `.env.local` e configurar os valores necessários.
3. Aplicar as migrações ao Supabase de desenvolvimento (ver `docs/DATABASE.md`).
4. `pnpm dev`, abrir `http://localhost:3000`.

Nesta máquina, Node e pnpm foram baixados apenas para `.tools/` (ignorada pelo Git). Podem ser usados com `PATH="$PWD/.tools/node/bin:$PATH" .tools/node/bin/node .tools/pnpm/bin/pnpm.mjs dev`. Não há dependência do Node embutido no aplicativo.

O build usa Webpack: o Turbopack não conseguiu abrir seu processo interno neste ambiente. O framework, o runtime e o modelo de aplicação permanecem os definidos no plano.

## Verificação

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Com `pnpm start` ativo e Chrome instalado: `pnpm test:e2e`
- Com Supabase local e Docker: `pnpm db:test`

As credenciais nunca devem ser publicadas ou enviadas em chat. SMTP é configurado no Supabase, não no navegador. Não há dados de pessoas reais em fixtures ou seeds.

## Documentação

- `docs/ARCHITECTURE.md`: arquitetura e decisões.
- `docs/DATABASE.md`: migrações, relacionamentos e bootstrap administrativo.
- `docs/SECURITY.md`: permissões, ameaças e limites.
- `docs/PRODUCT_SPEC.md`: regras de comportamento.
- `docs/DEPLOYMENT.md`: configuração e recuperação.
- `docs/TESTING.md`: cobertura e limites dos testes.
- `docs/IMPLEMENTATION_STATUS.md`: entrega e pendências externas.

Identidade visual e ícones tipográficos são provisórios. Não representam um logotipo oficial aprovado.
