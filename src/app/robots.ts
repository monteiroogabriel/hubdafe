import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";
export default function robots():MetadataRoute.Robots{return {rules:process.env.LEGAL_APPROVED==='true'?{userAgent:'*',allow:'/',disallow:['/dashboard/','/admin/','/api/','/auth/','/entrar','/recuperar']}:{userAgent:'*',disallow:'/'},sitemap:`${appUrl()}/sitemap.xml`};}
