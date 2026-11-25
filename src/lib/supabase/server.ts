import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { backendEnv, secret } from "@/lib/env";
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
export async function sessionClient() {
  const env = backendEnv();
  const jar = await cookies();
  return createServerClient(env.url, env.key, { cookieOptions, cookies: {
    getAll: () => jar.getAll(),
    setAll: (values) => { try { values.forEach(({ name, value, options }) => jar.set(name, value, { ...options, ...cookieOptions })); } catch { /* Server Components cannot write; proxy renews sessions. */ } },
  } });
}
export function technicalClient() {
  return createClient(backendEnv().url, secret("SUPABASE_SECRET_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
}
export function publicClient() {
  const env = backendEnv();
  return createClient(env.url, env.key, { auth: { persistSession: false, autoRefreshToken: false } });
}
