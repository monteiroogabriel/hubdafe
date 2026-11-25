import { NextResponse } from "next/server";
import { sessionClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/env";
export async function GET(request:Request){const url=new URL(request.url);const code=url.searchParams.get('code');if(code){const client=await sessionClient();const {error}=await client.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(url.searchParams.get('next')==='/dashboard/seguranca'?'/dashboard/seguranca':'/dashboard',appUrl()));}return NextResponse.redirect(new URL('/entrar?notice=error',appUrl()));}
