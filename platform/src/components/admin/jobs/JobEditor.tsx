"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { deleteJobAction, saveJobAction } from "@/app/(admin)/admin/(signed-in)/jobs/actions";
import { JobCard } from "@/components/jobs/JobCard";
import type { JobDisplayStatus } from "@/modules/jobs/jobs.rules";
import {
  JOB_CATEGORIES,
  JOB_TYPES,
  WORK_MODES,
  previewOf,
  publishProblems,
  type JobInput,
} from "@/modules/jobs/jobs.schema";
import { companyKey } from "@/modules/jobs/companies";
import { ApplyFields } from "./ApplyFields";
import { CompanyLogoField, type KnownCompany } from "./CompanyLogoField";
import { FormField } from "./FormField";
import { JobStatusPill } from "./JobStatusPill";
import { PosterSection } from "./PosterSection";

type Props = {
  jobId: string | null;
  initial: JobInput;
  status: JobDisplayStatus | "new";
  today: string;
  posterUrl: string | null;
  aiPretend: boolean;
  companies: KnownCompany[];
};

export function JobEditor({ jobId, initial, status, today, posterUrl, aiPretend, companies }: Props) {
  const [state, save, saving] = useActionState(saveJobAction.bind(null, jobId), null);
  const [values, setValues] = useState(initial);
  const [live, setLive] = useState(initial);
  // Bumped when the AI fills the form, so the fields re-render with its values
  const [fillCount, setFillCount] = useState(0);
  const fields = useRef<HTMLDivElement>(null);
  const errors = state?.fieldErrors ?? {};

  // Highlight what the AI filled in, until the person edits it (see onInput below)
  useEffect(() => {
    if (!fillCount || !fields.current) return;
    fields.current.querySelectorAll<HTMLInputElement>("input, textarea, select").forEach((el) => {
      const filled = el.type === "checkbox" || el.type === "radio" ? false : Boolean(el.value);
      el.classList.toggle("ai-filled", filled);
    });
  }, [fillCount]);

  const fillFromPoster = (job: JobInput) => {
    setValues(job);
    setLive(job);
    setFillCount((count) => count + 1);
  };

  // Live preview and checklist follow what's typed
  const readForm = (form: HTMLFormElement) => {
    const preview = previewOf(new FormData(form));
    if (preview) setLive(preview);
  };

  // Submitted by hand (not through the form's action) so typed text stays if something needs fixing
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const native = event.nativeEvent as SubmitEvent;
    const data = new FormData(event.currentTarget, native.submitter);
    startTransition(() => save(data));
  };

  return (
    <form
      className="post-layout"
      noValidate
      onSubmit={submit}
      onInput={(e) => {
        (e.target as HTMLElement).classList.remove("ai-filled");
        readForm(e.currentTarget);
      }}
      onChange={(e) => readForm(e.currentTarget)}
    >
      <div className="post-form">
        <PosterSection existingUrl={posterUrl} error={errors.poster} aiPretend={aiPretend} onRead={fillFromPoster} />
        <div ref={fields} key={fillCount} className="post-fields">
          <BasicsSection initial={values} errors={errors} company={live.company} companies={companies} />
          <DetailsSection initial={values} />
          <DeadlineSection initial={values} openEnded={live.openEnded} error={errors.deadline} />
          <section className="form-section">
            <h2>
              <span className="n">5</span>How to apply
            </h2>
            <p className="hint">Choose how the employer wants applications. Only the fields you need will show.</p>
            <ApplyFields initial={values.apply} method={live.apply.method} errors={errors} />
            <div className="fgrid">
              <FormField
                id="f-source"
                label="Where did you find this advert?"
                full
                hint="Shown on the job page so readers can see the original source."
              >
                <input
                  type="text"
                  id="f-source"
                  name="source"
                  defaultValue={values.source}
                  placeholder="e.g. Company's LinkedIn page"
                />
              </FormField>
            </div>
          </section>
        </div>
      </div>

      <aside className="post-aside">
        <section className="panel panel-body">
          <p className="preview-label">Live preview</p>
          <JobCard
            {...live}
            deadline={live.openEnded ? null : live.deadline}
            today={today}
            logoUrl={companies.find((c) => companyKey(c.name) === companyKey(live.company))?.logoUrl}
          />
        </section>
        <Checklist job={live} />
        <section className="panel panel-body publish-box">
          <div className="publish-meta">
            <span>Status</span>
            <JobStatusPill status={status} />
          </div>
          {Object.keys(errors).length > 0 && (
            <p className="field-error" role="alert">
              Please fix the highlighted fields.
            </p>
          )}
          <button type="submit" name="intent" value="publish" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : status === "published" ? "Save changes" : "Publish job"}
          </button>
          <button type="submit" name="intent" value="draft" className="btn btn-ghost" disabled={saving}>
            {status === "published" || status === "expired" ? "Move to drafts" : "Save as draft"}
          </button>
          {jobId && <DeleteJob jobId={jobId} title={initial.title} />}
        </section>
      </aside>
    </form>
  );
}

type BasicsProps = { initial: JobInput; errors: Record<string, string>; company: string; companies: KnownCompany[] };

