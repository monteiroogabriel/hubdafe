import { categories, directory } from "@/features/providers/queries";
import { ProviderCard } from "@/components/provider-card";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ClipboardList, Globe2, UserRound } from "lucide-react";
import { requireUser } from "@/lib/security/auth";
import { publication } from "@/features/providers/actions";
import { statusNames } from "@/types/domain";

export default async function Dashboard() {
  const { client, user } = await requireUser();
  const { data: roles } = await client.from("user_roles").select("role").eq("user_id",user.id);
  if(roles?.some(role => role.role === "customer") && !roles.some(role => role.role === "provider")) {
    const [topics,result] = await Promise.all([categories(),directory()]);
    return <><div className="workspace-heading"><h1>Encontre um serviço</h1><p>Explore os profissionais da comunidade e fale com quem pode ajudar.</p></div><form action="/profissionais" className="home-search"><input name="q" placeholder="Qual serviço você procura?" aria-label="Serviço" maxLength={100}/><button className="primary">Buscar</button></form><div className="category-list" style={{marginBlock:24}}>{topics.map(topic=><Link className="category-link" key={topic.slug} href={`/profissionais?categoria=${topic.slug}`}>{topic.name}</Link>)}</div>{result.unavailable?<p className="notice">Diretório indisponível no momento. Tente novamente mais tarde.</p>:result.items.length?<div className="grid">{result.items.map(profile=><ProviderCard key={profile.slug} profile={profile}/>)}</div>:<div className="empty"><h2>Em breve, novos profissionais</h2><p>Os perfis aparecem aqui depois da aprovação da liderança.</p></div>}</>;
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
        <p>Acompanhe seu perfil, sua publicação e os pedidos que você receber.</p>
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

        <Link className="dashboard-tile dashboard-tile-link" href="/dashboard/orcamentos">
          <span className="tile-icon"><ClipboardList size={22} aria-hidden="true" /></span>
          <div><h2>Orçamentos</h2><p>Veja os pedidos que chegaram pelo seu perfil.</p></div>
          <ArrowUpRight size={19} aria-hidden="true" />
        </Link>

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
