"use client";

import { useState, type FormEvent } from "react";
import { saveHomepageAction } from "@/app/(admin)/admin/(signed-in)/content/actions";
import type { StoredHomepage } from "@/modules/content/admin/homepage";
import { SaveBar, useSave } from "./useSave";

// The top of the homepage and the announcement bar, with a live preview. Nothing changes on the
// website until "Save & publish".
export function HomepageForm({ homepage }: { homepage: StoredHomepage }) {
  const save = useSave();
  const [home, setHome] = useState(homepage);

  const text = (name: "headline" | "highlight" | "lead" | "announcementText" | "announcementLink") => ({
    id: `hm-${name}`,
    name,
    value: home[name],
    onChange: (event: { target: { value: string } }) => setHome({ ...home, [name]: event.target.value }),
  });
  const setStat = (index: number, patch: Partial<StoredHomepage["stats"][number]>) =>
    setHome({ ...home, stats: home.stats.map((stat, i) => (i === index ? { ...stat, ...patch } : stat)) });
  const cls = (name: string, full = false) =>
    ["f", full && "full", save.errors[name] && "invalid"].filter(Boolean).join(" ");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save.run(() => saveHomepageAction(form));
  };

  return (
    <section className="panel editor-grid">
      <form className="panel-body" noValidate onSubmit={submit}>
        <h2 className="editor-title">Top of the homepage</h2>
        {save.error("form")}
        <div className="fgrid">
          <div className={cls("headline")}>
            <label htmlFor="hm-headline">Headline</label>
            <input type="text" maxLength={60} {...text("headline")} />
            {save.error("headline")}
          </div>
          <div className={cls("highlight")}>
            <label htmlFor="hm-highlight">
              Highlighted words <small>(underlined in gold)</small>
            </label>
            <input type="text" maxLength={40} {...text("highlight")} />
            {save.error("highlight")}
          </div>
          <div className={cls("lead", true)}>
            <label htmlFor="hm-lead">Intro text</label>
            <textarea rows={3} maxLength={300} {...text("lead")} />
            {save.error("lead")}
          </div>
        </div>

        <h3 className="sub-title">Numbers strip</h3>
        <div className="stats-edit">
          {home.stats.map((stat, i) => (
            <div key={i}>
              <input
                type="text"
                name={`stat-value-${i}`}
                value={stat.value}
                onChange={(event) => setStat(i, { value: event.target.value })}
                aria-label={`Number ${i + 1}`}
                maxLength={12}
              />
              <input
                type="text"
                name={`stat-label-${i}`}
                value={stat.label}
                onChange={(event) => setStat(i, { label: event.target.value })}
                aria-label={`Label ${i + 1}`}
                maxLength={30}
              />
              {save.error(`stats.${i}.value`)}
              {save.error(`stats.${i}.label`)}
            </div>
          ))}
        </div>

        <h3 className="sub-title">
          Announcement bar <small>(top of every page)</small>
        </h3>
        <label className="inline-check">
          <input
            type="checkbox"
            name="announcementOn"
            checked={home.announcementOn}
            onChange={(event) => setHome({ ...home, announcementOn: event.target.checked })}
          />{" "}
          Show the announcement
        </label>
        <div className="fgrid" style={{ marginTop: 10 }}>
          <div className={cls("announcementText")}>
            <label htmlFor="hm-announcementText">Message</label>
            <input type="text" maxLength={120} {...text("announcementText")} />
            {save.error("announcementText")}
          </div>
          <div className={cls("announcementLink")}>
            <label htmlFor="hm-announcementLink">
              Link <small>(optional, e.g. /pricing)</small>
            </label>
            <input type="text" {...text("announcementLink")} />
            {save.error("announcementLink")}
          </div>
        </div>
        <SaveBar save={save} label="Save & publish" />
      </form>

      <div className="panel-body preview-col">
        <p className="preview-label">Live preview</p>
        {home.announcementOn && home.announcementText && (
          <div className="announce-bar">
            <span>📣 {home.announcementText}</span>
            {home.announcementLink && <u>Learn more →</u>}
          </div>
        )}
        <div className="home-prev">
          <h3>
            {home.headline} <span className="highlight">{home.highlight}</span>
          </h3>
          <p>{home.lead}</p>
          <div className="home-prev-stats">
            {home.stats.map((stat, i) => (
              <div key={i}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
        <a className="hint-sm" href="/" target="_blank" rel="noopener">
          Open the homepage ↗
        </a>
      </div>
    </section>
  );
}
