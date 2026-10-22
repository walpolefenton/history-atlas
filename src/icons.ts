// Pictogram markers, drawn once as SVG and used both on the map (as images)
// and in the panel (inline). In Night and Survey they are engraved seals; in
// the Atlas themes, solid discs; in Clay, moulded beads.
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


export function eventIconSvg(type: EventType, color: string, ring: string, clay = false) {
  if (!clay) {
    // An engraved seal: the detailed glyph in the event's colour on a pale
    // wash, inside a fine double ring.
    const glyph = MODERN_GLYPHS[type].replace(/#fff/g, color).replace(/COLOR/g, ring);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <circle cx="32" cy="32" r="28" fill="${ring}" opacity="0.85"/><circle cx="32" cy="32" r="28" fill="${color}" opacity="0.14"/>
      <circle cx="32" cy="32" r="28" fill="none" stroke="${color}" stroke-width="1.6"/><circle cx="32" cy="32" r="24.6" fill="none" stroke="${color}" stroke-width="0.7" opacity="0.6"/>
      <g transform="translate(32 32) scale(0.8) translate(-32 -32)">${glyph}</g></svg>`;
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

/**
 * Atlas glyphs: drawn precisely rather than by pen, with enough detail to read
 * at marker size. White on the event's colour; COLOR marks the inner details
 * cut back into the white (seal, jewels, the heart of the flame).
 */
const SWORD = `<path d="M15.5 15.5 L21 16.5 L40.5 36 L36 40.5 L16.5 21 Z" fill="#fff"/>
  <path d="M34.5 45.5 L45.5 34.5" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/>
  <path d="M41.5 41.5 L46.5 46.5" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>
  <circle cx="48" cy="48" r="2.6" fill="#fff"/>
  <path d="M19 19 L37 37" stroke="COLOR" stroke-width="0.9" opacity="0.55"/>`;
const MODERN_GLYPHS: Record<EventType, string> = {
  // Two crossed swords, with guards, grips and pommels
  conflict: `${SWORD}<g transform="translate(64 0) scale(-1 1)">${SWORD}</g>`,
  // A charter: a page of text, sealed with wax and ribbons
  diplomacy: `<path d="M20 15 H38 L44 21 V45 H24 A4 4 0 0 1 20 41 Z" fill="#fff"/><path d="M38 15 V21 H44" fill="none" stroke="COLOR" stroke-width="1.2" opacity="0.5"/>
    <path d="M24.5 24 H37 M24.5 29 H39 M24.5 34 H33" stroke="COLOR" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
    <path d="M37 47.5 L35 54 M43 47.5 L45 54" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="40" cy="43" r="6.2" fill="#fff"/><circle cx="40" cy="43" r="4" fill="COLOR"/>`,
  // A crown: five points tipped with pearls, a jewelled band
  political: `<path d="M16.5 40 L14.5 23 L23.5 31 L32 17.5 L40.5 31 L49.5 23 L47.5 40 Z" fill="#fff"/>
    <circle cx="14.5" cy="21.5" r="2.6" fill="#fff"/><circle cx="32" cy="15.5" r="2.8" fill="#fff"/><circle cx="49.5" cy="21.5" r="2.6" fill="#fff"/>
    <rect x="16" y="42" width="32" height="6.5" rx="1.6" fill="#fff"/>
    <circle cx="23.5" cy="45.2" r="1.7" fill="COLOR"/><circle cx="32" cy="45.2" r="2" fill="COLOR"/><circle cx="40.5" cy="45.2" r="1.7" fill="COLOR"/>`,
  // A temple: pediment, entablature, four columns, a stepped base
  culture: `<path d="M14 25 L32 14.5 L50 25 Z" fill="#fff"/><circle cx="32" cy="21.3" r="1.9" fill="COLOR"/>
    <rect x="15.5" y="26.5" width="33" height="3.6" fill="#fff"/>
    <rect x="18.5" y="31.5" width="4.2" height="11.5" fill="#fff"/><rect x="26.5" y="31.5" width="4.2" height="11.5" fill="#fff"/>
    <rect x="33.3" y="31.5" width="4.2" height="11.5" fill="#fff"/><rect x="41.3" y="31.5" width="4.2" height="11.5" fill="#fff"/>
    <rect x="14" y="44.5" width="36" height="3" fill="#fff"/><rect x="11.5" y="48.5" width="41" height="3" fill="#fff"/>`,
  // A compass rose: eight points, half-shaded, in a ring
  exploration: `<circle cx="32" cy="32" r="16.5" fill="none" stroke="#fff" stroke-width="1.6" opacity="0.8"/>
    <path d="M32 21 L34.2 29.8 L43 32 L34.2 34.2 L32 43 L29.8 34.2 L21 32 L29.8 29.8 Z" fill="#fff" opacity="0.75" transform="rotate(45 32 32)"/>
    <path d="M32 11 L35.4 28.6 L53 32 L35.4 35.4 L32 53 L28.6 35.4 L11 32 L28.6 28.6 Z" fill="#fff"/>
    <path d="M32 11 L35.4 28.6 L32 32 Z M53 32 L35.4 35.4 L32 32 Z M32 53 L28.6 35.4 L32 32 Z M11 32 L28.6 28.6 L32 32 Z" fill="COLOR" opacity="0.4"/>
    <circle cx="32" cy="32" r="2" fill="COLOR"/>`,
  // A flame, with a second flame burning inside it
  crisis: `<path d="M32 12 C41.5 22 46 30 44 38.5 C42.5 45.5 37.5 50.5 32 50.5 C25 50.5 20 45 20 38.5 C20 31.5 25.5 28.5 27 21.5 C30.8 25.5 32 29.5 31 33.5 C35.8 29.8 35.4 21 32 12 Z" fill="#fff"/>
    <path d="M32 31 C36.3 36 37.8 40 36.3 43.5 C35.3 46 33.8 47.3 32 47.3 C29.4 47.3 27.4 45.3 27.4 42.6 C27.4 39.6 29.8 38 30.4 35 C31.8 36.6 32.6 38.2 32.1 39.8 C34 37.6 33.8 33.8 32 31 Z" fill="COLOR" opacity="0.85"/>`,
};

/** An Atlas event marker: the glyph on a disc of the event's colour, with a rim and a soft lift. */
export function modernEventSvg(type: EventType, color: string, ring: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
    <defs><radialGradient id="lift" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <filter id="drop" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.4" flood-color="#000" flood-opacity="0.28"/></filter></defs>
    <g filter="url(#drop)"><circle cx="32" cy="32" r="28" fill="${ring}"/></g>
    <circle cx="32" cy="32" r="25" fill="${color}"/><circle cx="32" cy="32" r="25" fill="url(#lift)"/>
    <g transform="translate(32 32) scale(0.82) translate(-32 -32)">${MODERN_GLYPHS[type].replace(/COLOR/g, color)}</g></svg>`;
}

const TOWER =
  "M21 52 V29 H18 V18 H24 V22 H29 V18 H35 V22 H40 V18 H46 V29 H43 V52 Z M29 52 V44 A3 3 0 0 1 35 44 V52 Z";

export function capitalIconSvg(color: string, ring: string, clay = false) {
  if (!clay) {
    // A crisp tower: a pale wash, a fine outline, the masonry coursed.
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <path d="${TOWER}" fill="${ring}" stroke="${ring}" stroke-width="5" stroke-linejoin="round" opacity="0.8"/>
      <path d="${TOWER}" fill="${color}" fill-opacity="0.22" fill-rule="evenodd" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M21 35 H43 M21 41 H29 M35 41 H43 M21 47 H29 M35 47 H43 M25 29 V35 M39 29 V35" stroke="${color}" stroke-width="0.9" opacity="0.55"/></svg>`;
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
