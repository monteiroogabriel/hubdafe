import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireAdmin } from "@/lib/security/auth";
import { statusNames } from "@/types/domain";
import { ReviewFilter } from "./review-filter";
import styles from "./reviews.module.css";

const reviewFilters = [
  { value: "todos", metric: "total", label: "Prestadores" },
  { value: "approved", metric: "approved", label: "Aprovados" },
  { value: "revisoes", metric: "pending_revisions", label: "Revisões pendentes" },
] as const;
const pageSize = 20;

export default async function Admin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const page = Math.min(10_000, Math.max(1, Math.floor(Number(params.pagina) || 1)));
  const showAll = { value: "mostrar-todos", label: "Mostrar todos" };
  const filterOptions = [showAll, ...reviewFilters];
  const filter = filterOptions.find(option => option.value === params.estado)?.value ?? showAll.value;
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
  else if (filter === "approved") query = query.eq("status", "approved");

  const [{ data: metrics }, { data, error, count }] = await Promise.all([
    client.rpc("admin_metrics"),
    query.range((page - 1) * pageSize, page * pageSize - 1),
  ]);
  if (error) throw new Error("ADMIN_UNAVAILABLE");
  const counts = metrics as Record<string, number> | null;

  return <>
    <h1>Revisão de prestadores</h1>
    <p>Avalie o vínculo com a igreja e os dados enviados antes de publicar.</p>
    {params.notice === "error" && <p className="notice error" role="status">A operação não foi concluída. Confira o estado da revisão, a validação do vínculo e a mensagem ao prestador.</p>}
    {params.notice === "saved" && <p className="notice success" role="status">Decisão registrada.</p>}
    <dl className={styles.metrics} aria-label="Resumo de prestadores">
      {reviewFilters.map(({ metric, label }) =>
        <div key={metric}>
          <dt>{label}</dt>
          <dd>{counts?.[metric] ?? "—"}</dd>
        </div>
      )}
    </dl>
    <ReviewFilter value={filter} options={filterOptions} />
    {!data?.length && <p className="notice">{pendingOnly ? "Nenhuma revisão aguardando decisão." : "Nenhum prestador encontrado."}</p>}
    {data && data.length > 0 && <ul className={styles.list} aria-label="Prestadores">
      {data.map(profile => {
        const revisions = profile.revisions as unknown as { id: string; display_name: string; state: string }[];
        const pending = revisions.find(revision => revision.state === "pending_review");
        const revision = pending ?? revisions[0];
        return <li key={profile.id}>
          <Link className={styles.row} href={`/admin/perfis/${profile.id}`}>
            <div className={styles.profile}>
              <h2>{revision?.display_name || "Perfil sem nome"}</h2>
              <div className={styles.states}>
                <span className="badge">{statusNames[profile.status]}</span>
                {pending && profile.status !== "pending_review" && (
                  <span className={styles.pending}>Revisão pendente</span>
                )}
              </div>
            </div>
            <span className={styles.action}>
              <span>{pending ? "Revisar" : "Ver perfil"}</span>
              <ChevronRight size={19} aria-hidden="true" />
            </span>
          </Link>
        </li>;
      })}
    </ul>}
    {(page > 1 || page * pageSize < (count || 0)) && (
      <nav className="pagination" aria-label="Páginas de prestadores">
        {page > 1 && <Link href={`?estado=${filter}&pagina=${page - 1}`}>Anterior</Link>}
        {page * pageSize < (count || 0) && <Link href={`?estado=${filter}&pagina=${page + 1}`}>Próxima</Link>}
      </nav>
    )}
  </>;
}
