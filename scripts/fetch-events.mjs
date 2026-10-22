// Fetches notable dated, located events from Wikidata (battles, wars, treaties,
// revolutions, disasters...) into vendor-src/wd_events.json.
// Run with: node scripts/fetch-events.mjs
//
// "Notable" means the item has an English Wikipedia article and is covered by at
// least MIN_SITELINKS language editions, a rough but source-neutral measure of
// how widely an event is written about.
import { writeFile } from "node:fs/promises";

const MIN_SITELINKS = 12;

// Wikidata class -> app event type
const CLASSES = {
  Q178561: "conflict", // battle
  Q188055: "conflict", // siege
  Q198: "conflict", // war
  Q8465: "conflict", // civil war
  Q131569: "diplomacy", // treaty
  Q625298: "diplomacy", // peace treaty
  Q10931: "political", // revolution
  Q124734: "political", // rebellion
  Q45382: "political", // coup d'état
  Q7944: "crisis", // earthquake
  Q12184: "crisis", // pandemic
  Q44512: "crisis", // epidemic
  Q8065: "crisis", // natural disaster
  Q2401485: "exploration", // expedition
};

const query = (cls) => `
SELECT ?item ?title ?desc ?time ?start ?end ?coord ?locCoord ?links WHERE {
  ?item wdt:P31 wd:${cls} ; wikibase:sitelinks ?links .
  FILTER(?links >= ${MIN_SITELINKS})
  ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?title .
  OPTIONAL { ?item wdt:P585 ?time }
  OPTIONAL { ?item wdt:P580 ?start }
  OPTIONAL { ?item wdt:P582 ?end }
  OPTIONAL { ?item wdt:P625 ?coord }
  OPTIONAL { ?item (wdt:P276|wdt:P1071) ?loc . ?loc wdt:P625 ?locCoord }
  OPTIONAL { ?item schema:description ?desc FILTER(LANG(?desc) = "en") }
}`;

async function sparql(q) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch("https://query.wikidata.org/sparql", {
      method: "POST",
      headers: {
        Accept: "application/sparql-results+json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "history-atlas/0.2 (open-source educational map)",
      },
      body: "query=" + encodeURIComponent(q),
    });
    if (res.ok) return (await res.json()).results.bindings;
    console.warn(`Wikidata ${res.status}, retrying`);
    await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
  }
  throw new Error("Wikidata query failed");
}

const year = (b) => {
  const m = b?.value?.match(/^(-?\d+)-/);
  return m ? Number(m[1]) : null;
};
const point = (b) => {
  const m = b?.value?.match(/Point\(([-\d.eE]+) ([-\d.eE]+)\)/);
  return m ? [Number(m[1]), Number(m[2])] : null;
};

const events = new Map();
for (const [cls, type] of Object.entries(CLASSES)) {
  const rows = await sparql(query(cls));
  let kept = 0;
  for (const r of rows) {
    const qid = r.item.value.split("/").pop();
    const start = year(r.time) ?? year(r.start);
    const coord = point(r.coord) ?? point(r.locCoord);
    if (start === null || !coord) continue;
    const prev = events.get(qid);
    if (prev) continue; // first row per item wins; duplicates come from multiple values
    events.set(qid, {
      qid,
      title: r.title.value,
      type,
      start,
      end: year(r.end) ?? undefined,
      lon: coord[0],
      lat: coord[1],
      desc: r.desc?.value ?? "",
      links: Number(r.links.value),
    });
    kept++;
  }
  console.log(`${cls.padEnd(9)} ${type.padEnd(12)} ${String(rows.length).padStart(5)} rows  ${String(kept).padStart(4)} kept`);
}

await writeFile("vendor-src/wd_events.json", JSON.stringify([...events.values()]));
console.log(`saved ${events.size} events`);
