import { NextResponse } from "next/server";
import { z } from "zod";
import { sessionClient } from "@/lib/supabase/server";
import { appUrl, backendConfigured } from "@/lib/env";
import { sameOrigin } from "@/lib/security/http";
import { getCountries, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";
export async function POST(request:Request){
 if(!sameOrigin(request)||!backendConfigured())return NextResponse.json({error:'Operação indisponível.'},{status:403});
 const form=await request.formData();const mode=String(form.get('mode'));const go=(path:string)=>{
 const target=new URL(path,appUrl());
 if(request.headers.get('accept')?.includes('application/json')) {
 const notice=target.searchParams.get('notice');
 const failed=!!notice && !['sent','signedout'].includes(notice);
 return NextResponse.json({next:target.pathname+target.search,error:failed?notice:null},{status:failed?400:200});
 }
 return NextResponse.redirect(target,303);
 };
 const client=await sessionClient();
 if(mode==='logout'){await client.auth.signOut();const response=go('/entrar?notice=signedout');response.headers.set('Clear-Site-Data','"cache"');return response;}
 const email=z.email().safeParse(form.get('email'));
 if(!email.success)return go(mode==='signup'?'/cadastro?notice=email':'/entrar?notice=error');
 if(mode==='recover'){
 await client.auth.resetPasswordForEmail(email.data,{redirectTo:new URL('/auth/callback?next=/dashboard/seguranca',appUrl()).href});return go('/entrar?notice=sent');
 }
 const password=z.string().min(mode==='signup'?8:1).max(128).safeParse(form.get('password'));if(!password.success)return go(mode==='signup'?'/cadastro?notice=password':'/entrar?notice=error');
 if(mode==='signup'){
 if(form.get('terms')!=='on')return go('/cadastro?notice=error');
 const name=z.string().trim().min(2).max(100).safeParse(form.get('name'));
 const rawPhone=z.string().trim().min(8).max(30).safeParse(form.get('phone'));
 const country=String(form.get('phone_country')||'');
 const validCountry=getCountries().includes(country as CountryCode);
 const parsedPhone=rawPhone.success?(rawPhone.data.startsWith('+')?parsePhoneNumberFromString(rawPhone.data):validCountry?parsePhoneNumberFromString(rawPhone.data,country as CountryCode):undefined):undefined;
 if(!rawPhone.success||!parsedPhone?.isValid())return go('/cadastro?notice=phone');
 if(!name.success)return go('/cadastro?notice=error');
 const {error}=await client.auth.signUp({email:email.data,password:password.data,options:{data:{account_type:'provider',name:name.data,phone:parsedPhone.number},emailRedirectTo:new URL('/auth/callback',appUrl()).href}});
 if(error){
 console.error('[auth] signup failed',{code:error.code,status:error.status});
 const notice=error.code==='email_address_invalid'?'email':error.status===429?'rate_limit':error.code==='weak_password'?'password':error.code==='unexpected_failure'?'service':'error';
 return go('/cadastro?notice='+notice);
 }
 return go('/confirmar-email');
 }
 if(mode!=='login')return go('/entrar?notice=error');
 const {error}=await client.auth.signInWithPassword({email:email.data,password:password.data});
 if(error?.code==='email_not_confirmed')return go('/entrar?notice=confirm');
 return go(error?'/entrar?notice=error':'/dashboard');
}
