"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// "Draft within 48 hours" on the server and while hydrating, then "Draft by Thu 26 Nov" in the
// browser, so a cached page still shows the right day. React renders both versions itself (the server
// snapshot is the fallback), so hydration always matches.
export function DraftByDate({ hours }: { hours: number }) {
  const due = useSyncExternalStore(
    subscribe,
    () =>
      new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000 + hours * 3_600_000).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    () => null,
  );
  return <b>{due ? `Draft by ${due}` : `Draft within ${hours} hours`}</b>;
}
