// Builds public/data/scenery.json: the illustrated layer that fills the globe,
// in the manner of a Saul Steinberg drawing. Run: node scripts/prepare-scenery.mjs
//
// Four kinds of feature, all small pen drawings or pen lines:
//   point  - scattered scenery: trees, peaks, dunes, animals, waves, chosen by
//            terrain and a coarse biome model, in density tiers by zoom
//   mural  - large, faint drawings spanning a whole region in a given era
//   range  - mountain ranges drawn as chains of peaks along their spines
//   route  - trade routes and sea lanes, as dotted trails, with era-appropriate
//            ships or caravans placed along them
// Features with "from"/"to" only appear in eras that overlap those years.
//
// Sources: Natural Earth 1:50m land and physical regions (public domain).
// Coordinates of ranges, routes and murals are hand-placed approximations.
import { readFile, writeFile } from "node:fs/promises";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";

const SRC = "vendor-src";
const round = (n) => Math.round(n * 100) / 100;

// Deterministic randomness, so rebuilding gives the same picture.
let seed = 20261021;
const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
const pick = (weights) => {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (const [k, w] of Object.entries(weights)) if ((r -= w) <= 0) return k;
  return null;
};

// --- Geometry helpers -------------------------------------------------------------

function bbox(geom) {
  let [w, s, e, n] = [180, 90, -180, -90];
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  for (const rings of polys)
    for (const [x, y] of rings[0]) {
      w = Math.min(w, x); e = Math.max(e, x);
      s = Math.min(s, y); n = Math.max(n, y);
    }
  return [w, s, e, n];
}

function indexed(features) {
  return features.map((f) => ({ f, b: bbox(f.geometry) }));
}

function hit(index, p) {
  for (const { f, b } of index) {
    if (p[0] < b[0] || p[0] > b[2] || p[1] < b[1] || p[1] > b[3]) continue;
    if (booleanPointInPolygon(p, f.geometry)) return f;
  }
  return null;
}

const read = async (name) => JSON.parse(await readFile(`${SRC}/${name}.geojson`, "utf8")).features;
const land = indexed(await read("ne_50m_land"));
const ice = indexed(await read("ne_50m_glaciated_areas"));
const TERRAIN = { Desert: "desert", "Range/mtn": "mountains", Plateau: "plateau", Tundra: "tundra", Wetlands: "wetland", Delta: "wetland" };
const terrain = indexed((await read("ne_50m_geography_regions_polys")).filter((f) => TERRAIN[f.properties.FEATURECLA]));

// --- Biomes -----------------------------------------------------------------------------

const inBox = ([lon, lat], w, s, e, n) => lon >= w && lon <= e && lat >= s && lat <= n;
const isAmericas = ([lon]) => lon < -30;
const isAfrica = (p) => inBox(p, -18, -35, 52, 15);
const isAustralia = (p) => inBox(p, 112, -44, 154, -10);

