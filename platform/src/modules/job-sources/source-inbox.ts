// Job sources as an inbox (pure, shared by the screen and the server): a source is unread when it has
// found jobs since the owner last opened it, or when they marked it unread by hand, like Gmail.

export type ReadState = { readAt: Date | null; markedUnread: boolean };
export type Find = { createdAt: Date };

// How many jobs it found since it was last opened, and whether it shows as unread
export function readStateOf(source: ReadState, finds: Find[]): { unread: boolean; newCount: number } {
  const newCount = finds.filter((find) => !source.readAt || find.createdAt > source.readAt).length;
  return { unread: source.markedUnread || newCount > 0, newCount };
}

export type SourceGroupKey = "unread" | "attention" | "rest";

// Where a source sits on the screen: new finds first, then the ones that need a look (failing or
// switched off), then everything else. A source with both new finds and a problem shows under new finds.
export function groupOf(source: { unread: boolean; enabled: boolean; lastError: string | null }): SourceGroupKey {
  if (source.unread) return "unread";
  if (!source.enabled || source.lastError) return "attention";
  return "rest";
}

export const SOURCE_GROUPS: { key: SourceGroupKey; title: string; empty: string }[] = [
  { key: "unread", title: "New jobs found", empty: "Nothing new since you last looked." },
  { key: "attention", title: "Needs attention", empty: "Every source is working." },
  { key: "rest", title: "Everything else", empty: "No other sources." },
];

// Typed in the search box: matches the name or the website
export function matchesSearch(source: { name: string; site: string }, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const text = `${source.name} ${source.site}`.toLowerCase();
  return words.every((word) => text.includes(word));
}
