// Pen-and-ink drawings for landmarks, curiosities and the hidden Surveyor,
// after Saul Steinberg: one wiry line weight, a light wash, a slight wobble.
//
// Each drawing is SVG markup on a 64x64 grid. Shapes marked fill="WASH" get
// the theme's wash colour; everything is stroked with the wrapper's ink. A
// small displacement filter makes the line waver like a real pen.

const D: Record<string, string> = {
  // --- Landmarks -------------------------------------------------------------
  pyramid: `<path d="M8 52 L32 13 L56 52 Z" fill="WASH"/><path d="M32 13 L37 52"/>
    <path d="M15 42 H35 M21 32 H34"/><path d="M3 52 H61"/>
    <path d="M44 52 L52 40 L60 52"/>`,
  stepped: `<path d="M9 52 H55 V45 H51 V38 H47 V31 H42 V24 H22 V31 H17 V38 H13 V45 H9 Z" fill="WASH"/>
    <path d="M29 52 V24 M35 52 V24"/><path d="M25 24 V15 H39 V24"/><path d="M28 15 V12 H36 V15"/><path d="M3 52 H61"/>`,
  stones: `<path d="M8 52 V29 M15 52 V29 M6 29 H17"/><path d="M25 52 V24 M33 52 V24 M23 24 H35"/>
    <path d="M44 52 V31 M51 52 V31 M42 31 H53"/><path d="M55 52 L61 47"/><path d="M8 33 H15 M25 28 H33" opacity=".5"/><path d="M2 52 H62"/>`,
  temple: `<path d="M8 24 L32 11 L56 24 Z" fill="WASH"/><path d="M8 24 H56 V28 H8 Z"/>
    <path d="M12 28 V48 M20 28 V48 M28 28 V48 M36 28 V48 M44 28 V48 M52 28 V48"/>
    <path d="M6 48 H58 V52 H6 Z"/><path d="M28 19 Q32 16 36 19"/>`,
  arena: `<path d="M6 52 V27 Q32 14 58 27 V40 L52 36 V52" fill="WASH"/>
    <path d="M6 36 Q32 26 52 33 M6 44 H52"/>
    <path d="M10 52 V47 Q12.5 44 15 47 V52 M19 52 V47 Q21.5 44 24 47 V52 M28 52 V47 Q30.5 44 33 47 V52 M37 52 V47 Q39.5 44 42 47 V52"/>
    <path d="M11 43 V39 Q13 37 15 39 V43 M20 42 V38 Q22 36 24 38 V42 M29 41 V37 Q31 35 33 37 V41 M38 41 V37 Q40 35 42 37 V41"/>`,
  dome: `<path d="M14 35 Q32 5 50 35 Z" fill="WASH"/><path d="M11 35 H53 V52 H11 Z"/>
    <path d="M29 13 V8 H35 V13"/><path d="M27 52 V45 Q32 40 37 45 V52"/><path d="M17 41 V47 M47 41 V47"/><path d="M5 52 H59"/>`,
  minarets: `<path d="M18 36 Q32 10 46 36 Z" fill="WASH"/><path d="M14 36 H50 V52 H14 Z"/><path d="M30 16 V11 H34 V16"/>
    <path d="M7 52 V20 M10 52 V20 M7 20 L8.5 13 L10 20"/><path d="M54 52 V20 M57 52 V20 M54 20 L55.5 13 L57 20"/>
    <path d="M28 52 V46 Q32 42 36 46 V52"/><path d="M3 52 H61"/>`,
  onion: `<path d="M22 31 Q19 21 32 12 Q45 21 42 31 Z" fill="WASH"/><path d="M32 12 V6"/>
    <path d="M18 31 H46 V48 H18 Z"/><path d="M28 48 V40 Q32 35 36 40 V48"/>
    <path d="M8 48 V22 M8 22 L9.5 17 L11 22 V48"/><path d="M53 48 V22 L54.5 17 L56 22 V48"/><path d="M4 48 H60 V52 H4 Z"/>`,
  stupa: `<path d="M16 42 Q32 14 48 42 Z" fill="WASH"/><path d="M8 52 H56 V47 H52 V42 H12 V47 H8 Z"/>
    <path d="M28 22 H36 V17 H28 Z"/><path d="M32 17 V5 M29 13 H35 M30 9 H34"/><path d="M22 30 H42" opacity=".5"/>`,
  towers: `<path d="M26 48 V27 Q32 6 38 27 V48 Z" fill="WASH"/><path d="M12 48 V34 Q17 20 22 34 V48"/><path d="M42 48 V34 Q47 20 52 34 V48"/>
    <path d="M27 34 H37 M28 22 H36 M13 40 H21 M43 40 H51"/><path d="M5 48 H59 V52 H5 Z"/><path d="M29 52 V48 M35 52 V48"/>`,
  pagoda: `<path d="M8 42 Q32 35 56 42 M8 42 L6 38 M56 42 L58 38"/><path d="M12 30 Q32 24 52 30 M12 30 L10 26 M52 30 L54 26"/>
    <path d="M16 18 Q32 13 48 18 M16 18 L14 14 M48 18 L50 14"/>
    <path d="M18 52 V42 H46 V52 Z M21 41 V31 H43 V41 Z M24 29 V19 H40 V29 Z" fill="WASH"/><path d="M32 13 V5"/><path d="M4 52 H60"/>`,
  wall: `<path d="M3 44 L13 38 L23 42 L33 32 L43 36 L53 28 L61 30 L61 36 L53 34 L43 42 L33 38 L23 48 L13 44 L3 50 Z" fill="WASH"/>
    <path d="M30 33 V24 H37 V34"/><path d="M29 24 V22 M33 24 V22 M37 24 V22"/>
    <path d="M6 42 V40 M10 40 V38 M17 39 V37 M20 40 V38 M45 35 V33 M49 32 V30 M57 28 V26"/><path d="M2 56 Q18 50 32 54 T62 52" opacity=".5"/>`,
  castle: `<path d="M22 52 V24 H42 V52 Z" fill="WASH"/><path d="M22 24 V20 H26 V24 M30 24 V20 H34 V24 M38 24 V20 H42 V24"/>
    <path d="M10 52 V32 H18 V52 M46 52 V32 H54 V52"/><path d="M9 32 L14 22 L19 32 M45 32 L50 22 L55 32"/>
    <path d="M28 52 V44 Q32 40 36 44 V52"/><path d="M32 30 V34"/><path d="M14 22 V17 L18 19 L14 20" /><path d="M4 52 H60"/>`,
  cathedral: `<path d="M24 52 V30 L32 22 L40 30 V52 Z" fill="WASH"/><path d="M11 52 V17 H24 V52 M40 52 V17 H53 V52"/>
    <path d="M11 17 V14 M15 17 V14 M19 17 V14 M23 17 V14 M41 17 V14 M45 17 V14 M49 17 V14 M53 17 V14"/>
    <circle cx="32" cy="36" r="4.5"/><path d="M32 22 V8"/><path d="M28 52 V46 Q32 42 36 46 V52"/>
    <path d="M14 30 V24 Q17.5 21 21 24 V30 M43 30 V24 Q46.5 21 50 24 V30"/><path d="M4 52 H60"/>`,
  adobe: `<path d="M8 52 V33 H56 V52 Z" fill="WASH"/><path d="M17 33 V19 Q21 14 25 19 V33 M38 33 V23 Q42 18 46 23 V33"/>
    <path d="M5 39 H9 M5 45 H9 M55 39 H59 M55 45 H59 M14 30 V27 M30 30 V27 M50 30 V27 M20 24 H17 M25 24 H28 M38 28 H35 M46 28 H49"/>
    <path d="M28 52 V45 Q31 42 34 45 V52"/><path d="M3 52 H61"/>`,
  terraces: `<path d="M30 52 L43 12 L58 52 Z" fill="WASH"/><path d="M38 26 L42 28 M46 34 L50 32"/>
    <path d="M3 50 Q17 46 32 50 M6 44 Q19 40 32 44 M10 38 Q20 35 31 38"/>
    <path d="M12 38 V33 H18 V38 M12 33 L15 30 L18 33 M22 37 V32 H28 V37 M22 32 L25 29 L28 32"/><path d="M2 54 H62"/>`,
  head: `<path d="M22 54 V22 Q22 12 31 12 Q39 12 39 19 L41 31 Q37 33 39 37 L37 45 Q35 49 37 54 Z" fill="WASH"/>
    <path d="M22 11 H38 V6 H22 Z"/><path d="M26 23 Q30 21 35 23"/><path d="M34 30 L36 30"/><path d="M28 43 H35"/><path d="M14 54 H50"/>`,
  lighthouse: `<path d="M20 36 V22 H44 V36 Z" fill="WASH"/><path d="M14 52 V36 H50 V52 Z"/><path d="M26 22 V13 H38 V22"/>
    <path d="M32 9 L32 3 M26 10 L22 6 M38 10 L42 6 M24 14 L18 13 M40 14 L46 13"/><path d="M29 52 V46 H35 V52"/><path d="M4 52 Q12 49 20 52 T36 52 T52 52 T62 52"/>`,
  tower: `<path d="M26 52 V18 H38 V52 Z" fill="WASH"/><path d="M26 18 L32 5 L38 18"/><circle cx="32" cy="24" r="3.5"/>
    <path d="M32 22 V24 L33.5 25"/><path d="M26 31 H38 M26 40 H38"/><path d="M20 52 V40 H26 M38 40 H44 V52"/><path d="M14 52 H50"/>`,
  lattice: `<path d="M14 52 Q26 36 29 9 H35 Q38 36 50 52" fill="WASH"/><path d="M22 52 Q32 39 42 52"/>
    <path d="M20 40 H44 M25 28 H39"/><path d="M17 46 L27 40 M47 46 L37 40 M24 34 L28 28 M40 34 L36 28 M28 24 L32 16 L36 24"/><path d="M32 9 V3"/><path d="M8 52 H56"/>`,
  statue: `<path d="M23 52 V40 H41 V52 Z"/><path d="M27 40 Q26 28 29 20 H35 Q38 28 37 40 Z" fill="WASH"/>
    <path d="M35 22 L39 9"/><path d="M37 9 Q39 3 41 9 Z"/><path d="M29 20 L28 15 M32 19 L32 14 M35 20 L36 15"/><path d="M28 26 L24 30"/><path d="M16 52 H48"/>`,
  skyscraper: `<path d="M18 52 V30 H23 V22 H27 V14 H37 V22 H41 V30 H46 V52 Z" fill="WASH"/><path d="M32 14 V3"/>
    <path d="M27 30 V48 M32 22 V48 M37 30 V48 M21 34 V48 M43 34 V48"/><path d="M10 52 H54"/>`,
  sails: `<path d="M8 49 Q13 27 25 22 Q21 36 25 49 Z" fill="WASH"/><path d="M22 49 Q29 20 42 14 Q37 34 41 49 Z" fill="WASH"/>
    <path d="M38 49 Q45 31 56 28 Q52 40 55 49 Z"/><path d="M4 49 H60 V53 H4 Z"/><path d="M2 58 Q10 55 18 58 T34 58 T50 58 T62 58" opacity=".6"/>`,

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

  // --- More landmarks and curiosities -------------------------------------------------
  aqueduct: `<path d="M4 18 H60 V24 H4 Z" fill="WASH"/><path d="M4 24 V52 M60 24 V52"/>
    <path d="M4 52 V34 Q10 26 16 34 V52 M16 52 V34 Q22 26 28 34 V52 M28 52 V34 Q34 26 40 34 V52 M40 52 V34 Q46 26 52 34 V52 M52 52 V34 Q56 28 60 32"/>
    <path d="M4 24 Q7 21 10 24 Q13 21 16 24 Q19 21 22 24 Q25 21 28 24 Q31 21 34 24 Q37 21 40 24 Q43 21 46 24 Q49 21 52 24 Q55 21 58 24"/><path d="M2 56 Q16 52 32 55 T62 54" opacity=".6"/>`,
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
  bridge: `<path d="M16 50 V12 M48 50 V12"/><path d="M14 12 H18 M46 12 H50"/><path d="M2 40 Q16 12 16 12 Q32 34 48 12 Q48 12 62 40"/>
    <path d="M2 40 H62 V44 H2 Z" fill="WASH"/><path d="M22 40 V24 M28 40 V29 M36 40 V29 M42 40 V24 M8 40 V30 M56 40 V30" opacity=".6"/><path d="M2 54 Q10 51 18 54 T34 54 T50 54 T62 54" opacity=".6"/>`,

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
  windmill: `<path d="M24 56 L27 28 H37 L40 56 Z" fill="WASH"/><path d="M27 28 L32 22 L37 28"/><circle cx="32" cy="24" r="2"/>
    <path d="M32 24 L14 8 L10 12 L30 26 M32 24 L50 8 L54 12 L34 26 M32 24 L16 42 L12 38 M32 24 L48 40 L52 36"/><path d="M30 56 V48 H34 V56"/><path d="M8 56 H58"/>`,
  torii: `<path d="M6 14 Q32 20 58 14 L56 20 Q32 24 8 20 Z" fill="WASH"/><path d="M12 26 H52"/><path d="M18 20 V56 M46 20 V56 M32 20 V26"/><path d="M14 56 H22 M42 56 H50"/>
    <path d="M2 58 Q16 55 32 58 T62 58" opacity=".5"/>`,
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
};

