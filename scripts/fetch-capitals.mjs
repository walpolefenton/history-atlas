// Fetches historical capitals from Wikidata and writes a compact cache to
// vendor-src/wd_capitals.json. Run with: node scripts/fetch-capitals.mjs
// The app never queries Wikidata at runtime; prepare-data.mjs reads this cache.
//
// Two passes:
//   1. every entity typed as a country, historical country, empire, kingdom...
//   2. every candidate entity found by resolve-names.mjs (any type), so names
//      like "Manchu Empire" -> Qing dynasty can be matched too.
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const FIELDS = `?state ?stateLabel ?cap ?capLabel ?coord ?start ?end ?inception ?dissolved`;
const BODY = `
  ?state p:P36 ?st . ?st ps:P36 ?cap .
  OPTIONAL { ?st pq:P580 ?start } OPTIONAL { ?st pq:P582 ?end }
  OPTIONAL { ?state wdt:P571 ?inception } OPTIONAL { ?state wdt:P576 ?dissolved }
  ?cap wdt:P625 ?coord .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }`;

const BY_CLASS = `SELECT ${FIELDS} WHERE {
  VALUES ?cls { wd:Q3024240 wd:Q6256 wd:Q3624078 wd:Q48349 wd:Q417175 wd:Q1250464 }
  ?state wdt:P31 ?cls .${BODY}
}`;

const byIds = (qids) => `SELECT ${FIELDS} WHERE {
  VALUES ?state { ${qids.map((q) => "wd:" + q).join(" ")} }${BODY}
}`;

async function sparql(query) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch("https://query.wikidata.org/sparql", {
      method: "POST",
      headers: {
        Accept: "application/sparql-results+json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "history-atlas/0.2 (open-source educational map)",
      },
      body: "query=" + encodeURIComponent(query),
    });
    if (res.ok) return (await res.json()).results.bindings;
    console.warn(`Wikidata ${res.status}, retrying`);
    await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
  }
  throw new Error("Wikidata query failed");
}

const rows = await sparql(BY_CLASS);
console.log(`pass 1: ${rows.length} rows`);

const CANDIDATES = "vendor-src/name_candidates.json";
if (existsSync(CANDIDATES)) {
  const c = JSON.parse(await readFile(CANDIDATES, "utf8"));
  const qids = [...new Set([...Object.values(c.aliases), ...Object.values(c.byName).flat()])];
  for (let i = 0; i < qids.length; i += 300) {
    rows.push(...(await sparql(byIds(qids.slice(i, i + 300)))));
  }
  console.log(`pass 2: ${qids.length} candidate entities, ${rows.length} rows total`);
}

// Pass 2 overlaps pass 1; drop exact duplicates.
const seen = new Set();
const unique = rows.filter((r) => {
  const k = [r.state.value, r.cap.value, r.start?.value, r.end?.value, r.inception?.value, r.dissolved?.value].join("|");
  return !seen.has(k) && seen.add(k);
});
await writeFile("vendor-src/wd_capitals.json", JSON.stringify(unique));
console.log(`saved ${unique.length} rows`);
