# Banco e migrações

As migrações SQL em `supabase/migrations` são a fonte de verdade. Não executar em produção sem ensaio em homologação e backup.

## Projeto Supabase hospedado

As migrações `202611220001_core.sql` a `202611220004_hardening.sql` foram aplicadas manualmente pelo SQL Editor. A conferência encontrou 17 tabelas com RLS, o gatilho `on_auth_user_created`, dois buckets privados e a função de busca. A tabela `supabase_migrations.schema_migrations` ainda não existe; portanto, não execute `supabase db push` nem repita os SQLs até reconciliar o histórico do CLI e marcar essas quatro versões como já aplicadas. As migrações não são scripts de reinstalação.

Não há categorias iniciais: o PRD não define uma lista de categorias. Depois de provisionar o primeiro administrador, cadastrar a taxonomia aprovada pelo HUB no painel administrativo antes de preencher serviços.

## Ambiente local completo

Com Docker e Supabase CLI instalados, executar `supabase start` e `supabase db reset`. O reset é destrutivo e serve somente para ambiente local descartável. O projeto não contém seed de pessoas. Copiar a URL e as chaves locais para `.env.local`. Para projeto hospedado, vincular explicitamente o projeto correto e aplicar `supabase db push` após revisar as migrações pendentes.

## Relacionamentos

auth.users → user_profiles (1:1) → user_roles (1:N). user_profiles → provider_profiles (1:1) → provider_revisions (1:N). provider_profiles → services (1:N) → service_revisions (1:N). Uma service_revision também referencia sua provider_revision, com FK composta garantindo o mesmo prestador. Fotos e documentos referenciam file_assets. Orçamentos referenciam prestador e, opcionalmente, a revisão do serviço por FK composta. Revisões históricas necessárias aos orçamentos não são apagadas pela limpeza.

provider_memberships, moderation_decisions e admin_audit_logs contêm informação privada. privacy_records registra autorização/revogação. O schema private contém idempotência, contadores e fila de remoção de objetos, sem exposição pela Data API.

## Primeiro administrador

1. Criar a conta pelo fluxo normal e confirmar seu e-mail.
2. Na área Conta e segurança, cadastrar TOTP e verificar o código.
3. Conferir a identidade com a liderança por canal independente.
4. No SQL Editor administrativo do projeto correto, executar uma transação chamando `private.provision_administrator` com o UUID conferido e `false` para suporte de orçamentos. A função verifica e-mail confirmado e fator TOTP validado; grants não estão acessíveis pela aplicação.
5. O administrador entra com MFA para usar o painel. Para suporte de orçamentos, o responsável pelo banco concede explicitamente essa capacidade usando o segundo parâmetro `true` após autorização organizacional.

Não conceder função administrativa a partir de e-mail enviado pelo navegador. Nenhum endpoint público aceita papel ou `is_admin`. Alterações de papéis/capacidades possuem triggers de auditoria.

## Validação

Os testes em PGlite executam as mesmas migrações, com tabelas auth/storage mínimas apenas na fixture. Eles verificam o PostgreSQL real e as permissões de roles, mas não simulam a implementação inteira dos serviços gerenciados. Rodar também os testes pgTAP em Supabase local e smoke tests de API/Storage hospedados antes da publicação.
