// Small string helpers shared across commands.

/** Turns an arbitrary string into a safe, lowercase Discord channel-name segment. */
export function slugify(text) {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  return slug || 'user';
}
