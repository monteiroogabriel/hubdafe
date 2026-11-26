import { NextResponse } from "next/server";
import { brazilStates } from "@/lib/location/brazil";

export async function GET(request: Request) {
  const state = new URL(request.url).searchParams.get("estado") || "";
  if (!brazilStates.some(([code]) => code === state)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }
  try {
    const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state}/municipios?orderBy=nome`, {
      next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("CITIES_UNAVAILABLE");
    const data: unknown = await response.json();
    if (!Array.isArray(data) || !data.length || !data.every(item => typeof item?.nome === "string")) throw new Error("INVALID_CITIES");
    return NextResponse.json(data.map(item => ({ nome: item.nome })), { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar as cidades." }, { status: 503 });
  }
}
