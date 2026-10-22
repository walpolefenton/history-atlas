// Fetches historical capitals from Wikidata and writes a compact cache to
// vendor-src/wd_capitals.json. Run with: node scripts/fetch-capitals.mjs
// The app never queries Wikidata at runtime; prepare-data.mjs reads this cache.
import { writeFile } from "node:fs/promises";

const QUERY = `
SELECT ?state ?stateLabel ?cap ?capLabel ?coord ?start ?end ?inception ?dissolved WHERE {
  VALUES ?cls { wd:Q3024240 wd:Q6256 wd:Q3624078 wd:Q48349 wd:Q417175 wd:Q1250464 }
  ?state wdt:P31 ?cls .
  ?state p:P36 ?st . ?st ps:P36 ?cap .
  OPTIONAL { ?st pq:P580 ?start } OPTIONAL { ?st pq:P582 ?end }
  OPTIONAL { ?state wdt:P571 ?inception } OPTIONAL { ?state wdt:P576 ?dissolved }
  ?cap wdt:P625 ?coord .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;

const url = "https://query.wikidata.org/sparql?query=" + encodeURIComponent(QUERY);
const res = await fetch(url, {
  headers: {
    Accept: "application/sparql-results+json",
    "User-Agent": "history-atlas/0.1 (open-source educational map)",
  },
});
if (!res.ok) throw new Error(`Wikidata ${res.status}: ${await res.text()}`);
const json = await res.json();
await writeFile("vendor-src/wd_capitals.json", JSON.stringify(json.results.bindings));
console.log(`saved ${json.results.bindings.length} rows`);
