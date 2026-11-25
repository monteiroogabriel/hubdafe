import Link from "next/link";
import { ArrowRight, ArrowUpRight, Search, ShieldCheck, UsersRound } from "lucide-react";
import { BrandMark } from "@/components/layout/brand";
import { ProviderCard } from "@/components/provider-card";
import { categories, directory } from "@/features/providers/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [topics, result] = await Promise.all([categories(), directory()]);

  return (
    <div className="home">
      <section className="home-intro">
        <div className="container home-intro-grid">
          <div>
            <p className="home-label">Diretório da comunidade</p>
            <h1>Encontre profissionais <em>do HUB da Fé.</em></h1>
            <p className="home-lead">Tem um serviço em mente? Busque por profissionais e empresas da comunidade e fale direto com quem pode ajudar.</p>
            <form className="home-search" action="/profissionais" aria-label="Buscar no diretório">
              <div className="home-search-field">
                <Search size={19} aria-hidden="true" />
                <label className="sr-only" htmlFor="home-search">Serviço ou nome do profissional</label>
                <input id="home-search" name="q" placeholder="Serviço ou nome do profissional" maxLength={100} />
              </div>
              <button className="primary" type="submit">Buscar <ArrowRight size={17} aria-hidden="true" /></button>
            </form>
          </div>
          <aside className="home-community" aria-label="Sobre a lista de profissionais">
            <div className="home-community-mark"><BrandMark size={80} /></div>
            <div>
              <h2>O que você encontra aqui?</h2>
              <p><ShieldCheck size={18} aria-hidden="true" /> Uma lista de profissionais e empresas da comunidade que oferecem serviços. A liderança do HUB confirma o vínculo de cada pessoa antes de mostrar seu perfil.</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="section home-directory">
        <div className="container">
          <div className="section-title">
            <h2>Explore o diretório</h2>
            <Link className="inline-link" href="/profissionais">Ver todos <ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
          {topics.length > 0 && (
            <div className="category-list home-categories">
              {topics.slice(0, 8).map(topic => <Link className="category-link" href={`/profissionais?categoria=${topic.slug}`} key={topic.slug}>{topic.name}</Link>)}
            </div>
          )}
          {result.items.length > 0 ? (
            <div className="grid">{result.items.slice(0, 6).map(profile => <ProviderCard key={profile.slug} profile={profile} />)}</div>
          ) : (
            <div className="home-empty">
              <span className="tile-icon"><UsersRound size={22} aria-hidden="true" /></span>
              <div>
                <h3>{result.unavailable ? "Diretório indisponível no momento" : "Ainda não há profissionais publicados"}</h3>
                <p>{result.unavailable ? "Tente acessar novamente mais tarde." : "Os perfis aparecem aqui após a avaliação da liderança."}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section home-about" id="proposito">
        <div className="container home-about-grid">
          <div>
            <h2>Sobre o HUB da Fé</h2>
            <p>O HUB reúne profissionais e empreendedores cristãos para trocar experiências, compartilhar conhecimento e se apoiar no trabalho. O diretório é a forma de encontrar os serviços dessa rede.</p>
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
