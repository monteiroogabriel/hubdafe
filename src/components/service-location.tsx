"use client";

import { useEffect, useId, useState } from "react";
import { brazilStates, normalizeState } from "@/lib/location/brazil";

export function ServiceLocation({ region, city, onChange }: {
  region: string;
  city: string;
  onChange: (region: string, city: string) => void;
}) {
  const [result, setResult] = useState<{ key: string; cities: string[]; status: "ready" | "error" }>({ key: "", cities: [], status: "ready" });
  const [retry, setRetry] = useState(0);
  const id = useId();
  const state = normalizeState(region);

  const key = `${state}:${retry}`;
  const cities = result.key === key ? result.cities : [];
  const status = result.key === key ? result.status : "loading";

  useEffect(() => {
    if (!state) return;
    const controller = new AbortController();
    let active = true;
    fetch(`/api/localidades?estado=${state}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("CITIES_UNAVAILABLE");
        const data: unknown = await response.json();
        if (!Array.isArray(data) || !data.length || !data.every(item => typeof item?.nome === "string")) throw new Error("INVALID_CITIES");
        if (active) { setResult({ key, cities: data.map(item => item.nome), status: "ready" }); }
      })
      .catch(() => { if (active) setResult({ key, cities: [], status: "error" }); });
    return () => { active = false; controller.abort(); };
  }, [state, key]);

  return <div className="form-grid">
    <label className="field">Estado<select required value={state} onChange={event => onChange(event.target.value, "")}>
      <option value="">Selecione seu estado</option>
      {brazilStates.map(([code, name]) => <option key={code} value={code}>{name} ({code})</option>)}
    </select></label>
    {state && <div>
      <label className="field">Cidade<input required value={city} list={id} maxLength={100} autoComplete="address-level2" placeholder={status === "loading" ? "Carregando cidades…" : "Digite para buscar sua cidade"} onChange={event => onChange(state, event.target.value)} /></label>
      <datalist id={id}>{cities.map(name => <option value={name} key={name} />)}</datalist>
      {status === "error" && <p className="fine" role="status">Não foi possível carregar as sugestões. Você pode digitar a cidade ou <button type="button" className="subtle-button" onClick={() => setRetry(value => value + 1)}>Tentar novamente</button>.</p>}
    </div>}
  </div>;
}
