// Downloads the map label typefaces into public/fonts/. MapLibre renders labels
// from these files directly (the style's "font-faces"), so the app needs no
// glyph server. All are SIL Open Font License, from the Google Fonts repository.
//
// The map's lettering follows the history of type:
//   Cinzel     - Roman inscriptional capitals, for prehistory and antiquity
//   IM Fell    - 17th-century English printing type, for the middle ages to 1800
//   Spectral   - a contemporary text serif, for the modern era
// Run: node scripts/fetch-fonts.mjs
import { mkdir, writeFile } from "node:fs/promises";

const BASE = "https://raw.githubusercontent.com/google/fonts/main/ofl/";
const FILES = {
  "spectral/Spectral-Regular.ttf": "Spectral-Regular.ttf",
  "spectral/Spectral-Italic.ttf": "Spectral-Italic.ttf",
  "spectral/Spectral-Medium.ttf": "Spectral-Medium.ttf",
  "spectral/OFL.txt": "OFL-Spectral.txt",
  "cinzel/Cinzel[wght].ttf": "Cinzel.ttf",
  "cinzel/OFL.txt": "OFL-Cinzel.txt",
  "imfellenglish/IMFeENrm28P.ttf": "IMFellEnglish-Regular.ttf",
  "imfellenglish/IMFeENit28P.ttf": "IMFellEnglish-Italic.ttf",
  "imfellenglish/OFL.txt": "OFL-IMFell.txt",
};

await mkdir("public/fonts", { recursive: true });
for (const [src, out] of Object.entries(FILES)) {
  const res = await fetch(BASE + src.split("/").map(encodeURIComponent).join("/"));
  if (!res.ok) throw new Error(`${src}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(`public/fonts/${out}`, buf);
  console.log(`${out}: ${Math.round(buf.length / 1024)} KB`);
}
