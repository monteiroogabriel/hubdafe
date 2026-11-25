import { NextResponse } from "next/server";
import { z } from "zod";
import { sessionClient } from "@/lib/supabase/server";
import { appUrl, backendConfigured } from "@/lib/env";
import { sameOrigin } from "@/lib/security/http";
import { parsePhoneNumberFromString } from "libphonenumber-js";
export async function POST(request:Request){
 if(!sameOrigin(request)||!backendConfigured())return NextResponse.json({error:'Operação indisponível.'},{status:403});
 const form=await request.formData();const mode=String(form.get('mode'));const go=(path:string)=>NextResponse.redirect(new URL(path,appUrl()),303);
 const client=await sessionClient();
 if(mode==='logout'){await client.auth.signOut();const response=go('/entrar?notice=signedout');response.headers.set('Clear-Site-Data','"cache"');return response;}
 const email=z.email().safeParse(form.get('email'));
 if(!email.success)return go('/entrar?notice=error');
 if(mode==='recover'){
 await client.auth.resetPasswordForEmail(email.data,{redirectTo:new URL('/auth/callback?next=/dashboard/seguranca',appUrl()).href});return go('/entrar?notice=sent');
 }
 const password=z.string().min(12).max(128).safeParse(form.get('password'));if(!password.success)return go('/entrar?notice=error');
 if(mode==='signup'){
 if(form.get('terms')!=='on')return go('/cadastro?notice=error');
 const accountType=z.enum(['provider','customer']).safeParse(form.get('account_type'));
 const name=z.string().trim().min(2).max(100).safeParse(form.get('name'));
 const rawPhone=z.string().trim().min(8).max(30).safeParse(form.get('phone'));
 const parsedPhone=rawPhone.success&&rawPhone.data.startsWith('+')?parsePhoneNumberFromString(rawPhone.data):undefined;
 if(!accountType.success||!name.success||!rawPhone.success||!parsedPhone?.isValid())return go('/cadastro?notice=error');
 const {error}=await client.auth.signUp({email:email.data,password:password.data,options:{data:{account_type:accountType.data,name:name.data,phone:parsedPhone.number},emailRedirectTo:new URL('/auth/callback',appUrl()).href}});
 return go(error?'/cadastro?notice=error':'/entrar?notice=sent');
 }
 if(mode!=='login')return go('/entrar?notice=error');
 const {error}=await client.auth.signInWithPassword({email:email.data,password:password.data});
 return go(error?'/entrar?notice=error':'/dashboard');
}
