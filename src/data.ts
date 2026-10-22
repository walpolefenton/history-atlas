import type { Drawing, HistoryEvent, Meta, SurveyorSpot, YearData } from "./types";

const base = import.meta.env.BASE_URL + "data/";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(base + path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export const loadMeta = () => getJson<Meta>("meta.json");
export const loadLand = () => getJson<GeoJSON.FeatureCollection>("land.json");
export const loadEvents = () => getJson<{ events: HistoryEvent[] }>("events.json").then((d) => d.events);
export const loadDrawings = () => getJson<{ drawings: Drawing[] }>("drawings.json").then((d) => d.drawings);
export const loadSurveyor = () => getJson<{ spots: Record<string, SurveyorSpot> }>("surveyor.json").then((d) => d.spots);
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

/** Drawings of things that existed at any point during a snapshot's era. */
export function drawingsForEra(drawings: Drawing[], from: number, to: number | null): Drawing[] {
  return drawings.filter((d) => (to === null || d.from < to) && (d.to === null || d.to >= from));
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
