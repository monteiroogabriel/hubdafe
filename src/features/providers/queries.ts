import "server-only";
import { backendConfigured } from "@/lib/env";
import { publicClient } from "@/lib/supabase/server";
import type { Category, PublicProfile } from "@/types/domain";
export async function directory(query = "", category = "", city = "", page = 1): Promise<{ items: PublicProfile[]; total: number; unavailable: boolean }> {
  if (!backendConfigured()) return { items: [], total: 0, unavailable: true };
  const { data, error } = await publicClient().rpc("search_directory", { p_query: query, p_category: category, p_city: city, p_page: page });
  if (error) return { items: [], total: 0, unavailable: true };
  return { ...(data as { items: PublicProfile[]; total: number }), unavailable: false };
}
export async function categories(): Promise<Category[]> {
  if (!backendConfigured()) return [];
  const { data, error } = await publicClient().rpc("public_categories");
  if (error) return [];
  return data as Category[];
}
export async function publicProfile(slug: string): Promise<PublicProfile | null> {
  if (!backendConfigured()) return null;
  const { data, error } = await publicClient().rpc("get_public_profile", { p_slug: slug });
  if (error) throw new Error("DIRECTORY_UNAVAILABLE");
  return data as PublicProfile | null;
}
