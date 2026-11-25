export type Category = { id?: string; slug: string; name: string; description: string; is_active?: boolean; sort_order?: number };
export type PublicProfile = {
 slug: string; display_name: string; provider_type: "individual" | "business";
 professional_name: string; business_name: string; short_description: string; full_description: string;
 public_email: string; public_phone: string; public_whatsapp: string; website_url: string;
 city: string; region: string; country: string; approved_at: string;
 service_areas: { city: string; region: string; country: string }[];
 documents: { kind: string; key: string }[];
 services: { key: string; title: string; description: string; category: string; category_slug: string; photos: { key: string; alt: string }[] }[];
};
export type Quote = { id: string; reference: string; requester_name: string; requester_email: string | null; requester_phone: string | null; preferred_contact_method: string; message: string; service_location: string; status: string; created_at: string };
export const statusNames: Record<string, string> = { draft: "Rascunho", pending_review: "Em revisão", approved: "Aprovado", rejected: "Revisar informações", suspended: "Suspenso", new: "Novo", viewed: "Visualizado", in_progress: "Em atendimento", closed: "Encerrado", spam: "Spam" };
