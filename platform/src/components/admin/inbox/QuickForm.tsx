"use client";

import type { ReactNode } from "react";
import { APPLY_TARGET } from "@/modules/inbox/inbox.flags";
import { JOB_CATEGORIES, JOB_TYPES, WORK_MODES, type ApplyMethod, type JobInput } from "@/modules/jobs/jobs.schema";

const METHODS: { value: ApplyMethod; label: string; target: string; placeholder: string }[] = [
  { value: "email", label: "Email", target: "Send applications to", placeholder: "careers@company.co.ke" },
  { value: "link", label: "Online link", target: "Application link", placeholder: "https://" },
  { value: "whatsapp", label: "WhatsApp / phone", target: "WhatsApp / phone number", placeholder: "07XX XXX XXX" },
  { value: "in-person", label: "In person", target: "Where to apply", placeholder: "Address or building" },
  { value: "other", label: "Other", target: "How to apply", placeholder: "What the poster says" },
];

type Props = {
  job: JobInput;
  // Fields the AI wasn't sure about and nobody has confirmed yet
  unsure: string[];
  onChange: (job: JobInput) => void;
  onConfirm: (field: string) => void;
};

// The main details next to the poster, corrected in place. Everything else the AI read (responsibilities,
// salary, notes…) is kept and published too; it can be edited later in the full job form.
export function QuickForm({ job, unsure, onChange, onConfirm }: Props) {
  const set = (patch: Partial<JobInput>) => onChange({ ...job, ...patch });
  const method = METHODS.find((m) => m.value === job.apply.method) ?? METHODS[0];
  const targetKey = APPLY_TARGET[job.apply.method];

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

  return (
    <form className="d-form" noValidate onSubmit={(event) => event.preventDefault()}>
      {field(
        "title",
        "Job title *",
        <input id="q-title" value={job.title} onChange={(e) => set({ title: e.target.value })} />,
        true,
      )}
      {field(
        "company",
        "Company *",
        <input id="q-company" value={job.company} onChange={(e) => set({ company: e.target.value })} />,
      )}
      {field(
        "location",
        "Location *",
        <input id="q-location" value={job.location} onChange={(e) => set({ location: e.target.value })} />,
      )}
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
        "deadline",
        "Deadline",
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
              onChange={(e) => set({ openEnded: e.target.checked, deadline: e.target.checked ? null : job.deadline })}
            />{" "}
            Open until filled
          </label>
        </>,
      )}
      {field(
        "apply",
        "How to apply",
        <select
          id="q-apply"
          value={job.apply.method}
          onChange={(e) => set({ apply: { ...job.apply, method: e.target.value as ApplyMethod } })}
        >
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>,
      )}
      {field(
        "target",
        `${method.target} *`,
        <input
          id="q-target"
          value={job.apply[targetKey]}
          placeholder={method.placeholder}
          onChange={(e) => set({ apply: { ...job.apply, [targetKey]: e.target.value } })}
        />,
        true,
      )}
      {field(
        "summary",
        "About the role",
        <textarea id="q-summary" rows={2} value={job.summary} onChange={(e) => set({ summary: e.target.value })} />,
        true,
      )}
      {field(
        "requirements",
        "Requirements (one per line)",
        <textarea
          id="q-requirements"
          rows={4}
          value={job.requirements.join("\n")}
          onChange={(e) => set({ requirements: e.target.value.split("\n") })}
        />,
        true,
      )}
    </form>
  );
}
