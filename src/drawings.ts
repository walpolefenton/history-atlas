// Pen-and-ink drawings for landmarks, curiosities and the hidden Surveyor,
// after Saul Steinberg: one wiry line weight, a light wash, a slight wobble.
//
// Each drawing is SVG markup on a 64x64 grid. Shapes marked fill="WASH" get
// the theme's wash colour; everything is stroked with the wrapper's ink. A
// small displacement filter makes the line waver like a real pen.

/** Repeats a drawn element: f(i) gives the markup of the i-th of n. */
const times = (n: number, f: (i: number) => string) => Array.from({ length: n }, (_, i) => f(i)).join("");
/** Rounds to one decimal, to keep generated paths short. */
const r1 = (v: number) => Math.round(v * 10) / 10;

const D: Record<string, string> = {
  // The Giza plateau: the Great Pyramid in front, Khafre behind, courses of stone on the lit face.
  pyramid: `<path d="M37 37.7 L46 24 L62 54 L48 54 Z" fill="WASH"/><path d="M46 24 L50.5 54"/><path d="M44.2 26.8 L47.6 26.8" opacity=".6"/>
    <path d="M2 54 L24 12 L48 54 Z" fill="WASH"/><path d="M24 12 L29 54"/>
    ${times(9, (i) => { const t = (i + 1) / 10; return `<path d="M${r1(24 - 22 * t)} ${r1(12 + 42 * t)} H${r1(24 + 5 * t)}" opacity=".38"/>`; })}
    ${times(4, (i) => { const t = (i + 1) / 5; return `<path d="M${r1(24 + 5 * t)} ${r1(12 + 42 * t)} H${r1(24 + 24 * t)}" opacity=".25"/>`; })}
    <path d="M1 54 H63"/><path d="M5 58 Q15 56.5 25 58 M37 58 Q48 56.5 59 58" opacity=".35"/>`,
  // A stepped temple pyramid: terraces with recessed panels, a stair, a shrine with a roof comb.
  stepped: `<path d="M7 54 H57 V48 H53 V42 H49 V36 H45 V30 H19 V36 H15 V42 H11 V48 H7 Z" fill="WASH"/>
    <path d="M27.5 54 V30 M36.5 54 V30"/>${times(8, (i) => `<path d="M27.5 ${51 - i * 3} H36.5" opacity=".55"/>`)}
    ${times(4, (i) => { const y = 49.5 - i * 6; const x0 = 9 + i * 4; const x1 = 55 - i * 4; return `<path d="M${x0} ${y} H${25.5} M${38.5} ${y} H${x1}" opacity=".35"/><path d="M${x0 + 2} ${y + 1.5} V${y + 3.5} M${x1 - 2} ${y + 1.5} V${y + 3.5} M${(x0 + 25.5) / 2} ${y + 1.5} V${y + 3.5} M${(38.5 + x1) / 2} ${y + 1.5} V${y + 3.5}" opacity=".35"/>`; })}
    <path d="M21.5 30 V21 H42.5 V30" fill="WASH"/><path d="M29.5 30 V24.5 H34.5 V30"/><path d="M24.5 21 V14.5 H39.5 V21" fill="WASH"/>
    ${times(4, (i) => `<path d="M${27 + i * 3.4} 16.5 V18.8" opacity=".6"/>`)}<path d="M2 54 H62"/>`,
  // Stonehenge: three trilithons, one leaning and one fallen, the stones weathered.
  stones: `<path d="M7.5 54 V31 H12.5 V54 Z M16.5 54 V31 H21.5 V54 Z" fill="WASH"/><path d="M6 27 H23 V31 H6 Z" fill="WASH"/>
    <path d="M26.5 54 V24 H31.5 V54 Z M34.5 54 V24 H39.5 V54 Z" fill="WASH"/><path d="M25 20 H41 V24 H25 Z" fill="WASH"/>
    <path d="M44 54 V33 H49 V54 Z" fill="WASH"/><path d="M52.5 54 V36.5 L56.5 35 L57.5 54 Z" fill="WASH"/><path d="M42.5 29 H51 V33 H42.5 Z" fill="WASH"/>
    <path d="M51 54 L54.5 50.5 L62.5 52 L61.5 54 Z" fill="WASH"/>
    <path d="M9.5 35 L10.5 41 M19 33 V37 M28.5 27 L29.5 35 M37 30 V35 M46 38 L47 44 M54.5 41 V45" opacity=".4"/>
    <path d="M2 54 H62"/><path d="M5 56.5 l1 -1.6 M13 56.5 l1 -1.6 M24 56.5 l1 -1.6 M36 56.5 l1 -1.6 M48 56.5 l1 -1.6" opacity=".35"/>`,
  // A Greek Doric temple: sculpted pediment, triglyph frieze, fluted columns, a three-stepped base.
  temple: `<path d="M8 22 L32 11 L56 22 Z" fill="WASH"/><path d="M13 20.5 L32 12.8 L51 20.5" opacity=".4"/>
    <path d="M21 20 Q24 16.8 27.5 18.6 M36 18.4 Q40 16.4 43.5 19.6" opacity=".45"/>
    <path d="M6 22 H58 V24.5 H6 Z M7 24.5 H57 V29 H7 Z M7 29 H57 V31 H7 Z" fill="WASH"/>
    ${times(12, (i) => `<path d="M${10 + i * 4.2} 25 V28.5 M${11.2 + i * 4.2} 25 V28.5" opacity=".5"/>`)}
    ${times(6, (i) => { const x = 11 + i * 8.4; return `<path d="M${r1(x - 2.2)} 31 V46 H${r1(x + 2.2)} V31" fill="WASH"/><path d="M${r1(x - 3)} 31 H${r1(x + 3)}" /><path d="M${r1(x - 0.7)} 32.5 V45 M${r1(x + 0.7)} 32.5 V45" opacity=".35"/>`; })}
    <path d="M6 46 H58 V48 H6 Z M4 48 H60 V50.5 H4 Z M2 50.5 H62 V53 H2 Z" fill="WASH"/>`,
  // The Colosseum: three tiers of arcades on the curve of the ellipse, the attic above, the ruined north side lower.
  arena: `<path d="M5 53 V31 L9 29.5 V25 Q32 9 59 18 V53 Z" fill="WASH"/>
    <path d="M5 44 Q32 40 59 44 M5 35.5 Q32 29.5 59 34.5 M9 27.5 Q33 18.5 59 25.5" />
    ${times(8, (i) => { const x = 6.8 + i * 6.6; return `<path d="M${r1(x)} 53 V48.4 Q${r1(x + 2.3)} 45.4 ${r1(x + 4.6)} 48.4 V53"/>`; })}
    ${times(8, (i) => { const x = 6.8 + i * 6.6; const t = (x + 2.3 - 5) / 54; const y = 44 - 8 * t * (1 - t); return `<path d="M${r1(x)} ${r1(y - 0.4)} V${r1(y - 4.6)} Q${r1(x + 2.3)} ${r1(y - 7.2)} ${r1(x + 4.6)} ${r1(y - 4.6)} V${r1(y - 0.4)}" opacity=".9"/>`; })}
    ${times(7, (i) => { const x = 10.5 + i * 6.8; const t = (x + 2.2 - 5) / 54; const y = 35.5 - 12 * t * (1 - t) - t; return `<path d="M${r1(x)} ${r1(y - 0.4)} V${r1(y - 4)} Q${r1(x + 2.2)} ${r1(y - 6.4)} ${r1(x + 4.4)} ${r1(y - 4)} V${r1(y - 0.4)}" opacity=".85"/>`; })}
    ${times(7, (i) => { const x = 13 + i * 6.6; const t = (x - 9) / 50; const y = 27.5 - 18 * t * (1 - t) - 2 * t; return `<path d="M${r1(x)} ${r1(y - 2)} h1.8 v-2.2 h-1.8 Z" opacity=".6"/>`; })}
    <path d="M9 29.5 Q15 27 22 26 M5 31 L9 29.5" opacity=".45"/><path d="M2 53 H62"/>`,
  // A domed rotunda (the Pantheon, St Peter's): ribbed dome on a windowed drum, lantern, portico.
  dome: `<path d="M16 29 Q16 11.5 32 10.5 Q48 11.5 48 29 Z" fill="WASH"/>
    <path d="M24 28.6 Q23.6 15.5 32 10.8 M40 28.6 Q40.4 15.5 32 10.8 M32 10.8 V28.6" opacity=".45"/>
    <path d="M29.5 10.6 V6.5 H34.5 V10.6" fill="WASH"/><path d="M32 6.5 V3"/><path d="M14.5 29 H49.5 V37 H14.5 Z" fill="WASH"/>
    ${times(7, (i) => `<path d="M${17.6 + i * 4.8} 35.5 V31.5" opacity=".55"/>`)}
    <path d="M7 54 V38 H15 V54 Z M49 54 V38 H57 V54 Z" fill="WASH"/><path d="M11 37 L32 37 L53 37 L32 30.5 Z" fill="WASH"/>
    ${times(6, (i) => { const x = 15 + i * 6.8; return `<path d="M${r1(x - 1.4)} 38 V51 H${r1(x + 1.4)} V38" fill="WASH"/>`; })}
    <path d="M9 37.6 H55" opacity=".5"/><path d="M5 51 H59 V54 H5 Z" fill="WASH"/><path d="M2 54 H62"/>`,
  // A great mosque (Hagia Sophia): a low ribbed dome over semi-domes and buttresses, four slender minarets.
  minarets: `<path d="M19 31 Q19 17 32 16 Q45 17 45 31 Z" fill="WASH"/>
    ${times(9, (i) => { const a = Math.PI * (0.12 + i * 0.095); return `<path d="M${r1(32 - 12.5 * Math.cos(a))} ${r1(30.5 - 13.6 * Math.sin(a) * 0.98)} L32 16.4" opacity=".28"/>`; })}
    <path d="M31 16 V12 M29.8 12 H34.2"/><path d="M12 38 Q12 31 19 30.5 L19 38 Z M52 38 Q52 31 45 30.5 L45 38 Z" fill="WASH"/>
    <path d="M14 54 V38 H50 V54 Z" fill="WASH"/>${times(9, (i) => `<path d="M${17 + i * 3.8} 44 V41 Q${18 + i * 3.8} 39.6 ${19 + i * 3.8} 41 V44" opacity=".5"/>`)}
    <path d="M28.5 54 V48 Q32 44.5 35.5 48 V54"/>
    ${[4, 9, 55, 60].map((x) => `<path d="M${x - 1.3} 54 V20 H${x + 1.3} V54 Z" fill="WASH"/><path d="M${x - 1.3} 20 L${x} 12 L${x + 1.3} 20"/><path d="M${x - 2.2} 30 H${x + 2.2} M${x - 2.2} 40 H${x + 2.2}"/>`).join("")}
    <path d="M1 54 H63"/>`,
  // The Taj Mahal: an onion dome on its drum, chhatris, the arched iwan, four minarets on the plinth.
  onion: `<path d="M23.5 25 Q19 18.5 25 13.5 Q30 10 32 5.5 Q34 10 39 13.5 Q45 18.5 40.5 25 Z" fill="WASH"/><path d="M32 5.5 V2"/>
    <path d="M23 25 H41 V28 H23 Z" fill="WASH"/>
    <path d="M14 28 Q14 24 16.5 22.8 Q19 24 19 28 Z M45 28 Q45 24 47.5 22.8 Q50 24 50 28 Z" fill="WASH"/>
    <path d="M13 48 V28 H51 V48 Z" fill="WASH"/><path d="M26 48 V36 Q32 30 38 36 V48" fill="WASH"/><path d="M24 48 V34 H40 V48" opacity=".55"/>
    ${[16, 45].map((x) => `<path d="M${x} 47 V41 Q${x + 1.5} 39 ${x + 3} 41 V47 M${x} 37 V32 Q${x + 1.5} 30 ${x + 3} 32 V37" opacity=".55"/>`).join("")}
    ${[4.5, 59.5].map((x) => `<path d="M${x - 1.4} 50 V21 H${x + 1.4} V50 Z" fill="WASH"/><path d="M${x - 2.2} 21 Q${x} 17.5 ${x + 2.2} 21 M${x} 17.6 V15.5 M${x - 2} 31 H${x + 2} M${x - 2} 40 H${x + 2}"/>`).join("")}
    <path d="M1 50 H63 V54 H1 Z" fill="WASH"/><path d="M1 56.5 H63" opacity=".4"/>`,
  // A stupa (Sanchi, Borobudur): the hemispherical dome on its drum, the harmika and the parasol stack, a railing.
  stupa: `<path d="M13 42 Q13 22 32 21 Q51 22 51 42 Z" fill="WASH"/><path d="M18 32 Q32 27.5 46 32" opacity=".35"/>
    <path d="M27.5 21.2 V16.5 H36.5 V21.2" fill="WASH"/><path d="M28 18.6 H36" opacity=".5"/>
    <path d="M32 16.5 V5"/><path d="M27 14.2 H37 M28.5 10.8 H35.5 M30 7.6 H34"/>
    <path d="M10 42 H54 V47 H10 Z" fill="WASH"/>${times(11, (i) => `<path d="M${12 + i * 4} 42.5 V46.5" opacity=".5"/>`)}
    <path d="M6 47 H58 V51 H6 Z" fill="WASH"/><path d="M4 51 H60 V54 H4 Z" fill="WASH"/>
    <path d="M26 54 V48.5 Q32 45 38 48.5 V54" opacity=".7"/><path d="M1 54 H63"/>`,
  // Angkor Wat: five lotus-bud towers, the central one highest, over the galleries.
  towers: `${[[16, 30, 7], [48, 30, 7], [24, 25, 7.5], [40, 25, 7.5]].map(([x, y, w]) => `<path d="M${x - w / 2} 44 V${y + 6} Q${x - w / 2} ${y - 4} ${x} ${y - 10} Q${x + w / 2} ${y - 4} ${x + w / 2} ${y + 6} V44 Z" fill="WASH"/>${times(3, (i) => `<path d="M${r1(x - w / 2 + 0.6)} ${y + 1 - i * 4.5} H${r1(x + w / 2 - 0.6)}" opacity=".4"/>`)}`).join("")}
    <path d="M27 44 V22 Q27 10 32 3 Q37 10 37 22 V44 Z" fill="WASH"/>${times(5, (i) => `<path d="M27.6 ${30 - i * 4.4} H36.4" opacity=".4"/>`)}
    <path d="M6 44 H58 V49 H6 Z" fill="WASH"/>${times(12, (i) => `<path d="M${8.5 + i * 4.4} 44.6 V48.4" opacity=".45"/>`)}
    <path d="M3 49 H61 V53 H3 Z" fill="WASH"/><path d="M29 53 V50 H35 V53"/><path d="M1 53 H63"/><path d="M4 57 Q18 55.5 32 57 T60 57" opacity=".35"/>`,
  // A five-storey pagoda: upturned eaves, each storey a little smaller, the finial with its rings.
  pagoda: `${times(5, (i) => { const y = 50 - i * 8.2; const w = 15 - i * 2; const h = 5.6; return `<path d="M${32 - w + 3} ${y} V${y - h} H${32 + w - 3} V${y} Z" fill="WASH"/>${times(Math.max(2, 5 - i), (j, n = Math.max(2, 5 - i)) => `<path d="M${r1(32 - w + 5 + (j * (2 * w - 10)) / (n - 1))} ${y - 0.6} V${y - h + 1}" opacity=".45"/>`)}<path d="M${32 - w - 3} ${y - h + 0.4} Q${32 - w} ${y - h - 0.8} ${32 - w + 3} ${y - h - 1.6} H${32 + w - 3} Q${32 + w} ${y - h - 0.8} ${32 + w + 3} ${y - h + 0.4} Q${32 + w + 1} ${y - h - 2.6} ${32 + w - 3} ${y - h - 3.4} H${32 - w + 3} Q${32 - w - 1} ${y - h - 2.6} ${32 - w - 3} ${y - h + 0.4} Z" fill="WASH"/>`; })}
    <path d="M32 11.8 V2"/><path d="M30.2 9 H33.8 M30.6 6.6 H33.4 M31 4.4 H33"/><path d="M8 50 H56 V54 H8 Z" fill="WASH"/><path d="M2 54 H62"/>`,
  // A stretch of the Great Wall: the crenellated wall riding the ridges, a watchtower, the hills falling away.
  wall: `<path d="M2 44 L12 37 L22 40 L31 31 L42 35 L52 27 L62 29" opacity=".5"/>
    <path d="M2 46 L12 39 L22 42 L31 33 L42 37 L52 29 L62 31 L62 36 L52 34 L42 42 L31 38 L22 47 L12 44 L2 51 Z" fill="WASH"/>
    ${times(12, (i) => { const x = 3.5 + i * 5; const pts = [[2, 46], [12, 39], [22, 42], [31, 33], [42, 37], [52, 29], [62, 31]]; let y = 46; for (let k = 0; k < pts.length - 1; k++) if (x >= pts[k][0] && x <= pts[k + 1][0]) y = pts[k][1] + ((x - pts[k][0]) / (pts[k + 1][0] - pts[k][0])) * (pts[k + 1][1] - pts[k][1]); return `<path d="M${r1(x)} ${r1(y)} v-1.8 h1.6 v1.8" opacity=".85"/>`; })}
    <path d="M27.5 34.5 V24 H35 V35.5" fill="WASH"/><path d="M26.8 24 H35.7 V22 H26.8 Z" fill="WASH"/><path d="M29.4 30.5 V27.5 H33 V30.5" opacity=".7"/>
    <path d="M2 58 Q14 52 26 56 T50 52 T62 54" opacity=".35"/><path d="M8 55 L12 51 M38 57 L42 53 M54 56 L58 52" opacity=".3"/>`,
  // A castle: a square keep with machicolations, two round flanking towers with conical roofs, a gatehouse.
  castle: `<path d="M21 54 V21 H43 V54 Z" fill="WASH"/>${times(6, (i) => `<path d="M${21 + i * 4} 21 V17.5 H${23 + i * 4} V21" />`)}
    <path d="M21 24.5 H43" opacity=".5"/><path d="M30 30 V27 H34 V30 M25 38 V35.5 H27.5 V38 M36.5 38 V35.5 H39 V38" opacity=".7"/>
    <path d="M28 54 V45 Q32 40.5 36 45 V54"/><path d="M29.5 54 V47 M31.5 54 V45.6 M33.5 54 V45.6 M35 54 V47" opacity=".35"/>
    ${[11.5, 52.5].map((x) => `<path d="M${x - 5} 54 V30 H${x + 5} V54 Z" fill="WASH"/><path d="M${x - 6} 30 L${x} 17 L${x + 6} 30 Z" fill="WASH"/><path d="M${x} 17 V12.5 L${x + 4} 13.8 L${x} 15"/><path d="M${x - 1} 37 V34 H${x + 1} V37 M${x - 1} 46 V43 H${x + 1} V46" opacity=".7"/>`).join("")}
    <path d="M1 54 H63"/>`,
  // A Gothic cathedral: twin west towers with tracery, the rose window, the portals, pinnacles.
  cathedral: `<path d="M22 54 V29 L32 21 L42 29 V54 Z" fill="WASH"/><circle cx="32" cy="34" r="4.6"/><circle cx="32" cy="34" r="1.4"/>
    ${times(8, (i) => { const a = (i * Math.PI) / 4; return `<path d="M${r1(32 + 1.4 * Math.cos(a))} ${r1(34 + 1.4 * Math.sin(a))} L${r1(32 + 4.6 * Math.cos(a))} ${r1(34 + 4.6 * Math.sin(a))}" opacity=".6"/>`; })}
    <path d="M27.5 54 V46 Q32 40.5 36.5 46 V54"/><path d="M29.2 54 V47.2 Q32 43.6 34.8 47.2" opacity=".5"/>
    ${[15.5, 48.5].map((x) => `<path d="M${x - 6.5} 54 V16 H${x + 6.5} V54 Z" fill="WASH"/>${times(5, (i) => `<path d="M${x - 6.5 + i * 3.25} 16 V13"/>`)}<path d="M${x - 3} 30 V23.5 Q${x - 1.5} 21.5 ${x} 23.5 V30 M${x} 30 V23.5 Q${x + 1.5} 21.5 ${x + 3} 23.5 V30" opacity=".65"/><path d="M${x - 3} 42 V36.5 Q${x} 33.5 ${x + 3} 36.5 V42" opacity=".6"/><path d="M${x - 6.5} 33 H${x + 6.5} M${x - 6.5} 46 H${x + 6.5}" opacity=".4"/><path d="M${x - 3} 54 V49.5 Q${x} 47 ${x + 3} 49.5 V54" />`).join("")}
    <path d="M32 21 V9.5 M30 13 H34"/><path d="M1 54 H63"/>`,
  // The great mud mosques of the Sahel (Djenné, Timbuktu): three towers bristling with toron beams, buttresses crowned with cones.
  adobe: `<path d="M5 54 V31 H59 V54 Z" fill="WASH"/>
    ${times(12, (i) => { const x = 7.5 + i * 4.5; return `<path d="M${r1(x)} 53 V32" opacity=".3"/><path d="M${r1(x - 1)} 31 L${r1(x)} 27.6 L${r1(x + 1)} 31"/>`; })}
    ${[[16, 15, 7], [32, 10, 9], [48, 15, 7]].map(([x, top, w]) => `<path d="M${x - w / 2} 31 V${top + 5} Q${x - w / 2} ${top} ${x} ${top - 2} Q${x + w / 2} ${top} ${x + w / 2} ${top + 5} V31 Z" fill="WASH"/><path d="M${x} ${top - 2} V${top - 5}"/><circle cx="${x}" cy="${top - 5.8}" r="0.8"/>${times(3, (i) => `<path d="M${x - w / 2 - 1.6} ${top + 7 + i * 5} H${x - w / 2} M${x + w / 2} ${top + 7 + i * 5} H${x + w / 2 + 1.6}"/>`)}`).join("")}
    ${times(4, (i) => `<path d="M${6.5 + i * 15} 37 H${8 + i * 15} M${6.5 + i * 15} 44 H${8 + i * 15}" />`)}
    <path d="M29 54 V45.5 H35 V54"/><path d="M1 54 H63"/>`,
  // Machu Picchu: the sugarloaf of Huayna Picchu, the stone terraces curving round the slope, gabled houses on the saddle.
  terraces: `<path d="M28 54 Q33 33 39 19 Q43 10 48 15 Q53 26 62 54 Z" fill="WASH"/>
    <path d="M42 18 Q40.5 28 38 40 M46.5 20 Q48.5 32 52 44 M44 30 Q44.5 38 45 48" opacity=".35"/>
    ${times(6, (i) => { const y = 52 - i * 4; const x = 31 - i * 1.6; return `<path d="M2 ${y} Q${r1(x / 2)} ${y - 1.6} ${r1(x)} ${y + 0.5}"/>${times(5, (j) => `<path d="M${r1(4 + j * (x - 6) / 5)} ${r1(y + 0.4)} V${r1(y + 3)}" opacity=".3"/>`)}`; })}
    ${[6, 12.5, 19].map((x) => `<path d="M${x} 30 V26.5 L${x + 2.8} 23.5 L${x + 5.6} 26.5 V30 Z" fill="WASH"/><path d="M${x + 2} 30 V27.8 H${x + 3.6} V30" opacity=".6"/>`).join("")}
    <path d="M1 54 H63"/>`,
  // Moai on their ahu: heavy brows, long noses, pursed lips, long ears, hands on the belly.
  head: `<path d="M6.5 52 V36.5 Q6.5 26.5 12 25.5 Q17.5 26.5 17 36.5 V52 Z" fill="WASH"/><path d="M7.5 31 H16.5 M12 31 V37.5 M9.8 41 Q12 40.2 14.2 41" opacity=".75"/>
    <path d="M46.5 52 V34 Q46.5 23 52 22 Q57.5 23 57.5 34 V52 Z" fill="WASH"/><path d="M47.5 28.5 H56.5 M52 28.5 V35.5 M49.8 39 Q52 38.2 54.2 39" opacity=".75"/>
    <path d="M23.5 52 V30.5 Q23 14 32 12 Q41 14 40.5 30.5 V52 Z" fill="WASH"/>
    <path d="M24.8 24 Q32 22.6 39.2 24"/><path d="M26.5 25.6 Q28.8 27.8 31 25.8 M33 25.8 Q35.2 27.8 37.5 25.6" opacity=".55"/>
    <path d="M32 24.5 V33.6 Q30.2 35.8 28.6 34.6 M32 33.6 Q33.8 35.8 35.4 34.6"/><path d="M28.6 39.4 Q32 37.8 35.4 39.4 M29 41.2 Q32 42.2 35 41.2"/>
    <path d="M26.6 44.4 Q32 46.6 37.4 44.4" opacity=".45"/><path d="M23.6 25.5 Q21.4 30 23.2 37.5 M40.4 25.5 Q42.6 30 40.8 37.5"/>
    <path d="M24.4 47.6 Q28 50 31.4 48.6 M39.6 47.6 Q36 50 32.6 48.6" opacity=".55"/>
    <path d="M2 52 H62 V55.5 H2 Z" fill="WASH"/><path d="M11 52 V55.5 M22 52 V55.5 M36 52 V55.5 M49 52 V55.5" opacity=".4"/>`,
  // The Pharos of Alexandria: a square tower, an octagonal stage, a round lantern with its fire, on the harbour mole.
  lighthouse: `<path d="M17 55 V30 H47 V55 Z" fill="WASH"/>${times(3, (i) => times(3, (j) => `<path d="M${22 + j * 9} ${35 + i * 6.5} v2.6 h2 v-2.6 Z" opacity=".55"/>`))}
    <path d="M15 30 H49 V27.5 H15 Z" fill="WASH"/><path d="M21.5 27.5 V15.5 H42.5 V27.5 Z" fill="WASH"/><path d="M27 27 V16 M37 27 V16" opacity=".45"/>
    <path d="M20 15.5 H44 V13.8 H20 Z" fill="WASH"/><path d="M26.5 13.8 V7 H37.5 V13.8 Z" fill="WASH"/><path d="M29.2 13.4 V7.4 M32 13.4 V7.4 M34.8 13.4 V7.4" opacity=".55"/>
    <path d="M25.6 7 H38.4"/><path d="M32 6 V2.6 M28.4 5.2 L26.4 3.2 M35.6 5.2 L37.6 3.2 M27 7.4 L24.4 6.6 M37 7.4 L39.6 6.6" opacity=".6"/>
    <path d="M8 55 H56"/><path d="M8 55 L4 58.5 M56 55 L60 58.5"/><path d="M2 61 Q6 59.5 10 61 T18 61 T26 61 T34 61 T42 61 T50 61 T58 61" opacity=".45"/>`,
  // Big Ben: the clock tower with its four faces, the belfry and the gilded spire, the Palace of Westminster at its foot.
  tower: `<path d="M2 56 V45 H25.5 V56 Z M38.5 56 V45 H62 V56 Z" fill="WASH"/>${times(9, (i) => `<path d="M${3.5 + i * 2.5 + (i > 4 ? 32 : 0)} 45 V42.6" />`)}
    ${times(6, (i) => `<path d="M${5 + i * 3.4 + (i > 2 ? 37 : 0)} 53 V49 Q${5.8 + i * 3.4 + (i > 2 ? 37 : 0)} 48 ${6.6 + i * 3.4 + (i > 2 ? 37 : 0)} 49 V53" opacity=".5"/>`)}
    <path d="M25.5 56 V22 H38.5 V56 Z" fill="WASH"/><path d="M28.6 54 V24 M31.2 54 V24 M33.8 54 V24 M36.4 54 V24" opacity=".28"/><path d="M25.5 34 H38.5 M25.5 44 H38.5" opacity=".4"/>
    <path d="M24.5 22 V12 H39.5 V22 Z" fill="WASH"/><circle cx="32" cy="17" r="4.1"/><circle cx="32" cy="17" r="3.2" opacity=".45"/><path d="M32 17 V14.4 M32 17 L34 17.8"/>
    <path d="M24.5 12 V9 M39.5 12 V9"/><path d="M26.5 12 V8.2 H37.5 V12" fill="WASH"/><path d="M28.6 11.6 V9.6 Q29.4 8.8 30.2 9.6 V11.6 M33.8 11.6 V9.6 Q34.6 8.8 35.4 9.6 V11.6" opacity=".6"/>
    <path d="M26.5 8.2 L32 1.6 L37.5 8.2 Z" fill="WASH"/><path d="M32 1.6 V0.2"/><path d="M1 56 H63"/>`,
  // The Eiffel Tower: four curved legs on their great arch, two platforms, the lattice tapering to the top.
  lattice: `<path d="M11 57 Q20 42 25.5 31 L29.4 10 H34.6 L38.5 31 Q44 42 53 57 H45 Q39.5 46.5 32 45.4 Q24.5 46.5 19 57 Z" fill="WASH"/>
    <path d="M17 40.8 H47 V38.2 H17 Z M24.6 29.6 H39.4 V27.6 H24.6 Z" fill="WASH"/><path d="M29.4 10 H34.6 V7.8 H29.4 Z" fill="WASH"/><path d="M32 7.8 V1.2"/>
    <path d="M14 54 L21 44.5 M17.6 56 L23.4 46.6 M16 49 L23.6 52 M50 54 L43 44.5 M46.4 56 L40.6 46.6 M48 49 L40.4 52" opacity=".4"/>
    <path d="M21.4 38 L26.6 31.4 M24.6 38 L27.8 33 M42.6 38 L37.4 31.4 M39.4 38 L36.2 33" opacity=".4"/>
    <path d="M26.6 27 L36.6 13 M37.4 27 L27.4 13 M28.4 20 H35.6 M29 15.4 H35" opacity=".4"/><path d="M2 57 H62"/>`,
  // A statue on its plinth: a robed figure, one arm raised.
  statue: `<path d="M21 57 V43 H43 V57 Z" fill="WASH"/><path d="M19.5 43 H44.5 V40.6 H19.5 Z" fill="WASH"/><path d="M25 46 V54 M39 46 V54" opacity=".4"/>
    <path d="M27 40.6 Q26 30 28.4 22.6 L30.4 18.6 H34 L35.6 22.6 Q38 30.5 37 40.6 Z" fill="WASH"/>
    <path d="M29.4 24.5 Q28.4 32 29.4 40.2 M32 23.6 Q32.6 32 32 40.2 M34.8 25 Q35.8 32 35 40.2" opacity=".4"/>
    <circle cx="32.2" cy="15.8" r="2.4" fill="WASH"/><path d="M34 19.6 L38.6 12 M28.6 21.6 L26 27"/><path d="M14 57 H50"/>`,
  // The Empire State Building: limestone setbacks, piers rising the full height, the mooring mast.
  skyscraper: `<path d="M18 58 V31 H21.5 V25 H25 V18.5 H28 V12.5 H36 V18.5 H39 V25 H42.5 V31 H46 V58 Z" fill="WASH"/>
    ${times(11, (i) => { const x = 19.5 + i * 2.5; const top = x > 28 && x < 36 ? 13 : x > 25 && x < 39 ? 19 : x > 21.5 && x < 42.5 ? 25.5 : 31.5; return `<path d="M${r1(x)} ${top} V57" opacity=".32"/>`; })}
    <path d="M30 12.5 V8.4 H34 V12.5 M30.8 8.4 V4.6 H33.2 V8.4 M32 4.6 V0.6"/><path d="M12 58 H52"/>`,
  // The Sydney Opera House: sail-like shells in profile on the podium, ribbed, above the harbour.
  sails: `<path d="M4 50 H60 V54 H4 Z" fill="WASH"/>
    <path d="M9 50 Q13 30 30 21.5 Q25.5 36 27.6 50 Z" fill="WASH"/><path d="M13.4 49.4 Q16.6 34 27 25 M18.6 49.4 Q20.8 36.4 28.2 27.6" opacity=".4"/>
    <path d="M25.6 50 Q32 25 47 17 Q40.6 34 42.2 50 Z" fill="WASH"/><path d="M30.4 49.4 Q35 31 44 21.4 M35.6 49.4 Q38.6 34 44.8 25" opacity=".4"/>
    <path d="M41.6 50 Q46 38 57 32.5 Q52.6 42 54 50 Z" fill="WASH"/><path d="M45.8 49.4 Q49 40.4 55.4 35.4" opacity=".4"/>
    <path d="M2 57.5 Q8 56 14 57.5 T26 57.5 T38 57.5 T50 57.5 T62 57.5 M6 61 Q12 59.6 18 61 T30 61 T42 61 T54 61" opacity=".4"/>`,

  // --- Curiosities -----------------------------------------------------------
  mammoth: `<path d="M12 40 Q11 20 31 18 Q45 17 49 26 Q54 31 51 40 Z" fill="WASH"/>
    <path d="M50 30 Q58 38 54 48 Q52 51 50 48"/><path d="M48 37 Q44 47 35 43"/>
    <path d="M16 40 V52 M22 40 V52 M38 40 V52 M44 40 V51"/><path d="M14 33 L12 37 M19 38 L18 41 M27 39 L26 42 M33 39 L33 42"/><circle cx="45" cy="27" r="0.8"/>
    <path d="M12 26 Q8 28 9 33"/><path d="M4 53 H60" opacity=".5"/>`,
  serpent: `<path d="M4 44 Q10 29 16 44 M20 44 Q26 27 32 44 M36 44 Q42 31 48 44"/>
    <path d="M47 44 Q50 29 57 31 Q61 35 56 38 L51 39" fill="WASH"/><circle cx="55" cy="33.5" r="0.8"/><path d="M58 37 L62 39 M58 37 L61 41"/>
    <path d="M9 37 L11 34 M25 35 L27 32 M41 37 L43 34"/><path d="M2 49 Q8 46 14 49 T26 49 T38 49 T50 49 T62 49"/>`,
  longship: `<path d="M8 40 Q32 54 56 40 L54 44 Q32 56 10 44 Z" fill="WASH"/><path d="M56 40 Q62 30 56 25 Q53 29 57 32"/><path d="M8 40 Q2 31 8 27 Q11 31 7 33"/>
    <path d="M32 47 V11"/><path d="M19 13 H45 V33 H19 Z"/><path d="M25 13 V33 M32 13 V33 M39 13 V33"/>
    <circle cx="17" cy="43" r="1.5"/><circle cx="24" cy="45" r="1.5"/><circle cx="31" cy="46" r="1.5"/><circle cx="38" cy="45" r="1.5"/><circle cx="45" cy="43" r="1.5"/>
    <path d="M2 54 Q8 51 14 54 T26 54 T38 54 T50 54 T62 54"/>`,
  junk: `<path d="M6 41 L12 49 H52 L58 39 Z" fill="WASH"/><path d="M15 41 V14 M33 41 V8 M48 40 V18"/>
    <path d="M15 16 Q22 15 26 18 V38 H15 M33 10 Q40 9 44 12 V37 H33 M48 20 Q53 19 56 22 V37 H48"/>
    <path d="M15 24 H26 M15 31 H26 M33 18 H44 M33 26 H44 M48 27 H56"/><path d="M2 54 Q8 51 14 54 T26 54 T38 54 T50 54 T62 54"/>`,
  camel: `<path d="M12 34 Q16 20 25 28 Q31 16 39 28 Q43 31 46 29 L50 22 Q53 20 55 23 L52 27 L49 35 Q44 39 36 38 H18 Q13 38 12 34 Z" fill="WASH"/>
    <path d="M18 38 L16 52 M23 38 L24 52 M36 38 L34 52 M42 37 L44 52"/><path d="M12 34 Q8 36 9 42"/><circle cx="52.5" cy="23.5" r="0.7"/>
    <path d="M24 24 L21 14 L27 14 Z"/><path d="M3 53 Q20 50 34 53 T62 52" opacity=".6"/>`,
  canoe: `<path d="M30 42 Q18 22 24 7 Q34 21 45 13 Q38 30 34 42 Z" fill="WASH"/><path d="M32 42 L28 18"/>
    <path d="M6 46 Q32 52 58 46 M10 41 Q32 46 54 41"/><path d="M18 42 V47 M32 44 V49 M46 42 V47"/>
    <path d="M2 55 Q8 52 14 55 T26 55 T38 55 T50 55 T62 55"/>`,
  galleon: `<path d="M8 38 L14 49 H50 L58 36 L48 38 H17 Z" fill="WASH"/><path d="M48 38 V32 H58 V36"/>
    <path d="M24 38 V8 M38 38 V6"/><path d="M15 14 Q24 18 33 14 V28 Q24 32 15 28 Z M29 11 Q38 15 47 11 V27 Q38 31 29 27 Z"/>
    <path d="M38 6 L44 8 L38 10"/><path d="M14 42 H52" opacity=".6"/><path d="M2 54 Q8 51 14 54 T26 54 T38 54 T50 54 T62 54"/>`,
  balloon: `<path d="M32 5 Q13 5 15 23 Q17 33 26 40 H38 Q47 33 49 23 Q51 5 32 5 Z" fill="WASH"/>
    <path d="M32 5 V40 M23 8 Q20 24 27 40 M41 8 Q44 24 37 40"/><path d="M16 22 Q32 27 48 22"/>
    <path d="M26 40 L28 47 M38 40 L36 47"/><path d="M27 47 H37 V53 H27 Z"/>`,
  train: `<path d="M14 44 V32 H42 V44 Z M42 44 V24 H54 V44 Z" fill="WASH"/><path d="M18 32 L16 19 H26 L24 32"/>
    <path d="M14 44 L7 51 H14"/><circle cx="21" cy="47" r="5"/><circle cx="33" cy="47" r="5"/><circle cx="48" cy="46" r="6"/>
    <path d="M45 28 H51 V34 H45 Z"/><circle cx="19" cy="12" r="3.5"/><circle cx="12" cy="7" r="4.5"/><path d="M2 53 H62"/>`,
  steamship: `<path d="M3 39 H58 L54 49 H9 Z" fill="WASH"/><path d="M12 39 V33 H50 V39"/>
    <path d="M17 33 L19 21 H24 L23 33 M26 33 L28 21 H33 L32 33 M35 33 L37 21 H42 L41 33 M44 33 L46 21 H50 L49 33"/>
    <path d="M14 44 H15 M21 44 H22 M28 44 H29 M35 44 H36 M42 44 H43"/><path d="M2 55 Q8 52 14 55 T26 55 T38 55 T50 55 T62 55"/>`,
  biplane: `<path d="M8 25 H52 V29 H8 Z M8 37 H52 V41 H8 Z" fill="WASH"/><path d="M14 29 V37 M24 29 V37 M36 29 V37 M46 29 V37"/>
    <path d="M52 33 H60 M56 27 V39"/><path d="M2 31 H8 M4 28 V35"/><circle cx="31" cy="23" r="2.5"/><path d="M31 25.5 V29"/>`,
  airship: `<ellipse cx="32" cy="25" rx="26" ry="10" fill="WASH"/><path d="M14 18 Q12 25 14 32 M23 16 Q21 25 23 34 M32 15 V35 M41 16 Q43 25 41 34 M50 18 Q52 25 50 32"/>
    <path d="M55 21 L62 15 V35 L55 29"/><path d="M26 35 H38 V40 H26 Z"/>`,
  rocket: `<circle cx="27" cy="27" r="9" fill="WASH"/><path d="M33 33 L60 47 M31 35 L52 56 M35 30 L61 38 M28 36 L40 61"/><path d="M21 23 Q24 20 28 21"/>`,
  volcano: `<path d="M5 54 L23 26 H41 L59 54 Z" fill="WASH"/><path d="M23 26 Q32 30 41 26"/><path d="M29 28 L26 40 M35 28 L38 44"/>
    <circle cx="27" cy="18" r="5"/><circle cx="35" cy="14" r="6"/><circle cx="44" cy="9" r="5"/><circle cx="24" cy="9" r="3.5"/>`,
  elephant: `<path d="M12 40 Q11 22 30 21 Q43 20 46 30 Q52 29 54 38 Q55 49 51 50" fill="WASH"/><path d="M12 40 H44"/>
    <path d="M16 40 V52 M23 40 V52 M36 40 V52 M43 40 V51"/><path d="M36 26 Q31 31 35 37 Q40 38 41 31"/><path d="M47 37 Q44 42 39 41"/><circle cx="45" cy="29" r="0.8"/>
    <path d="M24 21 L22 14 H32 L30 21"/><path d="M4 54 L20 46 L30 52 L44 42 L60 52" opacity=".5"/>`,
  horse: `<path d="M14 36 H44 V26 Q45 17 51 15 L57 19 L52 25 V36 Z" fill="WASH"/><path d="M18 36 V47 M24 36 V47 M38 36 V47 M44 36 V47"/>
    <path d="M10 47 H50"/><circle cx="16" cy="51" r="3"/><circle cx="44" cy="51" r="3"/><path d="M14 30 H44 M20 26 V36 M30 26 V36"/><path d="M48 15 L46 10 M14 32 Q9 34 10 40"/><circle cx="53" cy="18" r="0.8"/>`,
  press: `<path d="M14 54 V10 H50 V54"/><path d="M14 16 H50"/><path d="M32 16 V30"/><path d="M20 24 H44"/>
    <path d="M22 30 H42 V36 H22 Z" fill="WASH"/><path d="M18 42 H46 V46 H18 Z"/><path d="M24 40 L40 40" opacity=".6"/><path d="M8 54 H56"/>`,
  dodo: `<path d="M14 42 Q10 25 27 24 Q33 17 42 19 Q51 21 49 29 Q46 33 42 31 Q44 40 36 45 Q24 50 14 42 Z" fill="WASH"/>
    <path d="M49 29 Q53 31 50 34"/><circle cx="43" cy="23" r="0.8"/><path d="M12 33 Q6 31 7 26 M12 36 Q6 37 5 33"/>
    <path d="M27 46 L25 54 M33 46 L35 54 M22 54 H28 M32 54 H38"/>`,
  footprints: `<ellipse cx="12" cy="50" rx="2.6" ry="4.5" fill="WASH"/><ellipse cx="20" cy="44" rx="2.6" ry="4.5" fill="WASH"/>
    <ellipse cx="26" cy="35" rx="2.6" ry="4.5" fill="WASH"/><ellipse cx="34" cy="30" rx="2.6" ry="4.5" fill="WASH"/>
    <ellipse cx="40" cy="21" rx="2.6" ry="4.5" fill="WASH"/><ellipse cx="48" cy="16" rx="2.6" ry="4.5" fill="WASH"/>
    <path d="M52 9 L58 4" opacity=".5"/>`,
  kraken: `<path d="M10 46 Q4 30 14 22 Q20 18 18 26 Q14 34 20 44"/><path d="M26 46 Q24 20 36 12 Q42 10 39 17 Q32 26 34 46" fill="WASH"/>
    <path d="M44 46 Q46 32 56 30 Q61 30 58 35 Q52 38 52 46"/>
    <circle cx="15" cy="30" r="1"/><circle cx="31" cy="24" r="1"/><circle cx="32" cy="32" r="1"/><circle cx="51" cy="36" r="1"/>
    <path d="M2 50 Q8 47 14 50 T26 50 T38 50 T50 50 T62 50"/>`,

  // --- Nature in history --------------------------------------------------------
  wheat: `<path d="M22 54 Q24 36 27 21 M32 54 V17 M42 54 Q40 36 37 21"/>
    <path d="M32 17 Q28 12 30 6 Q34 10 32 17 Z M32 23 Q27 20 28 14 Q31 17 32 23 Z M32 23 Q37 20 36 14 Q33 17 32 23 Z M32 29 Q27 26 28 20 Q31 23 32 29 Z M32 29 Q37 26 36 20 Q33 23 32 29 Z" fill="WASH"/>
    <path d="M27 21 Q23 17 25 11 Q29 15 27 21 Z M37 21 Q41 17 39 11 Q35 15 37 21 Z" fill="WASH"/>
    <path d="M32 42 Q24 38 20 32 M32 38 Q40 34 44 30"/><path d="M10 54 H54"/>`,
  rice: `<path d="M16 50 Q20 30 30 20 Q38 16 41 26 M30 50 Q33 32 43 24 Q51 20 52 30 M44 50 Q44 38 50 32"/>
    <ellipse cx="41" cy="27" rx="1.6" ry="2.4" fill="WASH"/><ellipse cx="40" cy="31" rx="1.6" ry="2.4" fill="WASH"/><ellipse cx="38" cy="34.5" rx="1.6" ry="2.4" fill="WASH"/>
    <ellipse cx="52" cy="31" rx="1.6" ry="2.4" fill="WASH"/><ellipse cx="51" cy="35" rx="1.6" ry="2.4" fill="WASH"/><ellipse cx="49.5" cy="38.5" rx="1.6" ry="2.4" fill="WASH"/>
    <path d="M20 40 Q14 36 10 38 M34 40 Q28 34 24 36"/><path d="M2 50 H62 M6 55 H20 M28 55 H44 M50 55 H60" opacity=".7"/>`,
  maize: `<path d="M32 10 Q42 18 40 40 Q32 46 24 40 Q22 18 32 10 Z" fill="WASH"/>
    <path d="M27 20 H37 M25 26 H39 M25 32 H39 M26 38 H38 M32 12 V44 M28 14 V42 M36 14 V42" opacity=".7"/>
    <path d="M24 40 Q14 36 11 21 Q20 30 26 32 M40 40 Q50 36 53 21 Q44 30 38 32"/><path d="M32 44 V56"/><path d="M32 10 Q30 5 33 2"/>`,
  hippo: `<path d="M8 41 Q7 27 23 26 Q34 24 44 28 Q55 28 57 36 Q57 42 50 42 H14 Q9 42 8 41 Z" fill="WASH"/>
    <path d="M14 42 V47 M21 42 V47 M43 42 V47 M50 42 V47"/><path d="M46 27 L47 23 L50 27"/><circle cx="50" cy="31" r="0.8"/><circle cx="55.5" cy="35" r="0.6"/>
    <path d="M2 46 Q8 43 14 46 T26 46 T38 46 T50 46 T62 46"/><path d="M4 46 V34 M7 46 V31 M10 46 V36"/>`,
  tree: `<path d="M27 56 Q23 44 29 36 Q33 30 27 22 M35 56 Q39 46 35 38 Q32 32 38 24"/>
    <path d="M29 36 Q20 32 14 34 M34 32 Q44 28 50 30 M27 22 Q23 16 18 16 M38 24 Q42 18 48 16"/>
    <path d="M9 34 Q7 28 13 27 Q17 24 21 28 Q23 33 17 35 Z M44 30 Q44 24 50 24 Q56 25 55 31 Q52 34 46 33 Z M13 18 Q11 12 17 11 Q23 10 23 16 Q21 20 15 20 Z M44 18 Q44 12 50 12 Q55 13 54 18 Q51 21 46 20 Z" fill="WASH"/>
    <path d="M6 56 H58"/><path d="M12 56 Q15 52 19 56 M44 56 Q48 51 52 56"/>`,
  bull: `<path d="M10 38 Q10 24 26 24 H44 Q52 22 54 30 L58 36 Q56 40 52 38 L48 38 Q44 40 40 40 H16 Q11 40 10 38 Z" fill="WASH"/>
    <path d="M16 40 V52 M22 40 V52 M40 40 V52 M46 39 V52"/><path d="M50 25 Q47 16 55 12 M53 26 Q58 19 62 21"/>
    <path d="M10 30 Q5 34 6 42"/><circle cx="52" cy="29" r="0.8"/><path d="M4 53 H60" opacity=".5"/>`,
  moa: `<path d="M17 31 Q17 20 29 20 Q40 22 40 30 Q38 38 28 38 Q20 38 17 31 Z" fill="WASH"/>
    <path d="M36 22 Q40 12 44 8"/><path d="M44 8 Q48 5 51 9 L46 11"/><circle cx="46" cy="8" r="0.7"/>
    <path d="M26 38 L24 54 M32 38 L34 54 M20 54 H27 M31 54 H38"/><path d="M22 26 Q28 24 34 28 M20 31 Q27 29 33 33" opacity=".6"/>`,
  potato: `<path d="M32 30 V8"/><path d="M32 16 Q24 10 20 14 Q24 18 32 18 M32 12 Q40 6 44 10 Q40 14 32 14 M32 23 Q42 19 46 23 Q42 27 32 25" fill="WASH"/>
    <path d="M4 32 H60"/><path d="M32 32 Q26 38 20 42 M32 32 Q38 40 42 46 M32 32 V43"/>
    <ellipse cx="17" cy="45" rx="6" ry="4.5" fill="WASH"/><ellipse cx="44" cy="49" rx="6.5" ry="4.5" fill="WASH"/><ellipse cx="31" cy="48" rx="5" ry="4" fill="WASH"/>
    <circle cx="15" cy="44" r="0.6"/><circle cx="46" cy="48" r="0.6"/>`,
  tulip: `<path d="M32 56 Q30 40 32 31"/><path d="M31 50 Q20 44 18 30 Q26 38 31 44 M33 46 Q44 42 46 28 Q38 36 33 40"/>
    <path d="M24 14 Q24 30 32 32 Q40 30 40 14 L36 18 L32 10 L28 18 Z" fill="WASH"/>
    <circle cx="51" cy="12" r="5"/><path d="M50 9 Q52 8 52 10 V15 M49 12 H53"/>`,
  frost: `<path d="M8 40 L14 30 L20 40 Z M44 40 L50 30 L56 40 Z" fill="WASH"/><path d="M14 30 V27 L17 28 L14 29 M50 30 V27 L53 28 L50 29"/>
    <circle cx="32" cy="20" r="3.5"/><path d="M29 16 H35 M30 16 V12 H34 V16"/><path d="M32 23.5 L30 34 M31 27 L24 24 M31 27 L38 30 M30 34 L25 42 M30 34 L37 41"/>
    <path d="M22 43 H28 M35 42 H41"/><path d="M2 46 H62"/><path d="M10 50 L16 48 M40 52 L48 49" opacity=".6"/>
    <path d="M52 6 V16 M47.5 8.5 L56.5 13.5 M47.5 13.5 L56.5 8.5"/>`,
  bird: `<path d="M12 34 Q20 24 34 26 Q42 22 48 24 Q52 26 50 29 L46 30 Q42 36 32 38 Q22 40 12 34 Z" fill="WASH"/>
    <path d="M12 34 L2 40 M14 36 L4 44"/><path d="M24 30 Q32 26 40 30"/><circle cx="47" cy="26" r="0.8"/><path d="M50 27 L54 27.5"/>
    <path d="M8 46 H56 M30 38 V46 M34 38 V46"/><path d="M14 12 l3 2 l3 -2 M26 8 l3 2 l3 -2 M40 12 l3 2 l3 -2 M50 6 l3 2 l3 -2 M33 16 l2 1.5 l2 -1.5"/>`,
  dust: `<path d="M2 54 V20 Q8 10 18 16 Q24 6 34 14 Q40 10 44 18 Q48 24 44 30 Q52 34 48 42 Q54 46 50 54 Z" fill="WASH"/>
    <path d="M10 26 Q16 22 20 28 M22 20 Q28 16 32 22 M14 38 Q22 34 28 40 M30 32 Q36 28 40 34 M20 48 Q28 44 34 50" opacity=".7"/>
    <path d="M50 54 V44 L55 39 L60 44 V54"/><path d="M53 54 V49 H57 V54"/><path d="M2 54 H62"/>`,
  thylacine: `<path d="M10 36 Q12 26 24 26 H42 Q48 22 52 24 L58 28 L54 32 L50 32 Q48 38 42 38 H16 Q11 38 10 36 Z" fill="WASH"/>
    <path d="M16 38 V50 M22 38 V50 M38 38 V50 M44 37 V50"/><path d="M10 32 L2 30"/><path d="M27 26 V32 M31 26 V33 M35 26 V32 M39 26 V31"/>
    <path d="M50 24 L52 19 L54 25"/><circle cx="53" cy="26.5" r="0.7"/><path d="M4 51 H60" opacity=".5"/>`,
  wolf: `<path d="M46 54 V36 H60 V54 Z" opacity=".55"/><path d="M52 36 V18 H57 V36 M52 24 H57 M52 30 H57" opacity=".55"/>
    <path d="M14 54 Q12 40 18 32 Q20 24 24 18 L26 9 L29 15 L33 13 L32 21 Q34 30 32 40 Q36 48 34 54 Z" fill="WASH"/>
    <path d="M26 9 L34 3 M29 12 L35 7"/><path d="M14 54 Q6 52 6 44"/><circle cx="28" cy="15" r="0.7"/><path d="M2 54 H62"/>`,

  // A Roman aqueduct bridge (the Pont du Gard): three tiers of arches, the small arcade carrying the water channel on top.
  aqueduct: `<path d="M2 56 V40 H62 V56 Z ${[5, 19, 33, 47].map((x) => `M${x} 56 V46.5 A6 6 0 0 1 ${x + 12} 46.5 V56 Z`).join(" ")}" fill="WASH" fill-rule="evenodd"/>
    <path d="M2 40 V27 H62 V40 Z ${[5.5, 19.5, 33.5, 47.5].map((x) => `M${x} 40 V33 A5.5 5.5 0 0 1 ${x + 11} 33 V40 Z`).join(" ")}" fill="WASH" fill-rule="evenodd"/>
    <path d="M2 27 V18 H62 V27 Z ${times(12, (i) => `M${3.6 + i * 5} 27 V22.6 A1.7 1.7 0 0 1 ${7 + i * 5} 22.6 V27 Z`)}" fill="WASH" fill-rule="evenodd"/>
    <path d="M2 16.4 H62 V18 H2 Z" fill="WASH"/>
    ${[5, 19, 33, 47].map((x) => `<path d="M${x - 1.2} 46.5 A7.2 7.2 0 0 1 ${x + 13.2} 46.5" opacity=".35"/>`).join("")}
    <path d="M2 59 Q8 57.6 14 59 T26 59 T38 59 T50 59 T62 59" opacity=".45"/>`,
  geoglyph: `<path d="M32 30 L30 10 L33 22 L34 10 L35 30" /><path d="M32 30 Q20 24 8 28 Q20 30 26 34 M34 30 Q46 22 58 26 Q46 30 40 34"/>
    <path d="M28 34 Q32 46 32 58 M36 34 Q33 46 33 58"/><path d="M32 30 Q36 36 32 40 Q28 36 32 30 Z" fill="WASH"/><path d="M4 60 H60" opacity=".4"/>`,
  easel: `<path d="M20 56 L30 8 L40 56 M30 8 V56"/><path d="M16 14 H46 V40 H16 Z" fill="WASH"/>
    <path d="M26 22 Q31 18 36 22 Q37 30 31 32 Q25 30 26 22 Z"/><path d="M22 40 Q31 34 40 40"/><path d="M50 30 L58 22 M56 20 L60 24"/>`,
  telescope: `<path d="M12 36 L44 14 L48 20 L16 42 Z" fill="WASH"/><path d="M44 14 L50 10 L54 16 L48 20"/><path d="M12 36 L8 38 L11 43 L16 42"/>
    <path d="M30 28 L24 56 M30 28 L36 56 M30 28 V56"/><circle cx="54" cy="44" r="5"/><circle cx="54" cy="44" r="1"/><circle cx="46" cy="40" r="0.8"/><circle cx="60" cy="38" r="0.8"/>`,
  coffee: `<path d="M18 22 H42 L40 50 Q30 54 20 50 Z" fill="WASH"/><path d="M42 26 Q52 26 50 36 Q48 42 40 42"/><path d="M14 22 H46"/>
    <path d="M30 22 V16 Q30 12 34 12"/><path d="M24 10 Q22 6 25 3 M30 9 Q28 5 31 2 M36 10 Q34 6 37 3" opacity=".6"/><path d="M12 54 H48"/>`,
  pickaxe: `<path d="M12 18 Q32 8 52 18 Q32 14 12 18 Z" fill="WASH"/><path d="M32 14 L22 56"/><path d="M42 26 L52 56 M46 24 L38 24 L40 30 L48 30 Z"/>
    <path d="M8 56 H58"/><circle cx="16" cy="52" r="1.4" fill="WASH"/><circle cx="44" cy="52" r="1.2" fill="WASH"/>`,
  flask: `<path d="M26 8 H38 M28 8 V24 L14 50 Q12 56 18 56 H46 Q52 56 50 50 L36 24 V8"/><path d="M20 42 H44 L48 50 Q49 54 46 54 H18 Q15 54 16 50 Z" fill="WASH"/>
    <circle cx="28" cy="48" r="2"/><circle cx="36" cy="46" r="1.5"/><path d="M46 14 Q52 12 54 18" opacity=".6"/>`,
  // A suspension bridge (the Golden Gate): tall portal towers, the main cable swinging between them, the deck on its suspenders.
  bridge: `${[15, 49].map((x) => `<path d="M${x - 2.6} 54 V9 H${x + 2.6} V54 Z" fill="WASH"/><path d="M${x - 2.6} 15 H${x + 2.6} M${x - 2.6} 22 H${x + 2.6} M${x - 2.6} 29 H${x + 2.6} M${x} 9.4 V53" opacity=".45"/>`).join("")}
    <path d="M2 31 Q8 21 15 10 Q32 41 49 10 Q56 21 62 31"/>
    ${times(15, (i) => { const t = (i + 1) / 16; const x = 15 + 34 * t; const y = (1 - t) ** 2 * 10 + 2 * t * (1 - t) * 41 + t * t * 10; return `<path d="M${r1(x)} ${r1(y)} V37.5" opacity=".45"/>`; })}
    ${[4, 7, 10, 54, 57, 60].map((x) => `<path d="M${x} ${x < 32 ? r1(31 - (x - 2) * 1.6) : r1(31 - (62 - x) * 1.6)} V37.5" opacity=".45"/>`).join("")}
    <path d="M2 37.5 H62 V40.2 H2 Z" fill="WASH"/>${times(20, (i) => `<path d="M${3 + i * 3} 40.2 l1.5 1.6 l1.5 -1.6" opacity=".35"/>`)}
    <path d="M2 57 Q8 55.6 14 57 T26 57 T38 57 T50 57 T62 57" opacity=".4"/>`,

  // --- Culture of places ------------------------------------------------------------------
  derrick: `<path d="M22 56 L30 8 H34 L42 56 Z" fill="WASH"/><path d="M24 44 H40 M26 32 H38 M28 20 H36 M24 44 L38 32 M40 44 L26 32 M26 32 L36 20 M38 32 L28 20"/>
    <path d="M32 8 V3"/><path d="M14 56 H50"/><path d="M33 3 Q40 -2 44 4 Q48 0 50 6" opacity=".6"/>`,
  trumpet: `<path d="M8 30 H40 Q52 22 58 18 V42 Q52 38 40 30" fill="WASH"/><path d="M8 27 V33"/><path d="M20 30 V22 H32 V30 M24 22 V18 M28 22 V18"/>
    <path d="M16 36 Q24 40 34 36"/><path d="M46 46 L48 50 M52 44 L56 48 M42 50 L43 54" opacity=".6"/>`,
  filmcamera: `<path d="M12 28 H44 V48 H12 Z" fill="WASH"/><circle cx="20" cy="18" r="8"/><circle cx="38" cy="18" r="8"/><circle cx="20" cy="18" r="2"/><circle cx="38" cy="18" r="2"/>
    <path d="M44 34 L56 28 V48 L44 42"/><path d="M22 48 L16 58 M28 48 V58 M34 48 L40 58"/>`,
  launch: `<path d="M28 44 V16 Q32 4 36 16 V44 Z" fill="WASH"/><path d="M28 34 L22 44 H28 M36 34 L42 44 H36"/><path d="M28 24 H36"/>
    <path d="M26 46 Q24 54 20 58 M32 46 V60 M38 46 Q40 54 44 58" opacity=".7"/><circle cx="14" cy="56" r="4"/><circle cx="50" cy="56" r="4"/>`,
  car: `<path d="M8 40 V32 H20 L24 20 H40 L44 32 H56 V40 Z" fill="WASH"/><path d="M26 22 V32 M38 22 V32 M24 20 H40"/><circle cx="18" cy="42" r="6"/><circle cx="46" cy="42" r="6"/>
    <circle cx="18" cy="42" r="1.5"/><circle cx="46" cy="42" r="1.5"/><path d="M4 50 H60" opacity=".5"/>`,
  guitar: `<path d="M24 34 Q14 36 14 46 Q16 56 26 56 Q34 56 36 50 Q42 48 42 42 Q42 34 34 34 Q32 30 28 32 Z" fill="WASH"/><circle cx="28" cy="46" r="3.5"/>
    <path d="M32 36 L52 10 M50 8 L56 12 L54 14"/><path d="M22 52 H32" />`,
  // A Dutch smock mill: the thatched octagonal body, the stage, the cap, four latticed sails.
  windmill: `<path d="M23 56 L26.5 26 H37.5 L41 56 Z" fill="WASH"/><path d="M28.8 55 L30.4 27 M35.2 55 L33.6 27" opacity=".35"/>
    <path d="M18 40 H46 V42 H18 Z" fill="WASH"/><path d="M19.5 42 L21.5 47 M44.5 42 L42.5 47" opacity=".6"/>
    <path d="M25.5 26 Q32 19.5 38.5 26 Z" fill="WASH"/><circle cx="32" cy="24.5" r="1.4"/>
    ${[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([dx, dy]) => { const ex = 32 + dx * 20, ey = 24.5 + dy * 18; const px = -dy * 0.6, py = dx * 0.6; return `<path d="M32 24.5 L${ex} ${ey}"/><path d="M${r1(32 + dx * 4 + px * 4)} ${r1(24.5 + dy * 3.6 + py * 4)} L${r1(ex + px * 4)} ${r1(ey + py * 4)} L${ex} ${ey}" fill="WASH" opacity=".9"/>${times(4, (k) => { const t = 0.35 + k * 0.17; return `<path d="M${r1(32 + dx * 20 * t)} ${r1(24.5 + dy * 18 * t)} l${r1(px * 4)} ${r1(py * 4)}" opacity=".5"/>`; })}`; }).join("")}
    <path d="M30 56 V50 Q32 48 34 50 V56"/><path d="M4 56 H60"/>`,
  // The floating torii of Itsukushima: the curved kasagi, the tie beam, the posts standing in the sea.
  torii: `<path d="M4 13.5 Q32 19.5 60 13.5 L58.2 18.4 Q32 22.6 5.8 18.4 Z" fill="WASH"/><path d="M8.5 20.6 H55.5 V23 H8.5 Z" fill="WASH"/>
    <path d="M10 28 H54 V30.6 H10 Z" fill="WASH"/><path d="M30.6 23 V28 H33.4 V23" />
    <path d="M16.6 23 L15.6 55 H19.6 L18.6 23 Z M45.4 23 L44.4 55 H48.4 L47.4 23 Z" fill="WASH"/>
    <path d="M14.6 55 H20.6 M43.4 55 H49.4"/><path d="M2 56.5 Q10 55 18 56.5 T34 56.5 T50 56.5 T62 56.5 M8 60 Q16 58.6 24 60 T40 60 T56 60" opacity=".45"/>`,
  vase: `<path d="M26 8 H38 V14 Q38 18 44 24 Q52 34 46 46 Q42 54 32 56 Q22 54 18 46 Q12 34 20 24 Q26 18 26 14 Z" fill="WASH"/>
    <path d="M22 30 Q32 26 42 30 M20 40 Q32 44 44 40"/><path d="M28 34 Q32 30 36 34 Q32 38 28 34" /><path d="M24 56 H40"/>`,
  beaver: `<path d="M12 40 Q10 28 24 26 Q36 24 44 30 Q50 30 52 36 Q52 42 46 42 H16 Q12 42 12 40 Z" fill="WASH"/><path d="M12 38 Q2 40 4 48 Q8 52 14 44"/>
    <path d="M48 32 L49 29"/><circle cx="48" cy="34" r="0.8"/><path d="M50 40 V43 M18 42 V46 M24 42 V46 M40 42 V46"/><path d="M2 50 Q10 47 18 50 T34 50 T50 50 T62 50" opacity=".6"/>`,
  bell: `<path d="M20 44 Q20 24 32 20 Q44 24 44 44 Z" fill="WASH"/><path d="M16 44 H48 V48 H16 Z"/><path d="M32 20 V14 M26 14 H38"/><circle cx="32" cy="52" r="3"/>
    <path d="M34 26 L32 32 L35 36 L33 42"/>`,
  cow: `<path d="M10 38 Q10 26 22 26 H44 Q50 22 54 28 L56 34 L52 36 Q50 40 44 40 H16 Q10 40 10 38 Z" fill="WASH"/><path d="M16 40 V52 M22 40 V52 M40 40 V52 M45 40 V52"/>
    <path d="M50 24 L48 20 M54 25 L57 22"/><path d="M24 30 Q28 26 32 30 Q28 34 24 30 M36 32 Q39 29 42 33" /><path d="M10 32 Q5 36 7 42"/><path d="M30 40 Q30 44 33 44" />`,
  cowboy: `<path d="M10 38 Q12 30 22 30 H36 Q40 24 46 22 L50 26 L44 32 Q42 38 36 40 H14 Q10 40 10 38 Z" fill="WASH"/><path d="M15 40 L10 52 M20 40 L22 52 M34 40 L30 52 M38 39 L44 50"/>
    <path d="M20 10 Q28 6 36 10 M22 10 Q28 2 34 10"/><circle cx="28" cy="14" r="3.5"/><path d="M28 18 L27 30 M27 22 L38 18 Q44 14 42 24 Q40 30 46 32"/><path d="M10 34 Q4 34 3 42"/>`,

  // Farmland: a patchwork of furrowed plots, laid around villages.
  fields: `<path d="M4 40 L22 30 L40 36 L22 48 Z M24 29 L44 20 L60 27 L42 35 Z M42 37 L60 29 L62 40 L46 48 Z" fill="WASH"/>
    <path d="M8 40 L24 32 M12 42 L28 34 M16 44 L32 37 M28 27 L46 23 M32 29 L50 25 M36 31 L54 27 M46 40 L60 33 M48 43 L61 37" opacity=".6"/>`,

  // A city on an old map: a small ring with a dot, drawn by hand.
  city: `<circle cx="32" cy="32" r="14" fill="WASH"/><circle cx="32" cy="32" r="4.5"/>`,
  "city-ruin": `<circle cx="32" cy="32" r="14" stroke-dasharray="5 4"/><path d="M26 34 V28 M32 36 V26 M38 34 V29" />`,

  // --- Scenery: the land ----------------------------------------------------------
  peak: `<path d="M8 50 L30 16 L52 50" fill="WASH"/><path d="M23 27 L30 31 L36 25"/><path d="M36 30 L41 37 M38 38 L44 46 M42 32 L46 40" opacity=".6"/>`,
  peaks: `<path d="M3 52 L18 28 L28 42 L40 18 L61 52 Z" fill="WASH"/><path d="M14 34 L18 37 L21 33 M35 26 L40 30 L44 25"/><path d="M45 32 L50 40 M48 42 L53 50 M24 40 L27 46" opacity=".6"/>`,
  // A crescent dune: windward slope washed, slip face hatched.
  dune: `<path d="M4 46 Q18 30 38 33 Q52 35 60 46 Q46 40 33 42 Q18 44 4 46 Z" fill="WASH"/><path d="M38 33 Q35 39 33 42"/>
    <path d="M40 36 L44 42 M45 37 L49 43 M50 39 L53 44" opacity=".55"/><path d="M10 52 Q30 47 54 52" opacity=".4"/>`,
  cactus: `<path d="M28 54 V17 Q28 11 32 11 Q36 11 36 17 V54 Z" fill="WASH"/><path d="M28 34 H23 Q19 34 19 30 V23 M36 28 H41 Q45 28 45 24 V18"/><path d="M32 16 V50" opacity=".5"/><path d="M12 54 H52"/>`,
  palm: `<path d="M30 56 Q27 40 34 22"/><path d="M34 22 Q23 15 14 23 M34 22 Q29 11 20 9 M34 22 Q41 11 50 12 M34 22 Q47 18 53 27 M34 22 Q37 31 31 35" fill="none"/>
    <circle cx="33" cy="25" r="2" fill="WASH"/><circle cx="37" cy="24" r="2" fill="WASH"/><path d="M18 56 H46"/>`,
  jungle: `<path d="M16 54 Q11 33 24 25 Q31 38 22 54 Z M32 54 Q29 29 42 19 Q49 34 38 54 Z M44 54 Q46 37 57 33 Q59 46 50 54 Z" fill="WASH"/>
    <path d="M20 52 Q20 38 24 28 M35 52 Q37 34 42 22 M48 52 Q51 42 56 35" opacity=".6"/><path d="M6 54 H60"/>`,
  pine: `<path d="M22 12 L12 30 H17 L9 44 H35 L27 30 H32 Z M44 22 L37 34 H40 L34 46 H54 L48 34 H51 Z" fill="WASH"/><path d="M22 44 V54 M44 46 V54"/><path d="M6 54 H60"/>`,
  oak: `<path d="M19 34 Q13 26 21 20 Q23 10 33 12 Q43 8 46 18 Q54 22 50 32 Q50 40 40 38 Q32 42 26 38 Q18 40 19 34 Z" fill="WASH"/>
    <path d="M32 38 V54 M32 46 L26 42 M32 44 L38 40"/><path d="M14 54 H50"/>`,
  grass: `<path d="M14 50 Q10 44 6 41 M14 50 Q13 42 14 35 M14 50 Q17 43 22 39 M40 52 Q36 46 31 44 M40 52 Q40 44 41 37 M40 52 Q43 45 49 42 M54 50 Q52 46 50 44 M54 50 Q56 45 59 43"/><path d="M4 52 H60" opacity=".35"/>`,
  bison: `<path d="M10 40 Q10 22 26 22 Q32 15 40 22 Q48 22 52 30 Q56 32 54 38 L50 40 H14 Q10 40 10 40 Z" fill="WASH"/>
    <path d="M16 40 V50 M22 40 V50 M42 40 V50 M48 40 V50"/><path d="M52 30 Q55 26 53 24"/><path d="M50 38 Q50 44 47 45"/><path d="M28 26 L30 32 M34 24 L36 31" opacity=".6"/>`,
  caribou: `<path d="M14 36 Q14 28 24 28 H40 Q44 24 46 22 L50 26 L46 30 Q46 36 40 38 H18 Q14 38 14 36 Z" fill="WASH"/>
    <path d="M18 38 V52 M23 38 V52 M37 38 V52 M42 38 V52"/><path d="M46 22 L44 12 M44 16 L40 12 M46 22 L52 12 M50 15 L54 12"/>`,
  giraffe: `<path d="M18 37 Q18 30 26 30 H37 Q42 30 42 34 V38 H18 Z" fill="WASH"/><path d="M38 31 L46 10 M46 10 L52 12 L48 14 M44 9 L45 6"/>
    <path d="M20 38 V54 M25 38 V54 M36 38 V54 M41 38 V54"/><circle cx="25" cy="33" r="1.3"/><circle cx="32" cy="34" r="1.3"/><circle cx="42" cy="22" r="1"/><circle cx="44" cy="15" r="1"/>`,
  kangaroo: `<path d="M20 50 Q14 40 20 30 Q24 20 32 18 L36 10 L38 18 Q42 22 40 30 Q44 40 40 48 Z" fill="WASH"/>
    <path d="M40 48 L52 52 M30 50 H40"/><path d="M20 46 Q10 52 4 54"/><path d="M36 26 L44 28" /><circle cx="35" cy="17" r="0.7"/>`,
  penguin: `<path d="M24 54 Q18 40 24 26 Q30 16 36 26 Q42 40 36 54 Z" fill="WASH"/><path d="M27 30 Q30 46 30 52 M33 30 Q30 46 30 52" opacity=".5"/>
    <path d="M33 22 L38 24 L33 25"/><path d="M22 34 L16 42 M38 34 L44 42"/><path d="M24 54 H36"/>`,
  polarbear: `<path d="M8 42 Q8 30 22 30 H42 Q50 28 54 34 L58 38 L54 40 Q48 42 44 42 H12 Z" fill="WASH"/>
    <path d="M14 42 V50 M21 42 V50 M40 42 V50 M47 42 V50"/><path d="M48 30 L49 27 L51 30"/><circle cx="53" cy="34" r="0.7"/><path d="M2 52 H62 M10 55 L20 52 M40 55 L50 52" opacity=".6"/>`,
  wildhorse: `<path d="M12 34 Q14 26 24 26 H38 Q42 20 48 18 L52 22 L46 28 Q44 34 38 36 H16 Q12 36 12 34 Z" fill="WASH"/>
    <path d="M17 36 L12 48 M22 36 L24 48 M36 36 L32 48 M40 35 L46 46"/><path d="M12 30 Q6 30 5 38"/><path d="M42 22 L40 30" opacity=".6"/>`,

  // --- Scenery: people at work ---------------------------------------------------
  hunter: `<circle cx="24" cy="14" r="4"/><path d="M24 18 L22 36 L16 50 M22 36 L28 50"/><path d="M23 24 L14 30 M23 24 L36 18"/><path d="M14 34 L48 6" />
    <path d="M44 9 L50 4 L47 11"/><path d="M40 46 Q44 40 50 42 Q54 44 52 48 Z" fill="WASH"/><path d="M50 42 L52 38 M48 42 L48 38"/>`,
  herder: `<circle cx="14" cy="14" r="4"/><path d="M14 18 L13 36 L9 50 M13 36 L18 50 M14 24 L20 28"/><path d="M20 50 V22 Q20 16 25 17 Q28 19 25 22"/>
    <path d="M28 42 Q26 33 34 33 Q38 29 43 33 Q50 33 48 42 Z M44 46 Q43 40 49 40 Q52 37 56 40 Q60 41 58 46 Z" fill="WASH"/>
    <path d="M31 42 V48 M45 42 V48 M47 46 V51 M56 46 V51"/><path d="M48 36 L52 34" />`,
  farmer: `<path d="M30 38 Q30 28 40 28 H52 Q57 28 58 34 L60 38 L56 40 H34 Q30 40 30 38 Z" fill="WASH"/><path d="M34 40 V50 M40 40 V50 M50 40 V50 M55 40 V50"/>
    <path d="M56 28 L58 24 M56 28 L60 26"/><path d="M30 34 L18 40 L14 48"/><circle cx="10" cy="22" r="3.5"/><path d="M10 26 L11 38 L7 50 M11 38 L15 50 M11 30 L18 38"/>
    <path d="M2 52 H62 M4 56 H24 M30 56 H60" opacity=".6"/>`,
  fisher: `<path d="M8 42 Q32 50 56 42 L52 46 Q32 52 12 46 Z" fill="WASH"/><circle cx="26" cy="28" r="3.5"/><path d="M26 31.5 L27 42 M27 35 L40 26"/>
    <path d="M40 26 L52 14 M52 14 Q56 30 54 52"/><path d="M48 54 Q52 50 56 54 Q52 58 48 54 Z"/><path d="M2 52 Q8 49 14 52 T26 52 T38 52" opacity=".6"/>`,
  rider: `<path d="M10 38 Q12 30 22 30 H36 Q40 24 46 22 L50 26 L44 32 Q42 38 36 40 H14 Q10 40 10 38 Z" fill="WASH"/>
    <path d="M15 40 L10 52 M20 40 L22 52 M34 40 L30 52 M38 39 L44 50"/><circle cx="28" cy="14" r="3.5"/><path d="M28 18 L28 30 M28 22 L38 18"/>
    <path d="M38 10 Q46 18 38 28"/><path d="M10 34 Q4 34 3 42"/>`,

  // --- Scenery: towns, by region and era ---------------------------------------------
  "town-ancient": `<path d="M18 30 L32 21 L46 30 Z" fill="WASH"/><path d="M20 30 V44 M26 30 V44 M32 30 V44 M38 30 V44 M44 30 V44 M17 44 H47"/>
    <path d="M4 50 H60 M4 50 V42 H8 V50 M56 50 V42 H60 V50"/><path d="M8 50 V46 H14 V50 M50 50 V46 H56 V50"/>`,
  "town-europe": `<path d="M30 50 V24 L34 10 L38 24 V50" fill="WASH"/><path d="M10 50 V38 L16 32 L22 38 V50 M42 50 V36 L48 30 L54 36 V50 M22 50 V42 L26 38 L30 42"/>
    <path d="M2 50 H62"/><path d="M34 30 V34"/><path d="M14 44 H18 M46 42 H50"/>`,
  "town-islamic": `<path d="M18 38 Q30 18 42 38 Z" fill="WASH"/><path d="M14 38 H46 V50 H14"/><path d="M50 50 V20 M53 50 V20 M50 20 L51.5 14 L53 20"/>
    <path d="M6 50 V42 Q9 38 12 42 V50"/><path d="M30 24 V20"/><path d="M26 50 V45 Q30 41 34 45 V50"/><path d="M2 50 H62"/>`,
  "town-eastasia": `<path d="M14 30 Q32 24 50 30 M14 30 L12 27 M50 30 L52 27" /><path d="M18 30 V40 H46 V30" fill="WASH"/><path d="M10 40 Q32 35 54 40"/>
    <path d="M4 50 V42 H60 V50"/><path d="M28 50 V44 Q32 40 36 44 V50"/><path d="M6 44 V42 M12 44 V42 M52 44 V42 M58 44 V42"/><path d="M2 50 H62"/>`,
  "town-southasia": `<path d="M24 48 V30 Q24 14 32 8 Q40 14 40 30 V48 Z" fill="WASH"/><path d="M26 24 H38 M25 32 H39 M25 40 H39" opacity=".6"/><path d="M32 8 V3 L37 5 L32 7"/>
    <path d="M8 48 V38 L14 34 L20 38 V48 M44 48 V40 L50 36 L56 40 V48"/><path d="M2 48 H62"/>`,
  "town-americas": `<path d="M18 50 V44 H46 V50 M22 44 V38 H42 V44 M26 38 V32 H38 V38" fill="WASH"/><path d="M28 32 V26 H36 V32"/><path d="M30 50 V32 M34 50 V32"/>
    <path d="M4 50 V44 L9 38 L14 44 V50 M50 50 V44 L55 38 L60 44 V50"/><path d="M2 50 H62"/>`,
  "town-africa": `<path d="M20 50 V30 H44 V50" fill="WASH"/><path d="M24 30 V22 Q27 18 30 22 V30 M36 30 V24 Q39 20 42 24 V30"/><path d="M18 36 H22 M42 36 H46 M18 42 H22 M42 42 H46"/>
    <path d="M4 50 V42 M4 42 L9 34 L14 42 V50 M50 50 V42 M50 42 L55 34 L60 42 V50"/><path d="M2 50 H62"/>`,
  "town-steppe": `<path d="M8 50 V40 Q8 32 18 30 Q28 32 28 40 V50 Z M34 50 V42 Q34 36 42 34 Q50 36 50 42 V50 Z" fill="WASH"/>
    <path d="M18 30 V26 M42 34 V31 M8 40 H28 M34 42 H50"/><path d="M15 50 V44 H21 V50"/><path d="M54 50 V36 L58 38 L54 40"/><path d="M2 50 H62"/>`,
  "town-industrial": `<path d="M8 50 V34 L16 28 V34 L24 28 V34 L32 28 V50 Z" fill="WASH"/><path d="M38 50 V18 H43 V50 M48 50 V24 H52 V50"/>
    <circle cx="40" cy="12" r="3.5"/><circle cx="46" cy="7" r="4.5"/><circle cx="50" cy="18" r="3"/><path d="M12 42 H14 M20 42 H22 M26 42 H28"/><path d="M2 50 H62"/>`,
  "town-metro": `<path d="M8 50 V28 H16 V50 M18 50 V16 H26 V50 M28 50 V8 H34 V50 M36 50 V22 H44 V50 M46 50 V30 H56 V50" fill="WASH"/>
    <path d="M31 8 V2"/><path d="M21 22 H23 M21 30 H23 M21 38 H23 M39 28 H41 M39 36 H41 M11 34 H13 M11 42 H13 M50 36 H52"/><path d="M2 50 H62"/>`,

  // --- Scenery: the sea and sky ---------------------------------------------------
  waves: `<path d="M6 30 Q12 24 18 30 T30 30 M28 40 Q34 34 40 40 T52 40"/>`,
  whale: `<path d="M6 38 Q10 26 28 26 Q44 26 52 34 L58 28 L58 42 L52 38 Q40 46 24 44 Q10 44 6 38 Z" fill="WASH"/>
    <path d="M18 25 Q16 17 12 15 M18 25 Q20 17 24 15"/><circle cx="14" cy="34" r="0.8"/><path d="M8 38 Q14 40 20 38"/><path d="M2 48 Q10 45 18 48 T34 48 T50 48 T62 48" opacity=".6"/>`,
  fish: `<path d="M10 28 Q20 20 30 28 Q20 36 10 28 Z M30 28 L36 23 V33 Z M30 42 Q40 34 50 42 Q40 50 30 42 Z M50 42 L56 37 V47 Z" fill="WASH"/><circle cx="15" cy="27" r="0.7"/><circle cx="35" cy="41" r="0.7"/>`,
  wind: `<circle cx="18" cy="30" r="11" fill="WASH"/><path d="M12 26 Q14 24 16 26 M20 25 Q22 23 24 25"/><path d="M27 31 Q31 30 29 34"/><circle cx="14" cy="34" r="2"/>
    <path d="M32 26 Q42 22 52 26 M32 31 Q44 31 58 29 M32 36 Q42 38 50 36"/><path d="M10 20 Q14 14 20 17 M8 26 Q4 22 8 18" opacity=".6"/>`,
  compass: `<circle cx="32" cy="32" r="20"/><circle cx="32" cy="32" r="16" opacity=".5"/>
    <path d="M32 6 L36 28 L58 32 L36 36 L32 58 L28 36 L6 32 L28 28 Z" fill="WASH"/><path d="M32 12 L34 30 L52 14 M32 52 L30 34 L12 50" opacity=".5"/>
    <path d="M29 4 V-1 L35 4 V-1" />`,
  galley: `<path d="M4 38 L60 38 L54 44 H10 Z" fill="WASH"/><path d="M60 38 L64 40"/><path d="M32 38 V12 M20 14 H44 V32 H20 Z"/>
    <path d="M12 44 L8 52 M18 44 L14 52 M24 44 L20 52 M30 44 L26 52 M36 44 L32 52 M42 44 L38 52 M48 44 L44 52"/><path d="M4 38 Q2 32 6 30"/>`,
  dhow: `<path d="M8 40 Q32 50 56 38 L52 46 Q32 52 12 46 Z" fill="WASH"/><path d="M30 42 V12"/><path d="M14 36 L52 6 Q42 26 30 40 Z" fill="WASH"/><path d="M2 52 Q8 49 14 52 T26 52 T38 52 T50 52 T62 52" opacity=".6"/>`,
  clipper: `<path d="M6 40 L58 38 L52 47 H12 Z" fill="WASH"/><path d="M58 38 L64 33"/><path d="M18 40 V10 M32 40 V6 M46 39 V12"/>
    <path d="M12 14 H24 V20 H12 Z M11 22 H25 V30 H11 Z M26 10 H38 V17 H26 Z M25 19 H39 V28 H25 Z M40 16 H52 V22 H40 Z M39 24 H53 V32 H39 Z"/><path d="M2 53 Q8 50 14 53 T26 53 T38 53 T50 53 T62 53" opacity=".6"/>`,
  container: `<path d="M4 40 H60 L56 48 H8 Z" fill="WASH"/><path d="M8 40 V34 H16 V40 M16 34 V28 H24 V40 M24 34 H32 V40 M32 28 H40 V40 M40 34 H48 V40 M16 28 V34 M32 28 H24 V34"/>
    <path d="M50 40 V24 H56 V40 M52 24 V20"/><path d="M2 54 Q8 51 14 54 T26 54 T38 54 T50 54 T62 54" opacity=".6"/>`,
  airliner: `<path d="M8 32 L48 30 Q58 30 60 32 Q58 34 48 34 Z" fill="WASH"/><path d="M30 31 L20 16 H25 L38 31 M30 33 L20 48 H25 L38 33 M10 32 L6 24 H9 L14 31 M10 32 L6 40 H9 L14 33"/>`,

  // --- The Surveyor: a small, long-nosed figure with a telescope ---------------
  surveyor: `<path d="M24 12 H38 M27 12 V4 H35 V12"/><circle cx="31" cy="17" r="5"/><path d="M35 17 L41 19 L35 20"/>
    <path d="M27 22 L22 44 H38 L34 22 Z" fill="WASH"/><path d="M33 26 L50 17"/><path d="M48 15 L54 12 L56 16 L50 19 Z"/>
    <path d="M27 28 L18 34 L14 30"/><path d="M26 44 L23 56 M34 44 L37 56 M20 56 H25 M35 56 H40"/>`,
  // The Leaning Tower of Pisa: eight storeys of arcades, the belfry on top, tilting south.
  campanile: `<g transform="rotate(5.5 30 56)"><path d="M23.5 56 V13 H38.5 V56 Z" fill="WASH"/><path d="M22.5 13 H39.5 V11.6 H22.5 Z" fill="WASH"/>
    ${times(7, (i) => { const y = 49.5 - i * 5.4; return `<path d="M22.8 ${y} H39.2"/>${times(4, (j) => `<path d="M${25 + j * 3.6} ${y - 0.6} V${y - 3} Q${25.9 + j * 3.6} ${y - 4.2} ${26.8 + j * 3.6} ${y - 3} V${y - 0.6}" opacity=".6"/>`)}`; })}
    <path d="M26 11.6 V6 H36 V11.6 Z" fill="WASH"/><path d="M28 11 V8.2 Q29 7 30 8.2 V11 M32 11 V8.2 Q33 7 34 8.2 V11" opacity=".6"/><path d="M25.5 6 H36.5"/>
    <path d="M29.6 56 V52 Q31 50.4 32.4 52 V56"/></g><path d="M2 56 H62"/>`,
  // The Statue of Liberty: the crown of rays, the torch held high, the tablet, the robe, the pedestal on its star fort.
  liberty: `<path d="M20 58 V44 H44 V58 Z" fill="WASH"/><path d="M18.5 44 H45.5 V41.4 H18.5 Z" fill="WASH"/><path d="M24 47 V55 M40 47 V55 M28 49.5 H36" opacity=".4"/>
    <path d="M26.6 41.4 Q25.6 30 28 23 L30 19 H34.5 L36 23 Q38.6 31 37.6 41.4 Z" fill="WASH"/>
    <path d="M29 25 Q28 33 29 41 M32 24 Q32.6 33 31.8 41 M35 26 Q36 33 35.2 41" opacity=".4"/>
    <circle cx="32.2" cy="16.6" r="2.4" fill="WASH"/><path d="M30 14.6 L28.4 11.8 M31.4 14 L31 10.8 M33 14 L33.6 10.8 M34.4 14.6 L36.2 12"/>
    <path d="M34.5 19.5 L37.6 9.6"/><path d="M36.4 9.6 H39 L38.5 7.6 H37 Z" fill="WASH"/><path d="M37.8 7.6 Q36.6 5.4 37.8 3.6 Q39.2 5.4 37.8 7.6 Z" fill="WASH"/>
    <path d="M29 22 L26.8 27.4"/><path d="M25 26 L28.3 25.4 L28.8 30 L25.5 30.6 Z" fill="WASH"/><path d="M8 58 H56 V60.5 H8 Z" fill="WASH"/>`,
  // Christ the Redeemer: arms outstretched above Rio from the summit of Corcovado.
  redeemer: `<path d="M2 62 Q12 52 20 47 Q27 42 32 41.4 Q37 42 44 47 Q52 52 62 62 Z" fill="WASH"/>
    <path d="M12 55 Q18 50 23 49 M41 49 Q47 51 53 56 M27 47 L24 52" opacity=".35"/>
    <path d="M29.6 41.4 V36.4 H34.4 V41.4 Z" fill="WASH"/><path d="M30.4 36.4 L29.8 22.4 H34.2 L33.6 36.4 Z" fill="WASH"/><path d="M31.4 24.4 V35.6 M32.7 24.4 V35.6" opacity=".4"/>
    <path d="M16 21.4 Q24 20.4 30 20.6 H34 Q40 20.4 48 21.4 V23 Q40 22.6 34 23.4 H30 Q24 22.6 16 23 Z" fill="WASH"/>
    <circle cx="32" cy="18.4" r="1.9" fill="WASH"/>`,
  // The Terracotta Army: ranks of soldiers in their pit, each one different, receding into the earth.
  warriors: `<path d="M2 28 H62" opacity=".4"/><path d="M2 34.5 H62 M2 42 H62" opacity=".18"/>
    ${times(10, (i) => { const x = 5 + i * 6; return `<circle cx="${x}" cy="30" r="0.9"/><path d="M${x - 1.3} 31.6 V35.6 H${x + 1.3} V31.6" opacity=".6"/>`; })}
    ${times(7, (i) => { const x = 6.5 + i * 8.5; return `<circle cx="${x}" cy="36.6" r="1.3"/><path d="M${x - 2} 38.6 L${x - 2.3} 44 H${x + 2.3} L${x + 2} 38.6 Z" fill="WASH"/>`; })}
    ${times(5, (i) => { const x = 9 + i * 11.5; return `<circle cx="${x}" cy="45.4" r="1.9" fill="WASH"/><path d="M${x - 0.6} 43.2 Q${x + 0.4} 42 ${x + 1.4} 43.4"/><path d="M${x - 3.2} 48 L${x - 3.7} 58 H${x + 3.7} L${x + 3.2} 48 Z" fill="WASH"/><path d="M${x - 3.1} 50.8 H${x + 3.1} M${x - 3.3} 53.6 H${x + 3.3}" opacity=".45"/><path d="M${x - 3.2} 49 L${x - 4.8} 54.4 M${x + 3.2} 49 L${x + 4.8} 54.4"/>`; })}
    <path d="M1 59 H63"/>`,
  // Tower Bridge: two Gothic towers with their high walkways, the bascules below, the side spans hung from chains.
  towerbridge: `${[19, 45].map((x) => `<path d="M${x - 5.5} 50 V19 H${x + 5.5} V50 Z" fill="WASH"/>${[-5.5, 3].map((d) => `<path d="M${x + d} 19 V14 L${x + d + 1.25} 11 L${x + d + 2.5} 14 V19" fill="WASH"/>`).join("")}<path d="M${x - 2} 19 L${x} 9 L${x + 2} 19" fill="WASH"/><path d="M${x - 2.5} 28 V24 Q${x - 1.6} 22.6 ${x - 0.7} 24 V28 M${x + 0.7} 28 V24 Q${x + 1.6} 22.6 ${x + 2.5} 24 V28 M${x - 1} 40 V35.6 Q${x} 34 ${x + 1} 35.6 V40" opacity=".6"/><path d="M${x - 7} 50 H${x + 7}"/>`).join("")}
    <path d="M24.5 22 H39.5 V25.6 H24.5 Z" fill="WASH"/><path d="M24.5 22 L28.2 25.6 L32 22 L35.8 25.6 L39.5 22" opacity=".45"/>
    <path d="M24.5 41 H39.5 V43.4 H24.5 Z" fill="WASH"/><path d="M2 41 H13.5 M50.5 41 H62 M2 43.4 H13.5 M50.5 43.4 H62"/>
    <path d="M2 30 Q8 41 13.5 27 M50.5 27 Q56 41 62 30"/>${[5, 8, 11, 53, 56, 59].map((x) => `<path d="M${x} ${x < 32 ? 35 + (x - 5) * 0.3 : 35 + (59 - x) * 0.3} V41" opacity=".4"/>`).join("")}
    <path d="M2 56 Q8 54.6 14 56 T26 56 T38 56 T50 56 T62 56" opacity=".4"/>`,
  // The Mezquita of Córdoba: a forest of columns under double tiers of horseshoe arches, their voussoirs striped red and white.
  mezquita: `<path d="M2 12 H62 V19 H2 Z" fill="WASH"/>${times(10, (i) => `<path d="M${4 + i * 6} 12 V9.6 H${6.4 + i * 6} V12" />`)}
    ${times(5, (i) => { const x = 6 + i * 13; return `<path d="M${x - 1} 56 V40 H${x + 1} V56 Z" fill="WASH"/><path d="M${x - 1.8} 40 H${x + 1.8} M${x - 1.6} 55 H${x + 1.6}"/><path d="M${x - 0.8} 27.6 V19 M${x + 0.8} 27.6 V19" opacity=".7"/>`; })}
    ${[[37.4, 5.6, 7.4], [25.2, 4.6, 6]].map(([cy, ri, ro]) => times(4, (i) => {
      const cx = 12.5 + i * 13;
      const d = 0.4;
      const p = (r: number, a: number) => `${r1(cx + r * Math.cos(a))} ${r1(cy + r * Math.sin(a))}`;
      const n = 9;
      const span = Math.PI + 2 * d;
      const wedges = times(n, (k) => {
        if (k % 2) return "";
        const a0 = Math.PI - d + (k * span) / n;
        const a1 = a0 + span / n;
        return `<path d="M${p(ri, a0)} L${p(ro, a0)} A${ro} ${ro} 0 0 1 ${p(ro, a1)} L${p(ri, a1)} A${ri} ${ri} 0 0 0 ${p(ri, a0)} Z" fill="WASH" stroke="none"/>`;
      });
      return `${wedges}<path d="M${p(ri, Math.PI - d)} A${ri} ${ri} 0 1 1 ${p(ri, d)} M${p(ro, Math.PI - d)} A${ro} ${ro} 0 1 1 ${p(ro, d)}"/>`;
    })).join("")}
    <path d="M1 56 H63"/>`,
};

