/**
 * Convert a string to a URL-safe slug.
 * - Lowercase
 * - Replace spaces and special characters with hyphens
 * - Deduplicate consecutive hyphens
 * - Trim leading/trailing hyphens
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
