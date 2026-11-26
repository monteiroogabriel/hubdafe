"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { appUrl } from "@/lib/env";
import { publicClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/security/auth";
export async function decision(form:FormData){const {client}=await requireAdmin();const {error}=await client.rpc('decide_revision',{p_revision:String(form.get('revision')),p_approve:form.get('decision')==='approve',p_membership:form.get('membership')==='on',p_message:String(form.get('message')||''),p_note:String(form.get('note')||'')});if(error)redirect('/admin?notice=error');revalidatePath('/admin');redirect('/admin?notice=saved');}
export async function suspension(form:FormData){const {client}=await requireAdmin();const {error}=await client.rpc('set_suspension',{p_provider:String(form.get('provider')),p_suspend:form.get('suspend')==='true',p_reason:String(form.get('reason')||'')});if(error)redirect('/admin?notice=error');revalidatePath('/admin');redirect('/admin?notice=saved');}
export async function categoryAction(form:FormData){const {client}=await requireAdmin();const {error}=await client.rpc('manage_category',{p_id:form.get('id')||null,p_name:String(form.get('name')),p_slug:String(form.get('slug')),p_description:String(form.get('description')||''),p_active:form.get('active')==='on',p_order:Number(form.get('sort_order'))||0});if(error)redirect('/admin/categorias?notice=error');revalidatePath('/admin/categorias');}

export async function grantAdministrator(
  _previous: { notice: string; email: string },
  form: FormData,
): Promise<{ notice: string; email: string }> {
  const { client } = await requireAdmin();
  const parsed = z.email().max(254).safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { notice: "invalid", email: "" };
  const email = parsed.data;
  if (form.get("intent") === "resend") {
    const { data: allowed, error: eligibilityError } = await client.rpc("can_resend_administrator_confirmation", { p_email: email });
    if (eligibilityError) return { notice: "error", email };
    if (!allowed) return { notice: "resend_unavailable", email };
    const { error } = await publicClient().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: new URL("/auth/callback", appUrl()).href },
    });
    return {
      notice: error ? (error.status === 429 ? "resend_limited" : "resend_error") : "resent",
      email,
    };
  }
  if (form.get("confirm") !== "on") return { notice: "invalid", email };

  const { data, error } = await client.rpc("grant_administrator", { p_email: email });
  const outcomes = ["granted", "already_administrator", "unavailable", "confirmation_required"];
  const notice = !error && typeof data === "string" && outcomes.includes(data) ? data : "error";
  if (notice === "granted") revalidatePath("/admin/auditoria");
  return { notice, email };
}
