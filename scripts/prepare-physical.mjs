// Builds public/data/physical.json: the physical geography drawn beneath the
// political map (terrain textures, rivers, lakes, ice, landform and sea names).
// It gives shape to the large unclaimed areas of early eras.
// Source: Natural Earth 1:50m (public domain), downloaded into vendor-src/:
//   ne_50m_geography_regions_polys, ne_50m_geography_marine_polys,
//   ne_50m_rivers_lake_centerlines, ne_50m_lakes, ne_50m_glaciated_areas
// Run: node scripts/prepare-physical.mjs
import { readFile, writeFile } from "node:fs/promises";
import polylabel from "polylabel";
import { area } from "@turf/area";

const SRC = "vendor-src";
const round = (n) => Math.round(n * 1000) / 1000;
const roundCoords = (c) => (typeof c[0] === "number" ? [round(c[0]), round(c[1])] : c.map(roundCoords));
const read = async (name) => JSON.parse(await readFile(`${SRC}/${name}.geojson`, "utf8")).features;

function labelPoint(geom) {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  let best = polys[0];
  let bestArea = -1;
  for (const rings of polys) {
    const a = area({ type: "Polygon", coordinates: rings });
    if (a > bestArea) (bestArea = a), (best = rings);
  }
  const p = polylabel(best, 0.05);
  return [round(p[0]), round(p[1])];
}

// Natural Earth class -> terrain texture drawn on the map (null: label only).
const TERRAIN = {
  Desert: "desert",
  "Range/mtn": "mountains",
  Plateau: "plateau",
  Tundra: "tundra",
  Wetlands: "wetland",
  Delta: "wetland",
};
const LABELLED = new Set(["Desert", "Range/mtn", "Plateau", "Tundra", "Wetlands", "Plain", "Basin", "Delta", "Lowland", "Valley", "Peninsula", "Pen/cape"]);

const features = [];
const point = (props, coords) => features.push({ type: "Feature", properties: props, geometry: { type: "Point", coordinates: coords } });
const shape = (props, geom) => features.push({ type: "Feature", properties: props, geometry: { type: geom.type, coordinates: roundCoords(geom.coordinates) } });

// The Sahara and its sub-deserts were grassland with lakes during the African
// Humid Period (about 9000-3500 BCE); the app tints them green in those eras.
const GREEN_SAHARA_EXCLUDE = new Set(["KALAHARI DESERT", "NAMIB DESERT"]);

for (const f of await read("ne_50m_geography_regions_polys")) {
  const p = f.properties;
  const kind = TERRAIN[p.FEATURECLA];
  const green = kind === "desert" && p.REGION === "Africa" && !GREEN_SAHARA_EXCLUDE.has(p.NAME);
  if (kind) shape({ layer: "terrain", kind, ...(green ? { green: true } : {}) }, f.geometry);
  if (LABELLED.has(p.FEATURECLA) && p.NAME) {
    point({ layer: "land-label", name: p.NAME_EN || p.NAME, kind: kind ?? "region", minzoom: p.MIN_LABEL ?? 3, rank: p.SCALERANK ?? 5 }, labelPoint(f.geometry));
  }
}

for (const f of await read("ne_50m_geography_marine_polys")) {
  const p = f.properties;
  if (!p.name || !["ocean", "sea", "gulf", "bay", "strait", "channel", "sound"].includes(p.featurecla)) continue;
  point({ layer: "sea-label", name: p.name, kind: p.featurecla, minzoom: p.min_label ?? 3, rank: p.scalerank ?? 5 }, labelPoint(f.geometry));
}

for (const f of await read("ne_50m_glaciated_areas")) shape({ layer: "ice" }, f.geometry);
for (const f of await read("ne_50m_lakes")) shape({ layer: "lake", rank: f.properties.scalerank ?? 5 }, f.geometry);
for (const f of await read("ne_50m_rivers_lake_centerlines")) {
  if (f.properties.featurecla !== "River" && f.properties.featurecla !== "Lake Centerline") continue;
  shape({ layer: "river", rank: f.properties.scalerank ?? 6, name: f.properties.name_en || f.properties.name || null }, f.geometry);
}

await writeFile("public/data/physical.json", JSON.stringify({ type: "FeatureCollection", features }));
const counts = {};
for (const f of features) counts[f.properties.layer] = (counts[f.properties.layer] ?? 0) + 1;
console.log(counts);
