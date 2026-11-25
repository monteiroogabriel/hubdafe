import { NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin } from "@/lib/security/http";
import { sessionClient } from "@/lib/supabase/server";
export async function POST(request:Request){
 const fail=(status=400)=>NextResponse.json({error:'Não foi possível concluir. Verifique os dados e tente novamente.'},{status});
 if(!sameOrigin(request))return fail(403);
 try{const client=await sessionClient();const {data:{user}}=await client.auth.getUser();if(!user)return fail(401);const {data:enabled}=await client.rpc('account_enabled');if(!enabled)return fail(403);const body=await request.json();
 if(body.action==='enroll'){const {data:existing}=await client.auth.mfa.listFactors();for(const f of existing?.all||[]){if(f.status==='unverified')await client.auth.mfa.unenroll({factorId:f.id});}const {data,error}=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'HUB da Fé'});if(error)return fail();return NextResponse.json({factor:data.id,qr:data.totp.qr_code.startsWith('data:image/svg+xml')?data.totp.qr_code:`data:image/svg+xml;base64,${Buffer.from(data.totp.qr_code).toString('base64')}`,message:'Escaneie o QR code e confirme um código.'});}
 if(body.action==='factor'){const {data,error}=await client.auth.mfa.listFactors();const factor=data?.totp.find(f=>f.status==='verified');if(error||!factor)return fail();return NextResponse.json({factor:factor.id,message:'Digite o código do seu aplicativo autenticador.'});}
 if(body.action==='verify'){if(!z.uuid().safeParse(body.factor).success||!z.string().regex(/^\d{6}$/).safeParse(body.code).success)return fail();const {error}=await client.auth.mfa.challengeAndVerify({factorId:body.factor,code:body.code});if(error)return fail();return NextResponse.json({message:'Autenticação reforçada. Você já pode acessar as funções autorizadas.'});}
 if(body.action==='password'||body.action==='email'){const field=body.action==='password'?'password':'email';const check=field==='password'?z.string().min(12).max(128):z.email();const value=check.safeParse(body[field]);if(!value.success)return fail();const {error}=await client.auth.updateUser({[field]:value.data});if(error)return fail();return NextResponse.json({message:field==='email'?'Confira as mensagens de confirmação nos seus e-mails.':'Senha atualizada.'});}
 if(body.action==='revoke'||body.action==='delete'){const {error}=await client.rpc(body.action==='delete'?'request_account_deletion':'revoke_publication_consent');if(error)return fail();if(body.action==='delete')await client.auth.signOut();return NextResponse.json({message:'Seu perfil foi retirado do diretório.'});}return fail();
 }catch{return fail(503);}
}
