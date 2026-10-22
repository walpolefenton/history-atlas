// Downloads the map label typeface into public/fonts/. MapLibre renders labels
// from these files directly (the style's "font-faces"), so the app needs no
// glyph server. Spectral is by Production Type, SIL Open Font License.
// Run: node scripts/fetch-fonts.mjs
import { mkdir, writeFile } from "node:fs/promises";

const BASE = "https://raw.githubusercontent.com/google/fonts/main/ofl/spectral/";
const FILES = ["Spectral-Regular.ttf", "Spectral-Italic.ttf", "Spectral-Medium.ttf", "OFL.txt"];

await mkdir("public/fonts", { recursive: true });
for (const f of FILES) {
  const res = await fetch(BASE + f);
  if (!res.ok) throw new Error(`${f}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(`public/fonts/${f}`, buf);
  console.log(`${f}: ${Math.round(buf.length / 1024)} KB`);
}
