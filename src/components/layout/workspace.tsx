"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ClipboardList, FolderOpen, LayoutGrid, LogOut, ShieldCheck, Tags, UserCog, UserRound, Users } from "lucide-react";
import { Brand } from "./brand";

const memberLinks = [
  { href: "/dashboard", title: "Painel", icon: LayoutGrid },
  { href: "/dashboard/perfil", title: "Meu perfil", icon: UserRound },
  { href: "/dashboard/orcamentos", title: "Orçamentos", icon: ClipboardList },
  { href: "/dashboard/seguranca", title: "Minha conta", icon: ShieldCheck },
];

const adminLinks = [
  { href: "/admin", title: "Perfis", icon: Users },
  { href: "/admin/categorias", title: "Categorias", icon: Tags },
  { href: "/admin/auditoria", title: "Auditoria", icon: FolderOpen },
  { href: "/admin/orcamentos", title: "Orçamentos", icon: ClipboardList },
  { href: "/admin/administradores", title: "Administradores", mobileTitle: "Admins", icon: UserCog },
];

export function Workspace({ children, admin = false, canAdmin = false, customer = false }: {
  children: React.ReactNode;
  customer?: boolean;
  admin?: boolean;
  canAdmin?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="workspace">
      <header className="workspace-header">
        <Brand href="/dashboard" />
        <div className="workspace-header-actions">
          {admin ? <Link className="workspace-switch" href="/dashboard">Meu painel <ArrowUpRight size={16} /></Link> :
            canAdmin && <Link className="workspace-switch workspace-switch-admin" href="/admin"><ShieldCheck size={17} aria-hidden="true" /><span>Administração</span><ArrowUpRight size={16} aria-hidden="true" /></Link>}
          <form action="/auth/operacao" method="post">
            <input type="hidden" name="mode" value="logout" />
            <button className="workspace-logout" aria-label="Sair da conta"><LogOut size={18} aria-hidden="true" /><span>Sair</span></button>
          </form>
        </div>
      </header>
      <nav className={admin ? "workspace-nav workspace-nav-admin" : "workspace-nav"} aria-label={admin ? "Navegação administrativa" : "Navegação da conta"}>
        {(admin ? adminLinks : customer ? [
          { href: "/dashboard", title: "Explorar", icon: LayoutGrid },
          { href: "/profissionais", title: "Serviços", icon: Users },
          { href: "/dashboard/seguranca", title: "Minha conta", icon: ShieldCheck },
        ] : memberLinks).map(({ href, title, icon: Icon, ...item }, index) => {
          const active = pathname === href || (index > 0 && pathname.startsWith(href + "/")) ||
            (admin && index === 0 && pathname.startsWith("/admin/perfis/"));
          return (
            <Link prefetch={true} href={href} key={href} aria-current={active ? "page" : undefined}>
              <Icon size={21} aria-hidden="true" />
              {"mobileTitle" in item && typeof item.mobileTitle === "string" ? <>
                <span className="workspace-nav-full">{title}</span>
                <span className="workspace-nav-short" aria-hidden="true">{item.mobileTitle}</span>
              </> : <span>{title}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="workspace-body page">
        {children}
      </div>
    </div>
  );
}
