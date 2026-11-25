import "server-only";
import sharp from "sharp";
import { PDFDocument, PDFDict, PDFName, PDFArray, PDFStream, type PDFObject } from "pdf-lib";
import { createHash } from "node:crypto";
export async function validateAsset(bytes:Uint8Array,kind:'image'|'pdf'){
 if(bytes.length<8||bytes.length>(kind==='pdf'?3:5)*1024*1024)throw new Error('Arquivo fora do limite permitido.');
 let output:Buffer;let mime:string;
 if(kind==='image'){
  const input=sharp(bytes,{limitInputPixels:25_000_000,animated:false,failOn:'warning'});const meta=await input.metadata();
  if(!['jpeg','png','webp'].includes(meta.format||'')||(meta.pages||1)>1)throw new Error('Use uma imagem estática JPG, PNG ou WebP.');
  output=await input.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();mime='image/webp';
 }else{
  if(Buffer.from(bytes.slice(0,5)).toString()!=='%PDF-')throw new Error('O arquivo não é um PDF válido.');
  const pdf=await PDFDocument.load(bytes,{ignoreEncryption:false,updateMetadata:false});
  if(pdf.isEncrypted||pdf.getPageCount()>50)throw new Error('Use um PDF sem senha, com até 50 páginas.');
  const forbidden=new Set(['A','JS','JavaScript','AA','OpenAction','Launch','EmbeddedFiles','EmbeddedFile','RichMedia','XFA','AcroForm','SubmitForm','ImportData','GoToR','Rendition','Movie','Sound','FileAttachment']);
  const visited=new WeakSet<PDFObject>();let count=0;
  function inspect(object:PDFObject,depth=0){
   if(depth>64||++count>100000)throw new Error('PDF excessivamente complexo.');
   if(visited.has(object))return;visited.add(object);
   if(object instanceof PDFName&&forbidden.has(object.decodeText()))throw new Error('O PDF contém recursos ativos ou anexos não permitidos.');
   if(object instanceof PDFDict)for(const [key,value] of object.entries()){if(forbidden.has(key.decodeText()))throw new Error('O PDF contém recursos ativos ou anexos não permitidos.');inspect(value,depth+1);}
   else if(object instanceof PDFArray)for(const value of object.asArray())inspect(value,depth+1);
   else if(object instanceof PDFStream)inspect(object.dict,depth+1);
  }
  for(const [,object] of pdf.context.enumerateIndirectObjects())inspect(object);
  output=Buffer.from(await pdf.save({useObjectStreams:false}));mime='application/pdf';
 }
 if(output.length>3*1024*1024)throw new Error('O arquivo processado excede 3 MB. Reduza seu tamanho.');
 return {bytes:output,mime,hash:createHash('sha256').update(output).digest('hex')};
}
