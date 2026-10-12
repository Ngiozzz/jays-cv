"use client";

import Link from "next/link";
import { useActionState } from "react";
import { deleteJobAction, setPublishedAction } from "@/app/(admin)/admin/(signed-in)/jobs/actions";
import { Icon } from "@/components/icons/Icon";
import type { JobDisplayStatus } from "@/modules/jobs/jobs.rules";

type Props = { jobId: string; title: string; shownAs: JobDisplayStatus };

export function JobRowActions({ jobId, title, shownAs }: Props) {
  const publish = shownAs === "draft";
  const [state, toggle, pending] = useActionState(setPublishedAction.bind(null, jobId, publish), null);

  const confirmDelete = (event: React.FormEvent) => {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) event.preventDefault();
  };

  return (
    <div className="cell-actions">
      <Link className="icon-btn" href={`/admin/jobs/${jobId}`} title="Edit">
        <Icon name="edit" />
      </Link>
      <form action={toggle}>
        <button type="submit" className="icon-btn" title={publish ? "Publish" : "Move to drafts"} disabled={pending}>
          <Icon name={publish ? "upload" : "eye-off"} />
        </button>
      </form>
      <form action={deleteJobAction.bind(null, jobId, "list")} onSubmit={confirmDelete}>
        <button type="submit" className="icon-btn danger" title="Delete">
          <Icon name="trash" />
        </button>
      </form>
      {state?.error && (
        <p className="field-error row-error" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}
