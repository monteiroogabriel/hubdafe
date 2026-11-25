"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Brand } from "./brand";

function useWorkspace() {
  const pathname = usePathname();
  return ["/dashboard", "/admin"].some(path => pathname === path || pathname.startsWith(path + "/"));
}

export function Header() {
  const workspace = useWorkspace();
  const pathname = usePathname();
  if (workspace) return null;

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Navegação principal">
          <Link href="/profissionais">Diretório</Link>
          <Link href="/#proposito">Sobre o HUB</Link>
          <Link className="button secondary small" href="/entrar">Entrar</Link>
        </nav>
        <details className="mobile-nav" key={pathname}>
          <summary aria-label="Menu principal"><Menu size={22} aria-hidden="true" /></summary>
          <nav aria-label="Navegação principal">
            <Link href="/profissionais">Diretório</Link>
            <Link href="/#proposito" onClick={event => event.currentTarget.closest("details")?.removeAttribute("open")}>Sobre o HUB</Link>
            <Link href="/entrar">Entrar</Link>
            <Link href="/cadastro">Criar conta</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function Footer() {
  if (useWorkspace()) return null;

  return (
    <footer>
      <div className="container footer-grid">
        <div><Brand /><p>Rede de profissionais e empresas da comunidade.</p></div>
        <nav aria-label="Links institucionais">
          <Link href="/profissionais">Diretório</Link>
          <Link href="/dashboard">Área do prestador</Link>
        </nav>
        <nav aria-label="Termos e privacidade">
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/termos">Termos de uso</Link>
        </nav>
      </div>
    </footer>
  );
}
