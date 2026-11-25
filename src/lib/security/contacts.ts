import { parsePhoneNumberFromString } from "libphonenumber-js";
export function contactLink(kind: "phone" | "whatsapp" | "email" | "website", value: string): string | null {
  if (!value) return null;
  if (kind === "email") return /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(value) ? `mailto:${encodeURIComponent(value)}` : null;
  if (kind === "website") { try { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password ? u.href : null; } catch { return null; } }
  const p = parsePhoneNumberFromString(value);
  if (!value.startsWith("+") || !p?.isValid()) return null;
  return kind === "phone" ? `tel:${p.number}` : `https://wa.me/${p.number.slice(1)}`;
}
