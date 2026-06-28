"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import type { ParcelCandidate } from "@/types";

interface MapProps {
  candidates: ParcelCandidate[];
  selectedParcel: string | null;
  onSelectParcel: (id: string) => void;
  onZoneDrawn: (zone: [number, number][] | null) => void;
  communeCenter: [number, number] | null; // [lng, lat]
}

const IGN_ORTHO_URL =
  "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}";

function getParcelStyle(candidate: ParcelCandidate, isSelected: boolean): L.PathOptions {
  return {
    color: isSelected ? "#f59e0b" : candidate.hasBuilding ? "#ef4444" : "#3b82f6",
    weight: isSelected ? 3 : 2,
    fillColor: isSelected ? "#fbbf24" : candidate.hasBuilding ? "#fca5a5" : "#60a5fa",
    fillOpacity: isSelected ? 0.4 : 0.2,
  };
}

export default function Map({ candidates, selectedParcel, onSelectParcel, onZoneDrawn, communeCenter }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const parcelLayersRef = useRef<Record<string, L.GeoJSON>>({});
  const candidatesRef = useRef<ParcelCandidate[]>([]);
  const onSelectParcelRef = useRef(onSelectParcel);
  onSelectParcelRef.current = onSelectParcel;

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [46.5, 2.5],
      zoom: 6,
      zoomControl: true,
    });

    L.tileLayer(IGN_ORTHO_URL, {
      attribution: "&copy; IGN - Geoplateforme",
      maxZoom: 21,
    }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);

    // Draw controls
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    const drawControl = new L.Control.Draw({
      position: "topright",
      draw: {
        polygon: {
          allowIntersection: false,
          shapeOptions: { color: "#f59e0b", weight: 2, fillOpacity: 0.1 },
        },
        rectangle: {
          shapeOptions: { color: "#f59e0b", weight: 2, fillOpacity: 0.1 },
        },
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: false,
      },
      edit: { featureGroup: drawnItems, remove: true },
    });
    map.addControl(drawControl);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.on(L.Draw.Event.CREATED, (e: any) => {
      drawnItems.clearLayers();
      drawnItems.addLayer(e.layer);
      const layer = e.layer as L.Polygon;
      const latlngs = layer.getLatLngs()[0] as L.LatLng[];
      const zone: [number, number][] = latlngs.map((ll) => [ll.lng, ll.lat]);
      onZoneDrawn(zone);
    });

    map.on(L.Draw.Event.DELETED, () => onZoneDrawn(null));

    map.on(L.Draw.Event.EDITED, () => {
      const layers = drawnItems.getLayers();
      if (layers.length > 0) {
        const layer = layers[0] as L.Polygon;
        const latlngs = layer.getLatLngs()[0] as L.LatLng[];
        const zone: [number, number][] = latlngs.map((ll) => [ll.lng, ll.lat]);
        onZoneDrawn(zone);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Zoom to commune when selected
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !communeCenter) return;
    map.setView([communeCenter[1], communeCenter[0]], 14);
  }, [communeCenter]);

  // Fit bounds only when candidates change (new search)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || candidates.length === 0) return;

    const fc = {
      type: "FeatureCollection" as const,
      features: candidates.map((c) => c.feature),
    };
    const allFeatures = L.geoJSON(fc as unknown as GeoJSON.FeatureCollection);
    const bounds = allFeatures.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates]);

  // Build parcel layers when candidates change (NOT on selection change)
  useEffect(() => {
    const layerGroup = layerGroupRef.current;
    if (!layerGroup) return;

    layerGroup.clearLayers();
    parcelLayersRef.current = {};
    candidatesRef.current = candidates;

    if (candidates.length === 0) return;

    candidates.forEach((candidate) => {
      const layer = L.geoJSON(candidate.feature, {
        style: getParcelStyle(candidate, false),
      });

      // Street View popup — Leaflet opens it on click natively
      const [lng, lat] = candidate.center;
      const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
      layer.bindPopup(
        `<div style="font-size:13px;min-width:150px;">
          <strong>${candidate.section} ${candidate.numero}</strong><br/>
          ${candidate.contenance || candidate.computedArea} m²
          ${candidate.hasBuilding ? '<br/><span style="color:#ef4444;">⚠ Bâti</span>' : ""}
          <br/><a href="${streetViewUrl}" target="_blank" rel="noopener" style="color:#2563eb;text-decoration:underline;font-weight:600;font-size:14px;display:inline-block;margin-top:6px;">
            🗺️ Voir en Street View →
          </a>
        </div>`,
        { closeButton: true }
      );

      layer.bindTooltip(
        `${candidate.section}${candidate.numero}<br/>${candidate.contenance || candidate.computedArea} m²${candidate.hasBuilding ? "<br/>⚠ Bâti" : ""}`,
        { sticky: true }
      );

      layer.on("click", () => {
        onSelectParcelRef.current(candidate.id);
      });

      parcelLayersRef.current[candidate.id] = layer;
      layerGroup.addLayer(layer);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates]);

  // Update styles on selection change WITHOUT rebuilding layers (popup stays open)
  useEffect(() => {
    const layers = parcelLayersRef.current;
    const cands = candidatesRef.current;

    cands.forEach((candidate) => {
      const layer = layers[candidate.id];
      if (!layer) return;
      const isSelected = candidate.id === selectedParcel;
      layer.setStyle(getParcelStyle(candidate, isSelected));
    });
  }, [selectedParcel]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px] rounded-lg overflow-hidden"
    />
  );
}
