"use client";

import Link from "next/link";
import { useState } from "react";

export function QuoteForm({ provider, services, selected }: { provider: string; services: { key: string; title: string }[]; selected: string }) {
  const [method, setMethod] = useState("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [id, setId] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const key = id || crypto.randomUUID();
    setId(key);
    try {
      const response = await fetch("/api/orcamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          service: form.get("service"),
          name: form.get("name"),
          contact_method: method,
          email: method === "email" ? form.get("email") : "",
          phone: method !== "email" ? form.get("phone") : "",
          message: form.get("message"),
          location: form.get("location"),
          acknowledged: form.get("acknowledged") === "on",
          company_website: form.get("company_website"),
          idempotency_key: key,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setReference(data.reference);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha de conexão. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  if (reference) return <div className="notice success" role="status"><h2>Solicitação registrada</h2><p>Seu pedido já está disponível no painel do profissional. O contato será feito pelos canais que você informou.</p><p className="fine">Referência: {reference}</p><Link href={`/profissionais/${provider}`}>Voltar ao perfil</Link></div>;

  return <form onSubmit={submit}>
    <label className="field">Seu nome<input required name="name" minLength={2} maxLength={100} autoComplete="name" /></label>
    <label className="field">Serviço<select name="service" defaultValue={selected}><option value="">Quero conversar sobre meus serviços</option>{services.map(service => <option key={service.key} value={service.key}>{service.title}</option>)}</select></label>
    <label className="field">Como você prefere ser contatado?<select value={method} onChange={event => { setMethod(event.target.value); setId(""); }}><option value="email">E-mail</option><option value="phone">Telefone</option><option value="whatsapp">WhatsApp</option></select></label>
    {method === "email" ? <label className="field">Seu e-mail<input required type="email" name="email" autoComplete="email" /></label> : <label className="field">Seu telefone, com código do país<input required type="tel" name="phone" placeholder="+55…" autoComplete="tel" /></label>}
    <label className="field">O que você precisa?<textarea required name="message" minLength={10} maxLength={3000} placeholder="Conte sobre o serviço, sem incluir documentos ou informações sensíveis." /></label>
    <label className="field">Cidade ou local do serviço (opcional)<input name="location" maxLength={150} /></label>
    <div className="hidden-trap" aria-hidden="true"><label>Website da empresa<input name="company_website" tabIndex={-1} autoComplete="off" /></label></div>
    <label className="check"><input required type="checkbox" name="acknowledged" />Li o aviso de privacidade e estou ciente de que meu nome, contato e mensagem serão compartilhados com este profissional para responder à solicitação.</label>
    <p className="fine"><Link href="/privacidade">Ler aviso de privacidade</Link></p>
    {error && <p className="notice error" role="alert">{error}</p>}
    <button className="primary" disabled={busy}>{busy ? "Enviando…" : "Enviar solicitação"}</button>
  </form>;
}