/** A technical pen: the faintest life in the line, no visible wobble. */
const FILTER = (seed: number) =>
  `<filter id="pen" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="1" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="0.45"/></filter>`;

/**
 * Engraver's shading: fine diagonal hatching, and a deeper wash, laid over the
 * east side of every washed form and fading out toward the west, so each
 * drawing is lit from the same side as the map. The mask works in each shape's
 * own bounding box; mirrored versions flip it so the light never moves.
 */
const SHADING = (ink: string, mirrored: boolean) => {
  const [x1, x2] = mirrored ? [0.62, 0.02] : [0.38, 0.98];
  return `<pattern id="hatch" patternUnits="userSpaceOnUse" width="2.1" height="2.1" patternTransform="rotate(40)"><path d="M0 0 V2.1" stroke="${ink}" stroke-width="0.42"/></pattern>
    <linearGradient id="eastward" x1="${x1}" y1="0" x2="${x2}" y2="0.25"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient>
    <mask id="east" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#eastward)"/></mask>`;
};
/** Every washed form in a drawing: the silhouettes that take shading. */
const WASHED = /<(?:path|circle|ellipse|rect)\b[^>]*fill="WASH"[^>]*\/>/g;

/** Clay: a lumpier wobble and a soft cast shadow, like a figure on a stop-motion set. */
const CLAY_FILTER = (seed: number) =>
  `<filter id="pen" x="-15%" y="-15%" width="135%" height="135%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="2.6" result="lumpy"/><feDropShadow in="lumpy" dx="1.4" dy="2" stdDeviation="1" flood-color="#3c2010" flood-opacity="0.35"/></filter>`;

