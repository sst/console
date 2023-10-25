export function countLeadingSpaces(str: string) {
  let count = 0;
  for (let char of str) {
    if (char === " ") {
      count++;
    } else if (char === "\t") {
      count += 2;
    } else {
      break;
    }
  }
  return count;
}
