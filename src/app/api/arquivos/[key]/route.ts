import { z } from "zod";
import { sessionClient,technicalClient } from "@/lib/supabase/server";
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{key:string}>}){
 const {key}=await params;if(!z.uuid().safeParse(key).success)return new Response(null,{status:404});
 try{const client=await sessionClient();const {data:{user}}=await client.auth.getUser();
 const technical=technicalClient();const {data:asset,error}=await technical.rpc('resolve_file',{p_key:key,p_user:user?.id||null,p_aal:'aal1'});if(error||!asset)return new Response(null,{status:404});const {data:blob,error:downloadError}=await technical.storage.from('validated').download(asset.object_key);if(downloadError||!blob)return new Response(null,{status:404});
 return new Response(await blob.arrayBuffer(),{headers:{'Content-Type':asset.mime,'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Content-Disposition':asset.kind==='pdf'?'attachment; filename="apresentacao.pdf"':'inline','Content-Security-Policy':"default-src 'none'; sandbox",'Vary':'Cookie'}});
 }catch{return new Response(null,{status:503});}
}