export const DRAWING_KINDS = Object.keys(D);

/**
 * SVG for a drawing. The halo pass draws the same lines wide in the background
 * colour first, so the drawing stays legible over any territory.
 */
/** Number of hand-varied versions drawn of each scenery kind. */
export const VARIANTS = 4;

/**
 * How each version differs: mirrored, squatter or taller, lighter or heavier
 * line. With a different wobble seed each, no two neighbours look stamped.
 */
const VARIANT_STYLE = [
  { transform: "", weight: 1, sy: 1, mirrored: false },
  { transform: "translate(64 0) scale(-1 1)", weight: 0.9, sy: 1, mirrored: true },
  { transform: "translate(32 60) scale(1.12 0.88) translate(-32 -60)", weight: 0.85, sy: 0.88, mirrored: false },
  { transform: "translate(64 0) scale(-1 1) translate(32 60) scale(0.9 1.12) translate(-32 -60)", weight: 1.15, sy: 1.12, mirrored: true },
];

/** Scenery that stands on the land: trees, beasts, people and towns, but not the sea or sky. */
const STANDING = new Set([
  "peak", "peaks", "dune", "cactus", "palm", "jungle", "pine", "oak", "grass", "bison", "caribou", "giraffe", "kangaroo",
  "penguin", "polarbear", "wildhorse", "elephant", "camel", "hunter", "herder", "farmer", "fisher", "rider",
  "town-ancient", "town-europe", "town-islamic", "town-eastasia", "town-southasia", "town-americas", "town-africa",
  "town-steppe", "town-industrial", "town-metro",
]);
/** A drawing's own ground line: a lone horizontal stroke near the foot of the grid. */
const GROUND_LINE = /<path d="M[\d.]+ ([\d.]+) H[\d.]+"(?: opacity="[^"]*")?\s*\/>/g;

