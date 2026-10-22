// Gives polygon outlines a slight hand-drawn wobble, so borders look inked by
// hand rather than plotted. Long straight segments (colonial-era borders, for
// instance) are first broken into short steps, then every vertex is nudged.
//
// The nudge depends only on the vertex's own coordinates, so a border shared by
// two territories wobbles identically in both and the shapes still meet exactly.

const STEP = 0.3; // degrees between inserted points on long segments
const AMPLITUDE = 0.045; // maximum nudge in degrees (about 5 km)

function hash(x, y, salt) {
  let h = Math.imul(Math.round(x * 1000) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(Math.round(y * 1000) + salt, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 13;
  return ((h >>> 0) / 4294967296) * 2 - 1;
}

const nudge = ([x, y]) => [x + hash(x, y, 1) * AMPLITUDE, y + hash(x, y, 2) * AMPLITUDE * 0.8];

function wobbleRing(ring) {
  const out = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const [a, b] = [ring[i], ring[i + 1]];
    out.push(nudge(a));
    const n = Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / STEP);
    for (let j = 1; j < n; j++) {
      // Inserted points are computed from the segment's endpoints in a fixed
      // order, so both neighbours insert the same points.
      const [p, q] = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? [a, b] : [b, a];
      const t = (a === p ? j : n - j) / n;
      out.push(nudge([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]));
    }
  }
  out.push(out[0]);
  return out;
}

/** Wobbles a Polygon's or MultiPolygon's coordinates. */
export function wobble(geometry) {
  if (geometry.type === "Polygon") return { type: "Polygon", coordinates: geometry.coordinates.map(wobbleRing) };
  if (geometry.type === "MultiPolygon") return { type: "MultiPolygon", coordinates: geometry.coordinates.map((p) => p.map(wobbleRing)) };
  return geometry;
}
