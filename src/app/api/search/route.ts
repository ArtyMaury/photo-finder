import { NextRequest, NextResponse } from "next/server";
import { fetchCadastreCached, fetchBuildingsCached } from "@/lib/cadastre";
import { filterAndScoreParcels, findParcelsWithBuildings } from "@/lib/geo";
import type { SearchResult } from "@/types";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const communeCode = params.get("communeCode");
  const communeNom = params.get("communeNom") || "";
  const surface = Number(params.get("surface"));
  const margin = params.has("margin") ? Number(params.get("margin")) : 0;
  const excludeBuilt = params.get("excludeBuilt") === "true";
  const zoneParam = params.get("zone"); // JSON string of [lng,lat][] polygon

  if (!communeCode || !surface) {
    return NextResponse.json(
      { error: "communeCode and surface are required" },
      { status: 400 }
    );
  }

  try {
    const cadastre = await fetchCadastreCached(communeCode);

    // Parse zone polygon if provided
    let zone: [number, number][] | undefined;
    if (zoneParam) {
      try {
        zone = JSON.parse(zoneParam);
      } catch {
        // ignore invalid zone
      }
    }

    // Fetch buildings if needed
    let builtParcelIds: Set<string> | undefined;
    if (excludeBuilt) {
      const buildings = await fetchBuildingsCached(communeCode);
      builtParcelIds = findParcelsWithBuildings(cadastre.features, buildings);
    }

    const candidates = filterAndScoreParcels(cadastre.features, {
      targetSurface: surface,
      marginPercent: margin,
      zone,
      builtParcelIds,
      excludeBuilt,
    });

    const result: SearchResult = {
      candidates: candidates.slice(0, 100),
      totalParcels: cadastre.features.length,
      communeCode,
      communeNom,
      targetSurface: surface,
      margin,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Search error:", error);
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
