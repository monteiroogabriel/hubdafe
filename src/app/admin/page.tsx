import Link from "next/link";
import { requireAdmin } from "@/lib/security/auth";
import { statusNames } from "@/types/domain";

const profileStates = ["draft", "pending_review", "approved", "rejected", "suspended"];
const metricNames: Record<string, string> = {
  total: "Prestadores",
  pending_revisions: "Revisões pendentes",
  quotes: "Solicitações recebidas",
};
const pageSize = 20;

export default async function Admin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const page = Math.min(10_000, Math.max(1, Math.floor(Number(params.pagina) || 1)));
  const filter = params.estado === "todos" || profileStates.includes(params.estado ?? "")
    ? params.estado! : "revisoes";
  const pendingOnly = filter === "revisoes";
  const { client } = await requireAdmin();

  const revisionsJoin = pendingOnly ? "!provider_revisions_provider_id_fkey!inner" : "!provider_revisions_provider_id_fkey";
  let query = client.from("provider_profiles")
    .select(`id,status,revisions:provider_revisions${revisionsJoin}(id,display_name,state)`, { count: "exact" })
    .order(pendingOnly ? "updated_at" : "created_at", { ascending: false })
    .order("id")
    .order("created_at", { referencedTable: "revisions", ascending: false })
    .order("id", { referencedTable: "revisions" });
  if (pendingOnly) query = query.eq("revisions.state", "pending_review");
  else if (filter !== "todos") query = query.eq("status", filter);

  const [{ data: metrics }, { data, error, count }] = await Promise.all([
    client.rpc("admin_metrics"),
    query.range((page - 1) * pageSize, page * pageSize - 1),
  ]);
  if (error) throw new Error("ADMIN_UNAVAILABLE");

  return <>
    <h1>Revisão de prestadores</h1>
    <p>Avalie o vínculo com a igreja e os dados enviados antes de publicar.</p>
    {params.notice === "error" && <p className="notice error" role="status">A operação não foi concluída. Confira o estado da revisão, a validação do vínculo e a mensagem ao prestador.</p>}
    {params.notice === "saved" && <p className="notice success" role="status">Decisão registrada.</p>}
    <div className="grid" style={{ marginBottom: 24 }}>
      {Object.entries((metrics || {}) as Record<string, number>).map(([key, value]) =>
        <div className="card" key={key}><p>{statusNames[key] || metricNames[key] || key}</p><div className="metric">{value}</div></div>
      )}
    </div>
    <form className="filters">
      <label className="field">Mostrar
        <select name="estado" defaultValue={filter}>
          <option value="revisoes">Revisões pendentes</option>
          <option value="todos">Todos os perfis</option>
          {profileStates.map(state => <option value={state} key={state}>{statusNames[state]}</option>)}
        </select>
      </label>
      <button className="primary">Filtrar</button>
    </form>
    {!data?.length && <p className="notice">{pendingOnly ? "Nenhuma revisão aguardando decisão." : "Nenhum prestador encontrado."}</p>}
    <div className="grid">
      {data?.map(profile => {
        const revisions = profile.revisions as unknown as { id: string; display_name: string; state: string }[];
        const pending = revisions.find(revision => revision.state === "pending_review");
        const revision = pending ?? revisions[0];
        return <article className="card" key={profile.id}>
          <span className="badge">{statusNames[profile.status]}</span>
          <h2 style={{ fontSize: "1.3rem" }}>{revision?.display_name || "Perfil sem nome"}</h2>
          {pending && <p>Há uma revisão aguardando decisão.</p>}
          <Link className="button secondary" href={`/admin/perfis/${profile.id}`}>Revisar perfil</Link>
        </article>;
      })}
    </div>
    <nav className="pagination" aria-label="Páginas de prestadores">
      {page > 1 && <Link href={`?estado=${filter}&pagina=${page - 1}`}>Anterior</Link>}
      {page * pageSize < (count || 0) && <Link href={`?estado=${filter}&pagina=${page + 1}`}>Próxima</Link>}
    </nav>
  </>;
}
