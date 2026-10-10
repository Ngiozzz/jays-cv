// How package rules read on the website

type RevisionTerms = { revisionRounds: number | null; revisionWindowDays: number | null };

export function revisionsLabel({ revisionRounds, revisionWindowDays }: RevisionTerms): string {
  if (revisionRounds === null) {
    return revisionWindowDays ? `Unlimited (${revisionWindowDays} days)` : "Unlimited";
  }
  return `${revisionRounds} round${revisionRounds === 1 ? "" : "s"}`;
}

export function draftTimeLabel(hours: number): string {
  if (hours % 24 === 0 && hours > 48) {
    const days = hours / 24;
    return `${days} days`;
  }
  return `${hours} hours`;
}

// "Graduates & entry-level roles" → "For graduates & entry-level roles."
export function forWhomSentence(bestFor: string): string {
  return `For ${bestFor.charAt(0).toLowerCase()}${bestFor.slice(1)}.`;
}

// Pre-filled WhatsApp message when a client picks a package before online ordering (phase 3) exists
export function packageOrderMessage(shortName: string): string {
  return `Hi Jay CVS, I'd like the ${shortName} package`;
}
