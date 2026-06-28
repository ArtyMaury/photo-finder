# Photo Finder - Plan du projet

## Objectif

Retrouver une parcelle cadastrale precise a partir d'une annonce immobiliere :
photo de terrain + surface connue + commune/zone approximative.

---

## Stack technique

| Composant | Choix | Justification |
|-----------|-------|---------------|
| Frontend | Next.js (App Router) + TypeScript | API routes integrees, SSR |
| Carte | Leaflet (react-leaflet) | Gratuit, leger, WMTS/GeoJSON natif |
| Fond satellite | Geoplateforme IGN WMTS | Gratuit, sans rate limit, orthophotos HD France |
| Cadastre | cadastre.data.gouv.fr (GeoJSON bulk) | Gratuit, open data, surface + geometrie |
| Geocodage | geo.api.gouv.fr | Gratuit, contours communes |
| Geometrie | Turf.js | Surface, forme, intersection |
| IA (optionnel) | OpenAI GPT-4o vision | Analyse photo, ~0.01-0.05$/requete |
| Style | Tailwind CSS | Rapide |

---

## Architecture

```
photo-finder/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Page principale
│   │   ├── layout.tsx
│   │   └── api/
│   │       ├── search/route.ts       # Recherche principale
│   │       ├── communes/route.ts     # Proxy geocodage
│   │       └── analyze/route.ts      # Analyse IA photo
│   ├── components/
│   │   ├── SearchForm.tsx            # Formulaire
│   │   ├── Map.tsx                   # Carte Leaflet satellite
│   │   ├── ParcelList.tsx            # Parcelles candidates
│   │   └── ParcelCard.tsx            # Detail parcelle
│   ├── lib/
│   │   ├── cadastre.ts              # Download/parse cadastre
│   │   ├── geo.ts                   # Calculs Turf.js
│   │   ├── communes.ts              # API communes
│   │   └── ai.ts                    # Analyse IA
│   └── types/index.ts
├── .env.local                        # Cles API
```

---

## Pipeline de recherche

```
1. Utilisateur saisit : commune + surface (m2) + marge (+/-10%)
2. geo.api.gouv.fr -> code INSEE de la commune
3. cadastre.data.gouv.fr -> download GeoJSON parcelles (gzipped)
4. Filtrage : parcelles dont surface dans [cible-marge, cible+marge]
   - Champ "contenance" si disponible, sinon turf.area() en fallback
5. Filtrage forme (optionnel) : ratio bounding box, score compacite
6. Scoring + tri par proximite de surface
7. Affichage sur carte satellite IGN avec contours
8. (Optionnel) Analyse IA de la photo pour affiner
```

---

## APIs 100% gratuites

| Service | URL | Limite |
|---------|-----|--------|
| Cadastre GeoJSON | `cadastre.data.gouv.fr/data/etalab-cadastre/latest/geojson/communes/{dept}/{code}/cadastre-{code}-parcelles.json.gz` | Aucune |
| API Carto | `apicarto.ign.fr/api/cadastre/parcelle?code_insee={code}` | 30 req/s |
| Communes | `geo.api.gouv.fr/communes?nom={nom}&format=geojson&geometry=contour` | Illimite |
| WMTS Ortho | `data.geopf.fr/wmts` layer `ORTHOIMAGERY.ORTHOPHOTOS` | Illimite |
| WMTS Cadastre | `data.geopf.fr/wmts` layer `CADASTRALPARCELS.PARCELLAIRE_EXPRESS` | Illimite |

### Details techniques WMTS

Requete tuile satellite :
```
https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}
```

TileMatrixSet `PM` = EPSG:3857 (Web Mercator), zoom 0-21.

### Champs parcelle cadastrale (GeoJSON properties)

- `id` : identifiant complet (ex: "34172000AB0001")
- `commune` : code INSEE (5 chars)
- `prefixe` : prefixe section (3 chars)
- `section` : code section (2 chars)
- `numero` : numero parcelle (4 chars)
- `contenance` : surface en m2 (pas toujours renseigne)
- `arpente` : boolean (parcelle arpentee ou non)
- geometry : Polygon/MultiPolygon en WGS84

---

## Phases d'implementation

### Phase 1 - MVP (cout : 0 EUR)

1. Setup Next.js + Tailwind + Leaflet
2. Formulaire : surface + marge + commune (autocompletion)
3. Backend : download + parse cadastre GeoJSON (gzip)
4. Filtrage par surface avec marge d'erreur
5. Carte satellite IGN + parcelles candidates highlightees
6. Liste cliquable avec infos parcelle (id, surface, section)

**Definition of Done :**
- L'utilisateur saisit une commune (autocompletion)
- L'utilisateur saisit une surface en m2 et une marge
- Le systeme telecharge les parcelles de la commune
- Les parcelles dans la fourchette sont affichees sur carte satellite
- Chaque parcelle candidate est cliquable avec ses infos

### Phase 2 - Filtrage avance (cout : 0 EUR)

7. Filtre par forme (rectangulaire, carree, triangulaire, irreguliere)
8. Adjacence route (couche batiments/routes du cadastre)
9. Scoring composite + tri intelligent
10. Cache fichiers cadastre (eviter re-telechargement)

### Phase 3 - Analyse IA (cout : ~3-5 EUR/mois)

11. Upload photo + analyse LLM (vegetation, clotures, voisinage, relief)
12. Extraction attributs -> matching avec candidats
13. Tuiles satellite des top candidats pour comparaison visuelle

### Phase 4 - UX avancee

14. Dessin de zone libre sur carte (polygon)
15. Comparaison photo/satellite cote-a-cote
16. Multi-communes (recherche sur communes adjacentes)
17. Historique des recherches
18. Export resultats

---

## Estimation des couts

| Scenario | Cout mensuel |
|----------|--------------|
| Phase 1-2 uniquement | **0 EUR** |
| Avec IA (10 recherches/jour) | ~3-5 EUR |
| Hebergement Vercel free tier | 0 EUR |

---

## Points d'attention

1. **"contenance" pas toujours renseigne** -> fallback turf.area() obligatoire
2. **Parcelles multi-polygones** -> sommer les surfaces des parties
3. **Performance** -> commune = potentiellement milliers de parcelles, filtrage serveur
4. **Fichiers volumineux** -> GeoJSON gzipped grande commune = plusieurs Mo, prevoir cache
5. **Precision surface cadastrale** != surface reelle (arpentage ancien) -> marge d'erreur
6. **CORS** -> passer par API routes Next.js pour cache + contournement CORS

---

## Commandes de demarrage

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint
npm install leaflet react-leaflet @types/leaflet @turf/turf
```
