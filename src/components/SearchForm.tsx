"use client";

import { useState, useEffect, useRef } from "react";
import type { Commune, SearchParams } from "@/types";

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  isLoading: boolean;
  drawnZone: [number, number][] | null;
  onCommuneSelected: (center: [number, number] | null) => void;
}

export default function SearchForm({ onSearch, isLoading, drawnZone, onCommuneSelected }: SearchFormProps) {
  const [communeQuery, setCommuneQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Commune[]>([]);
  const [selectedCommune, setSelectedCommune] = useState<Commune | null>(null);
  const [surface, setSurface] = useState("");
  const [margin, setMargin] = useState("0");
  const [excludeBuilt, setExcludeBuilt] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!communeQuery || communeQuery.length < 2 || selectedCommune) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/communes?q=${encodeURIComponent(communeQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setShowSuggestions(true);
        }
      } catch {
        // ignore
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [communeQuery, selectedCommune]);

  const handleSelectCommune = (commune: Commune) => {
    setSelectedCommune(commune);
    setCommuneQuery(`${commune.nom} (${commune.codeDepartement})`);
    setShowSuggestions(false);
    setSuggestions([]);
    if (commune.centre) {
      onCommuneSelected(commune.centre.coordinates);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommune || !surface) return;

    onSearch({
      communeCode: selectedCommune.code,
      communeNom: selectedCommune.nom,
      surface: Number(surface),
      margin: Number(margin),
      excludeBuilt,
      bounds: drawnZone as SearchParams["bounds"],
    });
  };

  const handleCommuneInputChange = (value: string) => {
    setCommuneQuery(value);
    if (selectedCommune) {
      setSelectedCommune(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Recherche de parcelle</h2>

      {/* Commune autocomplete */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Commune
        </label>
        <input
          type="text"
          value={communeQuery}
          onChange={(e) => handleCommuneInputChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Tapez le nom d'une commune..."
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
            {suggestions.map((commune) => (
              <li
                key={commune.code}
                onMouseDown={() => handleSelectCommune(commune)}
                className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer flex justify-between"
              >
                <span>{commune.nom}</span>
                <span className="text-gray-400">{commune.codeDepartement}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Surface */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Surface (m²)
        </label>
        <input
          type="number"
          value={surface}
          onChange={(e) => setSurface(e.target.value)}
          placeholder="Ex: 800"
          min="1"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Margin */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Marge d&apos;erreur: {margin}%
        </label>
        <input
          type="range"
          value={margin}
          onChange={(e) => setMargin(e.target.value)}
          min="0"
          max="50"
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0%</span>
          <span>50%</span>
        </div>
      </div>

      {/* Exclude built */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="excludeBuilt"
          checked={excludeBuilt}
          onChange={(e) => setExcludeBuilt(e.target.checked)}
          className="rounded border-gray-300"
        />
        <label htmlFor="excludeBuilt" className="text-sm text-gray-700">
          Exclure terrains bâtis
        </label>
      </div>

      {/* Zone refinement */}
      {selectedCommune && (
        <div className={`p-3 rounded-lg border-2 ${drawnZone ? 'border-amber-400 bg-amber-50' : 'border-dashed border-blue-300 bg-blue-50'}`}>
          <p className="text-sm font-semibold text-gray-800 mb-1">
            {drawnZone ? '✓ Zone de recherche définie' : '📍 Affiner la zone de recherche'}
          </p>
          <p className="text-xs text-gray-600">
            {drawnZone
              ? 'La recherche sera limitée à la zone dessinée sur la carte. Vous pouvez la modifier ou supprimer.'
              : 'Utilisez les outils de dessin sur la carte (en haut à droite) pour limiter la recherche à une zone précise.'}
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!selectedCommune || !surface || isLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? "Recherche en cours..." : "Rechercher"}
      </button>

      {selectedCommune && surface && (
        <p className="text-xs text-gray-500">
          Recherche: {selectedCommune.nom} | {surface} m² ± {margin}%
          (de {Math.round(Number(surface) * (1 - Number(margin) / 100))} à{" "}
          {Math.round(Number(surface) * (1 + Number(margin) / 100))} m²)
        </p>
      )}
    </form>
  );
}
