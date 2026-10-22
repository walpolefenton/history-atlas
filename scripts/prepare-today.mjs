// Adds "today" to every territory in public/data/years/*.json: the present-day
// countries its land lies in, with each one's approximate share, so the panel
// can say where a historical state is on today's map.
// Run after prepare-data.mjs: node scripts/prepare-today.mjs
//
// Method: a quarter-degree grid of points over the land, each labelled with
// the present-day country it falls in (Natural Earth admin-1 provinces, public
// domain). A territory's share of a country is the area-weighted count of grid
// points inside it. Territories too small to hold a grid point use their label
// point. Shares are rounded; countries under 2% are dropped.
import { readFile, writeFile, readdir } from "node:fs/promises";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";

const STEP = 0.25;

function bbox(geom) {
  let [w, s, e, n] = [180, 90, -180, -90];
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  for (const rings of polys)
    for (const [x, y] of rings[0]) {
      if (x < w) w = x;
      if (x > e) e = x;
      if (y < s) s = y;
      if (y > n) n = y;
    }
  return [w, s, e, n];
}

// Some Natural Earth country names differ from everyday usage.
const RENAME = {
  "United States of America": "United States",
  "Republic of Serbia": "Serbia",
  "United Republic of Tanzania": "Tanzania",
  "Democratic Republic of the Congo": "DR Congo",
  "Republic of the Congo": "Republic of the Congo",
  "The Bahamas": "Bahamas",
  "Czechia": "Czech Republic",
  "eSwatini": "Eswatini",
  "Macedonia": "North Macedonia",
  "Ivory Coast": "Côte d'Ivoire",
};

// --- Grid of present-day countries -------------------------------------------------
const provinces = JSON.parse(await readFile("vendor-src/admin1-simplified.geojson", "utf8")).features.filter((f) => f.geometry);
const indexed = provinces.map((f) => ({ f, b: bbox(f.geometry) }));
// Bucket provinces by 10-degree tile, so each lookup tests only nearby ones.
const tiles = new Map();
for (const p of indexed)
  for (let tx = Math.floor(p.b[0] / 10); tx <= Math.floor(p.b[2] / 10); tx++)
    for (let ty = Math.floor(p.b[1] / 10); ty <= Math.floor(p.b[3] / 10); ty++) {
      const k = `${tx},${ty}`;
      if (!tiles.has(k)) tiles.set(k, []);
      tiles.get(k).push(p);
    }
function countryAt(pt) {
  for (const { f, b } of tiles.get(`${Math.floor(pt[0] / 10)},${Math.floor(pt[1] / 10)}`) ?? []) {
    if (pt[0] < b[0] || pt[0] > b[2] || pt[1] < b[1] || pt[1] > b[3]) continue;
    if (booleanPointInPolygon(pt, f.geometry)) return RENAME[f.properties.admin] ?? f.properties.admin;
  }
  return null;
}

const grid = [];
for (let lat = -60 + STEP / 2; lat < 84; lat += STEP)
  for (let lon = -180 + STEP / 2; lon < 180; lon += STEP) {
    const c = countryAt([lon, lat]);
    if (c) grid.push({ x: lon, y: lat, c, w: Math.cos((lat * Math.PI) / 180) });
  }
console.log(`${grid.length} land grid points`);
// Bucket grid points by 1-degree cell for fast range queries.
const cells = new Map();
for (const g of grid) {
  const k = `${Math.floor(g.x)},${Math.floor(g.y)}`;
  if (!cells.has(k)) cells.set(k, []);
  cells.get(k).push(g);
}

// --- Each snapshot ------------------------------------------------------------------
const files = (await readdir("public/data/years")).filter((f) => f.endsWith(".json"));
for (const file of files) {
  const path = `public/data/years/${file}`;
  const data = JSON.parse(await readFile(path, "utf8"));
  const labelOf = new Map(data.labels.features.map((l) => [l.properties.name, l.geometry.coordinates]));
  for (const f of data.borders.features) {
    const b = bbox(f.geometry);
    const tally = new Map();
    let total = 0;
    for (let cx = Math.floor(b[0]); cx <= Math.floor(b[2]); cx++)
      for (let cy = Math.floor(b[1]); cy <= Math.floor(b[3]); cy++)
        for (const g of cells.get(`${cx},${cy}`) ?? []) {
          if (g.x < b[0] || g.x > b[2] || g.y < b[1] || g.y > b[3]) continue;
          if (!booleanPointInPolygon([g.x, g.y], f.geometry)) continue;
          tally.set(g.c, (tally.get(g.c) ?? 0) + g.w);
          total += g.w;
        }
    if (!total) {
      const lp = labelOf.get(f.properties.name);
      const c = lp && countryAt(lp);
      f.properties.today = c ? `${c}:100` : "";
      continue;
    }
    f.properties.today = [...tally]
      .map(([c, w]) => [c, Math.round((w / total) * 100)])
      .filter(([, pct]) => pct >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([c, pct]) => `${c}:${pct}`)
      .join("|");
  }
  await writeFile(path, JSON.stringify(data));
  process.stdout.write(".");
}
console.log(`\n${files.length} snapshots annotated`);
