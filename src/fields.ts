// Farmland drawn flat on the ground: each "fields" scenery point becomes a small
// patchwork of plots that share their edges, each furrowed in its own direction,
// the way an engraver hatches fields on an old county map. Lying in the plane of
// the land, they read as part of it rather than as a picture standing on it.

/** A repeatable 0..1 value from a point and a salt, so a patchwork never reshuffles. */
function hash(x: number, y: number, salt: number) {
  let h = Math.imul(Math.round(x * 997) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(Math.round(y * 991) + salt * 7919, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** Number of furrow directions drawn as patterns (pat-furrow-0, -1, ...). */
export const FURROWS = 4;

/**
 * Plots around one field point: a jittered grid whose corners are shared, with a
 * few cells left fallow so the edge stays ragged. Size is in degrees of latitude.
 */
function patchwork(feature: GeoJSON.Feature, size: number): GeoJSON.Feature[] {
  const [lon, lat] = (feature.geometry as GeoJSON.Point).coordinates;
  const p = feature.properties ?? {};
  const cols = 3 + Math.floor(hash(lon, lat, 1) * 2);
  const rows = 2 + Math.floor(hash(lon, lat, 2) * 2);
  const cell = size / rows;
  const kx = 1 / Math.max(0.3, Math.cos((lat * Math.PI) / 180));
  // A slight skew, so the grid follows the lie of the land rather than the compass.
  const skew = (hash(lon, lat, 3) - 0.5) * 0.6;
  const corner = (i: number, j: number): [number, number] => {
    const jx = i > 0 && i < cols ? (hash(lon + i, lat + j, 4) - 0.5) * cell * 0.5 : 0;
    const jy = j > 0 && j < rows ? (hash(lon + i, lat + j, 5) - 0.5) * cell * 0.5 : 0;
    const x = (i - cols / 2) * cell + jx + (j - rows / 2) * cell * skew;
    const y = (j - rows / 2) * cell + jy;
    return [Math.round((lon + x * kx) * 1e4) / 1e4, Math.round((lat + y) * 1e4) / 1e4];
  };
  const out: GeoJSON.Feature[] = [];
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const r = hash(lon + i * 3, lat + j * 5, 6);
      // Corner cells lie fallow more often than inner ones.
      const edge = (i === 0 || i === cols - 1) && (j === 0 || j === rows - 1);
      if (r < (edge ? 0.45 : 0.12)) continue;
      out.push({
        type: "Feature",
        properties: { furrow: Math.floor(hash(lon + i, lat - j, 7) * FURROWS), tone: hash(lon - i, lat + j, 8), t: p.t ?? 4 },
        geometry: { type: "Polygon", coordinates: [[corner(i, j), corner(i + 1, j), corner(i + 1, j + 1), corner(i, j + 1), corner(i, j)]] },
      });
    }
  return out;
}

/** Field plots for every "fields" point among the given scenery features. */
export function fieldPlots(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
  const plots = features
    .filter((f) => f.properties?.k === "fields" && f.geometry.type === "Point")
    // Village farmland is smaller than the great farmed plains.
    .flatMap((f) => patchwork(f, (f.properties?.village ? 0.28 : 0.42) * (f.properties?.s ?? 1)));
  return { type: "FeatureCollection", features: plots };
}

/** A tile of furrows in one direction; seamless when repeated. */
export function furrowSvg(direction: number, ink: string): string {
  const lines = [
    "M0 4 H16 M0 12 H16", // across
    "M0 16 L16 0 M-4 4 L4 -4 M12 20 L20 12 M-4 12 L12 -4 M4 20 L20 4", // rising
    "M4 0 V16 M12 0 V16", // along
    "M0 0 L16 16 M-4 12 L4 20 M12 -4 L20 4 M-4 4 L12 20 M4 -4 L20 12", // falling
  ][direction % 4];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="${lines}" stroke="${ink}" stroke-width="0.9" stroke-linecap="round" opacity="0.5"/></svg>`;
}