/** What grows or roams here, as weights over scenery kinds. Null leaves it blank. */
function landScenery(p, kind) {
  const [lon, lat] = p;
  if (kind === "mountains") return { peaks: 6, peak: 4 };
  // Deserts keep plenty of open ground between their dunes.
  if (kind === "desert") return isAmericas(p) ? { cactus: 4, dune: 4, none: 3 } : { dune: 5, camel: 0.8, none: 5 };
  if (kind === "tundra") return { caribou: 2, grass: 3 };
  if (kind === "plateau") return { peak: 3, grass: 3 };
  if (kind === "wetland") return { grass: 3, fisher: 1 };

  // Arid belts that Natural Earth's desert outlines don't fully cover.
  if (inBox(p, 78, 28, 102, 38)) return { peak: 2, grass: 2, rider: 0.2 }; // Tibetan Plateau
  if (inBox(p, -18, 15, 62, 37) && !inBox(p, -10, 34, 42, 37)) return { dune: 3, grass: 1, camel: 0.6, palm: 0.4 };
  if (inBox(p, 50, 37, 90, 47)) return { grass: 2, dune: 2, camel: 0.5, rider: 0.2 };
  if (inBox(p, -120, 28, -100, 40)) return { cactus: 2, grass: 1, peak: 1 };
  if (lat < -62) return { penguin: 1 };
  if (lat > 70) return { polarbear: 1, grass: 2 };
  if (lat > 62 || (lat > 56 && lon < -60 && lon > -170)) return { caribou: 2, grass: 2, pine: 3 };
  if (lat > 50) return { pine: 8, caribou: 1 };
  if (Math.abs(lat) <= 12) return isAfrica(p) ? { jungle: 5, palm: 3, elephant: 1 } : { jungle: 6, palm: 3 };
  if (Math.abs(lat) <= 25) {
    if (isAfrica(p)) return { grass: 2, giraffe: 1.4, elephant: 1, palm: 1 };
    if (isAustralia(p)) return { grass: 3, kangaroo: 1.5 };
    if (isAmericas(p)) return lat > 20 && lon < -98 ? { cactus: 3, grass: 2 } : { palm: 3, oak: 3, jungle: 1 };
    return { palm: 4, oak: 3 };
  }
  // The great farmed plains carry fields rather than forest.
  if (inBox(p, 110, 22, 122, 40) || inBox(p, 75, 22, 90, 31) || inBox(p, 30, 22, 33, 31.5) || inBox(p, 42, 30, 48, 36)) return { fields: 5, oak: 1, none: 2 };
  if (inBox(p, -112, 30, -95, 52)) return { grass: 3, bison: 2 };
  if (inBox(p, 35, 42, 120, 52)) return { grass: 3, wildhorse: 1.5, rider: 0.3 };
  if (isAustralia(p)) return { grass: 2, kangaroo: 1.2, oak: 2 };
  if (inBox(p, -70, -42, -55, -25)) return { grass: 4 };
  if (inBox(p, -5, 43, 30, 55)) return { oak: 4, fields: 2, grass: 1, none: 2 };
  return { oak: 6, grass: 2, none: 1 };
}

// --- Scattered scenery ---------------------------------------------------------------------

/** Base drawing scale by kind: big things drawn big. Each piece then varies a little. */
const SCALE = {
  fields: 1.4,
  peaks: 1.5, peak: 1.15, jungle: 1.4, pine: 1.15, oak: 1.1, palm: 1.05, dune: 1.3, cactus: 0.85, grass: 0.7,
  bison: 1, caribou: 0.9, giraffe: 1.15, elephant: 1.2, kangaroo: 0.9, penguin: 0.75, polarbear: 1, wildhorse: 0.9,
  camel: 1, rider: 1, fisher: 1, waves: 0.95, whale: 1.6, fish: 0.8,
};
const scaled = (kind, shrink = 1) => Math.round((SCALE[kind] ?? 1) * shrink * (0.78 + rand() * 0.5) * 100) / 100;

// Trees grow in stands and grazing animals move in herds, with open ground
// between: masses of woodland and mountain, not an even scatter of single pieces.
const CLUMPS = { pine: [2, 5], oak: [1, 4], jungle: [2, 4], palm: [1, 3], bison: [1, 3], caribou: [1, 3], wildhorse: [1, 2], giraffe: [0, 1], dune: [1, 3], peaks: [1, 3], peak: [1, 2] };
/** Peaks stand shoulder to shoulder in a row, making a ridge rather than a scatter. */
const RIDGE = new Set(["peaks", "peak"]);

/** Is this sea point near a coast? Waves gather there, like engraved water lines. */
const nearCoast = (p, d) => [[d, 0], [-d, 0], [0, d], [0, -d]].some(([dx, dy]) => hit(land, [p[0] + dx, p[1] + dy]));

const TIERS = [
  { tier: 1, spacing: 7, ocean: true },
  { tier: 2, spacing: 3.5, ocean: true },
  { tier: 3, spacing: 1.75, ocean: false },
  { tier: 4, spacing: 0.9, ocean: false },
];
const features = [];
// Each piece picks one of four hand-varied versions of its drawing (v).
const point = (props, [lon, lat]) =>
  features.push({ type: "Feature", properties: { ...props, v: Math.floor(rand() * 4) }, geometry: { type: "Point", coordinates: [round(lon), round(lat)] } });

