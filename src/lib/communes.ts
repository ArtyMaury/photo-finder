import type { Commune } from "@/types";

const GEO_API_BASE = "https://geo.api.gouv.fr";

export async function searchCommunes(query: string): Promise<Commune[]> {
  if (!query || query.length < 2) return [];

  const url = `${GEO_API_BASE}/communes?nom=${encodeURIComponent(query)}&fields=nom,code,codeDepartement,codesPostaux,population,centre&boost=population&limit=10`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Communes API error: ${res.status}`);

  return res.json();
}

export async function getCommuneByCode(code: string): Promise<Commune | null> {
  const url = `${GEO_API_BASE}/communes/${code}?fields=nom,code,codeDepartement,codesPostaux,population`;

  const res = await fetch(url);
  if (!res.ok) return null;

  return res.json();
}
