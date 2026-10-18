export async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const size = Math.max(1, Math.min(concurrency, items.length));

  async function run(): Promise<void> {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      const item = items[current];
      if (item === undefined) continue;
      results[current] = await worker(item, current);
    }
  }

  await Promise.all(Array.from({ length: size }, () => run()));
  return results;
}
