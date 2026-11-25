import { timingSafeEqual } from "node:crypto";
import { technicalClient } from "@/lib/supabase/server";
import { secret } from "@/lib/env";
export const maxDuration=60;
export async function POST(request:Request){
 try{const expected=Buffer.from(`Bearer ${secret('CRON_SECRET')}`);const actual=Buffer.from(request.headers.get('authorization')||'');if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return new Response(null,{status:401});
 const client=technicalClient();const {data,error}=await client.rpc('prepare_cleanup');if(error)throw error;let failures=0;const done:string[]=[];
 for(const file of data.files){const a=await client.storage.from('quarantine').remove([file.object_key]);const b=await client.storage.from('validated').remove([file.object_key]);if(!a.error&&!b.error)done.push(file.id);else failures++;}
 if(done.length){const {error:ackError}=await client.rpc('ack_cleanup',{p_ids:done});if(ackError)failures++;}
 for(const user of data.users){const {error:deleteError}=await client.auth.admin.deleteUser(user);if(deleteError)failures++;}
 return Response.json({cleaned:done.length,failures},{status:failures?503:200});
 }catch{return Response.json({error:'CLEANUP_FAILED'},{status:503});}
}