const FILTER = (seed: number) =>
  `<filter id="pen" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="1" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="1.7"/></filter>`;

/** Clay: a lumpier wobble and a soft cast shadow, like a figure on a stop-motion set. */
const CLAY_FILTER = (seed: number) =>
  `<filter id="pen" x="-15%" y="-15%" width="135%" height="135%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="2.6" result="lumpy"/><feDropShadow in="lumpy" dx="1.4" dy="2" stdDeviation="1" flood-color="#3c2010" flood-opacity="0.35"/></filter>`;

export const DRAWING_KINDS = Object.keys(D);

/**
 * SVG for a drawing. The halo pass draws the same lines wide in the background
 * colour first, so the drawing stays legible over any territory.
 */
export function drawingSvg(kind: string, ink: string, wash: string, halo: string, seed = 1, clay = false, px = 128, weight = 1): string {
  const body = D[kind] ?? D.temple;
  const haloBody = body.replace(/fill="WASH"/g, 'fill="none"');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${px}" height="${px}">
    <defs>${clay ? CLAY_FILTER(seed) : FILTER(seed)}</defs>
    <g filter="url(#pen)" stroke-linecap="round" stroke-linejoin="round">
      <g fill="none" stroke="${halo}" stroke-width="${(clay ? 7.5 : 6) * weight}" opacity="0.85">${haloBody}</g>
      <g fill="none" stroke="${ink}" stroke-width="${(clay ? 3.2 : 2.3) * weight}">${body.replace(/fill="WASH"/g, `fill="${wash}"`)}</g>
    </g></svg>`;
}

/** Drawings used as background scenery, drawn quieter than landmarks. */
export const SCENERY_KINDS = [
  "peak", "peaks", "dune", "cactus", "palm", "jungle", "pine", "oak", "grass", "bison", "caribou", "giraffe", "kangaroo",
  "penguin", "polarbear", "wildhorse", "elephant", "camel", "hunter", "herder", "farmer", "fisher", "rider",
  "town-ancient", "town-europe", "town-islamic", "town-eastasia", "town-southasia", "town-americas", "town-africa",
  "town-steppe", "town-industrial", "town-metro", "waves", "whale", "fish", "wind", "compass", "city", "city-ruin", "fields",
  "galley", "dhow", "junk", "galleon", "longship", "canoe", "clipper", "steamship", "container", "airliner",
];
