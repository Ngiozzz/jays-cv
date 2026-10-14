"use client";

import { useTransition } from "react";
import { undoChangeAction } from "@/app/(admin)/admin/(signed-in)/content/actions";
import type { RecentChange } from "@/modules/content/admin/content-admin.service";
import { useToast } from "./useSave";

const ago = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
};

// Who changed what, newest first. The newest change in each section can be undone.
export function RecentChanges({ changes }: { changes: RecentChange[] }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const undo = (change: RecentChange) =>
    startTransition(async () => {
      const result = await undoChangeAction(change.id);
      toast(result.ok ? { text: result.message, error: false } : { text: result.error, error: true });
    });

  return (
    <aside className="panel content-aside">
      <div className="panel-head">
        <h2>Recent changes</h2>
      </div>
      <ul className="change-list">
        {changes.map((change) => (
          <li key={change.id}>
            <div>
              <p>
                <b>{change.who}</b> {change.summary}
              </p>
              <small>
                {change.section} · {ago(change.at)}
              </small>
            </div>
            {change.undoable && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={pending}
                onClick={() => undo(change)}
                aria-label={`Undo: ${change.summary}`}
              >
                Undo
              </button>
            )}
          </li>
        ))}
        {changes.length === 0 && <li className="empty-note">No changes yet. Edits you save appear here, with undo.</li>}
      </ul>
      <div className="panel-body">
        <a className="btn btn-ghost btn-block" href="/" target="_blank" rel="noopener">
          Open the website ↗
        </a>
      </div>
    </aside>
  );
}
