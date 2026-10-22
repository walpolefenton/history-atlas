// Live lookups against Wikipedia and Wikidata. Both APIs allow anonymous CORS
// requests. Results are cached for the session.

export interface WikiSummary {
  title: string;
  extract: string;
  thumbnail?: string;
  url: string;
  /** How the article was found, so the UI can be honest about uncertain matches. */
  match: "wikidata" | "exact" | "search";
}

const cache = new Map<string, Promise<WikiSummary | null>>();

async function summary(title: string): Promise<Omit<WikiSummary, "match"> | null> {
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`);
  if (!res.ok) return null;
  const d = await res.json();
  if (d.type === "disambiguation" || !d.extract) return null;
  return {
    title: d.title,
    extract: d.extract,
    thumbnail: d.thumbnail?.source,
    url: d.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(d.title)}`,
  };
}

async function titleForQid(qid: string): Promise<string | null> {
  const res = await fetch(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=sitelinks&sitefilter=enwiki&format=json&origin=*`,
  );
  if (!res.ok) return null;
  const d = await res.json();
  return d.entities?.[qid]?.sitelinks?.enwiki?.title ?? null;
}

async function searchTitle(query: string): Promise<string | null> {
  const res = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json&origin=*`,
  );
  if (!res.ok) return null;
  const d = await res.json();
  return d.query?.search?.[0]?.title ?? null;
}

/** Best-effort article for a polity: Wikidata link first, then exact title, then search. */
export function polityArticle(name: string, qid: string | null): Promise<WikiSummary | null> {
  const key = `p:${name}:${qid}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        if (qid) {
          const t = await titleForQid(qid);
          const s = t && (await summary(t));
          if (s) return { ...s, match: "wikidata" as const };
        }
        const exact = await summary(name);
        if (exact) return { ...exact, match: "exact" as const };
        const found = await searchTitle(name);
        const s = found && (await summary(found));
        return s ? { ...s, match: "search" as const } : null;
      })().catch(() => null),
    );
  }
  return cache.get(key)!;
}

/** Article for a curated event, whose exact title is known. */
export function eventArticle(title: string): Promise<WikiSummary | null> {
  const key = `e:${title}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      summary(title)
        .then((s) => (s ? { ...s, match: "exact" as const } : null))
        .catch(() => null),
    );
  }
  return cache.get(key)!;
}
