import { NextResponse } from "next/server";
import { z } from "zod";
import { sessionClient, technicalClient } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/security/http";
import { validateAsset } from "@/lib/storage/validate";
export const maxDuration=30;
export async function POST(request:Request){if(!sameOrigin(request))return new NextResponse(null,{status:403});try{const {id}=z.object({id:z.uuid()}).parse(await request.json());const client=await sessionClient();const {data:{user}}=await client.auth.getUser();if(!user)return new NextResponse(null,{status:401});const {data:asset,error}=await client.from('file_assets').select('*,provider_profiles!inner(owner_user_id)').eq('id',id).eq('provider_profiles.owner_user_id',user.id).single();if(error||asset.state!=='quarantine')return new NextResponse(null,{status:403});const technical=technicalClient();const {data:blob,error:downloadError}=await technical.storage.from('quarantine').download(asset.object_key);if(downloadError||!blob)throw new Error('Upload incompleto.');
 let processed;try{if(blob.size!==asset.size_bytes)throw new Error('Tamanho diferente do reservado.');processed=await validateAsset(new Uint8Array(await blob.arrayBuffer()),asset.kind);}catch{await technical.rpc('finalize_upload',{p_id:id,p_user:user.id,p_size:asset.size_bytes,p_mime:'',p_hash:'',p_valid:false});return NextResponse.json({error:'Arquivo rejeitado: confira formato, tamanho e conteúdo permitido.'},{status:400});}
 const {error:uploadError}=await technical.storage.from('validated').upload(asset.object_key,processed.bytes,{contentType:processed.mime,upsert:false,cacheControl:'0'});if(uploadError)throw uploadError;
 const {error:finalizeError}=await technical.rpc('finalize_upload',{p_id:id,p_user:user.id,p_size:processed.bytes.length,p_mime:processed.mime,p_hash:processed.hash,p_valid:true});if(finalizeError)throw finalizeError;
 await technical.storage.from('quarantine').remove([asset.object_key]);return NextResponse.json({asset:{id:asset.id,public_key:asset.public_key,kind:asset.kind,original_name:asset.original_name}},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Não foi possível validar o arquivo. Tente novamente.'},{status:400});}}
