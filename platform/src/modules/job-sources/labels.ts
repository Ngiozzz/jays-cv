// Words for the Job sources screen. Pure, so the browser can use them and the tests can check them.

const TIME = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit" });
const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" });

// When a source was last checked, in Nairobi time: "Today 05:00", "Yesterday 05:01", "3 days ago", "Never"
export function checkedLabel(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "Never";
  const when = new Date(iso);
  const days = Math.round((Date.parse(DAY.format(now)) - Date.parse(DAY.format(when))) / 86_400_000);
  if (days <= 0) return `Today ${TIME.format(when)}`;
  if (days === 1) return `Yesterday ${TIME.format(when)}`;
  return `${days} days ago`;
}

// What a check found, in a sentence
export function checkSummary(outcome: { found: number; added: number; waiting: number }): string {
  if (!outcome.found) return "No new jobs on this page right now. It will be checked again every morning.";
  const jobs = (n: number) => `${n} new job${n === 1 ? "" : "s"}`;
  return [
    `Found ${jobs(outcome.found)}: ${outcome.added} added to Bulk post, where the AI reads ${outcome.added === 1 ? "it" : "them"} for you to check.`,
    outcome.waiting ? `${outcome.waiting} more will be added tomorrow (daily limit).` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
