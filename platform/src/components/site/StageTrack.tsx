// The stage track, the site's signature: a row of short bars, done ones dark, the current one gold
export function StageTrack({ of, at }: { of: number; at: number }) {
  return (
    <span className="track" aria-hidden="true">
      {Array.from({ length: of }, (_, i) => (
        <i key={i} className={i < at ? "done" : i === at ? "now" : undefined} />
      ))}
    </span>
  );
}