for (const { tier, spacing, ocean } of TIERS) {
  for (let lat = -78 + spacing / 2; lat < 82; lat += spacing) {
    // Widen longitude steps toward the poles, so density stays even on the globe.
    const lonStep = spacing / Math.max(0.25, Math.cos((lat * Math.PI) / 180));
    for (let lon = -180 + rand() * lonStep; lon < 180; lon += lonStep) {
      const p = [lon + (rand() - 0.5) * lonStep * 0.7, lat + (rand() - 0.5) * spacing * 0.7];
      if (rand() < 0.38) continue; // breathing room: open country between the stands
      if (hit(land, p)) {
        if (hit(ice, p)) continue;
        const t = hit(terrain, p);
        const kind = pick(landScenery(p, t ? TERRAIN[t.properties.FEATURECLA] : null) ?? {});
        if (!kind || kind === "none") continue;
        if (tier === 4 && rand() < 0.4) continue; // keep the closest zoom from becoming a thicket
        // Fields only appear once farming had reached the region.
        point({ type: "point", k: kind, t: tier, s: scaled(kind), ...(kind === "fields" ? { from: -3000, to: null } : {}) }, p);
        const [lo, hi] = CLUMPS[kind] ?? [0, 0];
        const extra = lo + Math.floor(rand() * (hi - lo + 1));
        for (let j = 0; j < extra; j++) {
          // Ridges extend east and west alternately, each peak overlapping the last;
          // stands bunch closely around their first tree.
          const side = j % 2 ? -1 : 1;
          const q = RIDGE.has(kind)
            ? [p[0] + side * (Math.floor(j / 2) + 1) * lonStep * (0.16 + rand() * 0.06), p[1] + (rand() - 0.4) * spacing * 0.08]
            : [p[0] + (rand() - 0.5) * lonStep * 0.3, p[1] + (rand() - 0.5) * spacing * 0.18];
          if (hit(land, q)) point({ type: "point", k: kind, t: Math.min(4, tier + 1), s: scaled(kind, RIDGE.has(kind) ? 0.9 - j * 0.08 : 0.8) }, q);
        }
      } else if (ocean && Math.abs(p[1]) < 72) {
        if (tier === 2 && rand() < 0.5) continue;
        // Open sea stays calm; coastal water carries bands of waves.
        const coastal = nearCoast(p, spacing * 0.6);
        if (rand() < (coastal ? 0.1 : 0.55)) continue;
        const kind = coastal ? pick({ waves: 12, fish: 1 }) : pick({ waves: 6, whale: tier === 1 ? 1.4 : 0.8, fish: 1.2 });
        if (kind) point({ type: "point", k: kind, t: tier, s: scaled(kind, coastal ? 0.85 : 1) }, p);
      }
    }
  }
}

// --- Murals: large, faint drawings filling regions in their eras -----------------------------------
// deg is the drawing's width in degrees of longitude, so it stays the size of the region at any zoom.

