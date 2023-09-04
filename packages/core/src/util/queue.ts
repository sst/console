export async function queue<T, R>(
  concurrency: number,
  items: T[],
  processItem: (item: T) => Promise<R>
) {
  const workers = [...new Array(concurrency)];
  await Promise.all(
    workers.map(async () => {
      while (true) {
        const item = items.pop();
        if (!item) break;
        await processItem(item);
      }
    })
  );
}
