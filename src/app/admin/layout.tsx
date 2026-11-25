import { Workspace } from "@/components/layout/workspace";
import { requireAdmin } from "@/lib/security/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administração", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <Workspace admin>{children}</Workspace>;
}