const MURALS = [
  // Ice Age and early farming
  { k: "mammoth", at: [95, 60], deg: 26, from: -123000, to: -9000 },
  { k: "hippo", at: [12, 21], deg: 18, from: -9000, to: -3500 },
  { k: "wheat", at: [40, 36], deg: 8, from: -9500, to: -5000 },
  { k: "bison", at: [-101, 43], deg: 16, from: -123000, to: 1880 },
  // The ancient world
  { k: "pyramid", at: [30.5, 26.5], deg: 9, from: -2600, to: null },
  { k: "stepped", at: [45, 32], deg: 7, from: -3000, to: -500 },
  { k: "temple", at: [22.5, 38.6], deg: 6, from: -700, to: 400 },
  { k: "temple", at: [53, 30.5], deg: 8, from: -550, to: -330 },
  { k: "arena", at: [13, 42.3], deg: 6, from: -100, to: 500 },
  { k: "stupa", at: [81, 24], deg: 10, from: -300, to: 400 },
  { k: "wall", at: [108, 41.5], deg: 16, from: -220, to: null },
  { k: "stepped", at: [-96.5, 19], deg: 9, from: -1000, to: 1550 },
  { k: "stepped", at: [-89.5, 17.5], deg: 6, from: 250, to: 950 },
  // Medieval and early modern
  { k: "town-southasia", at: [78, 20], deg: 10, from: 600, to: 1700 },
  { k: "onion", at: [78, 27.5], deg: 8, from: 1650, to: 1858 },
  { k: "pagoda", at: [112, 32], deg: 12, from: 600, to: 1912 },
  { k: "pagoda", at: [138, 36.5], deg: 6, from: 700, to: 1868 },
  { k: "towers", at: [104, 13], deg: 7, from: 900, to: 1450 },
  { k: "rider", at: [103, 47], deg: 15, from: 1200, to: 1400 },
  { k: "town-steppe", at: [68, 48], deg: 14, from: -1000, to: 1850 },
  { k: "camel", at: [3, 22], deg: 14, from: 300, to: 1900 },
  { k: "dune", at: [48, 21], deg: 12, from: -123000, to: null },
  { k: "town-africa", at: [-4, 15], deg: 10, from: 1200, to: 1600 },
  { k: "wall", at: [31, -20], deg: 6, from: 1100, to: 1450 },
  { k: "terraces", at: [-73, -13], deg: 10, from: 1400, to: 1560 },
  { k: "castle", at: [5, 47.5], deg: 12, from: 900, to: 1500 },
  { k: "cathedral", at: [2, 49.5], deg: 7, from: 1150, to: 1600 },
  { k: "minarets", at: [33, 39.5], deg: 10, from: 1453, to: 1922 },
  { k: "castle", at: [40, 56], deg: 12, from: 1500, to: 1917 },
  { k: "town-industrial", at: [-1.5, 53.3], deg: 8, from: 1800, to: 1950 },
  { k: "town-metro", at: [-80, 40.5], deg: 10, from: 1900, to: null },
  // Seas and lands that are always there
  { k: "jungle", at: [-62, -5], deg: 18, from: -123000, to: null },
  { k: "kangaroo", at: [134, -25], deg: 18, from: -123000, to: null },
  { k: "pine", at: [100, 62], deg: 22, from: -9000, to: null },
  { k: "whale", at: [-140, 0], deg: 16, from: -123000, to: null },
  { k: "compass", at: [-22, -32], deg: 12, from: -123000, to: null },
  { k: "wind", at: [-165, 38], deg: 13, from: -123000, to: null },
  { k: "wind", at: [82, -38], deg: 13, from: -123000, to: null },
  // Seafaring
  { k: "canoe", at: [-150, -15], deg: 18, from: 1000, to: 1800 },
  { k: "longship", at: [-2, 61], deg: 10, from: 800, to: 1100 },
  { k: "dhow", at: [68, -4], deg: 14, from: 700, to: 1500 },
  { k: "junk", at: [114, 13], deg: 10, from: 900, to: 1500 },
  { k: "galleon", at: [-40, 25], deg: 16, from: 1500, to: 1820 },
  { k: "steamship", at: [-40, 44], deg: 15, from: 1850, to: 1960 },
  { k: "container", at: [160, 30], deg: 15, from: 1960, to: null },
];
for (const m of MURALS) point({ type: "mural", k: m.k, deg: m.deg, from: m.from, to: m.to }, m.at);

// --- Mountain ranges, as chains of peaks ------------------------------------------------------------

