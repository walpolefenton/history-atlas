// Builds public/data/images.json: a photograph or artwork for every landmark and
// curiosity on the map, and one work of art for each era of the timeline.
// Run: node scripts/fetch-images.mjs
//
// Images are the free lead images of Wikipedia articles (Wikipedia's page-images
// feature only offers freely licensed files), hosted on Wikimedia Commons. For
// each file we record its licence and artist, so the atlas can credit it.
import { readFile, writeFile } from "node:fs/promises";

const API = "https://en.wikipedia.org/w/api.php";
const COMMONS = "https://commons.wikimedia.org/w/api.php";
const HEADERS = { "User-Agent": "HistoryAtlas/0.6 (educational map; https://github.com/)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * One work of art per era: famous, public domain, and of its time. "from" is the
 * first year the era's image applies to; each era runs until the next begins.
 */
const ERAS = [
  { from: -200000, article: "Lascaux", caption: "Painted aurochs and horses, Lascaux cave, about 17,000 years ago" },
  { from: -3500, article: "Standard of Ur", caption: "The Standard of Ur, Sumer, about 2500 BCE" },
  { from: -1500, article: "Mask of Tutankhamun", caption: "The funerary mask of Tutankhamun, Egypt, about 1323 BCE" },
  { from: -700, article: "Ishtar Gate", caption: "The Ishtar Gate of Babylon, about 575 BCE" },
  { from: -400, article: "Alexander Mosaic", caption: "Alexander at the Battle of Issus, Roman mosaic after a Greek painting" },
  { from: -200, article: "Terracotta Army", caption: "The Terracotta Army of the first Qin emperor, about 210 BCE" },
  { from: 100, article: "Pantheon, Rome", caption: "The Pantheon, Rome, rebuilt under Hadrian about 125 CE" },
  { from: 500, article: "Hagia Sophia", caption: "Hagia Sophia, Constantinople, completed 537 CE" },
  { from: 700, article: "Book of Kells", caption: "The Book of Kells, an Irish gospel book, about 800 CE" },
  { from: 1000, article: "Bayeux Tapestry", caption: "The Bayeux Tapestry, embroidered in the 1070s" },
  { from: 1200, article: "Along the River During the Qingming Festival", caption: "Along the River During the Qingming Festival, Song China, 12th century" },
  { from: 1300, article: "Catalan Atlas", caption: "The compass rose of the Catalan Atlas, drawn in Majorca in 1375" },
  { from: 1450, article: "The Ambassadors (Holbein)", caption: "The Ambassadors, Hans Holbein the Younger, 1533" },
  { from: 1600, article: "The Art of Painting", caption: "The Art of Painting, Johannes Vermeer, about 1666, with a map of the Low Countries" },
  { from: 1750, article: "The Great Wave off Kanagawa", caption: "The Great Wave off Kanagawa, Katsushika Hokusai, about 1831" },
  { from: 1840, article: "Rain, Steam and Speed – The Great Western Railway", caption: "Rain, Steam and Speed, J. M. W. Turner, 1844" },
  { from: 1914, article: "Migrant Mother", caption: "Migrant Mother, Dorothea Lange, 1936" },
  { from: 1960, article: "Earthrise", caption: "Earthrise, photographed from Apollo 8, 1968" },
];

/**
 * Where a drawing's own article has no free lead image, the article whose image
 * stands in for it: the ship type, the wild horse, the tree species, the musician,
 * the relay riders' horses.
 */
const STAND_INS = {
  "manila-galleon": "Galleon",
  horse: "Przewalski's horse",
  methuselah: "Pinus longaeva",
  yam: "Mongolian horse",
  jazz: "Louis Armstrong",
};
const articleFor = (d) => STAND_INS[d.id] ?? d.wiki;

async function getJson(url, params) {
  const q = new URLSearchParams({ format: "json", formatversion: "2", ...params });
  for (let attempt = 0; attempt < 10; attempt++) {
    const res = await fetch(`${url}?${q}`, { headers: HEADERS });
    if (res.ok) return res.json();
    if (res.status !== 429 && res.status < 500) throw new Error(`${res.status} ${url}`);
    // Wikimedia rate-limits busy addresses; wait as long as it asks.
    const wait = Number(res.headers.get("retry-after")) || 5 * (attempt + 1);
    console.log(`${res.status}; waiting ${wait}s`);
    await sleep(wait * 1000 + 500);
  }
  throw new Error(`gave up on ${url}`);
}

/** Lead images for up to 50 article titles at a time. */
async function leadImages(titles) {
  const out = new Map();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const d = await getJson(API, { action: "query", prop: "pageimages", piprop: "thumbnail|name", pithumbsize: "480", titles: batch.join("|"), redirects: "1" });
    // Follow normalisation and redirects back to the titles we asked for.
    const alias = new Map();
    for (const n of d.query.normalized ?? []) alias.set(n.to, n.from);
    for (const r of d.query.redirects ?? []) alias.set(r.to, alias.get(r.from) ?? r.from);
    for (const p of d.query.pages) {
      if (!p.thumbnail) continue;
      out.set(alias.get(p.title) ?? p.title, { thumb: p.thumbnail.source, w: p.thumbnail.width, h: p.thumbnail.height, file: p.pageimage, page: p.title });
    }
    await sleep(500);
  }
  return out;
}

/** Licence and artist for up to 50 Commons files at a time. */
async function credits(files) {
  const out = new Map();
  const strip = (html) => (html ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  for (let i = 0; i < files.length; i += 50) {
    const batch = files.slice(i, i + 50).map((f) => `File:${f}`);
    const d = await getJson(COMMONS, { action: "query", prop: "imageinfo", iiprop: "extmetadata", iiextmetadatafilter: "LicenseShortName|Artist", titles: batch.join("|") });
    const alias = new Map((d.query.normalized ?? []).map((n) => [n.to, n.from]));
    for (const p of d.query.pages) {
      const m = p.imageinfo?.[0]?.extmetadata;
      if (!m) continue;
      const title = (alias.get(p.title) ?? p.title).replace(/^File:/, "");
      out.set(title, { license: strip(m.LicenseShortName?.value), artist: strip(m.Artist?.value).slice(0, 120) });
    }
    await sleep(500);
  }
  return out;
}

const { drawings } = JSON.parse(await readFile("public/data/drawings.json", "utf8"));
const articles = [...new Set([...drawings.map(articleFor).filter(Boolean), ...ERAS.map((e) => e.article)])];
const images = await leadImages(articles);
const files = [...new Set([...images.values()].map((v) => v.file.replace(/_/g, " ")))];
const credit = await credits(files);

const withCredit = (img) => img && { ...img, ...(credit.get(img.file.replace(/_/g, " ")) ?? {}) };
const out = {
  note: "Lead images of Wikipedia articles, hosted on Wikimedia Commons, with their licence and artist. Built by scripts/fetch-images.mjs.",
  drawings: Object.fromEntries(drawings.filter((d) => images.has(articleFor(d))).map((d) => [d.id, withCredit(images.get(articleFor(d)))])),
  eras: ERAS.filter((e) => images.has(e.article)).map((e) => ({ from: e.from, caption: e.caption, ...withCredit(images.get(e.article)) })),
};
await writeFile("public/data/images.json", JSON.stringify(out, null, 1));
const missing = drawings.filter((d) => !images.has(articleFor(d))).map((d) => d.id);
console.log(`${Object.keys(out.drawings).length}/${drawings.length} drawings, ${out.eras.length}/${ERAS.length} eras; no image: ${missing.join(", ")}`);
console.log("eras missing:", ERAS.filter((e) => !images.has(e.article)).map((e) => e.article));
