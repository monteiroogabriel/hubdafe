import { requireAdmin } from "@/lib/security/auth";
import { GrantForm } from "./grant-form";

export default async function Administrators() {
  await requireAdmin();

  return <div className="editor">
    <h1>Administradores</h1>
    <section>
      <h2>Conceder acesso</h2>
      <p>O acesso permite revisar perfis, gerir categorias e conceder acesso a outros administradores.</p>
      <GrantForm />
    </section>
  </div>;
}
