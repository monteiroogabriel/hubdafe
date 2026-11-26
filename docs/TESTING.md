# Testes

## Executáveis

- `pnpm typecheck`: TypeScript estrito.
- `pnpm lint`: ESLint/Next. Imagens intencionalmente não usam cache de next/image, para respeitar suspensão.
- `pnpm test`: validação, links internacionais, tratamento de imagens/PDF e migrações em PGlite.
- `pnpm test:e2e`: Chrome desktop e 360px, com aplicação servindo em localhost:3000 e sem backend configurado. São smoke tests do estado não configurado, não testes de sucesso de persistência.
- `pnpm db:test`: pgTAP no Supabase local (exige Docker/CLI); ainda não executado neste ambiente.

## Banco

Fixtures criam roles anon/authenticated/service_role e funções auth.uid/auth.jwt, além de tabelas mínimas do serviço. As migrações da aplicação são aplicadas sem reimplementação das regras. As consultas realmente executam PostgreSQL/RLS. Os valores de identidade são selecionados pelo teste; não há autenticação JWT real nesse nível.

Cobertura: leitura privada anônima, escalada de papel, edição de outro prestador, imutabilidade pendente, acesso administrativo sem MFA obrigatório, publicação sem notas/IDs privados, preservação da versão aprovada, busca com acentos, atualização obsoleta, consentimento explícito, automoderação, quota/propriedade de upload, orçamentos privados e idempotentes, suporte restrito, suspensão, limites, revogação, bloqueio da conta e retenção.

## Arquivos

Teste com imagem gerada verifica formato WebP e ausência de EXIF. PDFs inertes são aceitos, ações ativas e dicionários ativos aninhados são rejeitados. Testes não equivalem a análise antivírus.

## Ainda obrigatórios na integração completa

- E-mail de confirmação/recuperação e cookies SSR após login/logout em dois navegadores.
- MFA opcional real, recuperação operacional do administrador e bootstrap seguro.
- Upload assinado Supabase, MIME adulterado, URLs já utilizadas e suspensão após publicação de mídia.
- Limites nativos de Auth do Supabase, IP confiável Vercel e concorrência dos limites de orçamento entre instâncias.
- Cenários A–G completos do PRD com pessoas/credenciais exclusivamente de teste.
- Testes de concorrência com conexões PostgreSQL independentes; PGlite local não comprova concorrência de rede.
- Navegadores Safari/Firefox, instalação no iOS/Android, acessibilidade manual e métricas de performance.
- Backups, restauração, reexecução de exclusões, Sentry e scheduler real.

Não marcar cenários como aprovados apenas porque a tela ou o teste existe.
