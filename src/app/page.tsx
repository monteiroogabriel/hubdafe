import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/layout/brand";
import { HomeServiceCarousel } from "@/components/home-service-carousel";
import { categories } from "@/features/providers/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const topics = await categories();

  return (
    <div className="home">
      <section className="home-intro">
        <div className="container home-intro-grid">
          <div>
            <p className="home-label">Comunidade HUB da Fé</p>
            <h1>Encontre profissionais <em>e contrate serviços.</em></h1>
            <p className="home-lead">Conheça os profissionais da comunidade, explore o que oferecem e fale diretamente com quem pode ajudar.</p>
          </div>
          <aside className="home-community" aria-label="Sobre a lista de profissionais">
            <div className="home-community-mark"><BrandMark size={80} /></div>
            <div>
              <h2>O que você encontra aqui?</h2>
              <p><ShieldCheck size={18} aria-hidden="true" /> Uma lista de profissionais e empresas da comunidade que oferecem serviços e produtos. A liderança do HUB confirma o vínculo de cada pessoa antes de mostrar seu perfil.</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="section home-directory">
        <div className="container">
          <HomeServiceCarousel categories={topics} />
        </div>
      </section>

      <section className="section home-about" id="proposito">
        <div className="container home-about-grid">
          <div>
            <h2>Sobre o HUB da Fé</h2>
            <p>O HUB reúne profissionais e empreendedores cristãos para trocar experiências, compartilhar conhecimento e se apoiar no trabalho. Aqui você conhece o que essa comunidade oferece.</p>
          </div>
          <div className="home-join">
            <h3>Faz parte do HUB?</h3>
            <p>Cadastre-se para montar seu perfil e apresentar seus serviços à comunidade.</p>
            <Link className="button light" href="/cadastro">Criar minha conta <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
