import { notFound } from "next/navigation";
import { publicProfile } from "@/features/providers/queries";
import { QuoteForm } from "@/components/quote-form";
export const dynamic='force-dynamic';export const metadata={title:'Solicitar orçamento',robots:{index:false,follow:false}};
export default async function QuotePage({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{servico?:string}>}){const {slug}=await params;const {servico}=await searchParams;const p=await publicProfile(slug);if(!p)notFound();return <div className="form-shell"><p className="eyebrow">Uma nova conexão</p><h1>Solicitar orçamento</h1><p>Sua mensagem será enviada para <strong>{p.display_name}</strong>. Você não precisa criar uma conta.</p><QuoteForm provider={slug} services={p.services} selected={p.services.some(s=>s.key===servico)?servico||'':''}/></div>}