/**
 * Scenery loses its own ground line, which made each piece a separate little
 * picture, and instead casts a short hatched shadow eastward. Every piece on
 * the map is lit from the same side, so they read as one landscape.
 */
function grounded(kind: string, body: string, sy: number) {
  if (!STANDING.has(kind)) return { body, shadow: "" };
  let foot = 52;
  const stripped = body.replace(GROUND_LINE, (line, y) => (Number(y) >= 46 ? ((foot = Number(y)), "") : line));
  // Peaks and dunes already shade their own east faces; they cast a lighter shadow.
  const n = kind === "peak" || kind === "peaks" || kind === "dune" || kind === "grass" ? 2 : 4;
  const y = 60 + (foot - 60) * sy;
  const hatch = Array.from({ length: n }, (_, i) => `M${35 + i * 5} ${y + 1.5} L${39 + i * 5} ${y - 2.5}`).join(" ");
  return { body: stripped, shadow: `<path d="${hatch}" opacity=".45"/>` };
}

export function drawingSvg(kind: string, ink: string, wash: string, halo: string, seed = 1, clay = false, px = 128, weight = 1, variant = 0, scenery = false): string {
  const v = VARIANT_STYLE[variant % VARIANT_STYLE.length];
  const { body, shadow } = scenery ? grounded(kind, D[kind] ?? D.temple, v.sy) : { body: D[kind] ?? D.temple, shadow: "" };
  const lines = body.replace(/fill="WASH"/g, 'fill="none"');
  const w = weight * v.weight;
  const s = seed + variant * 101;
  if (clay) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${px}" height="${px}">
    <defs>${CLAY_FILTER(s)}</defs>
    <g transform="${v.transform}" stroke-linecap="round" stroke-linejoin="round">
      <g filter="url(#pen)">
        ${halo === "none" ? "" : `<g fill="none" stroke="${halo}" stroke-width="${7.5 * w}" opacity="0.85">${lines}</g>`}
        <g fill="none" stroke="${ink}" stroke-width="${3.2 * w}">${body.replace(/fill="WASH"/g, `fill="${wash}"`)}</g>
      </g>
    </g>
    ${shadow ? `<g filter="url(#pen)" fill="none" stroke="${ink}" stroke-width="${1.6 * w}" stroke-linecap="round">${shadow}</g>` : ""}</svg>`;
  }
  // Two weights of line: a firm outline round each washed form, a finer one
  // for everything drawn inside and around it.
  const inked = body.replace(/fill="WASH"/g, `fill="${wash}" stroke-width="${0.95 * w}"`);
  // Shading copies carry no stroke of their own (a form may set one already).
  const forms = (body.match(WASHED) ?? []).map((f) => f.replace(/\sstroke(?:-width)?="[^"]*"/g, ""));
  const deepen = forms.map((f) => f.replace(/fill="WASH"/, `fill="${wash}" stroke="none" mask="url(#east)"`)).join("");
  const hatch = forms.map((f) => f.replace(/fill="WASH"/, 'fill="url(#hatch)" stroke="none" mask="url(#east)"')).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${px}" height="${px}">
    <defs>${FILTER(s)}${SHADING(ink, v.mirrored)}</defs>
    <g transform="${v.transform}" stroke-linecap="round" stroke-linejoin="round">
      <g filter="url(#pen)">
        ${halo === "none" ? "" : `<g fill="none" stroke="${halo}" stroke-width="${5 * w}" opacity="0.85">${lines}</g>`}
        <g opacity="0.9">${deepen}</g><g opacity="0.75">${hatch}</g>
        <g fill="none" stroke="${ink}" stroke-width="${0.6 * w}">${inked}</g>
      </g>
    </g>
    ${shadow ? `<g filter="url(#pen)" fill="none" stroke="${ink}" stroke-width="${1.1 * w}" stroke-linecap="round">${shadow}</g>` : ""}</svg>`;
}

/** Drawings used as background scenery, drawn quieter than landmarks. */
export const SCENERY_KINDS = [
  "peak", "peaks", "dune", "cactus", "palm", "jungle", "pine", "oak", "grass", "bison", "caribou", "giraffe", "kangaroo",
  "penguin", "polarbear", "wildhorse", "elephant", "camel", "hunter", "herder", "farmer", "fisher", "rider",
  "town-ancient", "town-europe", "town-islamic", "town-eastasia", "town-southasia", "town-americas", "town-africa",
  "town-steppe", "town-industrial", "town-metro", "waves", "whale", "fish", "wind", "compass", "city", "city-ruin", "fields",
  "galley", "dhow", "junk", "galleon", "longship", "canoe", "clipper", "steamship", "container", "airliner",
];
