type CacheRecord<T> = {
  value: T;
  expiresAt: number;
};

export class TtlCache<T> {
  private readonly records = new Map<string, CacheRecord<T>>();

  constructor(private readonly ttlMs: number, private readonly maxSize = 5000) {}

  get(key: string): T | null {
    const record = this.records.get(key);
    if (!record || record.expiresAt < Date.now()) {
      this.records.delete(key);
      return null;
    }
    return record.value;
  }

  set(key: string, value: T): void {
    this.records.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    if (this.records.size > this.maxSize) {
      const oldestKey = this.records.keys().next().value;
      if (oldestKey) this.records.delete(oldestKey);
    }
  }
}
