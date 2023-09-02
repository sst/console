export async function benchmark<T>(
  label: string,
  cb: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  const result = await cb();
  console.log(label + "=" + (performance.now() - start).toString());
  return result;
}
