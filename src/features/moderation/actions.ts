"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/security/auth";
export async function decision(form:FormData){const {client}=await requireAdmin();const {error}=await client.rpc('decide_revision',{p_revision:String(form.get('revision')),p_approve:form.get('decision')==='approve',p_membership:form.get('membership')==='on',p_message:String(form.get('message')||''),p_note:String(form.get('note')||'')});if(error)redirect('/admin?notice=error');revalidatePath('/admin');redirect('/admin?notice=saved');}
export async function suspension(form:FormData){const {client}=await requireAdmin();const {error}=await client.rpc('set_suspension',{p_provider:String(form.get('provider')),p_suspend:form.get('suspend')==='true',p_reason:String(form.get('reason')||'')});if(error)redirect('/admin?notice=error');revalidatePath('/admin');redirect('/admin?notice=saved');}
export async function categoryAction(form:FormData){const {client}=await requireAdmin();const {error}=await client.rpc('manage_category',{p_id:form.get('id')||null,p_name:String(form.get('name')),p_slug:String(form.get('slug')),p_description:String(form.get('description')||''),p_active:form.get('active')==='on',p_order:Number(form.get('sort_order'))||0});if(error)redirect('/admin/categorias?notice=error');revalidatePath('/admin/categorias');}
