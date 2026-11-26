import { NextResponse } from "next/server";
import { appUrl } from "@/lib/env";
import { publicClient, sessionClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  if (tokenHash && searchParams.get("type") === "email") {
    // Confirm the address without putting the recipient's session in a browser cookie.
    const { error } = await publicClient().auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    const notice = error ? "confirmation-link-error" : "email-confirmed";
    return NextResponse.redirect(new URL(`/entrar?notice=${notice}`, appUrl()), {
      headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    });
  }

  const code = searchParams.get("code");
  if (code) {
    const client = await sessionClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      const destination = searchParams.get("next") === "/dashboard/seguranca" ? "/dashboard/seguranca" : "/dashboard";
      return NextResponse.redirect(new URL(destination, appUrl()));
    }
  }
  return NextResponse.redirect(new URL("/entrar?notice=error", appUrl()));
}
