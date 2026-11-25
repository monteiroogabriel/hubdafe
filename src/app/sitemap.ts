import type { MetadataRoute } from "next";
import { appUrl,backendConfigured } from "@/lib/env";
import { publicClient } from "@/lib/supabase/server";
export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{if(!backendConfigured()||process.env.LEGAL_APPROVED!=='true')return [];const {data,error}=await publicClient().rpc('public_sitemap');if(error)throw new Error('SITEMAP_UNAVAILABLE');return [{url:appUrl(),changeFrequency:'weekly'},{url:`${appUrl()}/profissionais`,changeFrequency:'daily'},...(data as {slug:string;updated_at:string}[]).map(p=>({url:`${appUrl()}/profissionais/${p.slug}`,lastModified:p.updated_at}))];}
