const cache = new Map();
const DEFAULT_TTL_MS = 1000 * 60 * 30;

export function stableCacheKey(value) {
  return stableStringify(value);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function getCached(key) {
  const record = cache.get(key);
  if (!record || record.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return record.value;
}

export function setCached(key, value, ttlMs = DEFAULT_TTL_MS) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  if (cache.size > 1000) cache.delete(cache.keys().next().value);
}
