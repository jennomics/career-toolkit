/**
 * Normalize a company name for deduplication.
 * Strips common corporate suffixes and returns both a cleaned display name
 * and a lowercased normalized name for comparison.
 */

const SUFFIXES_TO_STRIP = [
  ", Inc.",
  ", Inc",
  ", LLC",
  ", Ltd.",
  ", Ltd",
  ", LP",
  ", LLP",
  ", PLC",
  ", GmbH",
  ", AG",
  ", SA",
  ", NV",
  ", BV",
  " Inc.",
  " Inc",
  " LLC",
  " Corporation",
  " Corp.",
  " Corp",
  " Ltd.",
  " Ltd",
  " LP",
  " LLP",
  " PLC",
  " GmbH",
  " AG",
  " SA",
  " NV",
  " BV",
];

export function normalizeCompanyName(name: string): {
  displayName: string;
  normalizedName: string;
} {
  let displayName = name.trim();

  // Strip suffixes (case-insensitive matching, but preserve original casing for display)
  for (const suffix of SUFFIXES_TO_STRIP) {
    const lowerDisplay = displayName.toLowerCase();
    const lowerSuffix = suffix.toLowerCase();
    if (lowerDisplay.endsWith(lowerSuffix)) {
      displayName = displayName.slice(0, -suffix.length).trim();
      break; // Only strip one suffix
    }
  }

  const normalizedName = displayName.toLowerCase();

  return { displayName, normalizedName };
}
