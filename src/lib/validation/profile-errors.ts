import type { z } from "zod";

const labels: Record<string, string> = {
  display_name: "Nome exibido", short_description: "Descrição curta", full_description: "Apresentação detalhada",
  public_phone: "Número de contato", public_whatsapp: "Número de contato", public_email: "E-mail", website_url: "Site",
  instagram_username: "Instagram", city: "Cidade", region: "Estado", country: "País",
  title: "Nome do serviço", description: "Descrição do serviço", category_id: "Categoria",
  service_areas: "Cidades atendidas", services: "Serviços", documents: "Arquivos", photos: "Fotos", alt_text: "Descrição da foto",
};

export function profileValidationMessages(issues: z.core.$ZodIssue[]): string[] {
  return [...new Set(issues.map(issue => {
    const path = issue.path;
    const field = String(path[path.length - 1] || "");
    const service = path[0] === "services" && typeof path[1] === "number" ? `Serviço ${path[1] + 1} — ` : "";
    const label = `${service}${labels[field] || labels[String(path[0])] || "Dados do perfil"}`;
    if (field === "category_id") return `${label}: selecione uma categoria.`;
    if (field === "public_phone" || field === "public_whatsapp") return `${label}: informe um telefone válido com DDD.`;
    if (field === "public_email") return `${label}: informe um endereço de e-mail válido.`;
    if (field === "website_url") return `${label}: informe um endereço completo começando com https:// ou deixe em branco.`;
    if (field === "instagram_username") return `${label}: informe apenas o usuário, sem o link.`;
    if (issue.code === "too_small") return `${label}: preencha com pelo menos ${issue.minimum} ${issue.origin === "array" ? "itens" : "caracteres"}.`;
    if (issue.code === "too_big") return `${label}: use no máximo ${issue.maximum} ${issue.origin === "array" ? "itens" : "caracteres"}.`;
    return `${label}: confira o preenchimento antes de salvar.`;
  }))];
}
