// Photographs and artworks from Wikimedia Commons (public/data/images.json,
// built by scripts/fetch-images.mjs): one for each landmark and curiosity, and
// one work of art for each era. Every image carries its licence and artist.

export interface AtlasImage {
  /** A Commons thumbnail, about 480px on its longer side. */
  thumb: string;
  w: number;
  h: number;
  /** Commons file name, for the credit link. */
  file: string;
  license?: string;
  artist?: string;
}

export interface EraImage extends AtlasImage {
  from: number;
  caption: string;
}

interface ImageIndex {
  drawings: Record<string, AtlasImage>;
  eras: EraImage[];
}

let index: ImageIndex | null = null;
let loading: Promise<ImageIndex> | null = null;

export function loadImages(): Promise<ImageIndex> {
  loading ??= fetch(import.meta.env.BASE_URL + "data/images.json")
    .then((r) => (r.ok ? r.json() : { drawings: {}, eras: [] }))
    .catch(() => ({ drawings: {}, eras: [] }))
    .then((d: ImageIndex) => (index = d));
  return loading;
}

/** The image for a landmark or curiosity, once the index has loaded. */
export const drawingImage = (id: string): AtlasImage | undefined => index?.drawings[id];

/** The work of art that stands for the era containing a year. */
export function eraImage(year: number): EraImage | undefined {
  let best: EraImage | undefined;
  for (const e of index?.eras ?? []) if (e.from <= year) best = e;
  return best;
}

/** A short credit line: artist, licence, and a link to the file on Commons. */
export function creditHtml(img: AtlasImage, esc: (s: string) => string): string {
  const who = img.artist ? esc(img.artist.replace(/^(.+)\1$/, "$1")) : "Unknown";
  const url = `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(img.file)}`;
  return `${who} · ${esc(img.license || "see source")} · <a href="${url}" target="_blank" rel="noopener">Wikimedia Commons</a>`;
}

/**
 * A round photo pin for the map: the image cropped to a circle, with a white
 * rim, a short pointer to the exact spot below, and a soft shadow, drawn on a
 * canvas so the map can use it as an icon. Commons serves images with CORS
 * headers, so the canvas stays clean.
 */
export const MEDALLION_PX = 128;
export function medallion(src: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = MEDALLION_PX;
      const g = c.getContext("2d")!;
      const mid = MEDALLION_PX / 2;
      const r = mid - 18;
      const cy = r + 10; // the circle sits high; the pointer runs down to the bottom edge
      g.shadowColor = "rgba(20, 25, 35, 0.35)";
      g.shadowBlur = 8;
      g.shadowOffsetY = 2;
      g.beginPath();
      g.arc(mid, cy, r + 4, Math.PI * 0.62, Math.PI * 0.38);
      g.lineTo(mid, MEDALLION_PX - 4);
      g.closePath();
      g.fillStyle = "#ffffff";
      g.fill();
      g.shadowColor = "transparent";
      g.save();
      g.beginPath();
      g.arc(mid, cy, r, 0, Math.PI * 2);
      g.clip();
      // Cover the circle, cropping the longer side about the middle.
      const s = Math.max((2 * r) / img.width, (2 * r) / img.height);
      g.drawImage(img, mid - (img.width * s) / 2, cy - (img.height * s) / 2, img.width * s, img.height * s);
      g.restore();
      resolve(g.getImageData(0, 0, MEDALLION_PX, MEDALLION_PX));
    };
    img.onerror = reject;
    img.src = src;
  });
}
