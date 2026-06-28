import { gunzipSync } from "zlib";
import type { FeatureCollection, Polygon, MultiPolygon } from "geojson";
import type { ParcelCollection } from "@/types";

/**
 * Download and parse cadastre GeoJSON for a commune.
 */
export async function fetchCadastre(communeCode: string): Promise<ParcelCollection> {
  const dept = communeCode.substring(0, 2);
  const url = `https://cadastre.data.gouv.fr/data/etalab-cadastre/latest/geojson/communes/${dept}/${communeCode}/cadastre-${communeCode}-parcelles.json.gz`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Cadastre fetch failed for ${communeCode}: ${res.status} ${res.statusText}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const decompressed = gunzipSync(buffer);
  const data = JSON.parse(decompressed.toString("utf-8"));
  return data as ParcelCollection;
}

export type BuildingCollection = FeatureCollection<Polygon | MultiPolygon>;

/**
 * Download and parse buildings GeoJSON for a commune.
 */
export async function fetchBuildings(communeCode: string): Promise<BuildingCollection> {
  const dept = communeCode.substring(0, 2);
  const url = `https://cadastre.data.gouv.fr/data/etalab-cadastre/latest/geojson/communes/${dept}/${communeCode}/cadastre-${communeCode}-batiments.json.gz`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Buildings fetch failed for ${communeCode}: ${res.status} ${res.statusText}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const decompressed = gunzipSync(buffer);
  const data = JSON.parse(decompressed.toString("utf-8"));
  return data as BuildingCollection;
}

// Simple in-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function fetchCadastreCached(communeCode: string): Promise<ParcelCollection> {
  const key = `parcels_${communeCode}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as ParcelCollection;
  }

  const data = await fetchCadastre(communeCode);
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

export async function fetchBuildingsCached(communeCode: string): Promise<BuildingCollection> {
  const key = `buildings_${communeCode}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as BuildingCollection;
  }

  const data = await fetchBuildings(communeCode);
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}
