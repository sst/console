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

export function formatNumber(num: number): string {
  const absNum = Math.abs(num);

  if (absNum < 1000) {
    return num.toString();
  }

  const format = (value: number, divisor: number): string => {
    const result = value / divisor;
    return result % 1 === 0 ? result.toString() : result.toFixed(1);
  };

  if (absNum >= 1000 && absNum < 1000000) {
    return `${format(num, 1000)}K`;
  }

  if (absNum >= 1000000 && absNum < 1000000000) {
    return `${format(num, 1000000)}M`;
  }

  if (absNum >= 1000000000 && absNum < 1000000000000) {
    return `${format(num, 1000000000)}B`;
  }

  if (absNum >= 1000000000000) {
    return `${format(num, 1000000000000)}T`;
  }

  return num.toString(); // fallback
}
