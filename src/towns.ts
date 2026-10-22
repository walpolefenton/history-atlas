// Which townscape drawing suits a place in a given year: the architecture of its
// region and era. Mirrors townFor() and regionOf() in scripts/prepare-data.mjs,
// which uses the same rules for capitals and villages.

type Region = "europe" | "mena" | "steppe" | "eastAsia" | "southAsia" | "seAsiaOceania" | "africa" | "americas";

export function regionOf([lon, lat]: [number, number]): Region {
  if (lon < -30) return "americas";
  if ((lat >= 36 && lon < 26) || (lat >= 42 && lon < 45)) return "europe";
  if (lat >= 42 && lon >= 45) return lon >= 110 && lat < 54 ? "eastAsia" : "steppe";
  if (lat >= 12 && lon >= -20 && lon < 63) return "mena";
  if (lat >= 36 && lon >= 63 && lon < 100) return "steppe";
  if (lon >= 60 && lon < 92 && lat >= 5) return "southAsia";
  if (lon >= 100 && lat >= 18) return "eastAsia";
  if (lon >= 92) return "seAsiaOceania";
  if (lat < 12 && lon >= -20 && lon < 60) return "africa";
  return lat >= 42 ? "steppe" : "mena";
}

export function townFor(p: [number, number], year: number): string {
  const region = regionOf(p);
  const [lon, lat] = p;
  if (year >= 1930) return "town-metro";
  if (year >= 1830 && (region === "europe" || (region === "americas" && year >= 1870))) return "town-industrial";
  if (region === "americas") return year < 1550 ? "town-americas" : "town-europe";
  // Early Mesopotamian and Elamite cities get the stepped temple-mound drawing: a ziggurat.
  if (year < 500 && (region === "europe" || region === "mena")) return year < -800 && region === "mena" ? "town-americas" : "town-ancient";
  if (region === "mena") return year >= 650 ? "town-islamic" : "town-ancient";
  if (region === "europe") return "town-europe";
  if (region === "steppe") return lat > 52 && lon < 60 ? "town-europe" : "town-steppe";
  if (region === "eastAsia") return "town-eastasia";
  if (region === "southAsia" || region === "seAsiaOceania") return "town-southasia";
  if (region === "africa") return "town-africa";
  return "town-ancient";
}
