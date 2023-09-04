export function queue<T, R>(
  concurrency: number,
  items: T[],
  processItem: (item: T) => Promise<R>
): Promise<R[]> {
  const results: Promise<any>[] = [];
  const queue: T[] = [];

  function run() {
    if (queue.length === 0) return;

    const promises = queue.splice(0, concurrency).map((item) => {
      const promise = processItem(item);
      results.push(promise);
      return promise;
    });

    Promise.race(promises).then(() => run());
  }

  items.forEach((item) => queue.push(item));
  run();

  return Promise.all(results);
}
