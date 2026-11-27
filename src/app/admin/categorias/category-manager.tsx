"use client";

import { ChevronDown, ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useLayoutEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { categoryAction, deleteCategory } from "@/features/moderation/actions";
import styles from "./categories.module.css";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  sort_order: number;
};

type DialogView =
  | { kind: "create" }
  | { kind: "edit" | "delete"; category: Category };

const pageSize = 6;
const errors = {
  invalid: "Confira os dados informados e tente novamente.",
  duplicate: "Já existe uma categoria com esse identificador.",
  missing: "Esta categoria já foi removida.",
  in_use: "Esta categoria está vinculada a serviços. Edite a categoria para desativá-la.",
  error: "Não foi possível concluir a operação. Tente novamente.",
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(true);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<DialogView | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);

  const search = normalize(query.trim());
  const matches = categories.filter(({ name, slug }) =>
    normalize(name).includes(search) || normalize(slug).includes(search),
  );
  const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const deleting = view?.kind === "delete";
  const category = view && view.kind !== "create" ? view.category : undefined;

  useLayoutEffect(() => {
    if (view && !dialog.current?.open) dialog.current?.showModal();
  }, [view]);

  function openDialog(next: DialogView) {
    setNotice("");
    setError("");
    setView(next);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setError("");

    startTransition(async () => {
      const result = await (deleting ? deleteCategory(form) : categoryAction(form))
        .catch(() => "error" as const);
      if (result === "saved" || result === "deleted") {
        setNotice(result === "saved" ? "Categoria salva." : "Categoria excluída.");
        dialog.current?.close();
      } else {
        setError(errors[result]);
      }
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Categorias</h1>
          <p>Gerencie as categorias usadas para organizar os serviços.</p>
        </div>
        <button type="button" className="button small" onClick={() => openDialog({ kind: "create" })}>
          <Plus size={17} aria-hidden="true" /> Nova categoria
        </button>
      </header>

      {notice && <p className={styles.notice} role="status">{notice}</p>}

      <div className={styles.panel}>
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Buscar categoria por nome ou identificador</span>
            <input type="search" value={query} placeholder="Buscar categoria" onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
              setExpanded(true);
            }} />
          </label>
          <button type="button" className={styles.toggle} aria-expanded={expanded}
            aria-controls="category-results" onClick={() => setExpanded(!expanded)}>
            <span>{expanded ? "Recolher" : "Mostrar lista"}</span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        </div>

        <div id="category-results" hidden={!expanded}>
          {matches.length ? (
            <ul className={styles.list} aria-label="Categorias cadastradas">
              {matches.slice(start, start + pageSize).map((item) => (
                <li key={item.id} className={styles.row}>
                  <strong>{item.name}</strong>
                  <span className={item.is_active ? styles.active : styles.inactive}>
                    {item.is_active ? "Ativa" : "Inativa"}
                  </span>
                  <div className={styles.rowActions}>
                    <button type="button" className={styles.iconButton} aria-label={`Editar ${item.name}`}
                      onClick={() => openDialog({ kind: "edit", category: item })}>
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    <button type="button" className={styles.iconButton} aria-label={`Excluir ${item.name}`}
                      onClick={() => openDialog({ kind: "delete", category: item })}>
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>
              {search ? "Nenhuma categoria corresponde à busca." : "Nenhuma categoria cadastrada."}
            </p>
          )}
        </div>

        <div className={styles.footer}>
          <span role="status">
            {matches.length > 0 && expanded && `${start + 1}–${Math.min(start + pageSize, matches.length)} de `}
            {matches.length} {matches.length === 1 ? "categoria" : "categorias"}
          </span>
          {expanded && totalPages > 1 && (
            <nav className={styles.rowActions} aria-label="Páginas de categorias">
              <button type="button" className={styles.iconButton} aria-label="Página anterior"
                disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button type="button" className={styles.iconButton} aria-label="Próxima página"
                disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </nav>
          )}
        </div>
      </div>

      <dialog ref={dialog} className={styles.dialog} aria-labelledby="category-dialog-title"
        onClose={(event) => { if (!event.currentTarget.open) setView(null); }}
        onCancel={(event) => { if (pending) event.preventDefault(); }}>
        {view && (
          <form key={`${view.kind}-${category?.id ?? ""}`} onSubmit={submit}>
            <div className={styles.dialogHeader}>
              <h2 id="category-dialog-title">
                {deleting ? "Excluir categoria" : category ? "Editar categoria" : "Nova categoria"}
              </h2>
              <button type="button" className={styles.iconButton} aria-label="Fechar" disabled={pending}
                onClick={() => dialog.current?.close()}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <fieldset className={styles.dialogBody} disabled={pending}>
              <input type="hidden" name="id" value={category?.id ?? ""} />
              {deleting ? (
                <p>Deseja excluir <strong>{category?.name}</strong>?</p>
              ) : (
                <>
                  <label className="field">Nome
                    <input name="name" defaultValue={category?.name} required minLength={2} maxLength={80} />
                  </label>
                  <label className="field">Identificador
                    <input name="slug" defaultValue={category?.slug} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                      aria-describedby="category-slug-help" title="Use letras minúsculas, números e hífens." />
                    <span id="category-slug-help" className={styles.hint}>Exemplo: serviços de limpeza → servicos-de-limpeza</span>
                  </label>
                  <label className="field">Descrição <span className="sr-only">(opcional)</span>
                    <textarea name="description" defaultValue={category?.description} maxLength={500} rows={2} />
                  </label>
                  <div className={styles.settings}>
                    <label className="field">Ordem de exibição
                      <input type="number" name="sort_order" defaultValue={category?.sort_order ?? 0}
                        step={1} min={-2147483648} max={2147483647} required />
                    </label>
                    <label className={styles.checkbox}>
                      <input type="checkbox" name="active" defaultChecked={category?.is_active ?? true} />
                      Categoria ativa
                    </label>
                  </div>
                </>
              )}
              {error && <p className="notice error" role="alert">{error}</p>}
            </fieldset>
            <div className={styles.dialogFooter}>
              <button type="button" className="button secondary small" disabled={pending}
                onClick={() => dialog.current?.close()}>Cancelar</button>
              <button type="submit" className={`button small${deleting ? " danger" : ""}`} disabled={pending}>
                {pending ? "Aguarde…" : deleting ? "Excluir" : "Salvar categoria"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
