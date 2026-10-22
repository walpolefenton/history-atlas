// Turns the raw sources in vendor-src/ into the compact files the app loads.
//
//   vendor-src/geojson/world_*.geojson  (aourednik/historical-basemaps, GPL-3.0)
//   vendor-src/ne_50m_land.geojson      (Natural Earth, public domain)
//   vendor-src/wd_capitals.json         (Wikidata, CC0; see fetch-capitals.mjs)
//
// Output in public/data/:
//   meta.json          snapshot years + an index of which years each polity appears in
//   land.json          coastline base layer
//   years/<year>.json  { year, borders, labels, capitals } for one snapshot
import { readFile, writeFile, mkdir } from "node:fs/promises";
import polylabel from "polylabel";
import { area } from "@turf/area";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";

const SRC = "vendor-src";
const OUT = "public/data";
const PRECISION = 1000; // 3 decimals ≈ 100 m, plenty for world-scale borders

const round = (n) => Math.round(n * PRECISION) / PRECISION;

function roundCoords(c) {
  if (typeof c[0] === "number") return [round(c[0]), round(c[1])];
  const out = c.map(roundCoords);
  // Drop consecutive duplicate points introduced by rounding.
  if (typeof out[0][0] === "number") {
    return out.filter((p, i) => i === 0 || p[0] !== out[i - 1][0] || p[1] !== out[i - 1][1]);
  }
  return out;
}

function polygonsOf(geom) {
  if (geom.type === "Polygon") return [geom.coordinates];
  if (geom.type === "MultiPolygon") return geom.coordinates;
  return [];
}

// Label anchor: pole of inaccessibility of the largest polygon, so labels sit
// inside the territory rather than at a centroid that may fall in the sea.
function labelPoint(geom) {
  let best = null;
  let bestArea = -1;
  for (const rings of polygonsOf(geom)) {
    const a = area({ type: "Polygon", coordinates: rings });
    if (a > bestArea) {
      bestArea = a;
      best = rings;
    }
  }
  if (!best) return null;
  const p = polylabel(best, 0.05);
  return [round(p[0]), round(p[1])];
}

