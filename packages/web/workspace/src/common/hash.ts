export async function hash(input: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
    )
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
