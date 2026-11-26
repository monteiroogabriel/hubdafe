import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { backendConfigured } from "@/lib/env";
import { sessionClient } from "@/lib/supabase/server";
export const requireUser = cache(async function requireUser() {
  if (!backendConfigured()) redirect("/entrar?notice=configuration");
  const client = await sessionClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: enabled } = await client.rpc("account_enabled");
  if (!enabled) redirect("/entrar?notice=blocked");
  return { client, user };
});
export async function requireAdmin() {
  const result = await requireUser();
  const { data } = await result.client.rpc("is_administrator");
  if (!data) redirect("/dashboard?notice=admin-denied");
  return result;
}

export async function requireProvider() {
  const result = await requireUser();
  const { data } = await result.client.from("user_roles").select("role").eq("user_id", result.user.id).eq("role", "provider").maybeSingle();
  if (!data) redirect("/dashboard");
  return result;
}
