import { Workspace } from "@/components/layout/workspace";
import { requireUser } from "@/lib/security/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Área do prestador", robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { client } = await requireUser();
  const [{ data: canAdmin }, { data: roles }] = await Promise.all([
    client.rpc("is_administrator"),
    client.from("user_roles").select("role"),
  ]);
  const customer = roles?.some(role => role.role === "customer") && !roles.some(role => role.role === "provider");

  return <Workspace customer={Boolean(customer)} canAdmin={canAdmin === true}>{children}</Workspace>;
}
