import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { backendConfigured, backendEnv } from "@/lib/env";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  if (!backendConfigured()) return response;
  const env = backendEnv();
  const client = createServerClient(env.url, env.key, {
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" },
    cookies: { getAll: () => request.cookies.getAll(), setAll(values) {
      values.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      response.headers.set("Cache-Control", "private, no-store, max-age=0");
      values.forEach(({ name, value, options }) => response.cookies.set(name, value, { ...options, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" }));
    } },
  });
  await client.auth.getUser();
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|icons/|sw.js|offline.html|favicon.ico).*)"] };
