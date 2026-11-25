import { z } from "zod";
const publicSchema = z.object({
  url: z.url(), key: z.string().min(10),
});
const configuredBackend = publicSchema.safeParse({ url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY });
// Inlining this validity bit avoids exposing the public key on pages that only need auth-gated rendering.
export const backendReady = configuredBackend.success;
export function backendConfigured() {
  return publicSchema.safeParse({ url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }).success;
}
export function backendPublicEnv() {
  const parsed = publicSchema.safeParse({ url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY });
  return parsed.success ? parsed.data : null;
}
export function backendEnv() {
  const parsed = publicSchema.safeParse({ url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY });
  if (!parsed.success) throw new Error("BACKEND_NOT_CONFIGURED");
  return parsed.data;
}
export function appUrl() { return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"; }
export function secret(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`CONFIGURATION_MISSING:${name}`);
  return value;
}
