import type { Metadata } from "next";
import { Header, Footer } from "@/components/layout/header";
import { Pwa } from "@/components/pwa";
import { appUrl } from "@/lib/env";
import "./globals.css";
export const metadata: Metadata = { metadataBase: new URL(appUrl()), title: { default: "HUB da Fé — Profissionais com propósito", template: "%s | HUB da Fé" }, description: "Encontre profissionais e empresas da comunidade HUB da Fé. Habilidade, União e Benchmark.", applicationName: "HUB da Fé" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="pt-BR"><body><a className="skip" href="#conteudo">Pular para o conteúdo</a><Header /><main id="conteudo">{children}</main><Footer /><Pwa /></body></html>; }
