"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";
import { Icon } from "@/components/icons/Icon";
import {
  NO_FILTERS,
  countBy,
  boardPlaces,
  filterJobs,
  type BoardFilters,
  type BoardListing,
} from "@/modules/jobs/board-filter";
import { isCounty } from "@/modules/jobs/counties";
import { JobCard } from "./JobCard";

type Props = {
  jobs: BoardListing[];
  today: string;
  channelLink: string | null;
  draftTime: string;
  initial?: BoardFilters;
};

// The Find a job page. All open jobs arrive with the page (good for Google); filtering happens
// here in the browser, instantly, and the address bar keeps the search so it can be shared.
export function JobsBrowser({ jobs, today, channelLink, draftTime, initial = NO_FILTERS }: Props) {
  const [filters, setFilters] = useState<BoardFilters>(initial);
  const set = (patch: Partial<BoardFilters>) => setFilters((current) => ({ ...current, ...patch }));

  const places = useMemo(() => boardPlaces(jobs), [jobs]);
  const categories = useMemo(() => countBy(jobs, "category"), [jobs]);
  const types = useMemo(() => countBy(jobs, "type"), [jobs]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.q.trim()) params.set("q", filters.q.trim());
    if (filters.loc) params.set("loc", filters.loc);
    if (filters.cat) params.set("cat", filters.cat);
    const search = params.toString();
    window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
  }, [filters.q, filters.loc, filters.cat]);

  const shown = useMemo(() => filterJobs(jobs, filters, today), [jobs, filters, today]);

  return (
    <>
      <section className="page-hero jobs-hero">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <span>Find a job</span>
          </nav>
          <h1>Find a job in Kenya</h1>
          <p className="lead">
            Fresh vacancies from across Kenya, shared daily by the Jay CVS team. Search, filter and apply, then make
            sure your CV is ready.
          </p>
          <form className="job-search" role="search" onSubmit={(event: FormEvent) => event.preventDefault()}>
            <label className="job-search-field">
              <Icon name="search" />
              <span className="sr-only">Keyword</span>
              <input
                type="search"
                value={filters.q}
                onChange={(event) => set({ q: event.target.value })}
                placeholder="Job title, company or keyword"
                autoComplete="off"
              />
            </label>
            <label className="job-search-field job-search-loc">
              <Icon name="pin" />
              <span className="sr-only">County</span>
              <select value={filters.loc} onChange={(event) => set({ loc: event.target.value })}>
                <option value="">All counties</option>
                {places.map((place) => (
                  <option key={place} value={place}>
                    {isCounty(place) ? `${place} County` : place}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn btn-primary" type="submit">
              Search
            </button>
          </form>
          {channelLink && (
            <p className="jobs-hero-note">
              <Icon name="whatsapp" />
              Join 57,000+ job seekers on our{" "}
              <a href={channelLink} target="_blank" rel="noopener">
                WhatsApp job channel
              </a>
            </p>
          )}
        </div>
      </section>

      <section className="section jobs-section">
        <div className="container">
          <div className="filters jobs-cats" role="group" aria-label="Filter by category">
            <CategoryButton
              label="All jobs"
              count={jobs.length}
              pressed={!filters.cat}
              onClick={() => set({ cat: "" })}
            />
            {/* Jobs saved without a category only count under "All jobs" */}
            {Object.keys(categories)
              .filter(Boolean)
              .sort()
              .map((category) => (
                <CategoryButton
                  key={category}
                  label={category}
                  count={categories[category]}
                  pressed={filters.cat === category}
                  onClick={() => set({ cat: category })}
                />
              ))}
          </div>

          <div className="jobs-layout">
            <aside className="jobs-sidebar" aria-label="Filters">
              <div className="card side-block">
                <h3>Job type</h3>
                {Object.keys(types)
                  .sort()
                  .map((type) => (
                    <label key={type} className="check">
                      <input
                        type="checkbox"
                        checked={filters.types.includes(type)}
                        onChange={(event) =>
                          set({
                            types: event.target.checked
                              ? [...filters.types, type]
                              : filters.types.filter((t) => t !== type),
                          })
                        }
                      />{" "}
                      {type} <span>{types[type]}</span>
                    </label>
                  ))}
              </div>
              <div className="card side-block">
                <h3>Deadline</h3>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={filters.soon}
                    onChange={(event) => set({ soon: event.target.checked })}
                  />{" "}
                  Closing within 7 days
                </label>
              </div>
              <button type="button" className="btn btn-ghost btn-sm btn-block" onClick={() => setFilters(NO_FILTERS)}>
                Clear all filters
              </button>
              {channelLink && (
                <div className="card side-block channel-card">
                  <span className="channel-icon">
                    <Icon name="whatsapp" />
                  </span>
                  <h3>Never miss a job</h3>
                  <p>New vacancies every day on our WhatsApp channel.</p>
                  <a className="btn btn-wa btn-sm btn-block" href={channelLink} target="_blank" rel="noopener">
                    Follow the channel
                  </a>
                </div>
              )}
              <div className="card side-block safety">
                <h3>
                  <Icon name="shield" />
                  Stay safe
                </h3>
                <p>Genuine employers never ask for money to apply or to get an interview.</p>
              </div>
            </aside>

            <div className="jobs-results">
              <div className="results-bar">
                <p aria-live="polite">
                  {shown.length} {shown.length === 1 ? "job" : "jobs"} found
                </p>
                <label className="sort">
                  Sort by{" "}
                  <select
                    value={filters.sort}
                    onChange={(event) => set({ sort: event.target.value === "closing" ? "closing" : "newest" })}
                  >
                    <option value="newest">Newest first</option>
                    <option value="closing">Closing soon</option>
                  </select>
                </label>
              </div>
              <div className="job-stack">
                {shown.map((job, index) => (
                  <Fragment key={job.slug}>
                    {index === 3 && <CvPromo draftTime={draftTime} />}
                    <JobCard {...job} href={`/jobs/${job.slug}`} today={today} />
                  </Fragment>
                ))}
              </div>
              {shown.length === 0 && (
                <div className="job-empty">
                  <Icon name="search" />
                  <h3>{jobs.length ? "No jobs match your search" : "No open jobs right now"}</h3>
                  <p>
                    {jobs.length
                      ? "Try a different keyword or location, or clear the filters."
                      : "New vacancies are added every day. Check back soon."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function CategoryButton(props: { label: string; count: number; pressed: boolean; onClick: () => void }) {
  return (
    <button type="button" className="filter-btn" aria-pressed={props.pressed} onClick={props.onClick}>
      {props.label} <span>{props.count}</span>
    </button>
  );
}

function CvPromo({ draftTime }: { draftTime: string }) {
  return (
    <aside className="job-promo">
      <div>
        <strong>Found a job you like? Make sure your CV is ready.</strong>
        <p>Recruiters spend about 6 seconds on a CV. We&apos;ll write one that gets you shortlisted, in {draftTime}.</p>
      </div>
      <Link className="btn btn-primary" href="/services">
        Get my CV done
      </Link>
    </aside>
  );
}

// Starts from a shared link such as /jobs?cat=Healthcare. The address is only known in the browser, so the page
// is built with the plain list (inside <Suspense>) and this takes over once it loads.
export function JobsBrowserFromLink(props: Omit<Props, "initial">) {
  const params = useSearchParams();
  const initial = {
    ...NO_FILTERS,
    q: params.get("q") ?? "",
    loc: params.get("loc") ?? "",
    cat: params.get("cat") ?? "",
  };
  return <JobsBrowser {...props} initial={initial} />;
}
