"use server";
import { redirect } from "next/navigation";
import { requireProvider } from "@/lib/security/auth";
export async function beginRevision(){const {client}=await requireProvider();const {error}=await client.rpc('start_draft');if(error)throw new Error('Não foi possível iniciar a edição.');redirect('/dashboard/perfil');}
