// Pictogram markers, drawn once as SVG and used both on the map (as images)
// and in the panel (inline). Events are round medallions; capitals are a
// castle tower, so the two never read as the same kind of thing.
import type { EventType } from "./types";

const GLYPHS: Record<EventType, string> = {
  // Crossed swords
  conflict: `<g fill="none" stroke="#fff" stroke-width="4.2" stroke-linecap="round">
    <path d="M19 19 L41 41"/><path d="M45 19 L23 41"/>
    <path d="M37 45 L45 37"/><path d="M19 37 L27 45"/>
    <path d="M42 42 L47 47"/><path d="M22 42 L17 47"/></g>`,
  // Sealed document
  diplomacy: `<path d="M21 15 H36 L44 23 V49 H21 Z" fill="none" stroke="#fff" stroke-width="3.6" stroke-linejoin="round"/>
    <path d="M26 28 H38 M26 34 H36" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
    <circle cx="37" cy="43" r="4.5" fill="#fff"/>`,
  // Crown
  political: `<path d="M17 41 L19 23 L27 31 L32 18 L37 31 L45 23 L47 41 Z" fill="#fff"/>
    <rect x="17" y="43.5" width="30" height="4.5" rx="1.5" fill="#fff"/>`,
  // Temple
  culture: `<path d="M16 26 L32 16 L48 26 Z" fill="#fff"/>
    <rect x="20" y="28" width="5" height="14" fill="#fff"/><rect x="29.5" y="28" width="5" height="14" fill="#fff"/><rect x="39" y="28" width="5" height="14" fill="#fff"/>
    <rect x="16" y="44" width="32" height="4.5" fill="#fff"/>`,
  // Compass star
  exploration: `<path d="M32 12 L36.5 27.5 L52 32 L36.5 36.5 L32 52 L27.5 36.5 L12 32 L27.5 27.5 Z" fill="#fff"/>`,
  // Flame
  crisis: `<path d="M32 13 C41 23 45 30 43 38 C41.5 45 37 49.5 32 49.5 C25.5 49.5 21 44.5 21 38.5 C21 32 26 29 27.5 22.5 C31 26.5 32 30 31 33.5 C35.5 30 35 21.5 32 13 Z" fill="#fff"/>`,
};

export function eventIconSvg(type: EventType, color: string, ring: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <circle cx="32" cy="32" r="29" fill="${color}" stroke="${ring}" stroke-width="3"/>
    ${GLYPHS[type]}</svg>`;
}

const TOWER =
  "M21 52 V29 H18 V18 H24 V22 H29 V18 H35 V22 H40 V18 H46 V29 H43 V52 Z M29 52 V44 A3 3 0 0 1 35 44 V52 Z";

export function capitalIconSvg(color: string, ring: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <path d="${TOWER}" fill="${color}" fill-rule="evenodd" stroke="${ring}" stroke-width="5" stroke-linejoin="round" paint-order="stroke"/></svg>`;
}

/** Rasterises an SVG string for MapLibre's addImage. */
export function svgToImage(svg: string, size = 64): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(size, size);
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
}
