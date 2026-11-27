"use client";
import { useState, type FormEvent } from "react";
import { PhoneInput } from "@/components/phone-input";
export function AuthForm({mode,configured}:{mode:'login'|'signup'|'recover';configured:boolean}){
 const [busy,setBusy]=useState(false);const [accountType,setAccountType]=useState('provider');
 const [error,setError]=useState('');
 async function submit(event:FormEvent<HTMLFormElement>){
 event.preventDefault();
 const form=event.currentTarget;
 if(!form.reportValidity())return;
 setError('');setBusy(true);
 try{
 const response=await fetch('/auth/operacao',{method:'POST',headers:{Accept:'application/json'},body:new FormData(form)});
 const result=await response.json();
 if(!response.ok){
 const messages:Record<string,string>={phone:'Confira o país e informe um telefone válido, incluindo o código de área quando necessário.',email:'Informe um e-mail válido.',password:'Use uma senha de pelo menos 8 caracteres.',rate_limit:'Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.',service:'Não foi possível criar a conta no momento. Tente novamente mais tarde.'};
 setError(messages[result.error]||(mode==='login'?'Não foi possível entrar. Confira o e-mail e a senha e confirme seu e-mail de cadastro.':'Não foi possível concluir o cadastro. Confira os dados ou tente entrar se já possui uma conta.'));
 setBusy(false);return;
 }
 window.location.assign(result.next);
 }catch{setError('Não foi possível conectar. Confira sua conexão e tente novamente.');setBusy(false);}
 }

 return <form action="/auth/operacao" method="post" onSubmit={submit}><input type="hidden" name="mode" value={mode}/>{mode==='signup'&&<><fieldset className="account-choice"><legend>Como você quer usar o HUB?</legend><label><input type="radio" name="account_type" value="provider" checked={accountType==='provider'} onChange={()=>setAccountType('provider')}/><span><strong>Prestar serviços</strong><small>Criar meu perfil para avaliação.</small></span></label><label><input type="radio" name="account_type" value="customer" checked={accountType==='customer'} onChange={()=>setAccountType('customer')}/><span><strong>Encontrar serviços</strong><small>Entrar como contratante.</small></span></label></fieldset><label className="field">Seu nome<input name="name" required minLength={2} maxLength={100} autoComplete="name"/></label><PhoneInput /></>}<label className="field">E-mail<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>{mode!=='recover'&&<label className="field">Senha<input name="password" type="password" autoComplete={mode==='signup'?'new-password':'current-password'} minLength={mode==='signup'?8:1} maxLength={128} required/><span className="fine">{mode==='signup'?'Pelo menos 8 caracteres.':''}</span></label>}{mode==='signup'&&<label className="check"><input type="checkbox" name="terms" required/>Li os termos de uso e o aviso de privacidade. Minha conta não publica automaticamente meus dados.</label>}{error&&<p className="notice error" role="alert">{error}</p>}{!configured&&<p className="notice error" role="alert">Ainda falta configurar a conexão com o Supabase neste ambiente.</p>}<button className="primary" disabled={!configured||busy} style={{width:'100%',marginTop:18}}>{busy?'Aguarde…':mode==='login'?'Entrar':mode==='signup'?'Criar minha conta':'Enviar instruções'}</button></form>;
}
