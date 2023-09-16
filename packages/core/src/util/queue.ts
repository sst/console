export async function queue<T, R>(
  concurrency: number,
  items: T[],
  processItem: (item: T) => Promise<R>,
) {
  const workers = [...new Array(concurrency)];
  await Promise.all(
    workers.map(async (_, index) => {
      let count = 0;
      while (true) {
        const item = items.pop();
        if (!item) {
          if (count) console.log(`Worker ${index} finished`);
          break;
        }
        await processItem(item);
        count++;
      }
    }),
  );
}
