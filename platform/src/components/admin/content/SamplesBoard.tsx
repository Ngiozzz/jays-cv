"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { addSampleAction, moveSampleAction, saveSamplesAction } from "@/app/(admin)/admin/(signed-in)/content/actions";
import { POSTER_SIZE, shrinkImage } from "@/components/admin/jobs/shrink-image";
import { Icon } from "@/components/icons/Icon";
import { SAMPLE_TAGS } from "@/modules/content/admin/samples";
import type { AdminSample } from "@/modules/content/admin/samples.service";
import { SaveBar, useSave, useToast } from "./useSave";

// Every sample in website order: edit the wording, publish or unpublish, and move them around.
// The first 3 published ones are also on the homepage.
export function SamplesBoard({ samples }: { samples: AdminSample[] }) {
  const save = useSave();
  const toast = useToast();
  const [moving, startMoving] = useTransition();
  const ids = samples.map((sample) => sample.id);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save.run(() => saveSamplesAction(ids, form));
  };

  const move = (sample: AdminSample, direction: "earlier" | "later") =>
    startMoving(async () => {
      const result = await moveSampleAction(sample.id, direction);
      toast(result.ok ? { text: result.message, error: false } : { text: "Couldn't move it.", error: true });
    });

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2>Before &amp; after samples</h2>
          <a href="/samples" target="_blank" rel="noopener">
            View samples page ↗
          </a>
        </div>
        <form className="panel-body" noValidate onSubmit={submit}>
          <p className="hint-sm">
            The first 3 published samples are also shown on the homepage. Use ↑ ↓ to change the order.
          </p>
          {save.error("form")}
          <div className="sample-admin-grid">
            {samples.map((sample, i) => (
              <div key={sample.id} className={sample.published ? "sample-admin" : "sample-admin off"}>
                <div className="sample-thumbs">
                  <img src={sample.beforeUrl} alt={`${sample.role}: before`} loading="lazy" />
                  <img src={sample.afterUrl} alt={`${sample.role}: after`} loading="lazy" />
                </div>
                <div className={save.errors[`role-${sample.id}`] ? "f invalid" : "f"}>
                  <label htmlFor={`sm-role-${sample.id}`}>Role</label>
                  <input
                    id={`sm-role-${sample.id}`}
                    name={`role-${sample.id}`}
                    type="text"
                    defaultValue={sample.role}
                  />
                  {save.error(`role-${sample.id}`)}
                </div>
                <div className={save.errors[`tag-${sample.id}`] ? "f invalid" : "f"}>
                  <label htmlFor={`sm-tag-${sample.id}`}>Industry</label>
                  <select id={`sm-tag-${sample.id}`} name={`tag-${sample.id}`} defaultValue={sample.tag}>
                    {SAMPLE_TAGS.map((tag) => (
                      <option key={tag}>{tag}</option>
                    ))}
                  </select>
                  {save.error(`tag-${sample.id}`)}
                </div>
                <div className={save.errors[`caption-${sample.id}`] ? "f invalid" : "f"}>
                  <label htmlFor={`sm-cap-${sample.id}`}>Result</label>
                  <input
                    id={`sm-cap-${sample.id}`}
                    name={`caption-${sample.id}`}
                    type="text"
                    defaultValue={sample.caption}
                  />
                  {save.error(`caption-${sample.id}`)}
                </div>
                <div className="sample-admin-foot">
                  <label className="inline-check">
                    <input type="checkbox" name={`published-${sample.id}`} defaultChecked={sample.published} />{" "}
                    Published
                  </label>
                  <span>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => move(sample, "earlier")}
                      disabled={i === 0 || moving}
                      aria-label={`Move ${sample.role} earlier`}
                      title="Move earlier"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => move(sample, "later")}
                      disabled={i === samples.length - 1 || moving}
                      aria-label={`Move ${sample.role} later`}
                      title="Move later"
                    >
                      ↓
                    </button>
                  </span>
                </div>
              </div>
            ))}
          </div>
          <SaveBar save={save} label="Save & publish samples" />
        </form>
      </section>

      {/* key: an empty form again after each sample is added */}
      <AddSample key={samples.length} />
    </>
  );
}

// Picks one image, shrinks it in the browser (CV photos from phones can be several MB) and shows it
function ImagePick({ side, error }: { side: "before" | "after"; error?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const choose = async (file: File | undefined) => {
    if (!file || !input.current) return;
    const small = await shrinkImage(file, POSTER_SIZE);
    const transfer = new DataTransfer();
    transfer.items.add(small);
    input.current.files = transfer.files;
    setPreview(URL.createObjectURL(small));
  };

  // A file chosen in the moment before the page became interactive would otherwise be ignored
  useEffect(() => {
    const early = input.current?.files?.[0];
    if (early) void choose(early);
  }, []);

  const label = side === "before" ? "CV before (the client's old CV)" : "CV after (your rewrite)";
  return (
    <div className={error ? "f invalid" : "f"}>
      <label htmlFor={`sm-new-${side}`}>{label}</label>
      <input
        ref={input}
        id={`sm-new-${side}`}
        name={side}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => void choose(event.target.files?.[0])}
      />
      {preview && (
        <div className="sample-thumbs">
          <img src={preview} alt={`Chosen ${side} image`} />
        </div>
      )}
      {error && (
        <small className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}

function AddSample() {
  const save = useSave();
  const [open, setOpen] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save.run(() => addSampleAction(form));
  };

  const cls = (name: string) => (save.errors[name] ? "f invalid" : "f");

  return (
    <details className="panel" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="panel-head">
        <h2>
          <Icon name="upload" /> Add a sample
        </h2>
        <span className="hint-sm">It stays unpublished until you tick Published</span>
      </summary>
      <form className="panel-body" noValidate onSubmit={submit}>
        <p className="hint-sm">
          ⚠️ Always blur names, phone numbers and ID numbers before uploading, and only use CVs the client agreed to
          share.
        </p>
        <div className="fgrid">
          <div className={cls("role")}>
            <label htmlFor="sm-new-role">Role</label>
            <input id="sm-new-role" name="role" type="text" placeholder="e.g. Procurement Officer" />
            {save.error("role")}
          </div>
          <div className={cls("tag")}>
            <label htmlFor="sm-new-tag">Industry</label>
            <select id="sm-new-tag" name="tag" defaultValue={SAMPLE_TAGS[0]}>
              {SAMPLE_TAGS.map((tag) => (
                <option key={tag}>{tag}</option>
              ))}
            </select>
            {save.error("tag")}
          </div>
          <div className={`${cls("caption")} full`}>
            <label htmlFor="sm-new-caption">Result</label>
            <input
              id="sm-new-caption"
              name="caption"
              type="text"
              placeholder="e.g. Graduate → Shortlisted in 2 weeks"
            />
            {save.error("caption")}
          </div>
          <ImagePick side="before" error={save.errors.before} />
          <ImagePick side="after" error={save.errors.after} />
        </div>
        <SaveBar save={save} label="Add sample" />
      </form>
    </details>
  );
}
