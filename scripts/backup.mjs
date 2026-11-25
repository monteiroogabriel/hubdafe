import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile, rm, chmod } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
const required=['DATABASE_URL','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SECRET_KEY','BACKUP_AGE_RECIPIENT','BACKUP_OUTPUT_DIR'];
for(const key of required)if(!process.env[key])throw new Error(`Missing configuration: ${key}`);
function run(command,args,env=process.env){return new Promise((resolvePromise,reject)=>{const child=spawn(command,args,{env,stdio:['ignore','ignore','pipe']});child.on('error',()=>reject(new Error(`Unavailable tool: ${command}`)));child.stderr.resume();child.on('close',code=>code===0?resolvePromise():reject(new Error(`${command} failed`)));});}
const connection=new URL(process.env.DATABASE_URL);const output=resolve(process.env.BACKUP_OUTPUT_DIR);await mkdir(output,{recursive:true,mode:0o700});
const work=await mkdtemp(join(tmpdir(),'hub-backup-'));await chmod(work,0o700);
const archive=join(output,`hub-${new Date().toISOString().replaceAll(':','-')}.tar.age`);
const headers={Authorization:`Bearer ${process.env.SUPABASE_SECRET_KEY}`,apikey:process.env.SUPABASE_SECRET_KEY,'Content-Type':'application/json'};
const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
try{
 await run('pg_dump',['--format=custom','--no-owner','--no-acl','--file',join(work,'database.dump')],{...process.env,PGHOST:connection.hostname,PGPORT:connection.port||'5432',PGDATABASE:connection.pathname.slice(1),PGUSER:decodeURIComponent(connection.username),PGPASSWORD:decodeURIComponent(connection.password),PGSSLMODE:'require'});
 async function objects(bucket,prefix=''){
  for(let offset=0;;offset+=100){const response=await fetch(`${base}/storage/v1/object/list/${bucket}`,{method:'POST',headers,body:JSON.stringify({prefix,limit:100,offset,sortBy:{column:'name',order:'asc'}})});if(!response.ok)throw new Error('Storage listing failed');const rows=await response.json();
   for(const item of rows){if(!/^[a-zA-Z0-9_.-]+$/.test(item.name)||item.name==='..')throw new Error('Unexpected object key');const key=prefix?`${prefix}/${item.name}`:item.name;
    if(!item.id){await objects(bucket,key);continue;}
    const file=await fetch(`${base}/storage/v1/object/authenticated/${bucket}/${key}`,{headers});if(!file.ok)throw new Error('Storage download failed');const destination=join(work,'storage',bucket,...key.split('/'));await mkdir(resolve(destination,'..'),{recursive:true,mode:0o700});await writeFile(destination,new Uint8Array(await file.arrayBuffer()),{mode:0o600});
   }if(rows.length<100)break;
  }
 }
 await mkdir(join(work,'storage'),{recursive:true,mode:0o700});
 for(const bucket of ['quarantine','validated'])await objects(bucket);
 const manifest={created_at:new Date().toISOString(),buckets:['quarantine','validated'],consistent_snapshot:false,requires_deletion_replay:true};await writeFile(join(work,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600});
 const tar=join(work,'snapshot.tar');await run('tar',['-cf',tar,'-C',work,'database.dump','storage','manifest.json']);await run('age',['-r',process.env.BACKUP_AGE_RECIPIENT,'-o',archive,tar]);
 if(process.env.BACKUP_S3_URI)await run('aws',['s3','cp',archive,process.env.BACKUP_S3_URI,'--only-show-errors']);
 console.log(`Encrypted backup created: ${archive}`);
}finally{await rm(work,{recursive:true,force:true});}
