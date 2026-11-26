"use client";

import { useEffect, useId, useState } from "react";
import { brazilStates, normalizeState } from "@/lib/location/brazil";

export function ServiceLocation({ region, cities: selectedCities, onChange, onPendingChange }: {
  region: string;
  cities: string[];
  onChange: (region: string, cities: string[]) => void;
  onPendingChange: (hasPendingCity: boolean) => void;
}) {
  const [result, setResult] = useState<{ key: string; cities: string[]; status: "ready" | "error" }>({ key: "", cities: [], status: "ready" });
  const [retry, setRetry] = useState(0);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(selectedCities.length === 0);
  const [message, setMessage] = useState("");
  const id = useId();
  const state = normalizeState(region);

  const key = `${state}:${retry}`;
  const cities = result.key === key ? result.cities : [];
  const status = result.key === key ? result.status : "loading";

  function addCity() {
    const city = draft.trim().replace(/\s+/g, " ");
    if (!city) { setMessage("Digite o nome de uma cidade."); return; }
    if (selectedCities.some(item => item.toLocaleLowerCase("pt-BR") === city.toLocaleLowerCase("pt-BR"))) {
      setMessage("Essa cidade já foi adicionada."); return;
    }
    if (selectedCities.length >= 30) { setMessage("Você pode adicionar até 30 cidades."); return; }
    onChange(state, [...selectedCities, city]);
    setDraft("");
    onPendingChange(false);
    setMessage("");
    setAdding(false);
  }

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
    <label className="field">Estado<select required value={state} onChange={event => { onChange(event.target.value, []); setDraft(""); onPendingChange(false); setAdding(true); setMessage(""); }}>
      <option value="">Selecione seu estado</option>
      {brazilStates.map(([code, name]) => <option key={code} value={code}>{name} ({code})</option>)}
    </select></label>
    {state && <div>
      <span className="field">Cidades onde atende</span>
      {!!selectedCities.length && <ul aria-label="Cidades adicionadas" style={{listStyle:"none",padding:0,margin:"0 0 14px",display:"grid",gap:8}}>
        {selectedCities.map((city,index)=><li key={`${city.toLocaleLowerCase("pt-BR")}-${index}`} className="pill" style={{justifyContent:"space-between",padding:"8px 12px"}}>
          <span>{city} · {state}</span>
          <button type="button" className="subtle-button" aria-label={`Remover ${city}`} onClick={()=>{onChange(state,selectedCities.filter((_,i)=>i!==index));setMessage("");}}>Remover</button>
        </li>)}
      </ul>}
      {adding ? <>
        <label className="field sr-only" htmlFor={`${id}-city`}>Nome da cidade</label>
        <input id={`${id}-city`} required={selectedCities.length===0} value={draft} list={id} maxLength={100} autoComplete="address-level2" placeholder={status === "loading" ? "Carregando sugestões…" : "Digite uma cidade, por exemplo Campinas"} onChange={event=>{setDraft(event.target.value);onPendingChange(Boolean(event.target.value.trim()));setMessage("");}} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();addCity();}}}/>
        <datalist id={id}>{cities.map(name => <option value={name} key={name} />)}</datalist>
        <div className="actions" style={{marginTop:8}}><button type="button" className="button small" onClick={addCity}>Adicionar cidade</button>{selectedCities.length>0&&<button type="button" className="subtle-button" onClick={()=>{setAdding(false);setDraft("");onPendingChange(false);setMessage("");}}>Cancelar</button>}</div>
      </> : <button type="button" className="button secondary small" onClick={()=>setAdding(true)}>Adicionar outra cidade</button>}
      <p className="fine">Escolha o estado e adicione uma ou mais cidades. Elas serão exibidas no seu perfil e usadas na busca do diretório.</p>
      {message&&<p className="notice error" role="alert">{message}</p>}
      {status === "error" && <p className="fine" role="status">Não foi possível carregar as sugestões. Você pode digitar a cidade ou <button type="button" className="subtle-button" onClick={() => setRetry(value => value + 1)}>Tentar novamente</button>.</p>}
    </div>}
  </div>;
}
