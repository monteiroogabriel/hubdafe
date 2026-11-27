"use client";

import { useState } from "react";

export function SecurityPanel() {
  const [message, setMessage] = useState("");
  const [setupKey, setSetupKey] = useState("");
  const [factor, setFactor] = useState("");
  const [busy, setBusy] = useState(false);

  async function operation(action: string, extra: Record<string, string> = {}) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/conta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.factor) {
        setFactor(data.factor);
        setSetupKey(data.setupKey || "");
      }
      setMessage(data.message || "Operação concluída.");
      if (action === "verify") {
        setFactor("");
        setSetupKey("");
      } else if (action === "delete") {
        window.location.reload();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha na operação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="editor">
      <section>
        <h2>Autenticação em duas etapas</h2>
        <p>Opcional. Adicione um autenticador para reforçar a segurança da sua conta. Ele não é necessário para acessar o painel administrativo.</p>
        <div className="actions">
          <button className="primary" disabled={busy} onClick={() => void operation("enroll")}>Configurar autenticador (opcional)</button>
          <button className="button secondary" disabled={busy} onClick={() => void operation("factor")}>Já tenho autenticador</button>
        </div>
        {setupKey && <div className="notice" style={{ marginTop: 16 }}>
          <p>No seu autenticador, escolha adicionar uma conta por chave. Use o nome HUB da Fé e selecione código baseado em tempo (TOTP). Depois, volte aqui e digite o código de seis dígitos.</p>
          <label className="field">Chave de configuração<input readOnly value={setupKey} autoComplete="off" spellCheck={false} onFocus={event => event.currentTarget.select()} /></label>
          <button type="button" className="button secondary" onClick={async () => {
            try {
              await navigator.clipboard.writeText(setupKey);
              setMessage("Chave copiada.");
            } catch {
              setMessage("Selecione a chave acima e copie manualmente.");
            }
          }}>Copiar chave</button>
        </div>}
        {factor && <form onSubmit={event => {
          event.preventDefault();
          void operation("verify", { factor, code: String(new FormData(event.currentTarget).get("code")) });
        }}>
          <label className="field">Código de seis dígitos<input name="code" required pattern="[0-9]{6}" inputMode="numeric" autoComplete="one-time-code" /></label>
          <button className="primary" disabled={busy}>Verificar código</button>
        </form>}
      </section>
      <section>
        <h2>Alterar senha</h2>
        <form onSubmit={event => {
          event.preventDefault();
          void operation("password", { password: String(new FormData(event.currentTarget).get("password")) });
        }}>
          <label className="field">Nova senha<input type="password" name="password" required minLength={8} maxLength={128} autoComplete="new-password" /></label>
          <button className="primary" disabled={busy}>Atualizar senha</button>
        </form>
      </section>
      <section>
        <h2>Alterar e-mail de acesso</h2>
        <p>O e-mail público do perfil permanece separado.</p>
        <form onSubmit={event => {
          event.preventDefault();
          void operation("email", { email: String(new FormData(event.currentTarget).get("email")) });
        }}>
          <label className="field">Novo e-mail<input type="email" name="email" required /></label>
          <button className="primary" disabled={busy}>Solicitar alteração</button>
        </form>
      </section>
      <section>
        <h2>Retirar autorização de publicação</h2>
        <p>Seu perfil será retirado do diretório imediatamente. Sua conta e os orçamentos continuarão privados.</p>
        <button className="button secondary" disabled={busy} onClick={() => {
          if (window.confirm("Retirar sua autorização e ocultar seu perfil?")) void operation("revoke");
        }}>Retirar autorização</button>
      </section>
      <section>
        <h2>Excluir minha conta</h2>
        <p>O acesso e a publicação serão desativados imediatamente. A limpeza será concluída conforme a política de retenção.</p>
        <button className="button danger" disabled={busy} onClick={() => {
          if (window.confirm("Solicitar a exclusão da conta e retirar seu perfil do ar?")) void operation("delete");
        }}>Solicitar exclusão</button>
      </section>
      {message && <p className="notice" role="status">{message}</p>}
    </div>
  );
}
