// Links the territory names used by historical-basemaps to Wikidata entities,
// because many differ from Wikidata's main labels ("Manchu Empire" is the Qing
// dynasty). Run before fetch-capitals.mjs: node scripts/resolve-names.mjs
//
// Two sources of candidates, both fetched in bulk through the Wikidata query
// service (per-name API lookups hit Wikimedia's rate limits):
//   1. data-src/aliases.json: hand-curated name -> English Wikipedia title
//   2. every state with a capital whose English label or alternative name
//      equals the territory name
// prepare-data.mjs still accepts a candidate only if its capital lies inside
// the territory at that date, which filters out wrong matches.
//
// Output: vendor-src/name_candidates.json
//   { aliases: { name: qid }, byName: { name: [qid, ...] } }
import { readFile, writeFile } from "node:fs/promises";

const OUT = "vendor-src/name_candidates.json";

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

const qid = (b) => b.value.split("/").pop();
const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^the /, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// States, broadly: anything under "state" or "historical country", plus the
// classes fetch-capitals.mjs uses. Only entities with a capital are useful.
const NAMES_QUERY = `
SELECT DISTINCT ?state ?name WHERE {
  { ?state wdt:P31/wdt:P279* wd:Q7275 } UNION
  { ?state wdt:P31/wdt:P279* wd:Q3024240 } UNION
  { VALUES ?cls { wd:Q6256 wd:Q3624078 wd:Q48349 wd:Q417175 wd:Q1250464 wd:Q164950 } ?state wdt:P31 ?cls }
  ?state wdt:P36 ?cap .
  { ?state rdfs:label ?name } UNION { ?state skos:altLabel ?name }
  FILTER(LANG(?name) = "en")
}`;

const aliasQuery = (titles) => `
SELECT ?title ?item WHERE {
  VALUES ?title { ${titles.map((t) => JSON.stringify(t) + "@en").join(" ")} }
  ?article schema:name ?title ; schema:isPartOf <https://en.wikipedia.org/> ; schema:about ?item .
}`;

const index = JSON.parse(await readFile("vendor-src/index.json", "utf8"));
const names = [...new Set(index.years.flatMap((y) => y.countries))];
const aliasTitles = JSON.parse(await readFile("data-src/aliases.json", "utf8")).aliases;

// 1. Curated aliases.
const titleRows = await sparql(aliasQuery([...new Set(Object.values(aliasTitles))]));
const titleToQid = new Map(titleRows.map((r) => [r.title.value, qid(r.item)]));
const aliases = {};
for (const [name, title] of Object.entries(aliasTitles)) {
  if (titleToQid.has(title)) aliases[name] = titleToQid.get(title);
  else console.warn(`alias target not found on English Wikipedia: ${name} -> ${title}`);
}

// 2. Label and alternative-name matches.
const rows = await sparql(NAMES_QUERY);
const statesByName = new Map();
for (const r of rows) {
  const key = norm(r.name.value);
  if (!statesByName.has(key)) statesByName.set(key, new Set());
  statesByName.get(key).add(qid(r.state));
}
const byName = {};
for (const n of names) {
  const hits = statesByName.get(norm(n));
  if (hits) byName[n] = [...hits];
}

await writeFile(OUT, JSON.stringify({ aliases, byName }));
console.log(
  `${rows.length} state names from Wikidata; ${Object.keys(byName).length} of ${names.length} territory names matched; ${Object.keys(aliases).length} curated aliases`,
);