const RANGES = {
  Andes: [[-75, 10], [-73, 5], [-77, 0], [-79, -5], [-76, -12], [-70, -17], [-68, -23], [-70, -30], [-71, -38], [-72, -46], [-73, -52]],
  Rockies: [[-125, 58], [-120, 53], [-115, 49], [-111, 45], [-108, 40], [-106, 36], [-106, 32]],
  "Sierra Madre": [[-108, 30], [-104, 24], [-100, 19], [-97, 17]],
  Appalachians: [[-85, 34], [-81, 37], [-78, 40], [-74, 42], [-71, 44], [-68, 46]],
  Alps: [[6, 44], [7, 46], [10, 46.5], [13, 47], [15, 47.3]],
  Pyrenees: [[-1.8, 43.1], [0.5, 42.7], [3, 42.5]],
  Carpathians: [[17.5, 48.5], [20, 49.3], [24, 48], [26, 46], [23, 45.3]],
  Caucasus: [[37.5, 44.8], [42, 43.3], [46, 42], [49.5, 40.5]],
  Urals: [[59, 68], [60, 64], [59, 58], [58.5, 54], [58, 51]],
  Atlas: [[-9, 30.5], [-6, 32], [-2, 33.5], [3, 35], [8, 36]],
  Zagros: [[45, 37], [47, 34], [50, 31], [53, 29], [56, 27.5]],
  Himalaya: [[72, 35], [77, 33], [81, 30], [85, 28], [88, 27.8], [92, 28], [95, 28.5]],
  "Hindu Kush": [[66, 35], [70, 35.7], [73, 36]],
  "Tian Shan": [[70, 41], [75, 41.5], [80, 42], [86, 43]],
  Kunlun: [[76, 36.5], [82, 36], [88, 36], [94, 36], [100, 35]],
  Altai: [[86, 50], [90, 49], [95, 47]],
  Scandinavian: [[6, 59], [8, 61.5], [12, 64], [15, 67], [19, 69]],
  "Great Dividing Range": [[145, -15], [146, -20], [149, -25], [151, -30], [149, -35], [146, -37.5]],
  "Ethiopian Highlands": [[38, 14], [39, 10], [39.5, 7]],
  Drakensberg: [[27.5, -28.5], [29, -29.5], [30, -31]],
  "Southern Alps": [[167, -46], [170, -43.5], [173, -41.5]],
};
for (const [name, coords] of Object.entries(RANGES)) {
  features.push({ type: "Feature", properties: { type: "range", name }, geometry: { type: "LineString", coordinates: coords } });
}

// The Great Wall, roughly along its Ming course from Jiayuguan to Shanhaiguan.
features.push({
  type: "Feature",
  properties: { type: "wall", name: "Great Wall", from: -220, to: null },
  geometry: { type: "LineString", coordinates: [[98.2, 39.8], [102, 38.5], [105, 38], [107, 38.6], [110, 39.5], [112, 40.2], [114, 40.6], [116, 40.4], [118, 40.1], [119.8, 40]] },
});

// --- Routes: caravan trails and sea lanes, with travellers along them ------------------------------------

