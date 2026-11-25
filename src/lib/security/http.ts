import "server-only";
import { appUrl } from "@/lib/env";
export function sameOrigin(request: Request) { return request.headers.get("origin") === new URL(appUrl()).origin; }
export function safeError(error: { message?: string } | null) {
  const message = error?.message || "";
  if (message.includes("STALE_REVISION")) return "Seu perfil foi alterado em outra janela. Atualize a página antes de salvar.";
  if (message.includes("INCOMPLETE")) return "Complete os dados obrigatórios e adicione um serviço antes de enviar.";
  if (message.includes("SELF_MODERATION")) return "Outro administrador deve revisar seu perfil.";
  if (message.includes("INACTIVE_CATEGORY")) return "Selecione uma categoria ativa.";
  return "Não foi possível concluir. Verifique os dados e tente novamente.";
}
