import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/icons/Icon";
import type { ApplyDetails } from "@/modules/jobs/jobs.schema";
import { APPLY_LABEL } from "./JobCard";

type Props = { apply: ApplyDetails; jobTitle: string; deadlineLine: string };

// The "How to apply" box on a job page: exactly what the employer asked for, with copy buttons
export function HowToApply({ apply, jobTitle, deadlineLine }: Props) {
  return (
    <section className="apply-box card" id="how-to-apply">
      <h2>
        <Icon name={APPLY_LABEL[apply.method].icon} />
        How to apply
      </h2>
      <ApplySteps apply={apply} jobTitle={jobTitle} />
      <p className="apply-deadline">
        <Icon name="clock" />
        {deadlineLine}
      </p>
    </section>
  );
}

function ApplySteps({ apply, jobTitle }: { apply: ApplyDetails; jobTitle: string }) {
  const notes = apply.notes && (
    <p className="apply-notes">
      <Icon name="info" />
      {apply.notes}
    </p>
  );
  switch (apply.method) {
    case "email":
      return (
        <>
          <p>Send your application by email:</p>
          <ApplyRow label="Send to" value={apply.email} copy />
          {apply.subject && <ApplyRow label="Subject" value={apply.subject} copy />}
          <Attachments label="Attach" items={apply.attach} />
          {notes}
          <a
            className="btn btn-primary btn-block"
            href={`mailto:${apply.email}?subject=${encodeURIComponent(apply.subject || jobTitle)}`}
          >
            <Icon name="mail" />
            Open in my email app
          </a>
        </>
      );
    case "link":
      return (
        <>
          <p>Apply through the employer&apos;s online application page.</p>
          {notes}
          {/* nofollow: we don't vouch for every employer's site */}
          <a className="btn btn-primary btn-block" href={apply.url} target="_blank" rel="noopener nofollow">
            <Icon name="link" />
            Apply on the employer&apos;s website
          </a>
        </>
      );
    case "whatsapp":
      return (
        <>
          <p>Send your CV on WhatsApp:</p>
          <ApplyRow label="Number" value={apply.phone} copy />
          {notes}
        </>
      );
    case "in-person":
      return (
        <>
          <p>Apply in person:</p>
          <ApplyRow label="Where" value={apply.address} />
          {apply.when && <ApplyRow label="When" value={apply.when} />}
          <Attachments label="Bring" items={apply.attach} />
          {notes}
        </>
      );
    default:
      return notes || <p>See the original advert for how to apply.</p>;
  }
}

function ApplyRow({ label, value, copy = false }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="apply-row">
      <span>{label}</span>
      <strong>{value}</strong>
      {copy && <CopyButton text={value} label="Copy" className="copy-btn" />}
    </div>
  );
}

function Attachments({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="apply-row">
      <span>{label}</span>
      <ul className="ticks">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
