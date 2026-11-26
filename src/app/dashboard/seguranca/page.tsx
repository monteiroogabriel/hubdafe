import { SecurityPanel } from "@/components/security-panel";
export default async function Security({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  const adminMfa = notice === "admin-mfa";
  return <>
    <h1>Conta e segurança</h1>
    {adminMfa && <p className="notice">Para abrir a administração, verifique o código do seu autenticador. Se for seu primeiro acesso, configure o autenticador abaixo.</p>}
    <SecurityPanel returnToAdmin={adminMfa} />
  </>;
}
