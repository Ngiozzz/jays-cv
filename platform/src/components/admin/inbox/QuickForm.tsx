"use client";

import { useState, type ReactNode } from "react";
import { LOGO_SIZE, shrinkImage } from "@/components/admin/jobs/shrink-image";
import type { KnownCompany } from "@/components/admin/jobs/CompanyLogoField";
import { JobLogo } from "@/components/jobs/JobLogo";
import { companyKey } from "@/modules/jobs/companies";
import {
  APPLY_METHODS,
  ATTACH_OPTIONS,
  JOB_CATEGORIES,
  JOB_TYPES,
  MAX_TAGS,
  WORK_MODES,
  cleanTags,
  type ApplyDetails,
  type ApplyMethod,
  type JobInput,
} from "@/modules/jobs/jobs.schema";

const METHOD_LABEL: Record<ApplyMethod, string> = {
  email: "Email",
  link: "Online link",
  whatsapp: "WhatsApp",
  "in-person": "In person",
  other: "Other",
};

export type ChosenLogo = { file: File; url: string };

type Props = {
  job: JobInput;
  // Fields the AI wasn't sure about and nobody has confirmed yet
  unsure: string[];
  companies: KnownCompany[];
  logo: ChosenLogo | null;
  onChange: (job: JobInput) => void;
  onConfirm: (field: string) => void;
  onLogo: (logo: ChosenLogo) => void;
};

const lines = (text: string) => text.split("\n");

