import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";

// After publishing: the post for the Job Vacancies WhatsApp channel, ready to copy and paste
export function PublishedNotice({ channelPost }: { channelPost: string }) {
  return (
    <section className="panel panel-body published-notice">
      <h2>Job published 🎉</h2>
      <p>Post it to the Jay CVS Job Vacancies channel on WhatsApp:</p>
      <textarea className="wa-text" readOnly rows={10} value={channelPost} aria-label="WhatsApp channel post" />
      <div className="published-actions">
        <CopyButton text={channelPost} label="Copy for WhatsApp" />
        <Link className="btn btn-ghost btn-sm" href="/admin/jobs/new">
          Post another job
        </Link>
        <Link className="btn btn-ghost btn-sm" href="/admin/jobs">
          Back to all jobs
        </Link>
      </div>
    </section>
  );
}
