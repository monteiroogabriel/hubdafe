import Link from "next/link";
import { Search } from "lucide-react";
import { directory, categories } from "@/features/providers/queries";
import { ProfessionalFilters } from "@/components/professional-filters";
import { ProviderCard } from "@/components/provider-card";

export const dynamic = "force-dynamic";
export const metadata = { title: "Encontre profissionais", alternates: { canonical: "/profissionais" } };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function Directory({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const read = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
  };
  const query = read("q").slice(0, 100);
  const category = read("categoria").slice(0, 100);
  const city = read("cidade").slice(0, 100);
  const page = Math.min(500, Math.max(1, Math.floor(Number(read("pagina")) || 1)));
  const hasFilters = Boolean(query || category || city);

  const [result, availableCategories] = await Promise.all([
    directory(query, category, city, page),
    categories(),
  ]);
  const all = hasFilters && !result.unavailable && result.total === 0 ? await directory() : result;
  const noPublishedProfiles = !all.unavailable && all.total === 0;
  const categoryOptions = availableCategories.map(({ slug, name }) => ({ slug, name }));
  if (category && !categoryOptions.some(item => item.slug === category)) {
    categoryOptions.push({ slug: category, name: "Categoria indisponível" });
  }
  const pageLink = (number: number) => `/profissionais?${new URLSearchParams({
    q: query, categoria: category, cidade: city, pagina: String(number),
  })}`;

  return (
    <div className="container page">
      <div className="breadcrumbs"><Link href="/">Início</Link> / Encontrar serviços</div>
      <div className="page-head">
        <h1>Encontre profissionais</h1>
        <p>Busque por nome, serviço ou cidade.</p>
      </div>
      <ProfessionalFilters query={query} category={category} city={city} categories={categoryOptions} />

      {result.unavailable ? (
        <div className="notice" role="status">A busca de profissionais está temporariamente indisponível. Tente novamente mais tarde.</div>
      ) : (
        <>
          <div role="status" aria-atomic="true">
            {result.items.length > 0 ? (
              <p>{result.total} {result.total === 1 ? "profissional encontrado" : "profissionais encontrados"}</p>
            ) : (
              <div className="empty">
                <Search size={30} aria-hidden="true" />
                <h2>{noPublishedProfiles ? "Ainda não há profissionais publicados" : page > 1 && result.total > 0 ? "Nenhum perfil nesta página" : "Nenhum profissional encontrado"}</h2>
                <p>{noPublishedProfiles ? "Os perfis vão aparecer aqui depois da aprovação da comunidade." : page > 1 && result.total > 0 ? "Volte à primeira página para ver os perfis." : "Tente outro serviço, cidade ou categoria."}</p>
                {page > 1 && result.total > 0 ? (
                  <Link className="button secondary" href={pageLink(1)}>Voltar à primeira página</Link>
                ) : hasFilters && !noPublishedProfiles && (
                  <Link className="button secondary" href="/profissionais" scroll={false}>Limpar filtros</Link>
                )}
              </div>
            )}
          </div>
          {result.items.length > 0 && <div className="grid">{result.items.map(profile => <ProviderCard key={profile.slug} profile={profile} />)}</div>}
          {result.total > 20 && result.items.length > 0 && (
            <nav className="pagination" aria-label="Paginação">
              {page > 1 && <Link href={pageLink(page - 1)}>Anterior</Link>}
              <span>Página {page}</span>
              {page < 500 && page * 20 < result.total && <Link href={pageLink(page + 1)}>Próxima</Link>}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
