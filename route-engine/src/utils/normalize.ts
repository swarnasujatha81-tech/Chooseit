export function normalizeStopName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+bus\s+(stand|station|stop)$/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function uniq<T>(items: T[]): T[] {
  return [...new Set(items)];
}
