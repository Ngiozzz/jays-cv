// The number inside a homepage fact, so it can count up: "2,000+" → 2000 with "+" after it and
// thousands commas, "4.9/5" → 4.9 with one decimal place and "/5" after it. Null when there's no number.
export function splitCount(value: string) {
  const match = /^(\D*?)(\d[\d,]*(?:\.\d+)?)([^]*)$/.exec(value);
  if (!match) return null;
  const [, prefix, number, suffix] = match;
  const decimals = number.includes(".") ? number.split(".")[1].length : 0;
  const commas = number.includes(",");
  const target = Number(number.replace(/,/g, ""));
  if (!Number.isFinite(target)) return null;
  const format = (n: number) => {
    const fixed = n.toFixed(decimals);
    if (!commas) return fixed;
    const [whole, fraction] = fixed.split(".");
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return fraction ? `${grouped}.${fraction}` : grouped;
  };
  return { prefix, suffix, target, format };
}
