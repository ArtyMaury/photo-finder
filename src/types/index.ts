import type { Feature, Polygon, MultiPolygon, FeatureCollection } from "geojson";

export interface CadastreProperties {
  id: string;
  commune: string;
  prefixe: string;
  section: string;
  numero: string;
  contenance: number;
  arpente: boolean;
}

export type ParcelFeature = Feature<Polygon | MultiPolygon, CadastreProperties>;
export type ParcelCollection = FeatureCollection<Polygon | MultiPolygon, CadastreProperties>;

export interface Commune {
  nom: string;
  code: string; // code INSEE
  codeDepartement: string;
  codesPostaux: string[];
  population?: number;
  centre?: { type: "Point"; coordinates: [number, number] }; // [lng, lat]
}

export interface SearchParams {
  communeCode: string;
  communeNom: string;
  surface: number; // m2
  margin: number; // percentage (e.g. 10 for +/-10%)
  excludeBuilt?: boolean; // exclude parcels with buildings
  bounds?: [[number, number], [number, number], [number, number], [number, number]]; // polygon zone filter [lng,lat][]
}

export interface ParcelCandidate {
  feature: ParcelFeature;
  id: string;
  section: string;
  numero: string;
  contenance: number; // m2
  computedArea: number; // m2 via turf
  surfaceDiff: number; // absolute diff from target
  surfaceDiffPercent: number; // % diff from target
  center: [number, number]; // [lng, lat]
  hasBuilding?: boolean;
}

export interface SearchResult {
  candidates: ParcelCandidate[];
  totalParcels: number;
  communeCode: string;
  communeNom: string;
  targetSurface: number;
  margin: number;
}
