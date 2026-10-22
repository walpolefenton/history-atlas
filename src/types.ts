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
  color: string;
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
}

export interface YearData {
  year: number;
  borders: FeatureCollection<Polygon | MultiPolygon, PolityProps>;
  labels: FeatureCollection<Point, { name: string; km2: number }>;
  capitals: FeatureCollection<Point, CapitalProps>;
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
}

export type Selection =
  | { kind: "none" }
  | { kind: "polity"; name: string }
  | { kind: "event"; id: string }
  | { kind: "list" };
