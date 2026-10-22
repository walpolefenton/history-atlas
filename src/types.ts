import type { FeatureCollection, Point, Polygon, MultiPolygon } from "geojson";

export interface Meta {
  years: { year: number; polities: number; capitals: number }[];
  /** Polity name -> snapshot years in which it appears on the map. */
  appearances: Record<string, number[]>;
}

export interface PolityProps {
  name: string;
  sovereign: string;
  partOf: string | null;
  /** 1 approximate, 2 moderately precise, 3 set by international law. */
  precision: 1 | 2 | 3 | null;
  /** Index into the theme palette; shared by everything one power rules. */
  ci: number;
  km2: number;
  /** Wikidata ID, when the polity was matched to a Wikidata state. */
  qid: string | null;
}

export interface CapitalProps {
  name: string;
  qid: string;
  of: string;
  start: number | null;
  end: number | null;
  /** Area of the territory it is the capital of, used to rank markers. */
  rank: number;
  /** Townscape drawing for this capital's region and era. */
  town: string;
}

export interface YearData {
  year: number;
  borders: FeatureCollection<Polygon | MultiPolygon, PolityProps>;
  labels: FeatureCollection<Point, { name: string; km2: number }>;
  capitals: FeatureCollection<Point, CapitalProps>;
  /** Figures showing how people lived in territories that were cultures, not states. */
  scenery: FeatureCollection<Point, { k: string; t: number; of: string }>;
}

export type EventType = "conflict" | "diplomacy" | "political" | "culture" | "exploration" | "crisis";

export interface HistoryEvent {
  id: string;
  title: string;
  type: EventType;
  start: number;
  end?: number;
  approx?: boolean;
  lat: number;
  lon: number;
  summary: string;
  /** English Wikipedia article title, used as the source link. */
  wiki: string;
  /** Absent for hand-curated events; "wikidata" for imported ones (id is then the QID). */
  source?: "wikidata";
  /** Number of Wikipedia language editions covering the event. */
  notability?: number;
}

/** A landmark or curiosity drawn on the map (public/data/drawings.json). */
export interface Drawing {
  id: string;
  name: string;
  /** Which pen drawing to use (src/drawings.ts). */
  kind: string;
  cat: "landmark" | "curiosity" | "nature";
  lat: number;
  lon: number;
  /** Years it existed; to is null if it still stands. */
  from: number;
  to: number | null;
  approx?: boolean;
  /** 1 visible from afar, 2 at regional zoom, 3 only up close. */
  tier: 1 | 2 | 3;
  /** Drawing scale; defaults by tier. The great monuments are drawn larger. */
  size?: number;
  /** The caption: dry, short, true. */
  quip: string;
  /** The plain fact behind the caption. */
  note: string;
  wiki: string;
}

/** Where the Surveyor hides in one snapshot (public/data/surveyor.json). */
export interface SurveyorSpot {
  lat: number;
  lon: number;
  hint: string;
  place: string;
  note: string;
  wiki: string;
}

export type Selection =
  | { kind: "none" }
  | { kind: "polity"; name: string }
  | { kind: "event"; id: string }
  | { kind: "list" }
  | { kind: "compare" }
  | { kind: "drawing"; id: string }
  | { kind: "surveyor" }
  | { kind: "route"; name: string }
  | { kind: "city"; qid: string }
  | { kind: "admin"; name: string; country: string };

/** A city (public/data/cities.json). */
export interface City {
  qid: string;
  /** Present-day name. */
  name: string;
  /** Earlier names, oldest first: [until year, name]. */
  names?: [number, string][];
  lon: number;
  lat: number;
  from: number;
  to: number | null;
  approx?: boolean;
  /** No founding date known; shown from a default year. */
  undated?: boolean;
  pop: number | null;
  /** Wikipedia language editions: a rough measure of prominence. */
  links: number;
  ancient?: boolean;
}

/** A state, province or other first-level division (public/data/admin1.json). */
export interface AdminProps {
  name: string;
  country: string;
  kind: string;
  qid: string | null;
  /** Year from which it is drawn. */
  from: number;
  km2: number;
  rank: number;
}

export interface Admin1Data {
  shapes: FeatureCollection<Polygon | MultiPolygon, AdminProps>;
  labels: FeatureCollection<Point, { name: string; km2: number; rank: number; from: number }>;
}

/** A trade route or sea lane from the scenery layer. */
export interface RouteInfo {
  name: string;
  mode: "land" | "sea" | "air";
  from: number;
  to: number | null;
  note: string;
  wiki: string;
}
