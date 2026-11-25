import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { quoteSchema } from "@/lib/validation/schemas";
import { sameOrigin } from "@/lib/security/http";
import { technicalClient } from "@/lib/supabase/server";
import { appUrl, secret } from "@/lib/env";
export async function POST(request:Request){
 const fail=(error:string,status=400)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
 if(!sameOrigin(request))return fail('Origem inválida.',403);
 if(Number(request.headers.get('content-length'))>16000)return fail('Solicitação muito grande.',413);
 try{
 const raw=await request.text();if(raw.length>16000)return fail('Solicitação muito grande.',413);
 const parsed=quoteSchema.safeParse(JSON.parse(raw));if(!parsed.success)return fail('Verifique os campos, seu contato e o aceite do aviso de privacidade.');const data=parsed.data;
 const client=technicalClient();const hmac=(v:string)=>createHmac('sha256',secret('ABUSE_HMAC_SECRET')).update(v).digest('hex');
 // Vercel owns this header. Never trust caller-controlled forwarded headers on other deployments.
 const ip=process.env.VERCEL?request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim():process.env.NODE_ENV==='production'?null:'local-development';
 if(!ip)return fail('O envio está temporariamente indisponível.',503);
 const contact=data.contact_method==='email'?data.email.toLowerCase():data.phone;
 const {data:allowed,error:limitError}=await client.rpc('consume_quote_limit',{p_ip:hmac(ip),p_contact:hmac(`${data.provider}:${contact}`)});
 if(limitError)return fail('O envio está temporariamente indisponível.',503);if(!allowed)return fail('Muitas tentativas. Aguarde e tente novamente.',429);
 const payload={name:data.name,contact_method:data.contact_method,email:data.email,phone:data.phone,message:data.message,location:data.location};
 const {data:reference,error}=await client.rpc('create_quote',{p_slug:data.provider,p_service:data.service||null,p_data:payload,p_key:data.idempotency_key,p_fingerprint:hmac(JSON.stringify([data.provider,data.service,payload]))});
 if(error){if(error.message.includes('IDEMPOTENCY_CONFLICT'))return fail('Esta tentativa já foi usada com outros dados. Reabra o formulário.',409);return fail('O profissional ou serviço não está disponível para receber solicitações.',409);}
 return NextResponse.json({reference},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch{return fail('Não foi possível enviar agora. Tente novamente mais tarde.',503);}
}
