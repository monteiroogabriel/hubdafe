"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { appUrl } from "@/lib/env";
import { publicClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/security/auth";
export async function decision(form:FormData){const {client}=await requireAdmin();const {error}=await client.rpc('decide_revision',{p_revision:String(form.get('revision')),p_approve:form.get('decision')==='approve',p_membership:form.get('membership')==='on',p_message:String(form.get('message')||''),p_note:String(form.get('note')||'')});if(error)redirect('/admin?notice=error');revalidatePath('/admin');redirect('/admin?notice=saved');}
export async function suspension(form:FormData){const {client}=await requireAdmin();const {error}=await client.rpc('set_suspension',{p_provider:String(form.get('provider')),p_suspend:form.get('suspend')==='true',p_reason:String(form.get('reason')||'')});if(error)redirect('/admin?notice=error');revalidatePath('/admin');redirect('/admin?notice=saved');}
const categoryPath = "/admin/categorias";
const categoryInput = z.object({
  id: z.union([z.uuid(), z.literal("")]),
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(500),
  order: z.coerce.number().int().min(-2147483648).max(2147483647),
});

export async function categoryAction(form: FormData) {
  const { client } = await requireAdmin();
  const parsed = categoryInput.safeParse({
    id: form.get("id"),
    name: form.get("name"),
    slug: form.get("slug"),
    description: form.get("description"),
    order: form.get("sort_order"),
  });
  if (!parsed.success) return "invalid";

  const { data, error } = await client.rpc("manage_category", {
    p_id: parsed.data.id || null,
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_description: parsed.data.description,
    p_active: form.get("active") === "on",
    p_order: parsed.data.order,
  });
  if (error) return error.code === "23505" ? "duplicate" : "error";
  if (!data) return "missing";
  revalidatePath(categoryPath);
  revalidatePath("/admin/auditoria");
  return "saved";
}

export async function deleteCategory(form: FormData) {
  const { client } = await requireAdmin();
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return "invalid";

  const { data, error } = await client.rpc("delete_category", { p_id: id.data });
  if (error) return "error";
  if (data === "in_use") return "in_use";
  if (data !== "deleted") return "missing";

  revalidatePath(categoryPath);
  revalidatePath("/admin/auditoria");
  return "deleted";
}

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
