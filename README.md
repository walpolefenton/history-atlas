# History Atlas

An interactive atlas of world history: borders, capitals and major events from prehistory to today. Move through 54 snapshots of the world map, select any territory to see who ruled it, its capital and its Wikipedia summary, and follow the wars, treaties and revolutions of each era.

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
curl -L -o vendor-src/ne_50m_land.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson
npm run fetch:capitals   # queries Wikidata, writes vendor-src/wd_capitals.json
npm run prepare:data     # writes public/data/
```

## Using it

- **Timeline:** drag the slider, use ‹ › or the `[` `]` keys, or press ▶ to play through time.
- **Territories:** click one on the map, or use **All territories** for a text list grouped by ruling power.
- **Search:** press `/` and search any territory name across all eras, or any event.
- **Sharing:** the URL holds the year and selection, e.g. `#y=1914&p=Ottoman+Empire` or `#y=1939&e=ww2`.

## Project layout

| Path | What it is |
| --- | --- |
| `scripts/fetch-capitals.mjs` | Downloads historical capitals with date ranges from Wikidata |
| `scripts/prepare-data.mjs` | Simplifies borders, places labels, colours territories by ruler, matches capitals |
| `public/data/years/<year>.json` | One snapshot: borders, label points, capitals |
| `public/data/meta.json` | Snapshot list and which years each territory appears in |
| `public/data/events.json` | Curated events (hand-edited) |
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
- **Capitals** are matched to territories by name, date and location, so only about 16% of territory snapshots have one. Many territories are cultural regions with no capital, and others use names that differ from Wikidata's.
- **Wikipedia summaries** are found through Wikidata where possible. Otherwise the exact title is tried, then a search. Matches found by search are labelled as possibly imperfect.
- **Events** are a starter set of about 100, hand-written and still being reviewed.

## Licence and credits

This project is licensed under the GPL-3.0-or-later, the same licence as its border data.

- Borders: [aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps), GPL-3.0
- Coastlines: [Natural Earth](https://www.naturalearthdata.com/), public domain
- Capitals: [Wikidata](https://www.wikidata.org/), CC0
- Summaries: [Wikipedia](https://en.wikipedia.org/), CC BY-SA, loaded live
- Map rendering: [MapLibre GL JS](https://maplibre.org/), BSD-3-Clause; label fonts from MapLibre demo tiles
