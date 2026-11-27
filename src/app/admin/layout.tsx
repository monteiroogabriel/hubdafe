import { Workspace } from "@/components/layout/workspace";
import { requireAdmin } from "@/lib/security/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administração", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { client, user } = await requireAdmin();
  const { data: provider } = await client.from("user_roles")
    .select("role").eq("user_id", user.id).eq("role", "provider").maybeSingle();
  return <Workspace admin canProvide={Boolean(provider)}>{children}</Workspace>;
}
