"use client";

import { Icon } from "@/components/icons/Icon";
import { startTransition, useActionState, useRef } from "react";
import { removeLogoAction, uploadLogoAction } from "@/app/(admin)/admin/(signed-in)/companies/actions";
import { JobLogo } from "@/components/jobs/JobLogo";
import { LOGO_SIZE, shrinkImage } from "./shrink-image";

type Props = { id: string; name: string; logoUrl: string | null; jobCount: number };

// One company on the Company logos screen: choosing an image uploads it straight away
export function CompanyLogoRow({ id, name, logoUrl, jobCount }: Props) {
  const [state, upload, uploading] = useActionState(uploadLogoAction.bind(null, id), null);
  const input = useRef<HTMLInputElement>(null);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    const data = new FormData();
    data.set("logo", await shrinkImage(file, LOGO_SIZE));
    startTransition(() => upload(data));
    if (input.current) input.current.value = "";
  };

  const remove = () => {
    if (window.confirm(`Remove the ${name} logo? Its jobs will show initials instead.`)) {
      startTransition(() => removeLogoAction(id));
    }
  };

  return (
    <tr>
      <td>
        <div className="cell-job">
          <JobLogo company={name} logoUrl={logoUrl} />
          <strong>{name}</strong>
        </div>
      </td>
      <td>{jobCount}</td>
      <td>
        {logoUrl ? (
          <span className="status status-published">Has logo</span>
        ) : (
          <span className="cell-muted">Initials</span>
        )}
      </td>
      <td>
        <div className="cell-actions">
          <label className="btn btn-ghost btn-sm">
            {uploading ? "Uploading…" : logoUrl ? "Replace" : "Add logo"}
            <input
              ref={input}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              aria-label={`Logo for ${name}`}
              disabled={uploading}
              onChange={(event) => void choose(event.target.files?.[0])}
            />
          </label>
          {logoUrl && (
            <button type="button" className="btn btn-danger btn-sm" onClick={remove}>
              <Icon name="trash" />
              Remove
            </button>
          )}
          {state?.error && (
            <p className="field-error row-error" role="alert">
              {state.error}
            </p>
          )}
        </div>
      </td>
    </tr>
  );
}
