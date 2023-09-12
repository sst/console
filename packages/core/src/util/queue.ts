export async function queue<T, R>(
  concurrency: number,
  items: T[],
  processItem: (item: T) => Promise<R>,
) {
  const workers = [...new Array(concurrency)];
  await Promise.all(
    workers.map(async (index) => {
      while (true) {
        const item = items.pop();
        if (!item) {
          console.log(`Worker ${index} finished`);
          break;
        }
        await processItem(item);
      }
    }),
  );
}
