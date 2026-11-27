import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js";
const parsePhone = (value: string) => value.startsWith("+") ? parsePhoneNumberFromString(value) : parsePhoneNumberFromString(value, "BR");
export const phone = z.string().trim().refine(v => v === "" || !!parsePhone(v)?.isValid(), "Informe um número de telefone válido.").transform(v => v ? parsePhone(v)!.number : "");
const email = z.union([z.email(), z.literal("")]);
const website = z.union([z.url().refine(v => { const u = new URL(v); return u.protocol === "https:" && !u.username && !u.password; }, "Use um endereço HTTPS sem credenciais."), z.literal("")]);
export const profileSchema = z.object({
  provider_type: z.enum(["individual", "business"]), display_name: z.string().trim().min(2).max(100),
  professional_name: z.string().max(100).default(""), business_name: z.string().max(100).default(""),
  short_description: z.string().trim().min(10).max(240), full_description: z.string().max(5000).default(""),
  public_email: email, public_phone: phone, public_whatsapp: phone, website_url: website,
  instagram_username: z.string().trim().transform(v => v.replace(/^@/, "")).pipe(z.string().regex(/^$|^[A-Za-z0-9._]{1,30}$/, "Informe apenas o usuário do Instagram, sem link.")).default(""),
  country: z.string().regex(/^[A-Z]{2}$/), region: z.string().max(100), city: z.string().max(100),
  service_areas: z.array(z.object({ country: z.string().regex(/^[A-Z]{2}$/), region: z.string().max(100), city: z.string().min(1).max(100) })).max(30),
  services: z.array(z.object({
    service_id: z.uuid().optional(), title: z.string().trim().min(2).max(120), description: z.string().trim().min(10).max(5000),
    category_id: z.uuid(), is_active: z.boolean().default(true),
    photos: z.array(z.object({ asset_id: z.uuid(), alt_text: z.string().max(200) })).max(8),
  })).max(20),
  documents: z.array(z.object({ asset_id: z.uuid(), kind: z.enum(["avatar", "logo", "presentation"]) })).max(3),
});
export type ProfileInput = z.input<typeof profileSchema>;
