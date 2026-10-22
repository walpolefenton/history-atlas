// Builds public/data/landcover.json: what covers the land, as areas rather than
// scattered drawings. Woodland, rainforest, grassland and savanna are painted as
// soft-edged patches with an engraved texture, so the globe reads as one
// continuous picture. Run: node scripts/prepare-landcover.mjs
//
// A coarse biome model (by latitude and broad region, as in prepare-scenery.mjs)
// is sampled on a half-degree grid. Smooth noise breaks each biome into patches
// with open country between them. Cells are merged, rounded off, clipped to the
// coast, and cut away where deserts, mountains and ice already have their own look.
//
// Sources: Natural Earth 1:50m land, physical regions and glaciers (public domain).
import { readFile, writeFile } from "node:fs/promises";
import mapshaper from "mapshaper";

const SRC = "vendor-src";
const CELL = 0.5;

// --- Smooth value noise, so patches have natural shapes -------------------------------

function hash(x, y, salt) {
  let h = Math.imul(x ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(y + salt * 7919, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}
const smooth = (t) => t * t * (3 - 2 * t);
function valueNoise(x, y, salt) {
  const [xi, yi] = [Math.floor(x), Math.floor(y)];
  const [tx, ty] = [smooth(x - xi), smooth(y - yi)];
  const a = hash(xi, yi, salt), b = hash(xi + 1, yi, salt), c = hash(xi, yi + 1, salt), d = hash(xi + 1, yi + 1, salt);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}
/** Two octaves: broad masses of a few degrees, with ragged edges. */
const noise = (lon, lat, salt = 1) => 0.7 * valueNoise(lon / 3.2, lat / 2.6, salt) + 0.3 * valueNoise(lon / 1.1, lat / 0.9, salt + 5);

// --- Biomes --------------------------------------------------------------------------

const inBox = ([lon, lat], w, s, e, n) => lon >= w && lon <= e && lat >= s && lat <= n;
const isAmericas = ([lon]) => lon < -30;
const isAfrica = (p) => inBox(p, -18, -35, 52, 15);
const isAustralia = (p) => inBox(p, 112, -44, 154, -10);

/**
 * Farmland, with the year farming took hold there (roughly), or null. The great
 * river plains were farmed first; the open ground of temperate Europe and
 * eastern China followed. Shown only in eras after that year.
 */
function farmland(p, n) {
  /**
   * Inside a farmed region? Regions are drawn as rounded shapes that thin out
   * toward their margins (the noise must be higher there), never as boxes.
   * base: how much of the region's heart is farmed (0 none, 1 all).
   */
  const region = ([w, s, e, nn], base) => {
    const dx = (p[0] - (w + e) / 2) / ((e - w) / 2);
    const dy = (p[1] - (s + nn) / 2) / ((nn - s) / 2);
    const edge = Math.hypot(dx, dy); // 0 at the heart, 1 at the rim
    return edge < 1.15 && n > 1 - base + edge * edge * 0.55;
  };
  if (region([38, 29, 49, 38], 0.85)) return -7000; // Mesopotamia and the Fertile Crescent
  if (inBox(p, 30.2, 22, 32.6, 31.5) && n > 0.15) return -5000; // the Nile, a narrow green strip
  if (region([107, 29, 122, 41], 0.95)) return -5500; // the Yellow River and the north China plain
  if (region([104, 21, 122, 31], 0.6)) return -3000; // the Yangtze and the south
  if (region([69, 21, 91, 32], 0.9)) return -3000; // the Indus and the Ganges
  if (inBox(p, -10, 43, 30, 56) && n > 0.55) return -4000; // lowland Europe, between the woods
  if (region([-101, 13, -86, 23], 0.5)) return -2000; // Mesoamerica
  return null;
}

/**
 * The cover of a cell, or null for open ground. Each biome has a share of its
 * area covered (the noise threshold), leaving clearings and open country.
 */
function cover(p) {
  const [lon, lat] = p;
  const n = noise(lon, lat);
  const share = (kind, fraction) => (n < fraction ? kind : null);
  if (lat > 70 || lat < -56) return null;
  const farmed = farmland(p, n);
  if (farmed !== null) return { cover: "farmland", from: farmed };
  // Arid belts: left to the desert stipple.
  if (inBox(p, -18, 15, 62, 37) && !inBox(p, -10, 34, 42, 37)) return null;
  if (inBox(p, 78, 28, 102, 38)) return share("grassland", 0.35); // Tibetan Plateau
  if (inBox(p, 50, 37, 90, 47)) return share("grassland", 0.45);
  if (inBox(p, -120, 28, -100, 40)) return share("grassland", 0.3);
  // The great farmed plains: cleared for fields long ago.
  if (inBox(p, 110, 22, 122, 40) || inBox(p, 75, 22, 90, 31) || inBox(p, 42, 30, 48, 36)) return null;
  if (lat > 62 || (lat > 56 && lon < -60 && lon > -170)) return share("conifer", 0.4);
  if (lat > 50) return share("conifer", 0.78);
  if (Math.abs(lat) <= 12) return share("jungle", 0.8);
  if (Math.abs(lat) <= 25) {
    if (isAfrica(p)) return share("savanna", 0.75);
    if (isAustralia(p)) return share("grassland", 0.55);
    if (isAmericas(p)) return lat > 20 && lon < -98 ? share("grassland", 0.4) : share("broadleaf", 0.65);
    return share("broadleaf", 0.6);
  }
  if (inBox(p, -112, 30, -95, 52)) return share("grassland", 0.85); // prairie
  if (inBox(p, 35, 42, 120, 52)) return share("grassland", 0.8); // steppe
  if (isAustralia(p)) return n < 0.35 ? "broadleaf" : n < 0.7 ? "grassland" : null;
  if (inBox(p, -70, -42, -55, -25)) return share("grassland", 0.8); // pampas
  if (isAfrica(p)) return share("savanna", 0.6);
  return share("broadleaf", 0.62);
}

// --- Grid, merge, round off ------------------------------------------------------------

const cells = [];
for (let lat = -56; lat < 72; lat += CELL)
  for (let lon = -180; lon < 180; lon += CELL) {
    const c = cover([lon + CELL / 2, lat + CELL / 2]);
    const props = typeof c === "string" ? { cover: c, from: -200000 } : c;
    if (props) cells.push({ type: "Feature", properties: props, geometry: { type: "Polygon", coordinates: [[[lon, lat], [lon + CELL, lat], [lon + CELL, lat + CELL], [lon, lat + CELL], [lon, lat]]] } });
  }
console.log(cells.length, "cells");

const run = async (cmd, files) => {
  const out = await mapshaper.applyCommands(cmd, files);
  return JSON.parse(out["out.json"].toString());
};
const merged = await run("-i cells.json -dissolve2 cover,from -o out.json format=geojson", { "cells.json": { type: "FeatureCollection", features: cells } });

/** Chaikin corner-cutting: turns the grid's staircase edges into soft curves. */
function chaikin(ring, rounds = 3) {
  let r = ring.slice(0, -1);
  for (let k = 0; k < rounds; k++) {
    const next = [];
    for (let i = 0; i < r.length; i++) {
      const [a, b] = [r[i], r[(i + 1) % r.length]];
      next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    r = next;
  }
  r = r.map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]);
  return [...r, r[0]];
}
const rounded = (g) =>
  g.type === "Polygon"
    ? { type: "Polygon", coordinates: g.coordinates.map((r) => chaikin(r)) }
    : { type: "MultiPolygon", coordinates: g.coordinates.map((p) => p.map((r) => chaikin(r))) };
const soft = { type: "FeatureCollection", features: merged.features.map((f) => ({ ...f, geometry: rounded(f.geometry) })) };

// --- Clip to the land; cut out ice, deserts and mountains -----------------------------------

const read = async (name) => JSON.parse(await readFile(`${SRC}/${name}.geojson`, "utf8"));
const regions = await read("ne_50m_geography_regions_polys");
const bare = {
  type: "FeatureCollection",
  features: regions.features.filter((f) => ["Desert", "Range/mtn"].includes(f.properties.FEATURECLA)),
};
const land = await read("ne_50m_land");
const ice = await read("ne_50m_glaciated_areas");
const part = (farm) => ({ type: "FeatureCollection", features: soft.features.filter((f) => (f.properties.cover === "farmland") === farm) });
const wild = await run(
  "-i soft.json -clip land.json -erase ice.json -erase bare.json -simplify 40% keep-shapes -filter-slivers min-area=200km2 -o out.json format=geojson precision=0.001",
  { "soft.json": part(false), "land.json": land, "ice.json": ice, "bare.json": bare },
);
const farms = await run(
  "-i soft.json -clip land.json -simplify 40% keep-shapes -filter-slivers min-area=200km2 -o out.json format=geojson precision=0.001",
  { "soft.json": part(true), "land.json": land },
);
const result = { type: "FeatureCollection", features: [...wild.features, ...farms.features] };
const counts = {};
for (const f of result.features) counts[f.properties.cover] = (counts[f.properties.cover] ?? 0) + 1;
await writeFile("public/data/landcover.json", JSON.stringify(result));
console.log(counts);
