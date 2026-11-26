import { ProfileDialog } from "@/components/profile-dialog";
import { requireProvider } from "@/lib/security/auth";
import { ProfileEditor } from "@/components/profile-editor";
import { withdrawProfile } from "@/features/providers/actions";
import { statusNames } from "@/types/domain";
import { beginRevision } from "./novo/actions";
export default async function EditProfile(){
 const {client,user}=await requireProvider();const {data:profile}=await client.from('provider_profiles').select('id').eq('owner_user_id',user.id).maybeSingle();
 const {data:open}=profile?await client.from('provider_revisions').select('id').eq('provider_id',profile.id).in('state',['draft','pending_review']).maybeSingle():{data:null};
 if(!open)return <><h1>Meu perfil e serviços</h1><p>Comece uma nova versão para apresentar ou atualizar seus serviços. O conteúdo publicado permanece disponível durante a edição.</p><form action={beginRevision}><button className="primary">{profile?'Criar nova versão para edição':'Criar meu perfil'}</button></form></>;
 const id=open.id;
 const {data:r,error:readError}=await client.from('provider_revisions').select('*,service_revisions(*,service_photos(*)),provider_service_areas(*),provider_documents(*)').eq('id',id).single();if(readError)throw new Error('PROFILE_UNAVAILABLE');
 if(r.state!=='draft')return <><h1>Seu perfil está em revisão</h1><p className="badge">{statusNames[r.state]}</p><p>As informações enviadas ficam congeladas até a decisão. Se precisar alterar algo, retire a submissão.</p><form action={withdrawProfile}><input type="hidden" name="revision" value={r.id}/><button className="primary">Retirar submissão para editar</button></form></>;
 const [{data:cats},{data:assets}]=await Promise.all([client.from('categories').select('id,name,is_active').order('sort_order'),client.from('file_assets').select('id,public_key,kind,original_name').eq('provider_id',r.provider_id).eq('state','ready')]);
 const initial={provider_type:r.provider_type,display_name:r.display_name,professional_name:r.professional_name,business_name:r.business_name,short_description:r.short_description,full_description:r.full_description,public_email:r.public_email,public_phone:r.public_phone,public_whatsapp:r.public_whatsapp,website_url:r.website_url,instagram_username:r.instagram_username||'',country:r.country,region:r.region,city:r.city,
 service_areas:r.provider_service_areas.map((a:{city:string;region:string;country:string})=>({city:a.city,region:a.region,country:a.country})),
 services:r.service_revisions.sort((a:{sort_order:number},b:{sort_order:number})=>a.sort_order-b.sort_order).map((s:{service_id:string;title:string;description:string;category_id:string;is_active:boolean;service_photos:{asset_id:string;alt_text:string;sort_order:number}[]})=>({service_id:s.service_id,title:s.title,description:s.description,category_id:s.category_id,is_active:s.is_active,photos:s.service_photos.sort((a,b)=>a.sort_order-b.sort_order).map(p=>({asset_id:p.asset_id,alt_text:p.alt_text}))})),
 documents:r.provider_documents.map((d:{asset_id:string;kind:'avatar'|'logo'|'presentation'})=>({asset_id:d.asset_id,kind:d.kind}))};
 return <><h1>Meu perfil e serviços</h1><ProfileDialog><ProfileEditor key={`${id}:${r.version}`} id={id} version={r.version} initial={initial} categories={cats||[]} assets={assets||[]}/></ProfileDialog></>;
}
