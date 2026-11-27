"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import styles from "./reviews.module.css";

export function ReviewFilter({ value, options }: {
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selection, setSelection] = useOptimistic(value);

  function apply(next: string) {
    const params = new URLSearchParams({ estado: next });
    startTransition(() => {
      setSelection(next);
      router.replace(`/admin?${params}`, { scroll: false });
    });
  }

  return (
    <>
      <label className={`field ${styles.filters}`}>
        Mostrar
        <select name="estado" value={selection} onChange={event => apply(event.target.value)}>
          {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <span className="sr-only" role="status">{pending ? "Atualizando resultados…" : ""}</span>
    </>
  );
}
