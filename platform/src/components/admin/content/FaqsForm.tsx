"use client";

import { useState, type FormEvent } from "react";
import { saveFaqsAction } from "@/app/(admin)/admin/(signed-in)/content/actions";
import { Icon } from "@/components/icons/Icon";
import { MAX_FAQS, type StoredFaq } from "@/modules/content/admin/faqs";
import { SaveBar, useSave } from "./useSave";

type Row = { key: string; id: string | null; question: string; answer: string; visible: boolean };

let added = 0;

// The homepage questions: edit, show or hide, reorder, add and delete here, then publish them all
// in one go. Nothing changes on the website until "Save & publish FAQs".
export function FaqsForm({ faqs }: { faqs: StoredFaq[] }) {
  const save = useSave();
  const [rows, setRows] = useState<Row[]>(faqs.map((faq) => ({ key: faq.id, ...faq })));

  const change = (index: number, patch: Partial<Row>) =>
    setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const move = (index: number, to: number) => {
    const next = [...rows];
    [next[index], next[to]] = [next[to], next[index]];
    setRows(next);
  };
  const add = () => {
    added += 1;
    setRows([...rows, { key: `new-${added}`, id: null, question: "", answer: "", visible: true }]);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.run(() =>
      saveFaqsAction(rows.map(({ id, question, answer, visible }) => ({ id, question, answer, visible }))),
    );
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>
          Homepage FAQs <span className="count-pill">{rows.filter((row) => row.visible).length} shown</span>
        </h2>
        <a href="/#faq" target="_blank" rel="noopener">
          View ↗
        </a>
      </div>
      <form className="panel-body" noValidate onSubmit={submit}>
        {save.error("form")}
        <ol className="faq-admin">
          {rows.map((row, i) => (
            <li key={row.key} className={row.visible ? undefined : "off"}>
              <div className="faq-admin-fields">
                <input
                  type="text"
                  value={row.question}
                  onChange={(event) => change(i, { question: event.target.value })}
                  aria-label={`Question ${i + 1}`}
                  placeholder="Question"
                />
                {save.error(`question-${i}`)}
                <textarea
                  rows={2}
                  value={row.answer}
                  onChange={(event) => change(i, { answer: event.target.value })}
                  aria-label={`Answer ${i + 1}`}
                  placeholder="Answer"
                />
                {save.error(`answer-${i}`)}
              </div>
              <div className="faq-admin-tools">
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={row.visible}
                    onChange={(event) => change(i, { visible: event.target.checked })}
                    aria-label={`Show question ${i + 1}`}
                  />{" "}
                  Show
                </label>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  aria-label={`Move question ${i + 1} up`}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => move(i, i + 1)}
                  disabled={i === rows.length - 1}
                  aria-label={`Move question ${i + 1} down`}
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => setRows(rows.filter((_, j) => j !== i))}
                  aria-label={`Delete question ${i + 1}`}
                >
                  <Icon name="trash" />
                  Delete
                </button>
              </div>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="empty-note">No questions. The FAQ section is hidden on the homepage.</li>
          )}
        </ol>
        <p className="hint-sm">Moves, additions and deletions go live when you save.</p>
        <div className="editor-actions">
          <button type="button" className="btn btn-ghost" onClick={add} disabled={rows.length >= MAX_FAQS}>
            <Icon name="plus" />
            Add question
          </button>
        </div>
        <SaveBar save={save} label="Save & publish FAQs" />
      </form>
    </section>
  );
}
