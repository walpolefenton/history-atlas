// Builds public/data/cities.json from vendor-src/wd_cities.json (fetch-cities.mjs).
// Run: node scripts/prepare-cities.mjs
//
// Each city gets the span of years it should appear and, where it changed,
// the name it went by in each period. Wikidata lacks founding dates for some
// major cities and dates a few renamed cities from the renaming; the tables
// below correct those with approximate, hand-checked dates.
import { readFile, writeFile } from "node:fs/promises";

const cities = JSON.parse(await readFile("vendor-src/wd_cities.json", "utf8"));

/** Approximate founding (or first settlement as a town) where Wikidata has none or is misleading. */
const FOUNDED = {
  Beijing: -1045, Barcelona: -15, Ankara: -1200, Sofia: -700, Dhaka: 1608, Florence: -59, Kolkata: 1690, Naples: -600,
  Pyongyang: 427, Geneva: -58, Skopje: 1, Lyon: -43, Amman: -1200, Honolulu: 1804, Cologne: 50, "Abu Dhabi": 1761, Khartoum: 1821,
  Kampala: 1890, Tunis: -400, Stuttgart: 950, Turin: -28, Genoa: -500, Palermo: -734, Glasgow: 550, Nice: -350, Guangzhou: -214,
  Rotterdam: 1270, Leipzig: 1015, Bremen: 787, Bonn: -11, Belfast: 1613, Jeddah: 647, Salzburg: 696, Tianjin: 1404, Heidelberg: 1196,
  Ghent: 650, Aachen: 1, "Xi'an": -202, Porto: -300, Agra: 1504, Varanasi: -1000, "Lübeck": 1143, Hangzhou: 589, Ravenna: -200,
  Reims: -80, Regensburg: 179, "Nîmes": -120, Trabzon: -756, Istanbul: -667, "New York City": 1624, Tokyo: 1457, "Mexico City": 1521,
  Baku: 500, Isfahan: -500, Lucknow: 1775, Busan: 1407, Colombo: 1517, Casablanca: 1770, Muscat: 100,
};

/** Earlier names, oldest first: each applies until the given year. */
const NAMES = {
  Istanbul: [[330, "Byzantium"], [1453, "Constantinople"]],
  "New York City": [[1664, "New Amsterdam"]],
  Tokyo: [[1868, "Edo"]],
  "Saint Petersburg": [[1914, "Saint Petersburg"], [1924, "Petrograd"], [1991, "Leningrad"]],
  "Ho Chi Minh City": [[1976, "Saigon"]],
  Jakarta: [[1619, "Jayakarta"], [1942, "Batavia"]],
  Mumbai: [[1995, "Bombay"]],
  Chennai: [[1996, "Madras"]],
  Kolkata: [[2001, "Calcutta"]],
  Beijing: [[1272, "Yanjing"], [1368, "Khanbaliq"], [1403, "Beiping"], [1928, "Beijing"], [1949, "Beiping"]],
  "Xi'an": [[1369, "Chang'an"]],
  London: [[500, "Londinium"]],
  Paris: [[300, "Lutetia"]],
  Cologne: [[500, "Colonia Agrippina"]],
  Milan: [[500, "Mediolanum"]],
  Vienna: [[500, "Vindobona"]],
  Lyon: [[500, "Lugdunum"]],
  Barcelona: [[500, "Barcino"]],
  Ankara: [[1073, "Ancyra"], [1930, "Angora"]],
  "İzmir": [[1930, "Smyrna"]],
  Izmir: [[1930, "Smyrna"]],
  "Gdańsk": [[1945, "Danzig"]],
  "Wrocław": [[1945, "Breslau"]],
  Kaliningrad: [[1946, "Königsberg"]],
  Volgograd: [[1925, "Tsaritsyn"], [1961, "Stalingrad"]],
  Oslo: [[1624, "Oslo"], [1925, "Christiania"]],
  Harare: [[1982, "Salisbury"]],
  Kinshasa: [[1966, "Léopoldville"]],
  Maputo: [[1976, "Lourenço Marques"]],
  Yangon: [[1989, "Rangoon"]],
  Kyoto: [[1100, "Heian-kyō"]],
  Tunis: [[700, "Tunes"]],
  Naples: [[500, "Neapolis"]],
};

// Cities with no known founding date appear from 1500, or from 1900 in regions
// where most present-day cities are 19th-century or later foundations.
const lateRegion = ([lon, lat]) => lon < -30 || lon > 110 && lat < -10 || (lat < -15 && lon > 10 && lon < 42);

// Wikidata's city classes catch a few things that aren't cities.
const NOT_A_CITY = /metropolitan area|\bHall\b|\bPark\b|Monument|County|Region|District$|Province|Prefecture|Municipality of/i;

const out = [];
for (const c of cities) {
  if (NOT_A_CITY.test(c.title)) continue;
  if (c.ancient && c.founded === null && c.dissolved === null && FOUNDED[c.title] === undefined) continue; // undatable ruins
  const override = FOUNDED[c.title];
  const founded = override ?? c.founded;
  const undated = founded === null;
  const from = undated ? (lateRegion(c.coord) ? 1900 : 1500) : founded;
  const names = NAMES[c.title] ?? null;
  out.push({
    qid: c.qid,
    // "Boise, Idaho" becomes "Boise"; "Washington, D.C." becomes "Washington".
    name: c.title.replace(/ \(city\)$/, "").replace(/,.*$/, ""),
    ...(names ? { names } : {}),
    lon: Math.round(c.coord[0] * 1000) / 1000,
    lat: Math.round(c.coord[1] * 1000) / 1000,
    from,
    to: c.dissolved,
    ...(override !== undefined ? { approx: true } : {}),
    ...(undated ? { undated: true } : {}),
    pop: c.pop,
    links: c.links,
    ...(c.ancient ? { ancient: true } : {}),
  });
}
out.sort((a, b) => b.links - a.links);
await writeFile("public/data/cities.json", JSON.stringify(out));
console.log(`${out.length} cities (${out.filter((c) => c.undated).length} undated, shown from 1500/1900)`);
