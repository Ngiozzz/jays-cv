"use client";

import { useState, type FormEvent } from "react";
import { savePackageAction } from "@/app/(admin)/admin/(signed-in)/content/actions";
import { PackageCard } from "@/components/content/PackageCards";
import type { AdminPackage } from "@/modules/content/admin/content-admin.service";
import { DRAFT_HOURS, revisionChoice } from "@/modules/content/admin/prices";
import { SaveBar, useSave } from "./useSave";

const REVISION_LABELS = { "1": "1 round", "2": "2 rounds", "3": "3 rounds", unlimited: "Unlimited" } as const;

// Edit one package, with the price card exactly as the website will show it
export function PackageEditor({ pkg }: { pkg: AdminPackage }) {
  const [draft, setDraft] = useState({
    name: pkg.name,
    price: String(pkg.price),
    bestFor: pkg.bestFor,
    features: pkg.features.join("\n"),
    popular: pkg.popular,
  });
  const save = useSave();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save.run(() => savePackageAction(pkg.id, form));
  };

  const field = (name: keyof typeof draft) => ({
    name,
    value: String(draft[name]),
    onChange: (event: { target: { value: string } }) => setDraft({ ...draft, [name]: event.target.value }),
  });

  return (
    <section className="panel editor-grid">
      <form className="panel-body" noValidate onSubmit={submit}>
        <h2 className="editor-title">Edit: {pkg.name}</h2>
        {save.error("form")}
        <div className="fgrid">
          <div className={save.errors.name ? "f invalid" : "f"}>
            <label htmlFor="pk-name">Package name</label>
            <input id="pk-name" type="text" {...field("name")} />
            {save.error("name")}
          </div>
          <div className={save.errors.price ? "f invalid" : "f"}>
            <label htmlFor="pk-price">Price (KES)</label>
            <input id="pk-price" type="text" inputMode="numeric" {...field("price")} />
            {save.error("price")}
          </div>
          <div className={save.errors.bestFor ? "f full invalid" : "f full"}>
            <label htmlFor="pk-best">Best for</label>
            <input id="pk-best" type="text" {...field("bestFor")} />
            {save.error("bestFor")}
          </div>
          <div className="f">
            <label htmlFor="pk-draft">First draft within</label>
            <select id="pk-draft" name="firstDraftHours" defaultValue={pkg.firstDraftHours}>
              {DRAFT_HOURS.map((hours) => (
                <option key={hours} value={hours}>
                  {hours} hours
                </option>
              ))}
            </select>
          </div>
          <div className="f">
            <label htmlFor="pk-rounds">Revision rounds</label>
            <select id="pk-rounds" name="revisions" defaultValue={revisionChoice(pkg)}>
              {Object.entries(REVISION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {value === "unlimited" ? `${label} (${pkg.revisionWindowDays ?? 14} days)` : label}
                </option>
              ))}
            </select>
          </div>
          <div className={save.errors.features ? "f full invalid" : "f full"}>
            <label htmlFor="pk-features">
              What&apos;s included <small>(one per line)</small>
            </label>
            <textarea id="pk-features" rows={6} {...field("features")} />
            {save.error("features")}
          </div>
          <div className="f full checks">
            <label className="inline-check">
              <input
                type="checkbox"
                name="popular"
                checked={draft.popular}
                onChange={(event) => setDraft({ ...draft, popular: event.target.checked })}
              />{" "}
              Mark as &ldquo;Most popular&rdquo; <small>(only one package can be)</small>
            </label>
            <label className="inline-check">
              <input type="checkbox" name="visible" defaultChecked={pkg.visible} /> Show on the website
            </label>
          </div>
        </div>
        <p className="hint-sm">
          Existing orders keep the price the client paid. The new price applies to new orders and every price on the
          site.
        </p>
        <SaveBar save={save} label="Save & publish" />
      </form>
      <div className="panel-body preview-col">
        <p className="preview-label">Live preview</p>
        <PackageCard
          pkg={{
            shortName: pkg.shortName,
            name: draft.name || pkg.name,
            price: Number(draft.price.replace(/[^\d]/g, "")) || 0,
            bestFor: draft.bestFor || pkg.bestFor,
            features: draft.features
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
            popular: draft.popular,
          }}
        />
      </div>
    </section>
  );
}