// Stable, well-spread colour per sovereign so colonies share their ruler's hue.
function colorFor(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h >>>= 0;
  const hue = (h % 360 + (h >> 9) % 37) % 360;
  const sat = 32 + ((h >> 3) % 22);
  const light = 56 + ((h >> 13) % 14);
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

const norm = (s) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^the /, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Wikidata dates look like "-0026-01-01T00:00:00Z"; unknown values are blank-node URIs.
function wdYear(binding) {
  const m = binding?.value?.match(/^(-?\d+)-/);
  return m ? Number(m[1]) : null;
}

function parsePoint(wkt) {
  const m = wkt.match(/Point\(([-\d.eE]+) ([-\d.eE]+)\)/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

// --- Capitals index -------------------------------------------------------
const wdRows = JSON.parse(await readFile(`${SRC}/wd_capitals.json`, "utf8"));
const statesByName = new Map();
for (const r of wdRows) {
  const point = parsePoint(r.coord.value);
  if (!point) continue;
  const key = norm(r.stateLabel.value);
  if (!statesByName.has(key)) statesByName.set(key, []);
  statesByName.get(key).push({
    qid: r.state.value.split("/").pop(),
    capital: r.capLabel.value,
    capitalQid: r.cap.value.split("/").pop(),
    point,
    start: wdYear(r.start),
    end: wdYear(r.end),
    inception: wdYear(r.inception),
    dissolved: wdYear(r.dissolved),
  });
}

const LIFETIME_SLACK = 50; // snapshot years are coarse; allow some tolerance

// Border coastlines are generalised, so coastal capitals (Copenhagen, Lisbon,
// Constantinople...) often sit just offshore. Accept points within ~0.25°.
const NEAR_OFFSETS = [[0, 0]];
for (const r of [0.1, 0.25]) {
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    NEAR_OFFSETS.push([r * Math.cos(a), r * Math.sin(a)]);
  }
}
const nearPolygon = (p, geometry) =>
  NEAR_OFFSETS.some(([dx, dy]) => booleanPointInPolygon([p[0] + dx, p[1] + dy], geometry));

function findCapital(name, year, geometry) {
  const rows = statesByName.get(norm(name));
  if (!rows) return null;
  const candidates = rows.filter((r) => {
    if (r.inception !== null && r.inception > year + LIFETIME_SLACK) return false;
    if (r.dissolved !== null && r.dissolved < year - LIFETIME_SLACK) return false;
    if (r.start !== null && r.start > year) return false;
    if (r.end !== null && r.end < year) return false;
    return nearPolygon(r.point, geometry);
  });
  if (!candidates.length) return null;
  // Prefer statements with explicit dates: they are about *this* period.
  candidates.sort((a, b) => (b.start !== null) + (b.end !== null) - ((a.start !== null) + (a.end !== null)));
  return candidates[0];
}

// --- Snapshots --------------------------------------------------------------
const index = JSON.parse(await readFile(`${SRC}/index.json`, "utf8"));
await mkdir(`${OUT}/years`, { recursive: true });

const years = [];
const appearances = {}; // polity name -> [years]
let capitalCount = 0;
let polityCount = 0;

for (const { year, filename } of index.years.sort((a, b) => a.year - b.year)) {
  const raw = JSON.parse(await readFile(`${SRC}/geojson/${filename}`, "utf8"));
  const borders = [];
  const labels = [];
  const capitals = [];

  for (const f of raw.features) {
    const name = f.properties.NAME;
    if (!name || !f.geometry) continue;
    const sovereign = f.properties.SUBJECTO || name;
    const km2 = Math.round(area(f.geometry) / 1e6);
    const capital = findCapital(name, year, f.geometry);
    const props = {
      name,
      sovereign,
      partOf: f.properties.PARTOF || null,
      precision: f.properties.BORDERPRECISION ?? null,
      color: colorFor(sovereign),
      km2,
      qid: capital?.qid ?? null,
    };
    borders.push({ type: "Feature", properties: props, geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates) } });

    const lp = labelPoint(f.geometry);
    if (lp) labels.push({ type: "Feature", properties: { name, km2 }, geometry: { type: "Point", coordinates: lp } });

    if (capital) {
      capitalCount++;
      capitals.push({
        type: "Feature",
        properties: { name: capital.capital, qid: capital.capitalQid, of: name, start: capital.start, end: capital.end },
        geometry: { type: "Point", coordinates: capital.point.map(round) },
      });
    }

    (appearances[name] ??= []).includes(year) || appearances[name].push(year);
    polityCount++;
  }

  // Large territories first so their labels win collisions.
  labels.sort((a, b) => b.properties.km2 - a.properties.km2);

  await writeFile(
    `${OUT}/years/${year}.json`,
    JSON.stringify({
      year,
      borders: { type: "FeatureCollection", features: borders },
      labels: { type: "FeatureCollection", features: labels },
      capitals: { type: "FeatureCollection", features: capitals },
    }),
  );
  years.push({ year, polities: borders.length, capitals: capitals.length });
  console.log(`${String(year).padStart(7)}  ${String(borders.length).padStart(4)} polities  ${String(capitals.length).padStart(3)} capitals`);
}

await writeFile(`${OUT}/meta.json`, JSON.stringify({ years, appearances }));

const land = JSON.parse(await readFile(`${SRC}/ne_50m_land.geojson`, "utf8"));
await writeFile(
  `${OUT}/land.json`,
  JSON.stringify({
    type: "FeatureCollection",
    features: land.features.map((f) => ({ type: "Feature", properties: {}, geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates) } })),
  }),
);

console.log(`\n${years.length} snapshots, ${polityCount} polity-snapshots, ${capitalCount} with a matched capital (${Math.round((capitalCount / polityCount) * 100)}%)`);
