<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Photo Finder - Agent Context

## What this app does

Finds cadastral parcels matching a target surface area in a French commune. Users enter a commune name, surface in m², and margin of error. The app downloads cadastre data from open APIs, filters parcels, and displays matches on a satellite map.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4 (uses `@import "tailwindcss"` syntax, NOT `@tailwind` directives)
- Leaflet + react-leaflet + leaflet-draw (client-only, loaded via `next/dynamic`)
- @turf/turf (server-side geometry calculations)
- No database. No auth. No env vars required.

## Architecture

```
src/
├── app/
│   ├── page.tsx              # Main page. Client component. Orchestrates state.
│   ├── layout.tsx            # Root layout with metadata.
│   └── api/
│       ├── communes/route.ts # GET proxy to geo.api.gouv.fr (autocomplete)
│       └── search/route.ts   # GET main search endpoint. Downloads cadastre, filters, returns candidates.
├── components/
│   ├── SearchForm.tsx        # Form: commune autocomplete + surface + margin + excludeBuilt checkbox
│   ├── Map.tsx               # Leaflet map. Satellite IGN tiles. Draw controls for zone selection.
│   └── ParcelList.tsx        # ParcelCard + ParcelList. Shows candidates, Street View links.
├── lib/
│   ├── cadastre.ts           # Fetch + gunzip + cache parcelles & batiments from cadastre.data.gouv.fr
│   ├── communes.ts           # geo.api.gouv.fr commune search
│   └── geo.ts                # Turf.js: computeArea, getCenter, isInZone, findParcelsWithBuildings, filterAndScoreParcels
└── types/index.ts            # All shared TypeScript interfaces
```

## Data flow

1. `SearchForm` → user types commune → debounced fetch to `/api/communes?q=...`
2. `SearchForm` → user submits → `page.tsx` calls `/api/search?communeCode=...&surface=...&margin=...&excludeBuilt=...&zone=...`
3. `/api/search` → `cadastre.ts` downloads `cadastre-{code}-parcelles.json.gz` (+ batiments if excludeBuilt)
4. `/api/search` → `geo.ts` filters by surface ± margin, zone polygon, building intersection
5. Returns `SearchResult` with up to 100 `ParcelCandidate[]`
6. `page.tsx` passes candidates to `Map.tsx` (renders polygons on map) + `ParcelList.tsx` (sidebar list)
7. Clicking parcel in list or on map → highlights it (no zoom change) + shows Street View link

## Key design decisions

- **fitBounds only on new search**, never on parcel selection (two separate useEffects in Map.tsx)
- **Cadastre files are .json.gz** → must decompress with `gunzipSync` server-side (Node fetch doesn't auto-decompress .gz URLs)
- **Building detection**: centroid of each building checked against parcel polygon (not full intersection, for perf)
- **In-memory cache** (10min TTL) for cadastre/building files to avoid re-downloads
- **Map is client-only**: loaded via `next/dynamic({ ssr: false })` because Leaflet needs `window`
- **Tailwind v4**: use `text-gray-900` explicitly on inputs (no default text color inheritance)

## External APIs (all free, no keys)

| Service | URL pattern | Used in |
|---------|------------|---------|
| Commune search | `geo.api.gouv.fr/communes?nom={q}` | `lib/communes.ts` |
| Cadastre parcels | `cadastre.data.gouv.fr/.../cadastre-{code}-parcelles.json.gz` | `lib/cadastre.ts` |
| Cadastre buildings | `cadastre.data.gouv.fr/.../cadastre-{code}-batiments.json.gz` | `lib/cadastre.ts` |
| Satellite tiles | `data.geopf.fr/wmts` layer ORTHOIMAGERY.ORTHOPHOTOS | `components/Map.tsx` |

## File guide: what to read for common tasks

| Task | Read these files |
|------|-----------------|
| Add a new filter criterion | `types/index.ts` (add to SearchParams + ParcelCandidate), `lib/geo.ts` (filterAndScoreParcels), `app/api/search/route.ts` (parse param) |
| Change map behavior | `components/Map.tsx` |
| Change form fields/UI | `components/SearchForm.tsx` |
| Change parcel card display | `components/ParcelList.tsx` |
| Add new API data source | `lib/` (new file), `app/api/search/route.ts` (integrate) |
| Fix types | `types/index.ts` |
| Change page layout | `app/page.tsx` |

## Commands

```bash
npm run dev          # Dev server on localhost:3000
npm run build        # Production build
npx tsc --noEmit    # Type check
```
