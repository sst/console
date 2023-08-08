export function formatBytes(bytes: number, decimals = 2) {
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return {
    unit: sizes[i],
    value: parseFloat((bytes / Math.pow(k, i)).toFixed(dm)),
  };
}
