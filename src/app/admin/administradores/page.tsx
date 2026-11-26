import { grantAdministrator } from "@/features/moderation/actions";
import { requireAdmin } from "@/lib/security/auth";

const notices: Record<string, string> = {
  granted: "Acesso administrativo concedido. Para abrir o painel, a pessoa deverá verificar o código do autenticador.",
  already_administrator: "Esta conta já tem acesso administrativo.",
  unavailable: "Nenhuma conta ativa com e-mail confirmado foi encontrada para esse endereço.",
  invalid: "Informe um e-mail válido e confirme a concessão.",
  error: "Não foi possível conceder o acesso. Tente novamente.",
};

export default async function Administrators({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  await requireAdmin();
  const { notice } = await searchParams;
  const message = notice && Object.hasOwn(notices, notice) ? notices[notice] : null;

  return <div className="editor">
    <h1>Administradores</h1>
    <section>
      <h2>Conceder acesso</h2>
      <p>Use o e-mail de uma conta cadastrada e confirmada. O acesso permite revisar perfis, gerir categorias e conceder acesso a outros administradores.</p>
      {message && <p className="notice" role="status">{message}</p>}
      <form action={grantAdministrator}>
        <label className="field">E-mail da conta
          <input name="email" type="email" required maxLength={254} />
        </label>
        <label className="check">
          <input name="confirm" type="checkbox" required />
          Confirmo que esta pessoa pode administrar o HUB da Fé.
        </label>
        <button className="primary">Conceder acesso administrativo</button>
      </form>
    </section>
  </div>;
}
