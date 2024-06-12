import { DateTime } from "luxon";

export const DATETIME_LONG = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  hour12: true,
  minute: "numeric",
  second: "numeric",
  timeZoneName: "short",
} as const;

export function parseTime(input: string) {
  return DateTime.fromSQL(input, { zone: "utc" });
}

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

export function formatDuration(ms: number, useFullFormat?: boolean): string {
  const milliseconds = ms % 1000;
  const seconds = Math.floor(ms / 1000) % 60;
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60));

  if (ms < 1000) {
    return milliseconds + (useFullFormat ? " milliseconds" : "ms");
  } else if (ms < 1000 * 60) {
    return (milliseconds === 0
      ? seconds
      : (seconds + milliseconds / 1000).toFixed(2)) + (useFullFormat ? " seconds" : "s");
  } else if (ms < 1000 * 60 * 3) {
    return totalSeconds + (useFullFormat ? " seconds" : "s");
  } else if (ms < 1000 * 60 * 60) {
    return minutes + (seconds === 0 ? "" : ":" + (seconds < 10 ? "0" : "") + seconds) + (useFullFormat ? " minutes" : "m");
  } else {
    return hours + ":" + (minutes < 10 ? "0" : "") + minutes + (useFullFormat ? " hours" : "h");
  }
}

export function formatSinceTime(
  timestamp: string,
  useFullFormat?: boolean,
  noPostfix?: boolean,
): string {

  const postfix = noPostfix ? "" : " ago";
  const diffInSeconds = Math.max(
    0,
    Math.ceil(parseTime(timestamp).diffNow().as("seconds") * -1),
  );

  if (diffInSeconds < 60) {
    return useFullFormat
      ? diffInSeconds === 1
        ? `1 second${postfix}`
        : `${diffInSeconds} seconds${postfix}`
      : `${diffInSeconds}s${postfix}`;
  }

  const diffInMinutes = Math.round(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return useFullFormat
      ? diffInMinutes === 1
        ? `1 minute${postfix}`
        : `${diffInMinutes} minutes${postfix}`
      : diffInMinutes === 1
        ? `1min${postfix}`
        : `${diffInMinutes}mins${postfix}`;
  }

  const diffInHours = Math.round(diffInMinutes / 60);
  if (diffInHours < 24) {
    return useFullFormat
      ? diffInHours === 1
        ? `1 hour${postfix}`
        : `${diffInHours} hours${postfix}`
      : diffInHours === 1
        ? `1hr${postfix}`
        : `${diffInHours}hrs${postfix}`;
  }

  const diffInDays = Math.round(diffInHours / 24);
  if (diffInDays < 7) {
    return useFullFormat
      ? diffInDays === 1
        ? `1 day${postfix}`
        : `${diffInDays} days${postfix}`
      : diffInDays === 1
        ? `1d${postfix}`
        : `${diffInDays}d${postfix}`;
  }

  const diffInWeeks = Math.round(diffInDays / 7);
  if (diffInWeeks < 4) {
    return useFullFormat
      ? diffInWeeks === 1
        ? `1 week${postfix}`
        : `${diffInWeeks} weeks${postfix}`
      : diffInWeeks === 1
        ? `1wk${postfix}`
        : `${diffInWeeks}wks${postfix}`;
  }

  const diffInMonths = Math.round(diffInDays / 30);
  if (diffInMonths < 12) {
    return useFullFormat
      ? diffInMonths === 1
        ? `1 month${postfix}`
        : `${diffInMonths} months${postfix}`
      : diffInMonths === 1
        ? `1mo${postfix}`
        : `${diffInMonths}mos${postfix}`;
  }

  const diffInYears = Math.round(diffInDays / 365);
  return useFullFormat
    ? diffInYears === 1
      ? `1 year${postfix}`
      : `${diffInYears} years${postfix}`
    : diffInYears === 1
      ? `1yr${postfix}`
      : `${diffInYears}yrs${postfix}`;
}

export function formatCommit(commit: string) {
  return commit.slice(0, 7);
}
