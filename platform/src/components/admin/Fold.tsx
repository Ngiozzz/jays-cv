"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/IconSprite";

// Which sections are open, remembered in this browser so the screen opens the way it was left
const KEY = "jaycvs-folds";
const listeners = new Set<() => void>();

function saved(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function useFold(id: string, defaultOpen: boolean): [boolean, (open: boolean) => void] {
  // The server (and the first paint) uses the default, so hydration always matches
  const open = useSyncExternalStore(
    subscribe,
    () => saved()[id] ?? defaultOpen,
    () => defaultOpen,
  );
  const setOpen = (value: boolean) => {
    localStorage.setItem(KEY, JSON.stringify({ ...saved(), [id]: value }));
    listeners.forEach((listener) => listener());
  };
  return [open, setOpen];
}

type Props = {
  id: string;
  title: string;
  icon?: IconName;
  // Shown beside the title, e.g. how many are inside
  count?: number | string;
  // A quieter line beside the title, e.g. "3 new"
  note?: ReactNode;
  defaultOpen?: boolean;
  // Buttons on the right of the header (they don't open or close it)
  actions?: ReactNode;
  // "panel": a section of the page; "group": a group inside a section
  variant?: "panel" | "group";
  className?: string;
  children: ReactNode;
};

// A section that opens and closes from its header, like the labels down the side of Gmail
export function Fold({
  id,
  title,
  icon,
  count,
  note,
  defaultOpen = true,
  actions,
  variant = "panel",
  className,
  children,
}: Props) {
  const [open, setOpen] = useFold(id, defaultOpen);
  const Heading = variant === "panel" ? "h2" : "h3";
  return (
    <section className={["fold", `fold-${variant}`, open ? "is-open" : "", className ?? ""].filter(Boolean).join(" ")}>
      <div className="fold-head">
        <button
          type="button"
          className="fold-toggle"
          aria-expanded={open}
          aria-controls={`${id}-body`}
          onClick={() => setOpen(!open)}
        >
          <Icon name="chevron-down" size={16} className="fold-chev" />
          {icon && <Icon name={icon} size={18} className="fold-icon" />}
          <Heading>{title}</Heading>
          {count !== undefined && <span className="fold-count">{count}</span>}
          {note && <span className="fold-note">{note}</span>}
        </button>
        {actions && <div className="fold-actions">{actions}</div>}
      </div>
      {open && (
        <div className="fold-body" id={`${id}-body`}>
          {children}
        </div>
      )}
    </section>
  );
}
