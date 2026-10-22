// Pictogram markers, drawn once as SVG and used both on the map (as images)
// and in the panel (inline). In Night and Survey they are pen drawings over a
// faint wash, like everything else on the map; in Clay, moulded beads.
// Events are round; capitals are a castle tower, so they never read alike.
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

/** A moulded-clay finish: a soft highlight, a shadow beneath, a slightly uneven edge. */
const CLAY_DEFS = `<defs>
  <radialGradient id="sheen" cx="0.36" cy="0.3" r="0.75"><stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="0.45" stop-color="#fff" stop-opacity="0.08"/><stop offset="1" stop-color="#000" stop-opacity="0.28"/></radialGradient>
  <filter id="lump" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="2.2"/></filter>
</defs>`;

const PEN = `<filter id="pen" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="1" seed="5"/><feDisplacementMap in="SourceGraphic" scale="2"/></filter>`;

export function eventIconSvg(type: EventType, color: string, ring: string, clay = false) {
  if (!clay) {
    // The glyph in the event's colour, over a loose wash and a hand-drawn ring.
    const glyph = GLYPHS[type].replace(/#fff/g, color);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs>${PEN}</defs>
      <g filter="url(#pen)"><circle cx="32" cy="32" r="27" fill="${color}" opacity="0.18"/>
      <circle cx="32" cy="32" r="27" fill="none" stroke="${color}" stroke-width="2" opacity="0.7"/>${glyph}</g></svg>`;
  }
  if (clay) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${CLAY_DEFS}
      <ellipse cx="33" cy="36" rx="27" ry="25" fill="#3c2010" opacity="0.28"/>
      <g filter="url(#lump)"><ellipse cx="32" cy="32" rx="28.5" ry="27.5" fill="${color}" stroke="${ring}" stroke-width="2.5"/>
      <ellipse cx="32" cy="32" rx="28.5" ry="27.5" fill="url(#sheen)"/>${GLYPHS[type]}</g></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <circle cx="32" cy="32" r="29" fill="${color}" stroke="${ring}" stroke-width="3"/>
    ${GLYPHS[type]}</svg>`;
}

const TOWER =
  "M21 52 V29 H18 V18 H24 V22 H29 V18 H35 V22 H40 V18 H46 V29 H43 V52 Z M29 52 V44 A3 3 0 0 1 35 44 V52 Z";

export function capitalIconSvg(color: string, ring: string, clay = false) {
  if (!clay) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs>${PEN}</defs>
      <g filter="url(#pen)"><path d="${TOWER}" fill="${color}" fill-opacity="0.25" fill-rule="evenodd" stroke="${color}" stroke-width="3" stroke-linejoin="round"/></g></svg>`;
  }
  if (clay) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${CLAY_DEFS}
      <path d="${TOWER}" fill="#3c2010" opacity="0.28" transform="translate(2 3)"/>
      <g filter="url(#lump)"><path d="${TOWER}" fill="${color}" fill-rule="evenodd" stroke="${ring}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"/>
      <path d="${TOWER}" fill="url(#sheen)" fill-rule="evenodd"/></g></svg>`;
  }
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
