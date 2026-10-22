// Builds public/data/admin1.json: first-level divisions (states, provinces,
// regions) with the year from which each should be drawn.
// Run: node scripts/prepare-admin1.mjs
//
// Source: Natural Earth 1:10m admin-1 (public domain), simplified with
// mapshaper into vendor-src/admin1-simplified.geojson:
//   npx mapshaper vendor-src/ne_10m_admin_1_states_provinces.geojson \
//     -filter-fields name,admin,adm0_a3,type_en,wikidataid,labelrank,min_label,postal \
//     -simplify 4% weighted keep-shapes -o format=geojson precision=0.001 vendor-src/admin1-simplified.geojson
//
// These are present-day boundaries. For the United States, Canada and Australia,
// each unit appears from the year it became a state, province or colony, so the
// map fills in over time; elsewhere they appear from the 1990s maps on.
import { readFile, writeFile } from "node:fs/promises";
import polylabel from "polylabel";
import { area } from "@turf/area";

const DEFAULT_FROM = 1994;

// Year of admission to the Union.
const US = {
  Delaware: 1787, Pennsylvania: 1787, "New Jersey": 1787, Georgia: 1788, Connecticut: 1788, Massachusetts: 1788, Maryland: 1788,
  "South Carolina": 1788, "New Hampshire": 1788, Virginia: 1788, "New York": 1788, "North Carolina": 1789, "Rhode Island": 1790,
  Vermont: 1791, Kentucky: 1792, Tennessee: 1796, Ohio: 1803, Louisiana: 1812, Indiana: 1816, Mississippi: 1817, Illinois: 1818,
  Alabama: 1819, Maine: 1820, Missouri: 1821, Arkansas: 1836, Michigan: 1837, Florida: 1845, Texas: 1845, Iowa: 1846, Wisconsin: 1848,
  California: 1850, Minnesota: 1858, Oregon: 1859, Kansas: 1861, "West Virginia": 1863, Nevada: 1864, Nebraska: 1867, Colorado: 1876,
  "North Dakota": 1889, "South Dakota": 1889, Montana: 1889, Washington: 1889, Idaho: 1890, Wyoming: 1890, Utah: 1896, Oklahoma: 1907,
  "New Mexico": 1912, Arizona: 1912, Alaska: 1959, Hawaii: 1959, "District of Columbia": 1790,
};
// Year each became a province or territory of Canada.
const CANADA = {
  Ontario: 1867, "Québec": 1867, Quebec: 1867, "Nova Scotia": 1867, "New Brunswick": 1867, Manitoba: 1870, "British Columbia": 1871,
  "Prince Edward Island": 1873, Alberta: 1905, Saskatchewan: 1905, "Newfoundland and Labrador": 1949, Yukon: 1898,
  "Northwest Territories": 1870, Nunavut: 1999,
};
// Year each was established as a British colony or territory.
const AUSTRALIA = {
  "New South Wales": 1788, Tasmania: 1825, "Western Australia": 1829, "South Australia": 1836, Victoria: 1851, Queensland: 1859,
  "Northern Territory": 1911, "Australian Capital Territory": 1911, "Jervis Bay Territory": 1915,
};

const src = JSON.parse(await readFile("vendor-src/admin1-simplified.geojson", "utf8"));
const round = (n) => Math.round(n * 1000) / 1000;

function labelPoint(geom) {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  let best = polys[0];
  let bestArea = -1;
  for (const rings of polys) {
    const a = area({ type: "Polygon", coordinates: rings });
    if (a > bestArea) (bestArea = a), (best = rings);
  }
  const p = polylabel(best, 0.02);
  return [round(p[0]), round(p[1])];
}

const shapes = [];
const labels = [];
const missing = [];
for (const f of src.features) {
  const p = f.properties;
  if (!f.geometry || !p.name) continue;
  const table = p.adm0_a3 === "USA" ? US : p.adm0_a3 === "CAN" ? CANADA : p.adm0_a3 === "AUS" ? AUSTRALIA : null;
  const from = table ? table[p.name] : DEFAULT_FROM;
  if (from === undefined) {
    missing.push(`${p.admin}: ${p.name}`);
    continue;
  }
  const km2 = Math.round(area(f.geometry) / 1e6);
  const props = { name: p.name, country: p.admin, kind: p.type_en || "Region", qid: p.wikidataid || null, from, km2, rank: p.labelrank ?? 6 };
  shapes.push({ type: "Feature", properties: props, geometry: f.geometry });
  labels.push({ type: "Feature", properties: { name: p.name, km2, rank: props.rank, from }, geometry: { type: "Point", coordinates: labelPoint(f.geometry) } });
}
labels.sort((a, b) => b.properties.km2 - a.properties.km2);

await writeFile("public/data/admin1.json", JSON.stringify({ shapes: { type: "FeatureCollection", features: shapes }, labels: { type: "FeatureCollection", features: labels } }));
console.log(`${shapes.length} divisions${missing.length ? `; skipped (no date): ${missing.join(", ")}` : ""}`);
