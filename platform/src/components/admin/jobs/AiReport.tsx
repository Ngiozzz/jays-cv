"use client";

import { Icon } from "@/components/icons/Icon";
import { siteOf, type LinkResult } from "@/modules/ai/links";
import type { ReadingReport, ReportItem } from "@/modules/ai/reading-report";

type Props = {
  report: ReadingReport;
  // The links in the text posted with the poster, and whether each could be read
  links?: LinkResult[];
  // The input to jump to for a field ("location" → "f-location")
  idOf: (key: string) => string;
};

// After the AI reads a poster: what it couldn't be sure of, what the poster didn't say, and what
// it filled in. Each item jumps to its field. Follows the form, so items move as they're fixed.
export function AiReport({ report, links = [], idOf }: Props) {
  const needed = report.missing.filter((item) => item.needed).length;
  const jump = (key: string) => {
    const el = document.getElementById(idOf(key));
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      el.focus({ preventScroll: true });
    }
  };
  const chip = (item: ReportItem) => (
    <button type="button" className="ai-report-chip" onClick={() => jump(item.key)}>
      {item.label}
    </button>
  );

  return (
    <section className="ai-report" aria-label="What the AI found on the poster">
      <p className="ai-report-title">
        <Icon name="sparkle" />
        What the AI found on the poster
      </p>
      {needed > 0 && (
        <p className="ai-report-needed" role="alert">
          {needed === 1 ? "1 thing is" : `${needed} things are`} needed before you can publish.
        </p>
      )}

      {links.length > 0 && (
        <div className="ai-report-group links">
          <h4>
            <span aria-hidden="true">↗</span> Links in the posted text ({links.length})
          </h4>
          <ul className="ai-report-list">
            {links.map((link) => (
              <li key={link.url} className={link.ok ? "ok" : "failed"}>
                <span className="ai-report-link">
                  {link.ok ? "✓ Read" : "✗ Couldn't open"}{" "}
                  <a href={link.finalUrl ?? link.url} target="_blank" rel="noopener noreferrer">
                    {siteOf(link.finalUrl ?? link.url)}
                  </a>
                </span>
                {!link.ok && (
                  <small>
                    {link.reason ? `Because ${link.reason}. ` : ""}Open it yourself, copy the job details into the text
                    box with the poster, and read it again.
                  </small>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.unsure.length > 0 && (
        <div className="ai-report-group unsure">
          <h4>
            <span aria-hidden="true">⚠</span> Not sure: check these against the poster ({report.unsure.length})
          </h4>
          <ul className="ai-report-chips">
            {report.unsure.map((item) => (
              <li key={item.key}>{chip(item)}</li>
            ))}
          </ul>
        </div>
      )}

      {report.missing.length > 0 && (
        <div className="ai-report-group missing">
          <h4>
            <span aria-hidden="true">○</span> Not on the poster ({report.missing.length})
          </h4>
          <ul className="ai-report-list">
            {report.missing.map((item) => (
              <li key={item.key}>
                {chip(item)}
                {item.needed && <span className="ai-report-tag">Needed</span>}
                {item.note && <small>{item.note}</small>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.filled.length > 0 && (
        <div className="ai-report-group filled">
          <h4>
            <span aria-hidden="true">✓</span> Filled in ({report.filled.length})
          </h4>
          <ul className="ai-report-chips">
            {report.filled.map((item) => (
              <li key={item.key}>{chip(item)}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="ai-report-foot">Click any item to jump to it. Always compare with the poster before publishing.</p>
    </section>
  );
}
