"use client";

import type { FormEvent, ReactNode } from "react";
import { saveSettingsAction } from "@/app/(admin)/admin/(signed-in)/content/actions";
import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/IconSprite";
import { AI_WARN_CHOICES, POSTER_RETENTION_CHOICES, RETENTION_CHOICES } from "@/modules/content/admin/settings";
import type { AdminSettings } from "@/modules/content/admin/settings.service";
import { useSave } from "./useSave";

// Contact details, links and rules used across the whole website and every order
export function SettingsForm({ settings }: { settings: AdminSettings }) {
  const save = useSave();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save.run(() => saveSettingsAction(form));
  };

  const field = (
    name: keyof AdminSettings,
    label: ReactNode,
    attrs: { full?: boolean; placeholder?: string; inputMode?: "tel" | "email" | "numeric" | "url" } = {},
  ) => (
    <div className={["f", attrs.full && "full", save.errors[name] && "invalid"].filter(Boolean).join(" ")}>
      <label htmlFor={`st-${name}`}>{label}</label>
      <input
        id={`st-${name}`}
        name={name}
        type="text"
        defaultValue={String(settings[name] ?? "")}
        placeholder={attrs.placeholder}
        inputMode={attrs.inputMode}
      />
      {save.error(name)}
    </div>
  );

  const rule = (name: keyof AdminSettings, max: number, min = 1) => (
    <input
      type="number"
      name={name}
      min={min}
      max={max}
      defaultValue={String(settings[name])}
      aria-invalid={Boolean(save.errors[name])}
    />
  );

  return (
    <form className="settings-grid" noValidate onSubmit={submit}>
      {save.error("form")}
      <Panel icon="whatsapp" title="Contact details">
        <p className="hint-sm">Used on every WhatsApp button, phone link and the footer, across the whole website.</p>
        <div className="fgrid">
          {field("whatsapp", "WhatsApp number", { inputMode: "tel", placeholder: "0712 345 678" })}
          {field("email", "Email", { inputMode: "email" })}
          {field("address", "Office address", { full: true })}
        </div>
      </Panel>

      <Panel icon="globe" title="Channel & social links">
        <p className="hint-sm">Leave a link empty to hide it on the website.</p>
        <div className="fgrid">
          {field("channelLink", "WhatsApp job channel invite link", {
            full: true,
            inputMode: "url",
            placeholder: "https://whatsapp.com/channel/…",
          })}
          {field("linkedinUrl", "LinkedIn", { inputMode: "url", placeholder: "https://linkedin.com/…" })}
          {field("facebookUrl", "Facebook", { inputMode: "url", placeholder: "https://facebook.com/…" })}
          {field("instagramUrl", "Instagram", { inputMode: "url", placeholder: "https://instagram.com/…" })}
          {field("xUrl", "X (Twitter)", { inputMode: "url", placeholder: "https://x.com/…" })}
        </div>
      </Panel>

      <Panel icon="clock" title="Order rules">
        <p className="hint-sm">These drive the automatic steps in every order.</p>
        <div className="rules-grid">
          <label>
            Unpaid orders are abandoned after <span>{rule("unpaidHours", 168)} hours</span>
          </label>
          {save.error("unpaidHours")}
          <label>
            Remind the client to review their draft after <span>{rule("reminderDays", 14)} days</span>
          </label>
          {save.error("reminderDays")}
          <label>
            Complete the order automatically after <span>{rule("autoCompleteDays", 30)} days</span> with no reply
          </label>
          {save.error("autoCompleteDays")}
          <label>
            Revised drafts are due within <span>{rule("revisionHours", 96)} hours</span>
          </label>
          {save.error("revisionHours")}
          <label>
            Delete abandoned (never paid) orders and their files <span>{rule("deleteAbandonedDays", 365, 7)} days</span>{" "}
            after they were placed
          </label>
          {save.error("deleteAbandonedDays")}
          <label>
            &ldquo;Check it yourself&rdquo; (AI feedback on a CV for one job) costs{" "}
            <span>KES {rule("cvCheckPrice", 1000)}</span>
          </label>
          {save.error("cvCheckPrice")}
        </div>
      </Panel>

      <Panel icon="shield" title="Client files & privacy">
        <div className="fgrid">
          <div className="f">
            <label htmlFor="st-retentionMonths">Delete client CVs and drafts</label>
            <select id="st-retentionMonths" name="retentionMonths" defaultValue={settings.retentionMonths}>
              {RETENTION_CHOICES.map((choice) => (
                <option key={choice.months} value={choice.months}>
                  {choice.label}
                </option>
              ))}
            </select>
            {save.error("retentionMonths")}
          </div>
          <div className="f">
            <label htmlFor="st-posterRetentionMonths">Delete job posters</label>
            <select
              id="st-posterRetentionMonths"
              name="posterRetentionMonths"
              defaultValue={settings.posterRetentionMonths}
            >
              {POSTER_RETENTION_CHOICES.map((months) => (
                <option key={months} value={months}>
                  {months} {months === 1 ? "month" : "months"} after the job closes
                </option>
              ))}
            </select>
            {save.error("posterRetentionMonths")}
          </div>
        </div>
        <p className="hint-sm">
          Kenya&apos;s Data Protection Act expects you to keep personal data only as long as needed. Clients are told
          this on the order page.
        </p>
      </Panel>

      <Panel icon="sparkle" title="AI tokens">
        <div className="f">
          <label htmlFor="st-aiWarnPct">Warn me when tokens left drop below</label>
          <select id="st-aiWarnPct" name="aiWarnPct" defaultValue={settings.aiWarnPct}>
            {AI_WARN_CHOICES.map((pct) => (
              <option key={pct} value={pct}>
                {pct}% of my tokens
              </option>
            ))}
          </select>
          {save.error("aiWarnPct")}
        </div>
        <p className="hint-sm">
          When tokens run out, AI buttons pause and everything else keeps working. Ask your developer to add more
          tokens.
        </p>
      </Panel>

      <Panel icon="lock" title="Payments (M-Pesa)">
        <div className="fgrid">{field("paybill", "Paybill number", { inputMode: "numeric" })}</div>
        <div className="pay-mode">
          <label className="inline-check">
            <input type="radio" checked={settings.mpesaMode === "TEST"} disabled readOnly /> Test mode{" "}
            <small>(Safaricom sandbox, no real money)</small>
          </label>
          <label className="inline-check">
            <input type="radio" checked={settings.mpesaMode === "LIVE"} disabled readOnly /> Live mode{" "}
            <small>(after Safaricom approves &quot;Go Live&quot;)</small>
          </label>
        </div>
        <p className="hint-sm">
          Clients pay you directly: a prompt on their phone, or your Paybill with their order number as the account
          number. Your developer switches to Live mode once Safaricom approves it.
        </p>
      </Panel>

      <div className="settings-save">
        <button type="submit" className="btn btn-primary btn-lg" disabled={save.pending}>
          {save.pending ? "Saving…" : "Save & publish settings"}
        </button>
      </div>
    </form>
  );
}

function Panel({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <section className="panel panel-body">
      <h2 className="editor-title">
        <Icon name={icon} />
        {title}
      </h2>
      {children}
    </section>
  );
}
