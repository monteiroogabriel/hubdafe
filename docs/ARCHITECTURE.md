# Arquitetura

Monólito modular Next.js 16.4.6 / React 19.3.1, TypeScript 5.9.3, Node 24, pnpm 12.21.0. Versões resolvidas no `pnpm-lock.yaml`. Tailwind 4.3.5, Supabase JS 2.119.2 e SSR 0.12.7. PostgreSQL 17 no projeto hospedado.

Páginas públicas são Server Components dinâmicos. Formulários interativos usam componentes de cliente e validação Zod no servidor. Formulários simples usam controles HTML nativos; React Hook Form e shadcn/Radix não foram instalados porque os componentes atuais não exigem suas abstrações. Lucide fornece ícones. O código de domínio fica em `features/`, e a autorização transacional fica em funções SQL.

## Fronteiras

- `sessionClient`: sessão por cookies HttpOnly, com identidade do usuário e RLS.
- `publicClient`: chave publicável, somente funções públicas de projeção.
- `technicalClient`: chave secreta no servidor. Limitado a orçamentos protegidos, arquivos e limpeza.
- `proxy.ts`: renova sessão e marca respostas como privadas/no-store; não substitui autorização de ações.
- Auth, tokens, caminhos do Storage, proprietário e notas internas nunca entram nos objetos públicos do catálogo.

## Publicação

`provider_profiles` tem identidade estável, proprietário único e ponteiro para `provider_revisions`. Serviços também têm identidade estável e conteúdo versionado em `service_revisions`. A aprovação congela conteúdo e troca o ponteiro na transação. Fotografias e documentos pertencem à revisão. Uma revisão pendente não pode ser editada.

`private.can_publish` é o predicado usado para catálogo, perfil, sitemap, arquivos e aceitação de orçamento. Aprovação e suspensão bloqueiam a mesma linha do prestador. A aplicação não usa ISR nem caches compartilhados para conteúdo moderado.

## Pesquisa

Texto normalizado por unaccent, tsvector português e índice GIN. Nomes e descrições recebem busca parcial e tolerância por trigramas. Filtros de categoria/cidade e paginação de 20 registros; limite de 500 páginas no MVP. Validar planos de consulta e relevância com volume representativo antes do lançamento.

## Arquivos e PWA

Uploads reservados no banco, enviados diretamente a bucket privado de quarentena, processados no servidor e transferidos ao bucket validado. Imagens recodificadas, sem EXIF. Entrega por `/api/arquivos/[key]`, sem cache e sem otimizador compartilhado. PDF é download, nunca iframe.

O service worker armazena somente ícones e a página genérica offline. Não armazena respostas de API, páginas autenticadas ou perfis. A instalação PWA depende do navegador; não há sincronização ou edição offline.

## Tipos

DTOs de domínio estão em `src/types/domain.ts`; validação em `schemas.ts`. Os tipos completos do PostgREST deverão ser gerados via `pnpm db:types` quando houver Supabase local configurado. Ainda não há declaração gerada apresentada como se tivesse sido obtida de um serviço inexistente.
