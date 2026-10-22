# History Atlas

An interactive atlas of world history: borders, capitals, events, landmarks and natural history from prehistory to today. Move through 54 snapshots of the world map, select any territory to see who ruled it, its capital and its Wikipedia summary, follow nearly 4,000 wars, battles, treaties, revolutions and disasters, and compare any two years side by side.

## Running it

Requires Node.js 20+.

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/, can be hosted anywhere
```

The prepared data in `public/data/` is committed, so the steps above are all you need. To rebuild the data from source:

```sh
git clone --depth 1 https://github.com/aourednik/historical-basemaps.git vendor-src
for f in land geography_regions_polys geography_marine_polys rivers_lake_centerlines lakes glaciated_areas; do
  curl -L -o vendor-src/ne_50m_$f.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_$f.geojson
done
npm run resolve:names    # links territory names to Wikidata (uses data-src/aliases.json)
npm run fetch:capitals   # capitals with date ranges from Wikidata
npm run fetch:events     # notable events from Wikidata
npm run fetch:fonts      # map label typeface (Spectral) into public/fonts/
npm run prepare:data     # writes public/data/, including physical geography
node scripts/prepare-scenery.mjs   # the illustrated layer (scenery, murals, ranges, routes)
```

## Using it

- **Timeline:** drag the slider, use ‹ › or the `[` `]` keys, or press ▶ to play through time.
- **Territories:** click one on the map, or use **All territories** for a text list grouped by ruling power.
- **Events:** key events (hand-written) show as large dots, other events from Wikidata as small ones. Use **Show event types** in the overview to filter both.
- **Compare:** press **Compare** to see two years side by side, with a list of territories that appeared, disappeared, changed ruler or changed size.
- **Search:** press `/` and search any territory name across all eras, or any event.
- **Map style:** the last button in the toolbar cycles through Atlas (a modern reference atlas with photographs), Atlas Dark, Night (a globe in space), Survey (a lithograph atlas), Clay (sculpted relief, after stop-motion animation) and Auto (Atlas or Atlas Dark, following your system).
- **Images:** each era opens with a work of art from its time, and every landmark has a photograph, shown as a photo pin on the Atlas map and at the top of its page. All are freely licensed files from Wikimedia Commons, credited where they appear.
- **Look closer:** pen-and-ink drawings of landmarks, curiosities and moments in natural history appear as you zoom in, each with a short caption, the facts and a Wikipedia summary. Map lettering changes with the era: Roman capitals for antiquity, early printing type to 1800, a modern serif after.
- **The land:** woodland, rainforest, grassland, savanna and farmland are painted as areas (engraved textures in the illustrated styles, soft colour in Atlas). Farmland appears as farming spread, from the Fertile Crescent around 7000 BCE. Mountains are drawn as hills over shaded relief.
- **The illustrated styles** add faint regional murals, figures for how people lived, mountain ranges as chains of peaks, the Great Wall, villages on their roads, and trade routes with the right ships and caravans for each era. Hover or click travellers and figures to learn more.
- **Find the Surveyor:** a small figure hides somewhere different in every era. The overview offers a hint and counts how many you've found (stored in your browser only).
- **Sharing:** the URL holds the year and selection, e.g. `#y=1914&p=Ottoman+Empire`, `#y=1939&e=ww2` or `#y=1914&c=1920` for a comparison.

## Project layout

