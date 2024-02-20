export module Pulumi {
  export function nameFromURN(input: string) {
    return input.split("::").at(-1)!;
  }
}
