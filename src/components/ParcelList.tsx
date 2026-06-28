"use client";

import type { ParcelCandidate } from "@/types";

interface ParcelCardProps {
  candidate: ParcelCandidate;
  isSelected: boolean;
  onClick: () => void;
}

export function ParcelCard({ candidate, isSelected, onClick }: ParcelCardProps) {
  const surface = candidate.contenance || candidate.computedArea;
  const [lng, lat] = candidate.center;
  const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-md border cursor-pointer transition-all ${
        isSelected
          ? "border-amber-400 bg-amber-50 shadow-md"
          : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <span className="font-mono font-semibold text-sm text-gray-900">
            {candidate.section} {candidate.numero}
          </span>
          <p className="text-xs text-gray-500 mt-0.5">ID: {candidate.id}</p>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            candidate.surfaceDiffPercent <= 2
              ? "bg-green-100 text-green-700"
              : candidate.surfaceDiffPercent <= 5
              ? "bg-yellow-100 text-yellow-700"
              : "bg-orange-100 text-orange-700"
          }`}
        >
          {candidate.surfaceDiffPercent > 0 ? "±" : ""}
          {candidate.surfaceDiffPercent}%
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-700">
        <div>
          <span className="text-gray-500">Surface:</span>{" "}
          <span className="font-medium text-gray-900">{surface} m²</span>
        </div>
        <div>
          <span className="text-gray-500">Calculée:</span>{" "}
          <span className="font-medium text-gray-900">{candidate.computedArea} m²</span>
        </div>
      </div>

      {isSelected && (
        <a
          href={streetViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-2 inline-block text-xs font-medium text-blue-600 hover:text-blue-800 underline"
        >
          Voir en Street View →
        </a>
      )}
    </div>
  );
}

interface ParcelListProps {
  candidates: ParcelCandidate[];
  selectedParcel: string | null;
  onSelectParcel: (id: string) => void;
}

export default function ParcelList({
  candidates,
  selectedParcel,
  onSelectParcel,
}: ParcelListProps) {
  if (candidates.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p className="text-sm">Aucune parcelle trouvée.</p>
        <p className="text-xs mt-1">Essayez d&apos;augmenter la marge d&apos;erreur.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-800 font-medium">
        {candidates.length} parcelle{candidates.length > 1 ? "s" : ""} trouvée
        {candidates.length > 1 ? "s" : ""}
      </p>
      <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto pr-1">
        {candidates.map((candidate) => (
          <ParcelCard
            key={candidate.id}
            candidate={candidate}
            isSelected={candidate.id === selectedParcel}
            onClick={() => onSelectParcel(candidate.id)}
          />
        ))}
      </div>
    </div>
  );
}
