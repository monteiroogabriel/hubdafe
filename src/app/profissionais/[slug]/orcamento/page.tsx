import { redirect } from "next/navigation";

export default async function OldQuotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/profissionais/${encodeURIComponent(slug)}`);
}
