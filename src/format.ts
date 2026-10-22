import type { EventType, HistoryEvent } from "./types";

export function formatYear(y: number): string {
  if (y < 0) return `${(-y).toLocaleString("en")} BCE`;
  return `${y} CE`;
}

export function formatEventDate(e: HistoryEvent): string {
  const c = e.approx ? "c. " : "";
  if (e.end === undefined || e.end === e.start) return c + formatYear(e.start);
  // "1914 – 1918 CE" reads better than repeating the era on both ends.
  if (e.start > 0) return `${c}${e.start} – ${e.end} CE`;
  if (e.end < 0) return `${c}${-e.start} – ${-e.end} BCE`;
  return `${c}${formatYear(e.start)} – ${formatYear(e.end)}`;
}

export function formatArea(km2: number): string {
  if (km2 >= 1_000_000) return `${(km2 / 1_000_000).toFixed(1)} million km²`;
  return `${km2.toLocaleString("en")} km²`;
}

export const PRECISION_LABEL: Record<number, { label: string; detail: string }> = {
  1: { label: "Approximate", detail: "Borders are a rough reconstruction; the real extent of control was often fluid or contested." },
  2: { label: "Moderately precise", detail: "Borders follow known features but are generalised." },
  3: { label: "Precise", detail: "Borders were defined by treaty or international law." },
};

export const EVENT_TYPES: Record<EventType, { label: string; color: string }> = {
  conflict: { label: "War & conflict", color: "#e5534b" },
  diplomacy: { label: "Treaty & diplomacy", color: "#4fa3e0" },
  political: { label: "Political change", color: "#d4a72c" },
  culture: { label: "Culture & religion", color: "#a371f7" },
  exploration: { label: "Exploration", color: "#3fb950" },
  crisis: { label: "Crisis & disaster", color: "#db6d28" },
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
