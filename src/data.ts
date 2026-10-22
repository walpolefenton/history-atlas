import type { HistoryEvent, Meta, YearData } from "./types";

const base = import.meta.env.BASE_URL + "data/";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(base + path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export const loadMeta = () => getJson<Meta>("meta.json");
export const loadLand = () => getJson<GeoJSON.FeatureCollection>("land.json");
export const loadEvents = () => getJson<{ events: HistoryEvent[] }>("events.json").then((d) => d.events);
export const loadWikidataEvents = () => getJson<{ events: HistoryEvent[] }>("wd-events.json").then((d) => d.events);

const yearCache = new Map<number, Promise<YearData>>();

export function loadYear(year: number): Promise<YearData> {
  let p = yearCache.get(year);
  if (!p) {
    p = getJson<YearData>(`years/${year}.json`);
    p.catch(() => yearCache.delete(year));
    yearCache.set(year, p);
  }
  return p;
}

/** Events that happen in, or are still ongoing at the start of, a snapshot's era. */
export function eventsForEra(events: HistoryEvent[], from: number, to: number | null): HistoryEvent[] {
  return events
    .filter((e) => {
      const end = e.end ?? e.start;
      const startsInEra = e.start >= from && (to === null || e.start < to);
      const ongoing = e.start < from && end >= from;
      return startsInEra || ongoing;
    })
    .sort((a, b) => a.start - b.start);
}
