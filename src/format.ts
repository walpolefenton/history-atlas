import type { EventType, HistoryEvent } from "./types";

export function formatYear(y: number): string {
  // Thousands separators only from 10,000 up, so "5000 BCE" reads like a year.
  if (y < 0) return `${-y >= 10000 ? (-y).toLocaleString("en") : -y} BCE`;
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

export const EVENT_TYPES: Record<EventType, { label: string }> = {
  conflict: { label: "War & conflict" },
  diplomacy: { label: "Treaty & diplomacy" },
  political: { label: "Political change" },
  culture: { label: "Culture & religion" },
  exploration: { label: "Exploration" },
  crisis: { label: "Crisis & disaster" },
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
