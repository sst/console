import { parse } from "relaxed-json";
export function extractJSON(input: string) {
  const stack = [];
  const results = [];
  let startIdx = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === "{") {
      stack.push("{");
      if (stack.length === 1) {
        startIdx = i;
      }
    }

    if (char === "}") {
      stack.pop();
      if (stack.length === 0) {
        try {
          const jsonString = input.substring(startIdx, i + 1);
          console.log(jsonString);
          const jsonObj = parse(jsonString);
          results.push(jsonObj);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }

  return results;
}
