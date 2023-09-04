export async function retry<T>(max: number, callback: () => T) {
  let final: any;
  for (let i = 0; i < max; i++) {
    try {
      const result = await Promise.resolve(callback());
      return result;
    } catch (err) {
      final = err;
      continue;
    }
  }
  console.error(final);
}
