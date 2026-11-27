import { Workspace } from "@/components/layout/workspace";
import { requireUser } from "@/lib/security/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Área do prestador", robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { client, user } = await requireUser();
  const { data: roles } = await client.from("user_roles").select("role").eq("user_id", user.id);
  const canAdmin = roles?.some(role => role.role === "administrator");
  const canProvide = roles?.some(role => role.role === "provider");

  return <Workspace canProvide={canProvide === true} canAdmin={canAdmin === true}>{children}</Workspace>;
}
