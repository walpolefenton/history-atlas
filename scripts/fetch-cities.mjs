// Fetches cities from Wikidata into vendor-src/wd_cities.json.
// Run: node scripts/fetch-cities.mjs
//
// Two sets:
//   - present-day cities of about 150,000 people or more
//   - ancient cities (Wikidata "ancient city"), including abandoned ones
// For each: English Wikipedia title, coordinates, founding date (inception or
// earliest written record), dissolution date, population, and the number of
// Wikipedia language editions (a rough measure of prominence, used to decide
// which cities are labelled first).
import { writeFile } from "node:fs/promises";

async function sparql(query) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch("https://query.wikidata.org/sparql", {
      method: "POST",
      headers: {
        Accept: "application/sparql-results+json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "history-atlas/0.5 (open-source educational map)",
      },
      body: "query=" + encodeURIComponent(query),
    });
    if (res.ok) return (await res.json()).results.bindings;
    console.warn(`Wikidata ${res.status}, retrying`);
    await new Promise((r) => setTimeout(r, 6000 * (attempt + 1)));
  }
  throw new Error("Wikidata query failed");
}

const FIELDS = `?city ?title ?coord ?pop ?inception ?record ?dissolved ?links`;
const OPTIONALS = `
  ?article schema:about ?city ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?title .
  OPTIONAL { ?city wdt:P1082 ?pop }
  OPTIONAL { ?city wdt:P571 ?inception }
  OPTIONAL { ?city wdt:P1249 ?record }
  OPTIONAL { ?city wdt:P576 ?dissolved }`;

const MODERN = `SELECT ${FIELDS} WHERE {
  VALUES ?cls { wd:Q1637706 wd:Q515 wd:Q200250 wd:Q174844 wd:Q5119 wd:Q1549591 }
  ?city wdt:P31 ?cls ; wdt:P625 ?coord ; wdt:P1082 ?p ; wikibase:sitelinks ?links .
  FILTER(?p >= 150000 && ?links >= 25)
  ${OPTIONALS}
}`;

const ANCIENT = `SELECT ${FIELDS} WHERE {
  VALUES ?cls { wd:Q15661340 }
  ?city wdt:P31 ?cls ; wdt:P625 ?coord ; wikibase:sitelinks ?links .
  FILTER(?links >= 20)
  ${OPTIONALS}
}`;

const year = (b) => {
  const m = b?.value?.match(/^(-?\d+)-/);
  return m ? Number(m[1]) : null;
};
const point = (b) => {
  const m = b?.value?.match(/Point\(([-\d.eE]+) ([-\d.eE]+)\)/);
  return m ? [Number(m[1]), Number(m[2])] : null;
};

const cities = new Map();
for (const [label, q] of [["modern", MODERN], ["ancient", ANCIENT]]) {
  const rows = await sparql(q);
  for (const r of rows) {
    const qid = r.city.value.split("/").pop();
    const c = cities.get(qid) ?? { qid, title: r.title.value, coord: point(r.coord), links: Number(r.links.value), ancient: label === "ancient", founded: null, dissolved: null, pop: null };
    // Multiple statements produce multiple rows: keep the earliest founding date and the largest population.
    for (const y of [year(r.inception), year(r.record)]) if (y !== null && (c.founded === null || y < c.founded)) c.founded = y;
    const d = year(r.dissolved);
    if (d !== null && (c.dissolved === null || d > c.dissolved)) c.dissolved = d;
    const p = r.pop ? Number(r.pop.value) : null;
    if (p !== null && (c.pop === null || p > c.pop)) c.pop = p;
    cities.set(qid, c);
  }
  console.log(`${label}: ${rows.length} rows`);
}
const list = [...cities.values()].filter((c) => c.coord);
await writeFile("vendor-src/wd_cities.json", JSON.stringify(list));
console.log(`saved ${list.length} cities; ${list.filter((c) => c.founded !== null).length} with founding dates`);
