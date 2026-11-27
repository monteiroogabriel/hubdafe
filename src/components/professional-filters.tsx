"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import type { Category } from "@/types/domain";

type Filters = { q: string; categoria: string; cidade: string };
const fields = ["q", "categoria", "cidade"] as const;

export function ProfessionalFilters({ query, category, city, categories }: {
  query: string;
  category: string;
  city: string;
  categories: Pick<Category, "slug" | "name">[];
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requested = useRef("");
  const [pending, startTransition] = useTransition();

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    const filters = { q: query, categoria: category, cidade: city };
    if (new URLSearchParams(filters).toString() === requested.current) return;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    for (const name of fields) {
      const control = form.current?.elements.namedItem(name);
      if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
        control.value = filters[name];
      }
    }
  }, [query, category, city]);

  function apply() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    if (!form.current) return;
    const values = new FormData(form.current);
    const filters: Filters = {
      q: String(values.get("q") ?? "").trim(),
      categoria: String(values.get("categoria") ?? ""),
      cidade: String(values.get("cidade") ?? "").trim(),
    };
    if (!pending && filters.q === query && filters.categoria === category && filters.cidade === city
      && !new URLSearchParams(window.location.search).has("pagina")) return;

    requested.current = new URLSearchParams(filters).toString();
    const params = new URLSearchParams();
    for (const name of fields) {
      if (filters[name]) params.set(name, filters[name]);
    }
    startTransition(() => router.replace(params.size ? `/profissionais?${params}` : "/profissionais", { scroll: false }));
  }

  function schedule() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(apply, 350);
  }

  return (
    <form ref={form} className="filters" action="/profissionais" onSubmit={event => {
      event.preventDefault();
      apply();
    }}>
      <label className="field">
        Serviço ou profissional
        <input name="q" defaultValue={query} maxLength={100}
          placeholder="O que você está procurando?"
          onChange={event => { if (!(event.nativeEvent as InputEvent).isComposing) schedule(); }}
          onCompositionEnd={schedule} />
      </label>
      <label className="field">
        Categoria
        <select name="categoria" defaultValue={category} onChange={apply}>
          <option value="">Todas as categorias</option>
          {categories.map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}
        </select>
      </label>
      <label className="field">
        Cidade
        <input name="cidade" defaultValue={city} maxLength={100} placeholder="Em qualquer cidade"
          onChange={event => { if (!(event.nativeEvent as InputEvent).isComposing) schedule(); }}
          onCompositionEnd={schedule} />
      </label>
      <span className="sr-only" role="status">{pending ? "Atualizando resultados…" : ""}</span>
    </form>
  );
}
