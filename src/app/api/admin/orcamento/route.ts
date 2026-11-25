import { NextResponse } from "next/server";
import { sessionClient } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/security/http";
import { z } from "zod";
export async function POST(request:Request){if(!sameOrigin(request))return new NextResponse(null,{status:403});try{const data=z.object({reference:z.uuid(),reason:z.string().trim().min(10).max(300)}).parse(await request.json());const client=await sessionClient();const {data:quote,error}=await client.rpc('support_quote',{p_reference:data.reference,p_reason:data.reason});if(error)return NextResponse.json({error:'Acesso negado.'},{status:403});return NextResponse.json({quote},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'Solicitação inválida.'},{status:400});}}
