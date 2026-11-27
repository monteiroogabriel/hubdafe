import { SecurityPanel } from "@/components/security-panel";
import { requireUser } from "@/lib/security/auth";
export default async function Security() {
  const { user } = await requireUser();
  return <>
    <h1>Conta e segurança</h1>
    <p>Atualize os dados usados para entrar no HUB da Fé.</p>
    <SecurityPanel email={user.email || ""} />
  </>;
}
