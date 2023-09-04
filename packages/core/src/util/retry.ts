export async function retry<T>(max: number, callback: () => T) {
  for (let i = 0; i < max; i++) {
    try {
      const result = await Promise.resolve(callback());
      return result;
    } catch (err) {
      console.error(err);
      continue;
    }
  }
}