function BasicsSection({ initial, errors, company, companies }: BasicsProps) {
  return (
    <section className="form-section">
      <h2>
        <span className="n">2</span>The job
      </h2>
      <p className="hint">What it is, who&apos;s hiring and where.</p>
      <div className="fgrid">
        <FormField id="f-title" label="Job title" required full error={errors.title}>
          <input type="text" id="f-title" name="title" defaultValue={initial.title} placeholder="e.g. I.T Specialist" />
        </FormField>
        <FormField
          id="f-company"
          label="Company"
          required
          error={errors.company}
          hint='If the advert hides the name, describe it, e.g. "Private hospital, Nairobi".'
        >
          <input
            type="text"
            id="f-company"
            name="company"
            defaultValue={initial.company}
            placeholder="e.g. Kilimall"
            list="known-companies"
            autoComplete="off"
          />
          {/* Suggests companies already used, so their saved logo is picked up */}
          <datalist id="known-companies">
            {companies.map((c) => (
              <option key={c.name} value={c.name} />
            ))}
          </datalist>
        </FormField>
        <FormField id="f-location" label="Location" required error={errors.location}>
          <input
            type="text"
            id="f-location"
            name="location"
            defaultValue={initial.location}
            placeholder="e.g. Nairobi (Mombasa Road)"
          />
        </FormField>
        <CompanyLogoField company={company} known={companies} error={errors.companyLogo} />
        <FormField id="f-category" label="Category">
          <select id="f-category" name="category" defaultValue={initial.category}>
            <option value="">Choose a category</option>
            {JOB_CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </FormField>
        <FormField id="f-type" label="Job type">
          <select id="f-type" name="type" defaultValue={initial.type}>
            {JOB_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </FormField>
        <FormField id="f-mode" label="Work setting">
          <select id="f-mode" name="workMode" defaultValue={initial.workMode}>
            {WORK_MODES.map((mode) => (
              <option key={mode}>{mode}</option>
            ))}
          </select>
        </FormField>
        <FormField id="f-salary" label="Salary">
          <input
            type="text"
            id="f-salary"
            name="salary"
            defaultValue={initial.salary}
            placeholder="Only if the advert says, e.g. KES 60,000"
          />
        </FormField>
      </div>
    </section>
  );
}

function DetailsSection({ initial }: { initial: JobInput }) {
  return (
    <section className="form-section">
      <h2>
        <span className="n">3</span>Details
      </h2>
      <p className="hint">Written text helps people find the job on Google. Put one item per line.</p>
      <div className="fgrid">
        <FormField id="f-summary" label="About the role" full>
          <textarea
            id="f-summary"
            name="summary"
            rows={3}
            defaultValue={initial.summary}
            placeholder="One or two sentences about the job"
          />
        </FormField>
        <FormField id="f-resp" label="Responsibilities">
          <textarea
            id="f-resp"
            name="responsibilities"
            rows={6}
            defaultValue={initial.responsibilities.join("\n")}
            placeholder="One per line"
          />
        </FormField>
        <FormField id="f-req" label="Requirements">
          <textarea
            id="f-req"
            name="requirements"
            rows={6}
            defaultValue={initial.requirements.join("\n")}
            placeholder="One per line"
          />
        </FormField>
      </div>
    </section>
  );
}

function DeadlineSection({ initial, openEnded, error }: { initial: JobInput; openEnded: boolean; error?: string }) {
  return (
    <section className="form-section">
      <h2>
        <span className="n">4</span>Deadline
      </h2>
      <p className="hint">The job hides from the website automatically after this date.</p>
      <div className="fgrid">
        <FormField id="f-deadline" label="Application deadline" required={!openEnded} error={error}>
          <input
            type="date"
            id="f-deadline"
            name="deadline"
            defaultValue={initial.deadline ?? ""}
            disabled={openEnded}
          />
        </FormField>
        <div className="f" style={{ justifyContent: "flex-end" }}>
          <label className="inline-check" style={{ paddingBottom: 12 }}>
            <input type="checkbox" name="openEnded" defaultChecked={initial.openEnded} /> Open until filled (no
            deadline)
          </label>
        </div>
      </div>
    </section>
  );
}

function Checklist({ job }: { job: JobInput }) {
  const problems = job.title ? publishProblems(job).map((p) => p.path) : ["title"];
  const missing = (...paths: string[]) => paths.some((path) => problems.some((p) => p.startsWith(path)));
  const items = [
    { label: "Title, company & location", ok: !missing("title", "company", "location") },
    { label: "Job details", ok: Boolean(job.summary || job.responsibilities.length || job.requirements.length) },
    { label: "Deadline", ok: !missing("deadline") },
    { label: "How to apply", ok: !missing("apply") },
  ];
  return (
    <section className="panel panel-body">
      <p className="preview-label">Ready to publish?</p>
      <ul className="checklist">
        {items.map((item) => (
          <li key={item.label} className={item.ok ? "ok" : undefined}>
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DeleteJob({ jobId, title }: { jobId: string; title: string }) {
  const confirmDelete = () => {
    if (window.confirm(`Delete "${title}"? This can't be undone.`)) {
      startTransition(() => deleteJobAction(jobId, "editor"));
    }
  };
  return (
    <div className="publish-foot">
      <button type="button" className="link-btn danger" onClick={confirmDelete}>
        Delete job
      </button>
    </div>
  );
}
