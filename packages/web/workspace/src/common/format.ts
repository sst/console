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

export function formatNumber(num: number, lowercase?: boolean): string {
  const absNum = Math.abs(num);

  if (absNum < 1000) {
    return num.toString();
  }

  const format = (value: number, divisor: number): string => {
    const result = value / divisor;
    return result % 1 === 0 ? result.toString() : result.toFixed(1);
  };

  if (absNum >= 1000 && absNum < 1000000) {
    return format(num, 1000) + (lowercase ? "k" : "K");
  }

  if (absNum >= 1000000 && absNum < 1000000000) {
    return format(num, 1000000) + (lowercase ? "m" : "M");
  }

  if (absNum >= 1000000000 && absNum < 1000000000000) {
    return format(num, 1000000000) + (lowercase ? "b" : "B");
  }

  if (absNum >= 1000000000000) {
    return format(num, 1000000000000) + (lowercase ? "t" : "T");
  }

  return num.toString(); // fallback
}

export function formatDuration(ms: number): string {
  const milliseconds = ms % 1000;
  const seconds = Math.floor(ms / 1000) % 60;
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60));

  if (ms < 1000) {
    return milliseconds + "ms";
  } else if (ms < 1000 * 60) {
    return (seconds + milliseconds / 1000).toFixed(2) + "s";
  } else if (ms < 1000 * 60 * 60) {
    return totalSeconds + "s";
  } else {
    return hours + ":" + (minutes < 10 ? "0" : "") + minutes + "h";
  }
}

export function formatSinceTime(timestamp: number): string {
  const currentTimestamp = Date.now();
  const diffInSeconds = Math.round((currentTimestamp - timestamp) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  }

  const diffInMinutes = Math.round(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1 ? "1min ago" : `${diffInMinutes}mins ago`;
  }

  const diffInHours = Math.round(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1 ? "1hr ago" : `${diffInHours}hrs ago`;
  }

  const diffInDays = Math.round(diffInHours / 24);
  if (diffInDays < 7) {
    return diffInDays === 1 ? "1d ago" : `${diffInDays}d ago`;
  }

  const diffInWeeks = Math.round(diffInDays / 7);
  if (diffInWeeks < 4) {
    return diffInWeeks === 1 ? "1wk ago" : `${diffInWeeks}wks ago`;
  }

  const diffInMonths = Math.round(diffInDays / 30);
  if (diffInMonths < 12) {
    return diffInMonths === 1 ? "1mo ago" : `${diffInMonths}mos ago`;
  }

  const diffInYears = Math.round(diffInDays / 365);
  return diffInYears === 1 ? "1yr ago" : `${diffInYears}yrs ago`;
}
