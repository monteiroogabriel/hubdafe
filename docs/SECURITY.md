# Segurança

## Controles

- RLS em todas as tabelas da aplicação; anon não consulta tabelas privadas.
- Sem INSERT/UPDATE/DELETE direto para authenticated, inclusive administradores.
- Projeções públicas explícitas. SECURlTY DEFINER é restrito a funções com autorização e search_path vazio; execução por PUBLIC revogada.
- Papéis no banco, contas habilitadas e e-mail confirmado. Administração exige aal2 e bloqueia automoderação.
- Orçamentos só são lidos pelo destinatário ou por função de suporte que exige capacidade, justificativa e auditoria.
- Sessão em cookies HttpOnly/Secure/SameSite. Redirect allowlist, Origin em endpoints mutáveis e proteção nativa das Server Actions.
- Chaves técnicas server-only; sem acesso privilegiado genérico para a interface.
- Cadastro, login e recuperação usam Supabase Auth, confirmação de e-mail e senha mínima de 12 caracteres. CAPTCHA está desativado no MVP; o Auth mantém os limites nativos do Supabase.
- Limites atômicos PostgreSQL; HMAC nos identificadores de abuso; retenção de 24h. No Vercel, confiar apenas no header de IP da plataforma. Em outro host, adaptar uma origem de IP confiável antes de permitir envios.
- Imagens com MIME real, limites de pixels, recodificação e remoção EXIF. PDF com parsing recursivo e rejeição de ações/objetos ativos, anexos e senha; até 50 páginas. Não é um antivírus.
- Headers CSP, nosniff, frame denial e referrer policy; armazenamento e respostas privadas sem cache.

## Limitações e revisão antes do lançamento

- A CSP permite scripts inline exigidos pelo SSR atual. Adotar nonce por resposta para endurecer esta política antes de exposição ampla; não tratá-la como proteção completa contra XSS.
- RLS não protege contra comprometimento de credenciais do proprietário do banco ou da chave secreta. Restringir, rotacionar e auditar acessos operacionais.
- Limites de orçamento e honeypot reduzem abuso automatizado, mas não eliminam ataques distribuídos; configurar limites adicionais da hospedagem antes de ampliar o tráfego.
- Supabase Auth/Storage reais ainda precisam ser exercitados no projeto conectado.
- Documentos e backups podem conter dados pessoais; a governança jurídica e os contratos de operadores precisam ser concluídos.
- Revogação interrompe novas leituras pela plataforma. Não apaga downloads, capturas ou índices de terceiros já existentes.
- Deleção de Storage depende da rotina operacional; falhas mantêm fila para nova tentativa e devem disparar alerta.

O conteúdo dos erros técnicos, tokens, mensagens de orçamento e contatos não deve ser enviado aos logs. Notas de justificativa de suporte também devem evitar copiar dados do solicitante.
