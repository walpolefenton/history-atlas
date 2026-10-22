// Turns the raw sources in vendor-src/ into the compact files the app loads.
//
//   vendor-src/geojson/world_*.geojson  (aourednik/historical-basemaps, GPL-3.0)
//   vendor-src/ne_50m_land.geojson      (Natural Earth, public domain)
//   vendor-src/wd_capitals.json         (Wikidata, CC0; see fetch-capitals.mjs)
//   vendor-src/name_candidates.json     (name -> Wikidata IDs; see resolve-names.mjs)
//   vendor-src/wd_events.json           (Wikidata, CC0; see fetch-events.mjs)
//
// Output in public/data/:
//   meta.json          snapshot years + an index of which years each polity appears in
//   land.json          coastline base layer
//   years/<year>.json  { year, borders, labels, capitals } for one snapshot
//   wd-events.json     notable events from Wikidata, minus those already curated
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
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

// Colour index per sovereign: the palette family comes from the cultural
// region of the power's heartland, the shade within it from a stable hash.
// Colonies share their ruler's colour, and a power keeps it across eras.
// The app maps indexes to theme palettes (src/theme.ts, REGION_FAMILIES).
const SHADES = 4;
const REGIONS = ["europe", "mena", "steppe", "eastAsia", "southAsia", "seAsiaOceania", "africa", "americas"];