const ROUTES = [
  // Overland
  { name: "Silk Road", mode: "land", k: "camel", from: -130, to: 1450, path: [[108.9, 34.3], [103.8, 36], [94.7, 40.1], [75.9, 39.5], [67, 39.7], [61.8, 37.6], [44.4, 33.3], [38.3, 34.5], [36.2, 36.2]] },
  { name: "Trans-Saharan route (west)", mode: "land", k: "camel", from: 300, to: 1600, path: [[-4.3, 31.3], [-4.9, 23.6], [-3, 16.8]] },
  { name: "Trans-Saharan route (east)", mode: "land", k: "camel", from: 300, to: 1600, path: [[13.2, 32.9], [13.9, 25.9], [12.9, 18.7], [8.5, 12]] },
  { name: "Incense Route", mode: "land", k: "camel", from: -700, to: 200, path: [[45, 12.8], [45.3, 15.4], [39.8, 21.4], [35.4, 30.3], [34.4, 31.5]] },
  { name: "Persian Royal Road", mode: "land", k: "rider", from: -500, to: -300, path: [[28, 38.5], [33, 39], [38.5, 37], [43, 36.3], [48.2, 32.2]] },
  { name: "Inca road", mode: "land", k: "herder", from: 1400, to: 1550, path: [[-78.5, -0.2], [-79, -8], [-72, -13.5], [-68, -20], [-70.6, -33.4]] },
  // By sea
  { name: "Phoenician sea lanes", mode: "sea", k: "galley", from: -1200, to: -146, path: [[35.2, 33.3], [25, 34.5], [13, 37], [10.3, 36.9], [-6.3, 36.5]] },
  { name: "Roman grain route", mode: "sea", k: "galley", from: -30, to: 500, path: [[29.9, 31.3], [25, 34], [15, 37], [12.3, 41.7]] },
  { name: "Monsoon route", mode: "sea", k: "dhow", from: -100, to: 1500, path: [[45, 12.5], [54, 12.5], [76.2, 10.2], [80, 6], [95, 6], [102, 2.5]] },
  { name: "Swahili coast", mode: "sea", k: "dhow", from: 800, to: 1500, path: [[45, 12.5], [45.3, 2], [39.7, -4], [39.5, -8.9], [34.7, -20]] },
  { name: "Maritime Silk Road", mode: "sea", k: "junk", from: 700, to: 1500, path: [[102, 2.5], [106, 8], [113.3, 21], [118.6, 24.9]] },
  { name: "Norse North Atlantic", mode: "sea", k: "longship", from: 870, to: 1050, path: [[5, 60], [-1, 60.5], [-7, 62], [-20, 64], [-45, 61], [-55.5, 51.6]] },
  { name: "Cape route", mode: "sea", k: "galleon", from: 1498, to: 1800, path: [[-9.1, 38.7], [-16, 28], [-23, 15], [-20, -10], [18.5, -35.5], [40.7, -15], [55, 0], [73.8, 15.5]] },
  { name: "Spanish treasure fleets", mode: "sea", k: "galleon", from: 1520, to: 1790, path: [[-6.3, 36.5], [-16, 28], [-45, 20], [-70, 19], [-82.4, 23.1], [-96.1, 19.2]] },
  { name: "Manila galleons", mode: "sea", k: "galleon", from: 1565, to: 1815, path: [[-99.9, 16.8], [-140, 13], [170, 14], [121, 14.6]] },
  { name: "Tea clippers", mode: "sea", k: "clipper", from: 1840, to: 1875, path: [[0, 50.5], [-25, 0], [18, -37], [80, -38], [105, -8], [113, 22]] },
  { name: "Transatlantic steamers", mode: "sea", k: "steamship", from: 1840, to: 1960, path: [[-3, 53.4], [-30, 50], [-74, 40.6]] },
  { name: "Suez route", mode: "sea", k: "steamship", from: 1869, to: 1960, path: [[-1.4, 50.9], [-5.6, 36], [14.5, 35.9], [32.3, 31.3], [38, 20], [45, 12.5], [72.8, 18.9]] },
  { name: "Container lanes (Asia–Europe)", mode: "sea", k: "container", from: 1960, to: null, path: [[121.5, 31], [104, 1.3], [79.8, 6.9], [45, 12.5], [32.5, 30], [-5.6, 36], [4, 51.9]] },
  { name: "Container lanes (trans-Pacific)", mode: "sea", k: "container", from: 1960, to: null, path: [[121.5, 31], [150, 38], [180, 40], [-150, 38], [-118.2, 33.7]] },
  // By air
  { name: "North Atlantic air route", mode: "air", k: "airliner", from: 1950, to: null, path: [[-0.5, 51.5], [-20, 55], [-40, 53], [-73.8, 40.6]] },
  { name: "Trans-Pacific air route", mode: "air", k: "airliner", from: 1950, to: null, path: [[-118.4, 33.9], [-158, 21.3], [180, 30], [139.8, 35.5]] },
];

