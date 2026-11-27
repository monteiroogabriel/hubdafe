import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ArrowUpRight, Globe2, UserRound } from "lucide-react";
import { requireUser } from "@/lib/security/auth";
import { publication } from "@/features/providers/actions";
import { statusNames } from "@/types/domain";

export default async function Dashboard() {
  const { client, user } = await requireUser();
  const { data: roles } = await client.from("user_roles").select("role").eq("user_id",user.id);
  if (!roles?.some(role => role.role === "provider")) {
    redirect(roles?.some(role => role.role === "administrator") ? "/admin" : "/profissionais");
  }
  const { data: profile } = await client.from("provider_profiles")
    .select("id, status, published_revision_id, slug, is_active")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  const { data: revision } = profile ? await client.from("provider_revisions")
    .select("state, provider_message")
    .eq("provider_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle() : { data: null };

  return (
    <>
      <div className="workspace-heading">
        <h1>Meu painel</h1>
        <p>Acompanhe seu perfil e sua publicação.</p>
      </div>
      <div className="dashboard-overview">
        <section className="dashboard-tile dashboard-profile">
          <div className="tile-top">
            <span className="tile-icon"><UserRound size={22} aria-hidden="true" /></span>
            <span className="badge">{profile ? statusNames[profile.status] : "Perfil ainda não criado"}</span>
          </div>
          <h2>Meu perfil e serviços</h2>
          <p>{profile ? "Atualize suas informações e gerencie os serviços que você oferece." : "Você ainda não tem um perfil de prestador. Quando quiser oferecer serviços, crie seu perfil e envie para avaliação da liderança."}</p>
          {revision && <p className="fine">Última versão: {statusNames[revision.state]}</p>}
          {revision?.provider_message && <p className="notice">{revision.provider_message}</p>}
          <Link className="button" href="/dashboard/perfil">
            {profile ? "Editar perfil" : "Criar meu perfil"} <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section>

        <section className="dashboard-tile dashboard-visibility">
          <span className="tile-icon"><Globe2 size={22} aria-hidden="true" /></span>
          <div>
            <h2>Publicação</h2>
            <p>{profile?.published_revision_id ? "As alterações aparecem no diretório depois da aprovação." : "Seu perfil aparece no diretório após a aprovação da liderança."}</p>
            {profile?.published_revision_id && (
              <div className="actions">
                {profile.is_active && profile.status === "approved" && <Link className="inline-link" href={`/profissionais/${profile.slug}`}>Ver perfil publicado <ArrowUpRight size={16} aria-hidden="true" /></Link>}
                <form action={publication}>
                  <input type="hidden" name="active" value={profile.is_active ? "false" : "true"} />
                  <button className="subtle-button">{profile.is_active ? "Retirar perfil do ar" : "Restaurar visibilidade"}</button>
                </form>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
