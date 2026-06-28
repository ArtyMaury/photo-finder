"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import SearchForm from "@/components/SearchForm";
import ParcelList from "@/components/ParcelList";
import type { SearchParams, SearchResult } from "@/types";

// Leaflet must be loaded client-side only (no SSR)
const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedParcel, setSelectedParcel] = useState<string | null>(null);
  const [drawnZone, setDrawnZone] = useState<[number, number][] | null>(null);
  const [communeCenter, setCommuneCenter] = useState<[number, number] | null>(null);

  const handleSearch = useCallback(async (params: SearchParams) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setSelectedParcel(null);

    try {
      const qs = new URLSearchParams({
        communeCode: params.communeCode,
        communeNom: params.communeNom,
        surface: String(params.surface),
        margin: String(params.margin),
      });

      if (params.excludeBuilt) {
        qs.set("excludeBuilt", "true");
      }

      if (params.bounds) {
        qs.set("zone", JSON.stringify(params.bounds));
      }

      const res = await fetch(`/api/search?${qs}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la recherche");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelectParcel = useCallback((id: string) => {
    setSelectedParcel((prev) => (prev === id ? null : id));
  }, []);

  const handleZoneDrawn = useCallback((zone: [number, number][] | null) => {
    setDrawnZone(zone);
  }, []);

  const handleCommuneSelected = useCallback((center: [number, number] | null) => {
    setCommuneCenter(center);
  }, []);

  return (
    <main className="flex flex-col lg:flex-row h-screen">
      {/* Sidebar */}
      <aside className="w-full lg:w-96 p-4 overflow-y-auto bg-gray-50 border-r border-gray-200 flex-shrink-0">
        <SearchForm onSearch={handleSearch} isLoading={isLoading} drawnZone={drawnZone} onCommuneSelected={handleCommuneSelected} />

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-2">
              {result.totalParcels} parcelles dans {result.communeNom} |{" "}
              {result.candidates.length} correspondent
            </div>
            <ParcelList
              candidates={result.candidates}
              selectedParcel={selectedParcel}
              onSelectParcel={handleSelectParcel}
            />
          </div>
        )}
      </aside>

      {/* Map area */}
      <div className="flex-1 relative">
        <Map
          candidates={result?.candidates || []}
          selectedParcel={selectedParcel}
          onSelectParcel={handleSelectParcel}
          onZoneDrawn={handleZoneDrawn}
          communeCenter={communeCenter}
        />
      </div>
    </main>
  );
}
