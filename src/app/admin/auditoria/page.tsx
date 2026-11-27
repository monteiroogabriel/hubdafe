import Link from "next/link";
import { requireAdmin } from "@/lib/security/auth";

const pageSize = 30;
const actionGroups = [
  { value: "all", label: "Todas" },
  { value: "profiles", label: "Perfis" },
  { value: "access", label: "Acessos" },
  { value: "categories", label: "Categorias" },
  { value: "account", label: "Conta" },
] as const;

const actionLabels: Record<string, string> = {
  profile_draft_created: "Rascunho de perfil criado",
  profile_draft_saved: "Rascunho de perfil atualizado",
  profile_submitted: "Perfil enviado para revisão",
  profile_submission_withdrawn: "Envio retirado pelo prestador",
  profile_revision_approved: "Revisão aprovada",
  profile_revision_rejected: "Revisão rejeitada",
  profile_revision_state_changed: "Estado da revisão alterado",
  provider_status_changed: "Situação do perfil alterada",
  publication_consent_granted: "Autorização de publicação concedida",
  publication_consent_revoked: "Autorização de publicação retirada",
  administrator_granted: "Acesso de administrador concedido",
  administrator_revoked: "Acesso de administrador removido",
  provider_granted: "Acesso de prestador concedido",
  provider_revoked: "Acesso de prestador removido",
  capability_granted: "Permissão adicional concedida",
  capability_revoked: "Permissão adicional removida",
  category_created: "Categoria criada",
  category_updated: "Categoria atualizada",
  category_deleted: "Categoria excluída",
  account_deletion_requested: "Exclusão de conta solicitada",
  quote_accessed: "Pedido de contato acessado",
  approved: "Revisão aprovada",
  rejected: "Revisão rejeitada",
  suspended: "Prestador suspenso",
  reactivated: "Prestador reativado",
  user_roles_granted: "Permissão de usuário concedida",
  user_roles_revoked: "Permissão de usuário removida",
  admin_capabilities_granted: "Permissão administrativa concedida",
  admin_capabilities_revoked: "Permissão administrativa removida",
};

const groupActions: Record<string, string[]> = {
  profiles: ["profile_draft_created", "profile_draft_saved", "profile_submitted", "profile_submission_withdrawn", "profile_revision_approved", "profile_revision_rejected", "profile_revision_state_changed", "provider_status_changed", "publication_consent_granted", "publication_consent_revoked", "approved", "rejected", "suspended", "reactivated"],
  access: ["administrator_granted", "administrator_revoked", "provider_granted", "provider_revoked", "capability_granted", "capability_revoked", "user_roles_granted", "user_roles_revoked", "admin_capabilities_granted", "admin_capabilities_revoked"],
  categories: ["category_created", "category_updated", "category_deleted"],
  account: ["account_deletion_requested", "quote_accessed"],
};

function metadataLabel(key: string) {
  const labels: Record<string, string> = {
    provider_name: "Prestador",
    profile_status: "Situação",
    revision_state: "Revisão",
    version: "Versão",
    target_email: "Conta afetada",
    role: "Acesso",
    capability: "Permissão",
    name: "Categoria",
    slug: "Identificador",
    active: "Ativa",
    old_status: "Situação anterior",
    new_status: "Nova situação",
    publication_active: "Publicação ativa",
    reason: "Justificativa",
  };
  return labels[key] ?? key.replaceAll("_", " ");
}

function displayValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default async function Audit({ searchParams }: {
  searchParams: Promise<{ pagina?: string; tipo?: string }>;
}) {
  const params = await searchParams;
  const page = Math.min(10_000, Math.max(1, Math.floor(Number(params.pagina) || 1)));
  const selectedGroup = actionGroups.some(group => group.value === params.tipo) ? params.tipo! : "all";
  const { client } = await requireAdmin();
  let query = client
    .from("admin_audit_logs")
    .select("id,created_at,actor_user_id,actor_email,actor_name,action,entity_id,metadata", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (selectedGroup !== "all") query = query.in("action", groupActions[selectedGroup] ?? []);
  const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw new Error("AUDIT_UNAVAILABLE");

  const visibleLogs = data ?? [];
  const total = count ?? 0;
  return <>
    <h1>Auditoria</h1>
    <p>Histórico das principais ações feitas por administradores e prestadores.</p>
    <nav className="pagination" aria-label="Filtrar histórico">
      {actionGroups.map(group => <Link
        key={group.value}
        href={`?tipo=${group.value}`}
        aria-current={selectedGroup === group.value ? "page" : undefined}
        className={selectedGroup === group.value ? "button" : "button secondary"}
      >{group.label}</Link>)}
    </nav>
    {!visibleLogs.length && <p className="notice">Nenhuma ação encontrada neste filtro.</p>}
    {visibleLogs.map(log => {
      const metadata = (log.metadata && typeof log.metadata === "object" ? log.metadata : {}) as Record<string, unknown>;
      const actor = log.actor_name?.trim() || log.actor_email?.trim() || log.actor_user_id || "Rotina do sistema";
      const details = Object.entries(metadata).filter(([, value]) => value !== null && value !== "");
      return <article className="card" key={log.id} style={{ marginBottom: 12 }}>
        <strong>{actionLabels[log.action] ?? log.action.replaceAll("_", " ")}</strong>
        <p className="fine">{new Date(log.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · Por: {actor}</p>
        {typeof metadata.provider_name === "string" && <p>Perfil: <Link href={`/admin/perfis/${log.entity_id}`}>{metadata.provider_name}</Link></p>}
        {log.entity_id && <details className="fine"><summary>Referência técnica</summary><code style={{ overflowWrap: "anywhere" }}>{log.entity_id}</code></details>}
        {details.length > 0 && <dl className="form-grid">
          {details.map(([key, value]) => <div key={key}>
            <dt className="fine">{metadataLabel(key)}</dt>
            <dd style={{ overflowWrap: "anywhere" }}>{displayValue(value)}</dd>
          </div>)}
        </dl>}
      </article>;
    })}
    <nav className="pagination" aria-label="Páginas do histórico">
      {page > 1 && <Link href={`?tipo=${selectedGroup}&pagina=${page - 1}`}>Anterior</Link>}
      {page * pageSize < total && <Link href={`?tipo=${selectedGroup}&pagina=${page + 1}`}>Próxima</Link>}
      <span className="fine">Página {page} · {total} registros</span>
    </nav>
  </>;
}
