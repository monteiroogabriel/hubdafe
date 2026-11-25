"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/auth";
export async function changeQuoteStatus(form:FormData){const {client}=await requireUser();const {error}=await client.rpc('update_quote_status',{p_id:String(form.get('id')),p_status:String(form.get('status'))});if(error)throw new Error('Não foi possível atualizar este orçamento.');revalidatePath('/dashboard/orcamentos');}
