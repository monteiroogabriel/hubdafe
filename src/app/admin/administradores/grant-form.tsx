"use client";

import { useActionState } from "react";
import { grantAdministrator } from "@/features/moderation/actions";

const notices: Record<string, string> = {
  granted: "Acesso concedido. A pessoa já pode entrar na administração; configurar autenticador em Minha conta é opcional.",
  already_administrator: "Esta conta já tem acesso administrativo.",
  unavailable: "Nenhuma conta ativa foi encontrada para esse endereço.",
  confirmation_required: "A conta existe, mas ainda precisa confirmar o e-mail. Depois da confirmação, conceda o acesso novamente.",
  invalid: "Informe um e-mail válido e confirme a concessão.",
  error: "Não foi possível concluir a operação. Tente novamente.",
  resent: "Link de confirmação reenviado. Peça à pessoa que confira a caixa de entrada e a pasta de spam.",
  resend_limited: "Aguarde um pouco antes de reenviar outro link.",
  resend_error: "Não foi possível reenviar o link. Tente novamente.",
  resend_unavailable: "O reenvio não está disponível para esta conta. Verifique se o e-mail já foi confirmado.",
};

export function GrantForm() {
  const [state, action, pending] = useActionState(grantAdministrator, { notice: "", email: "" });
  const message = notices[state.notice];
  const canResend = ["confirmation_required", "resent", "resend_limited", "resend_error"].includes(state.notice);

  return <>
    <form action={action}>
      <label className="field">E-mail da conta
        <input name="email" type="email" required maxLength={254} defaultValue={state.email} />
      </label>
      <label className="check">
        <input name="confirm" type="checkbox" required />
        Confirmo que esta pessoa pode administrar o HUB da Fé.
      </label>
      <button className="primary" disabled={pending}>Conceder acesso administrativo</button>
    </form>
    {message && <p className="notice" role="status" style={{ marginTop: 16 }}>{message}</p>}
    {canResend && <form action={action}>
      <input type="hidden" name="intent" value="resend" />
      <input type="hidden" name="email" value={state.email} />
      <button className="button secondary" disabled={pending}>Reenviar confirmação para {state.email}</button>
    </form>}
  </>;
}