function hash(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Broad cultural region for a point. Coarse by design: it only picks a colour family. */
function regionOf([lon, lat]) {
  if (lon < -30) return "americas";
  if ((lat >= 36 && lon < 26) || (lat >= 42 && lon < 45)) return "europe";
  if (lat >= 42 && lon >= 45) return lon >= 110 && lat < 54 ? "eastAsia" : "steppe";
  if (lat >= 12 && lon >= -20 && lon < 63) return "mena";
  if (lat >= 36 && lon >= 63 && lon < 100) return "steppe";
  if (lon >= 60 && lon < 92 && lat >= 5) return "southAsia";
  if (lon >= 100 && lat >= 18) return "eastAsia";
  if (lon >= 92) return "seAsiaOceania";
  if (lat < 12 && lon >= -20 && lon < 60) return "africa";
  return lat >= 42 ? "steppe" : "mena";
}

const colorIndex = (sovereign, heartland) => REGIONS.indexOf(regionOf(heartland)) * SHADES + (hash(sovereign) % SHADES);

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
const statesByQid = new Map();
const push = (map, key, v) => (map.get(key) ?? map.set(key, []).get(key)).push(v);
for (const r of wdRows) {
  const point = parsePoint(r.coord.value);
  // Skip capitals without an English label (the label service falls back to the QID).
  if (!point || /^Qd+$/.test(r.capLabel.value)) continue;
  const row = {
    qid: r.state.value.split("/").pop(),
    capital: r.capLabel.value,
    capitalQid: r.cap.value.split("/").pop(),
    point,
    start: wdYear(r.start),
    end: wdYear(r.end),
    inception: wdYear(r.inception),
    dissolved: wdYear(r.dissolved),
  };
  push(statesByName, norm(r.stateLabel.value), row);
  push(statesByQid, row.qid, row);
}

const candidates = existsSync(`${SRC}/name_candidates.json`)
  ? JSON.parse(await readFile(`${SRC}/name_candidates.json`, "utf8"))
  : { aliases: {}, byName: {} };

/** Wikidata rows to try for a name, most trusted source first. */
function rowGroups(name) {
  const groups = [];
  const alias = candidates.aliases[name];
  if (alias) groups.push({ source: "alias", rows: statesByQid.get(alias) ?? [] });
  groups.push({ source: "label", rows: statesByName.get(norm(name)) ?? [] });
  for (const q of candidates.byName[name] ?? []) groups.push({ source: "altName", rows: statesByQid.get(q) ?? [] });
  return groups;
}
const matchStats = { alias: 0, label: 0, altName: 0 };

// Snapshot years are coarse, so allow some tolerance on a state's lifetime;
// less for modern states, whose dates are known precisely.
const lifetimeSlack = (year) => (year >= 1800 ? 3 : 50);

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

function capitalFrom(rows, year, geometry) {
  const valid = rows.filter((r) => {
    if (r.inception !== null && r.inception > year + lifetimeSlack(year)) return false;
    if (r.dissolved !== null && r.dissolved < year - lifetimeSlack(year)) return false;
    if (r.start !== null && r.start > year) return false;
    if (r.end !== null && r.end < year) return false;
    return nearPolygon(r.point, geometry);
  });
  if (!valid.length) return null;
  // Prefer statements with explicit dates: they are about *this* period.
  valid.sort((a, b) => (b.start !== null) + (b.end !== null) - ((a.start !== null) + (a.end !== null)));
  return valid[0];
}

function findCapital(name, year, geometry) {
  for (const { source, rows } of rowGroups(name)) {
    const c = capitalFrom(rows, year, geometry);
    if (c) {
      matchStats[source]++;
      return c;
    }
  }
  return null;
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

  // Each power's heartland: its capital if known, else the middle of its own
  // territory, else of its largest holding. (Russia's middle is in Siberia;
  // its capital puts it in Europe.)
  const info = raw.features.map((f) =>
    f.properties.NAME && f.geometry
      ? { km2: Math.round(area(f.geometry) / 1e6), lp: labelPoint(f.geometry), capital: findCapital(f.properties.NAME, year, f.geometry) }
      : null,
  );
  const heartland = new Map();
  raw.features.forEach((f, i) => {
    if (!info[i]?.lp) return;
    const sovereign = f.properties.SUBJECTO || f.properties.NAME;
    const own = f.properties.NAME === sovereign;
    const best = heartland.get(sovereign);
    const lp = info[i].capital ? info[i].capital.point : info[i].lp;
    if (!best || (own && !best.own) || (own === best.own && info[i].km2 > best.km2)) heartland.set(sovereign, { own, km2: info[i].km2, lp });
  });

  for (const [i, f] of raw.features.entries()) {
    const name = f.properties.NAME;
    if (!name || !f.geometry) continue;
    const sovereign = f.properties.SUBJECTO || name;
    const km2 = info[i].km2;
    const capital = info[i].capital;
    const props = {
      name,
      sovereign,
      partOf: f.properties.PARTOF || null,
      precision: f.properties.BORDERPRECISION ?? null,
      ci: colorIndex(sovereign, heartland.get(sovereign)?.lp ?? info[i].lp ?? [0, 0]),
      km2,
      qid: capital?.qid ?? null,
    };
    borders.push({ type: "Feature", properties: props, geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates) } });

    const lp = info[i].lp;
    if (lp) labels.push({ type: "Feature", properties: { name, km2 }, geometry: { type: "Point", coordinates: lp } });

    if (capital) {
      capitalCount++;
      capitals.push({
        type: "Feature",
        properties: { name: capital.capital, qid: capital.capitalQid, of: name, start: capital.start, end: capital.end, rank: km2 },
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

// --- Wikidata events ----------------------------------------------------------
if (existsSync(`${SRC}/wd_events.json`)) {
  const curated = JSON.parse(await readFile(`${OUT}/events.json`, "utf8")).events;
  const curatedTitles = new Set(curated.map((e) => e.wiki));
  const wd = JSON.parse(await readFile(`${SRC}/wd_events.json`, "utf8"))
    .filter((e) => !curatedTitles.has(e.title))
    .map((e) => ({
      id: e.qid,
      title: e.title,
      type: e.type,
      start: e.start,
      // Some items have an end before their start; treat those as single-date.
      ...(e.end !== undefined && e.end > e.start ? { end: e.end } : {}),
      lat: round(e.lat),
      lon: round(e.lon),
      summary: e.desc,
      wiki: e.title,
      source: "wikidata",
      notability: e.links,
    }))
    .sort((a, b) => a.start - b.start);
  await writeFile(`${OUT}/wd-events.json`, JSON.stringify({ events: wd }));
  console.log(`${wd.length} Wikidata events (${curated.length} curated events take precedence)`);
}

console.log(`capital matches by source: ${JSON.stringify(matchStats)}`);
console.log(`\n${years.length} snapshots, ${polityCount} polity-snapshots, ${capitalCount} with a matched capital (${Math.round((capitalCount / polityCount) * 100)}%)`);
