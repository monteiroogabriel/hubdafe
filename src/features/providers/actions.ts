"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProvider } from "@/lib/security/auth";
import { profileSchema } from "@/lib/validation/schemas";
import { safeError } from "@/lib/security/http";
import { z } from "zod";
import { profileFieldErrors } from "@/lib/validation/profile-errors";
export async function saveProfile(id:string,version:number,input:unknown){
 const {client}=await requireProvider();const data=profileSchema.safeParse(input);
 if(!z.uuid().safeParse(id).success||!data.success)return {error:data.success?'Perfil inválido.':'Confira os campos indicados abaixo.' ,fieldErrors:data.success?{}:profileFieldErrors(data.error.issues)};
 const {data:nextVersion,error}=await client.rpc('save_revision',{p_revision:id,p_version:version,p_data:data.data});
 if(error)return {error:safeError(error)};revalidatePath('/dashboard/perfil');return {success:true,version:Number(nextVersion)};
}
export async function submitProfile(id:string,consent:boolean){const {client}=await requireProvider();const {error}=await client.rpc('submit_revision',{p_revision:id,p_consent:consent});if(error)return {error:safeError(error)};revalidatePath('/dashboard');revalidatePath('/dashboard/perfil');revalidatePath('/admin');return {success:true};}
export async function withdrawProfile(form:FormData){const {client}=await requireProvider();const {error}=await client.rpc('withdraw_revision',{p_revision:String(form.get('revision'))});if(error)throw new Error('Não foi possível retirar a submissão.');revalidatePath('/dashboard/perfil');revalidatePath('/admin');redirect('/dashboard/perfil?editar=1');}
export async function publication(form:FormData){const {client}=await requireProvider();const {error}=await client.rpc('set_publication',{p_active:form.get('active')==='true'});if(error)throw new Error('Não foi possível alterar a publicação.');revalidatePath('/dashboard');}
export async function revokeConsent(){const {client}=await requireProvider();const {error}=await client.rpc('revoke_publication_consent');if(error)throw new Error('Não foi possível retirar a autorização.');revalidatePath('/dashboard');}
