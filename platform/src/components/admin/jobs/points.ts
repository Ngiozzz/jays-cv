// A pasted list as separate points: one per line, without the bullets or numbers it came with
// ("• Prepare reports", "- Prepare reports", "1. Prepare reports", "a) Prepare reports")
export function splitPoints(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^(?:[•●▪◦‣∙·*–—-]|\(?(?:\d{1,2}|[a-zA-Z]|[ivxIVX]{1,4})[.)])\s*/, "")
        .trim(),
    )
    .filter(Boolean);
}
