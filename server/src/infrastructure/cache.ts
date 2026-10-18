interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

export class TtlCache {
  private readonly store = new Map<string, CacheEntry>();

  constructor(private readonly maxEntries = 200) {}

  get<T>(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
}
