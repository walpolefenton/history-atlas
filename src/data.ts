import type { Admin1Data, City, Drawing, HistoryEvent, Meta, SurveyorSpot, YearData } from "./types";
import { townFor } from "./towns";

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
export const loadCities = () => getJson<City[]>("cities.json");
export const loadAdmin1 = () => getJson<Admin1Data>("admin1.json");

/** The name a city went by in a given year. */
export function cityNameAt(c: City, year: number): string {
  for (const [until, name] of c.names ?? []) if (year < until) return name;
  return c.name;
}

/** Cities that existed in a snapshot year, as map features named as they were then. */
export function citiesForEra(cities: City[], from: number, exclude: Set<string>): GeoJSON.Feature[] {
  return cities
    // Unlike events, a city must already exist in the snapshot year itself.
    .filter((c) => !exclude.has(c.qid) && c.from <= from && (c.to === null || c.to >= from))
    .map((c) => ({
      type: "Feature",
      // town: the townscape drawn for it up close; v: which hand-varied version.
      properties: { qid: c.qid, name: cityNameAt(c, from), links: c.links, ancient: c.ancient ?? false, town: townFor([c.lon, c.lat], from), v: c.links % 4 },
      geometry: { type: "Point", coordinates: [c.lon, c.lat] },
    }));
}

export const loadScenery = () => getJson<GeoJSON.FeatureCollection>("scenery.json").then((d) => d.features);
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

/** Scenery for an era: timeless features plus those whose years overlap it. */
export function sceneryForEra(features: GeoJSON.Feature[], from: number, to: number | null): GeoJSON.Feature[] {
  return features.filter((f) => {
    const p = f.properties as { from?: number; to?: number | null } | null;
    if (p?.from === undefined) return true;
    return (to === null || p.from < to) && (p.to === null || p.to === undefined || p.to >= from);
  });
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