| Path | What it is |
| --- | --- |
| `scripts/resolve-names.mjs` | Links dataset territory names to Wikidata states via labels, alternative names and `data-src/aliases.json` |
| `scripts/fetch-capitals.mjs` | Downloads historical capitals with date ranges from Wikidata |
| `scripts/fetch-events.mjs` | Downloads notable dated, located events from Wikidata |
| `data-src/aliases.json` | Hand-curated territory name → Wikipedia article links (edit to improve capital matches) |
| `scripts/prepare-data.mjs` | Simplifies borders, places labels, colours territories by ruler, matches capitals |
| `scripts/prepare-physical.mjs` | Terrain, rivers, lakes, ice and landform/sea names drawn beneath the political map |
| `src/theme.ts` | Map colours for each theme (page colours are in `src/style.css`) |
| `scripts/prepare-landcover.mjs` | Woodland, grassland, farmland and other land cover as areas (`public/data/landcover.json`) |
| `scripts/fetch-images.mjs` | Photographs for landmarks and an artwork for each era, with credits (`public/data/images.json`) |
| `src/images.ts` | Image index, credit lines and the photo pins drawn on the map |
| `src/icons.ts` | Event and capital pictograms, shared by the map and the panel |
| `public/data/years/<year>.json` | One snapshot: borders, label points, capitals |
| `public/data/meta.json` | Snapshot list and which years each territory appears in |
| `public/data/events.json` | Key events (hand-edited) |
| `public/data/wd-events.json` | Generated Wikidata events |
| `public/data/drawings.json` | Landmarks, curiosities and natural history (hand-edited) |
| `public/data/scenery.json` | Generated illustrated layer (`scripts/prepare-scenery.mjs`) |
| `public/data/surveyor.json` | The Surveyor's hiding place in each era (hand-edited) |
| `src/drawings.ts` | The pen-and-ink drawings, as SVG |
| `src/map.ts` | MapLibre map, layers and interaction |
| `src/panel.ts` | Overview, territory, event and list views |
| `src/search.ts` | Accessible search combobox |
| `src/wiki.ts` | Live Wikipedia / Wikidata lookups |

### Adding events

Add an entry to `public/data/events.json`:

```json
{ "id": "unique-id", "title": "…", "type": "conflict", "start": 1914, "end": 1918,
  "lat": 43.86, "lon": 18.41, "summary": "One or two sentences.", "wiki": "Exact Wikipedia title" }
```

`type` is one of `conflict`, `diplomacy`, `political`, `culture`, `exploration`, `crisis`. Use negative years for BCE, and set `"approx": true` for approximate or traditional dates.

## Accuracy and known limits

- **Borders** come from historical-basemaps, which its authors describe as a work in progress. Its `BORDERPRECISION` value is shown in the app, and approximate borders are drawn dashed.
- **Capitals** are matched to territories by name (via Wikidata labels, alternative names and curated aliases), then checked by date and location. About 20% of territory snapshots have one. Many territories are cultural regions with no capital. Matching is strict for modern states, so a few colonial-era capitals are missing rather than wrong. To improve coverage, add entries to `data-src/aliases.json`.
- **Wikipedia summaries** are found through Wikidata where possible. Otherwise the exact title is tried, then a search. Matches found by search are labelled as possibly imperfect.
- **Key events**, drawings and Surveyor notes are hand-written and still being reviewed. Each links to its Wikipedia article.
- **Colours** come from a coarse cultural-region model (by the location of each power's capital or heartland). They are a visual aid, not a claim about identity.
- **Images** are the lead images of the matching Wikipedia articles. A few landmarks have none and keep their drawing.
- **Land cover** comes from a coarse biome model with noise for natural patches, not from vegetation surveys; farmland regions and dates are broad approximations.
- **The illustrated layer** uses a coarse biome model and hand-placed routes and murals. It is decorative but meant to be truthful in broad strokes: routes, ranges and the Great Wall are approximate, and villages are placed at random within each state.
- **The Green Sahara** is shown for snapshots between 9000 and 3500 BCE, with simplified desert outlines.
- **Wikidata events** are items with an English Wikipedia article covered by at least 12 language editions. Their dates and locations are as recorded in Wikidata, and some are approximate or wrong.
- **Compare** matches territories by name, so a renamed state appears as one that disappeared plus one that appeared. The data also sometimes records the same colony under different rulers between snapshots.

## Licence and credits

This project is licensed under the GPL-3.0-or-later, the same licence as its border data.

- Borders: [aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps), GPL-3.0
- Coastlines and physical geography: [Natural Earth](https://www.naturalearthdata.com/), public domain
- Interface fonts: Bodoni Moda and Instrument Sans from Google Fonts
- Capitals and events: [Wikidata](https://www.wikidata.org/), CC0
- Summaries: [Wikipedia](https://en.wikipedia.org/), CC BY-SA, loaded live
- Shaded relief: [Mapzen terrain tiles](https://registry.opendata.aws/terrain-tiles/) on AWS Open Data (SRTM, GMTED, ETOPO1 and others), loaded live
- Map lettering: Cinzel, IM Fell English and Spectral, SIL Open Font License
- Map rendering: [MapLibre GL JS](https://maplibre.org/), BSD-3-Clause