// Everything the AI read from the poster, corrected in place. The same steps and fields as
// Post a job (step 1, the poster, is beside this form), all open on one screen.
export function QuickForm({ job, unsure, companies, logo, onChange, onConfirm, onLogo }: Props) {
  const set = (patch: Partial<JobInput>) => onChange({ ...job, ...patch });
  const setApply = (patch: Partial<ApplyDetails>) => set({ apply: { ...job.apply, ...patch } });
  const method = job.apply.method;
  const only = (...methods: ApplyMethod[]) => methods.includes(method);
  const known = companies.find((company) => companyKey(company.name) === companyKey(job.company));

  const field = (key: string, label: string, control: ReactNode, full = false, id = `q-${key}`) => {
    const isUnsure = unsure.includes(key);
    return (
      <div className={["f", full ? "full" : "", isUnsure ? "unsure" : ""].filter(Boolean).join(" ")}>
        <label htmlFor={id}>{label}</label>
        {control}
        {isUnsure && (
          <small className="unsure-note">
            AI wasn&apos;t sure: check the poster.{" "}
            <button type="button" onClick={() => onConfirm(key)}>
              Looks right
            </button>
          </small>
        )}
      </div>
    );
  };

  const chooseLogo = async (file: File | undefined) => {
    if (!file) return;
    const small = await shrinkImage(file, LOGO_SIZE);
    onLogo({ file: small, url: URL.createObjectURL(small) });
  };

  return (
    <form className="d-form d-steps" noValidate onSubmit={(event) => event.preventDefault()}>
      <section className="d-step">
        <h3>
          <span className="n">2</span>The job
        </h3>
        <div className="d-fields">
          {field(
            "title",
            "Job title *",
            <input id="q-title" value={job.title} onChange={(e) => set({ title: e.target.value })} />,
            true,
          )}
          {field(
            "company",
            "Company *",
            <>
              <input
                id="q-company"
                value={job.company}
                list="q-known-companies"
                autoComplete="off"
                onChange={(e) => set({ company: e.target.value })}
              />
              {/* Suggests companies already used, so their saved logo is picked up */}
              <datalist id="q-known-companies">
                {companies.map((company) => (
                  <option key={company.name} value={company.name} />
                ))}
              </datalist>
            </>,
          )}
          {field(
            "location",
            "Location *",
            <input id="q-location" value={job.location} onChange={(e) => set({ location: e.target.value })} />,
          )}
          <div className="f full logo-field">
            <span className="label">Company logo</span>
            <div className="logo-field-row">
              <JobLogo company={job.company || "?"} logoUrl={logo?.url ?? known?.logoUrl ?? null} />
              <label className="btn btn-ghost btn-sm">
                {logo || known?.logoUrl ? "Replace logo" : "Add logo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  aria-label="Logo image"
                  onChange={(event) => void chooseLogo(event.target.files?.[0])}
                />
              </label>
            </div>
            <small>
              {logo
                ? "New logo: saved when you approve, and used for this company from now on."
                : known?.logoUrl
                  ? `Saved logo for ${known.name}.`
                  : "No logo yet: initials are shown instead. Add one if you have it."}
            </small>
          </div>
          {field(
            "category",
            "Category",
            <select
              id="q-category"
              value={job.category}
              onChange={(e) => set({ category: e.target.value as JobInput["category"] })}
            >
              <option value="">Choose…</option>
              {JOB_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>,
          )}
          {field(
            "type",
            "Job type",
            <select id="q-type" value={job.type} onChange={(e) => set({ type: e.target.value as JobInput["type"] })}>
              {JOB_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>,
          )}
          {field(
            "workMode",
            "Work setting",
            <select
              id="q-workMode"
              value={job.workMode}
              onChange={(e) => set({ workMode: e.target.value as JobInput["workMode"] })}
            >
              {WORK_MODES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>,
          )}
          {field(
            "salary",
            "Salary",
            <input
              id="q-salary"
              value={job.salary}
              placeholder="Only if the poster says, e.g. KES 60,000"
              onChange={(e) => set({ salary: e.target.value })}
            />,
          )}
        </div>
      </section>

      <section className="d-step">
        <h3>
          <span className="n">3</span>Details
        </h3>
        <div className="d-fields">
          {field(
            "summary",
            "About the role",
            <textarea id="q-summary" rows={3} value={job.summary} onChange={(e) => set({ summary: e.target.value })} />,
            true,
          )}
          {field(
            "responsibilities",
            "Responsibilities (one per line)",
            <textarea
              id="q-responsibilities"
              rows={5}
              value={job.responsibilities.join("\n")}
              onChange={(e) => set({ responsibilities: lines(e.target.value) })}
            />,
          )}
          {field(
            "requirements",
            "Requirements (one per line)",
            <textarea
              id="q-requirements"
              rows={5}
              value={job.requirements.join("\n")}
              onChange={(e) => set({ requirements: lines(e.target.value) })}
            />,
          )}
          {field(
            "tags",
            `Search tags (commas, up to ${MAX_TAGS}; each gets its own page people find on Google)`,
            <TagsInput tags={job.tags} onChange={(tags) => set({ tags })} />,
            true,
          )}
        </div>
      </section>

      <section className="d-step">
        <h3>
          <span className="n">4</span>Deadline
        </h3>
        <div className="d-fields">
          {field(
            "deadline",
            "Application deadline",
            <>
              <input
                id="q-deadline"
                type="date"
                value={job.deadline ?? ""}
                disabled={job.openEnded}
                onChange={(e) => set({ deadline: e.target.value || null })}
              />
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={job.openEnded}
                  onChange={(e) =>
                    set({ openEnded: e.target.checked, deadline: e.target.checked ? null : job.deadline })
                  }
                />{" "}
                Open until filled (no deadline)
              </label>
            </>,
            true,
          )}
        </div>
      </section>

      <section className="d-step">
        <h3>
          <span className="n">5</span>How to apply
        </h3>
        <div className="method-picker" role="radiogroup" aria-label="Application method">
          {APPLY_METHODS.map((value) => (
            <label key={value}>
              <input
                type="radio"
                name={`q-method`}
                value={value}
                checked={method === value}
                onChange={() => setApply({ method: value })}
              />
              {METHOD_LABEL[value]}
            </label>
          ))}
        </div>
        <div className="d-fields">
          {only("email") &&
            field(
              "target",
              "Send applications to *",
              <input
                id="q-target"
                type="email"
                value={job.apply.email}
                placeholder="recruitment@company.com"
                onChange={(e) => setApply({ email: e.target.value })}
              />,
            )}
          {only("email") &&
            field(
              "subject",
              "Email subject line",
              <input
                id="q-subject"
                value={job.apply.subject}
                placeholder="e.g. I.T SPECIALIST"
                onChange={(e) => setApply({ subject: e.target.value })}
              />,
            )}
          {only("link") &&
            field(
              "target",
              "Application link *",
              <input
                id="q-target"
                type="url"
                value={job.apply.url}
                placeholder="https://"
                onChange={(e) => setApply({ url: e.target.value })}
              />,
              true,
            )}
          {only("whatsapp") &&
            field(
              "target",
              "WhatsApp / phone number *",
              <input
                id="q-target"
                type="tel"
                value={job.apply.phone}
                placeholder="07XX XXX XXX"
                onChange={(e) => setApply({ phone: e.target.value })}
              />,
            )}
          {only("in-person") &&
            field(
              "target",
              "Where to apply *",
              <input
                id="q-target"
                value={job.apply.address}
                placeholder="Address or building"
                onChange={(e) => setApply({ address: e.target.value })}
              />,
            )}
          {only("in-person") &&
            field(
              "when",
              "When",
              <input
                id="q-when"
                value={job.apply.when}
                placeholder="e.g. Monday 6 Oct, 9am–1pm"
                onChange={(e) => setApply({ when: e.target.value })}
              />,
            )}
          {only("email", "in-person") && (
            <div className="f full">
              <span className="label">What to send or bring</span>
              <div className="chip-checks">
                {ATTACH_OPTIONS.map((option) => (
                  <label key={option}>
                    <input
                      type="checkbox"
                      checked={job.apply.attach.includes(option)}
                      onChange={(e) =>
                        setApply({
                          attach: e.target.checked
                            ? [...job.apply.attach, option]
                            : job.apply.attach.filter((item) => item !== option),
                        })
                      }
                    />{" "}
                    {option}
                  </label>
                ))}
              </div>
            </div>
          )}
          {field(
            method === "other" ? "target" : "notes",
            method === "other" ? "How to apply *" : "Special instructions",
            <textarea
              id={method === "other" ? "q-target" : "q-notes"}
              rows={2}
              value={job.apply.notes}
              placeholder="e.g. State your current and expected salary. Only shortlisted candidates will be contacted."
              onChange={(e) => setApply({ notes: e.target.value })}
            />,
            true,
            method === "other" ? "q-target" : "q-notes",
          )}
          {field(
            "source",
            "Where did you find this advert?",
            <input
              id="q-source"
              value={job.source}
              placeholder="e.g. Company's LinkedIn page"
              onChange={(e) => set({ source: e.target.value })}
            />,
            true,
          )}
        </div>
      </section>
    </form>
  );
}

// Typed as one line ("CPA, Nairobi"); kept as text while typing so commas and spaces aren't eaten,
// and refilled when the job's tags change from outside (another poster chosen, the AI's reading)
function TagsInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [text, setText] = useState(tags.join(", "));
  if (cleanTags(text.split(",")).join("|") !== cleanTags(tags).join("|")) setText(tags.join(", "));
  return (
    <input
      id="q-tags"
      value={text}
      placeholder="e.g. CPA, Accounting, Nairobi, Entry level"
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value.split(","));
      }}
    />
  );
}
