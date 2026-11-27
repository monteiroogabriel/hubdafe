import { describe,it,expect } from "vitest";
import { contactLink } from "@/lib/security/contacts";
import { phone } from "@/lib/validation/schemas";
import { validateAsset } from "@/lib/storage/validate";
import { PDFDocument,PDFName,PDFString } from "pdf-lib";
import sharp from "sharp";
describe('Input and file security',()=>{
 it('normalizes international contact links',()=>{expect(contactLink('whatsapp','+55 11 99999-9999')).toBe('https://wa.me/5511999999999');expect(contactLink('phone','11999999999')).toBeNull();expect(phone.safeParse('+34 612 345 678').success).toBe(true);});
 it('rejects unsafe website and email links',()=>{expect(contactLink('website','javascript:alert(1)')).toBeNull();expect(contactLink('website','https://user:pass@example.com')).toBeNull();expect(contactLink('email','a@example.com?subject=spam')).toBeNull();});
 it('recodes valid images without retaining EXIF',async()=>{const source=await sharp({create:{width:30,height:30,channels:3,background:'#ffffff'}}).jpeg().withMetadata().toBuffer();const result=await validateAsset(source,'image');const meta=await sharp(result.bytes).metadata();expect(result.mime).toBe('image/webp');expect(meta.exif).toBeUndefined();});
 it('rejects masquerading files',async()=>{await expect(validateAsset(Buffer.from('<html>not image</html>'),'image')).rejects.toThrow();await expect(validateAsset(Buffer.from('not a pdf document'),'pdf')).rejects.toThrow();});
 it('accepts inert PDF and rejects active actions',async()=>{const pdf=await PDFDocument.create();pdf.addPage();const clean=await pdf.save();expect((await validateAsset(clean,'pdf')).mime).toBe('application/pdf');pdf.catalog.set(PDFName.of('OpenAction'),pdf.context.obj({S:PDFName.of('JavaScript'),JS:PDFString.of('alert(1)')}));await expect(validateAsset(await pdf.save(),'pdf')).rejects.toThrow('ativos');});
 it('rejects active content hidden in a nested direct PDF dictionary',async()=>{const pdf=await PDFDocument.create();pdf.addPage();pdf.catalog.set(PDFName.of('Names'),pdf.context.obj({Custom:pdf.context.obj({JavaScript:pdf.context.obj({JS:PDFString.of('alert(1)')})})}));await expect(validateAsset(await pdf.save(),'pdf')).rejects.toThrow('ativos');});
});
