import Link from "next/link";
import { MapPin, BadgeCheck } from "lucide-react";
import type { PublicProfile } from "@/types/domain";
export function ProviderCard({ profile: p }: { profile: PublicProfile }) {
  const image = p.documents.find(d => d.kind === "avatar" || d.kind === "logo");
  const cities = [...new Set([p.city,...p.service_areas.map(area=>area.city)].filter(Boolean))];
  return <article className="card">{image ? <img className="avatar" src={`/api/arquivos/${image.key}`} alt="" width={62} height={62} /> : <div className="avatar" aria-hidden="true">{p.display_name.slice(0,2).toUpperCase()}</div>}<span className="pill"><BadgeCheck size={15} /> Membro validado</span><h3><Link href={`/profissionais/${p.slug}`}>{p.display_name}</Link></h3><p>{p.short_description}</p><p className="micro"><MapPin size={14} style={{ display: "inline" }} /> {cities.join(", ")}{p.region ? `, ${p.region}` : ""}</p><Link className="button secondary small" href={`/profissionais/${p.slug}`}>Conhecer profissional</Link></article>;
}
