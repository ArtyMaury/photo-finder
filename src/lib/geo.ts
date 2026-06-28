import * as turf from "@turf/turf";
import type { ParcelFeature, ParcelCandidate } from "@/types";
import type { Feature, Polygon, MultiPolygon, FeatureCollection } from "geojson";
import type { BuildingCollection } from "./cadastre";

/**
 * Compute area in m2 for a parcel geometry using Turf.js
 */
export function computeArea(geometry: Polygon | MultiPolygon): number {
  return turf.area(geometry);
}

/**
 * Get centroid [lng, lat] of a parcel
 */
export function getCenter(geometry: Polygon | MultiPolygon): [number, number] {
  const centroid = turf.centroid({ type: "Feature", geometry, properties: {} });
  return centroid.geometry.coordinates as [number, number];
}

/**
 * Check if a parcel center is within a polygon zone (drawn by user)
 */
export function isInZone(
  parcelCenter: [number, number],
  zone: [number, number][]
): boolean {
  const point = turf.point(parcelCenter);
  // Close the polygon ring
  const ring = [...zone, zone[0]];
  const polygon = turf.polygon([ring]);
  return turf.booleanPointInPolygon(point, polygon);
}

/**
 * Build a set of parcel IDs that have buildings on them.
 * Uses spatial index: for each building, find which parcels it intersects.
 */
export function findParcelsWithBuildings(
  parcels: ParcelFeature[],
  buildings: BuildingCollection
): Set<string> {
  const builtParcelIds = new Set<string>();

  // For performance: check if building centroid falls within parcel
  // (full intersection is too expensive for thousands of features)
  const buildingCentroids = buildings.features.map((b) => ({
    point: turf.centroid(b as Feature<Polygon | MultiPolygon>),
    geometry: b.geometry,
  }));

  for (const parcel of parcels) {
    for (const building of buildingCentroids) {
      try {
        if (turf.booleanPointInPolygon(building.point, parcel as Feature<Polygon | MultiPolygon>)) {
          builtParcelIds.add(parcel.properties.id);
          break; // One building is enough
        }
      } catch {
        // Skip invalid geometries
      }
    }
  }

  return builtParcelIds;
}

interface FilterOptions {
  targetSurface: number;
  marginPercent: number;
  zone?: [number, number][]; // polygon vertices [lng, lat]
  builtParcelIds?: Set<string>; // parcels to exclude
  excludeBuilt?: boolean;
}

/**
 * Filter parcels by surface, zone, and building criteria
 */
export function filterAndScoreParcels(
  parcels: ParcelFeature[],
  options: FilterOptions
): ParcelCandidate[] {
  const { targetSurface, marginPercent, zone, builtParcelIds, excludeBuilt } = options;
  const minSurface = targetSurface * (1 - marginPercent / 100);
  const maxSurface = targetSurface * (1 + marginPercent / 100);

  const candidates: ParcelCandidate[] = [];

  for (const feature of parcels) {
    const props = feature.properties;

    // Use contenance if available, otherwise compute with turf
    const contenance = props.contenance || 0;
    const computedArea = computeArea(feature.geometry);

    // Use contenance as primary, fallback to computed
    const effectiveSurface = contenance > 0 ? contenance : computedArea;

    // Surface filter
    if (effectiveSurface < minSurface || effectiveSurface > maxSurface) continue;

    const center = getCenter(feature.geometry);

    // Zone filter
    if (zone && zone.length >= 3 && !isInZone(center, zone)) continue;

    // Building filter
    const hasBuilding = builtParcelIds?.has(props.id) ?? false;
    if (excludeBuilt && hasBuilding) continue;

    const surfaceDiff = Math.abs(effectiveSurface - targetSurface);
    const surfaceDiffPercent = (surfaceDiff / targetSurface) * 100;

    candidates.push({
      feature,
      id: props.id,
      section: props.section,
      numero: props.numero,
      contenance: contenance,
      computedArea: Math.round(computedArea),
      surfaceDiff: Math.round(surfaceDiff),
      surfaceDiffPercent: Math.round(surfaceDiffPercent * 10) / 10,
      center,
      hasBuilding,
    });
  }

  // Sort by proximity to target surface
  candidates.sort((a, b) => a.surfaceDiff - b.surfaceDiff);

  return candidates;
}