/** What each route carried, and its Wikipedia article, shown when a traveller is clicked. */
const ROUTE_INFO = {
  "Silk Road": { wiki: "Silk Road", note: "Silk, spices and horses moved between China and the Mediterranean in relays; so did Buddhism, paper and, in 1346, the Black Death." },
  "Trans-Saharan route (west)": { wiki: "Trans-Saharan trade", note: "Salt from Saharan mines like Taghaza was carried south to Timbuktu and traded for West African gold." },
  "Trans-Saharan route (east)": { wiki: "Trans-Saharan trade", note: "Linked Tripoli with Lake Chad and the Hausa cities; caravans carried cloth, salt, ivory and enslaved people." },
  "Incense Route": { wiki: "Incense Route", note: "Frankincense and myrrh from southern Arabia were carried north to Petra, Gaza and the Mediterranean markets." },
  "Persian Royal Road": { wiki: "Royal Road", note: "Built by Darius I; royal messengers with relays of horses covered its 2,700 km in about nine days." },
  "Inca road": { wiki: "Inca road system", note: "Some 40,000 km of roads tied the Inca Empire together; runners carried messages and llamas carried goods." },
  "Phoenician sea lanes": { wiki: "Phoenicia", note: "Phoenician traders from Tyre and Sidon sailed the length of the Mediterranean and founded Carthage and Gades." },
  "Roman grain route": { wiki: "Roman Egypt", note: "Fleets carried Egyptian wheat to Rome; the city depended on it for a large share of its bread." },
  "Monsoon route": { wiki: "Indian Ocean trade", note: "Sailors timed voyages to the monsoon winds, linking Arabia, India and Southeast Asia in pepper, cotton and spices." },
  "Swahili coast": { wiki: "Swahili coast", note: "Trading towns like Kilwa and Mombasa exchanged gold, ivory and timber for goods from Arabia, India and China." },
  "Maritime Silk Road": { wiki: "Maritime Silk Road", note: "Chinese ships and ports such as Quanzhou carried porcelain and silk to Southeast Asia and beyond." },
  "Norse North Atlantic": { wiki: "Norse colonization of North America", note: "Norse sailors hopped from Norway to Iceland, Greenland and briefly to Newfoundland." },
  "Cape route": { wiki: "Portuguese India Armadas", note: "After Vasco da Gama reached India in 1498, Portuguese fleets sailed around Africa for pepper and spices." },
  "Spanish treasure fleets": { wiki: "Spanish treasure fleet", note: "Convoys carried silver from the Americas to Seville for over 250 years." },
  "Manila galleons": { wiki: "Manila galleon", note: "Mexican silver for Chinese silk and porcelain: the first regular trade route across the Pacific." },
  "Tea clippers": { wiki: "Tea clipper", note: "Fast sailing ships raced each new season's tea from China to London, until the Suez Canal and steam took over." },
  "Transatlantic steamers": { wiki: "Transatlantic crossing", note: "Steamships cut the Atlantic crossing from weeks to days and carried millions of emigrants to the Americas." },
  "Suez route": { wiki: "Suez Canal", note: "The Suez Canal, opened in 1869, cut the voyage from Europe to India by thousands of kilometres." },
  "Container lanes (Asia–Europe)": { wiki: "Containerization", note: "Standard shipping containers, from the 1950s, made sea freight so cheap that most of what you own has been on one." },
  "Container lanes (trans-Pacific)": { wiki: "Containerization", note: "The busiest container route links East Asian factories with ports on the American west coast." },
  "North Atlantic air route": { wiki: "Transatlantic flight", note: "Jet airliners from the late 1950s turned the Atlantic crossing into an evening's journey." },
  "Trans-Pacific air route": { wiki: "Transpacific flight", note: "Long-range airliners made the Pacific, once a months-long voyage, a matter of hours." },
};

/** Splits each segment so lines follow the globe smoothly and travellers space out evenly. */
function densify(path, step) {
  const out = [path[0]];
  for (let i = 1; i < path.length; i++) {
    let [x0, y0] = path[i - 1];
    let [x1, y1] = path[i];
    if (Math.abs(x1 - x0) > 180) x1 += x1 < x0 ? 360 : -360; // cross the antimeridian the short way
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let j = 1; j <= n; j++) {
      let x = x0 + ((x1 - x0) * j) / n;
      if (x > 180) x -= 360;
      if (x < -180) x += 360;
      out.push([round(x), round(y0 + ((y1 - y0) * j) / n)]);
    }
  }
  return out;
}

for (const r of ROUTES) {
  if (!ROUTE_INFO[r.name]) throw new Error(`No ROUTE_INFO for ${r.name}`);
  const line = densify(r.path, 2);
  // Split at the antimeridian so the line doesn't streak across the map.
  const parts = [[line[0]]];
  for (let i = 1; i < line.length; i++) {
    if (Math.abs(line[i][0] - line[i - 1][0]) > 180) parts.push([]);
    parts[parts.length - 1].push(line[i]);
  }
  features.push({
    type: "Feature",
    properties: { type: "route", mode: r.mode, name: r.name, from: r.from, to: r.to, ...ROUTE_INFO[r.name] },
    geometry: { type: "MultiLineString", coordinates: parts.filter((p) => p.length > 1) },
  });
  // A traveller roughly every 12 degrees along the way.
  const stops = densify(r.path, 12);
  stops.forEach((p, i) => {
    if (i === 0 || i === stops.length - 1) return;
    point({ type: "traveller", k: r.k, route: r.name, mode: r.mode, from: r.from, to: r.to, t: i % 2 ? 2 : 3, ...ROUTE_INFO[r.name] }, p);
  });
}

await writeFile("public/data/scenery.json", JSON.stringify({ type: "FeatureCollection", features }));
const counts = {};
for (const f of features) counts[f.properties.type] = (counts[f.properties.type] ?? 0) + 1;
console.log(counts, `${features.length} features`);
