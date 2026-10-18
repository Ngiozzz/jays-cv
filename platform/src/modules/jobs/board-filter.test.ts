import { describe, expect, it } from "vitest";
import { NO_FILTERS, boardPlaces, countBy, filterJobs, type BoardJob } from "./board-filter";

const today = "2026-10-12";
const job = (patch: Partial<BoardJob>): BoardJob => ({
  title: "Job",
  company: "Co",
  location: "Nairobi County",
  counties: ["Nairobi"],
  type: "Full-time",
  category: "IT & Tech",
  summary: "",
  tags: [],
  deadline: null,
  postedDay: "2026-10-10",
  ...patch,
});

const nurse = job({
  title: "Nurse",
  category: "Healthcare",
  location: "Kisumu County",
  counties: ["Kisumu"],
  deadline: "2026-10-14",
  postedDay: "2026-10-01",
});
const dev = job({ title: "Developer", company: "Kilimall", deadline: "2026-11-30", postedDay: "2026-10-11" });
const intern = job({ title: "Intern", type: "Graduate / Internship", postedDay: "2026-10-05" });
const jobs = [nurse, dev, intern];

describe("boardPlaces", () => {
  it("lists the counties with jobs A to Z, then Outside Kenya", () => {
    const places = boardPlaces([
      { counties: ["Outside Kenya"] },
      { counties: ["Nairobi", "Kisumu"] },
      { counties: ["Machakos"] },
      { counties: ["All counties"] },
      { counties: ["Not specified"] },
      { counties: ["Nairobi"] },
    ]);
    expect(places).toEqual(["Kisumu", "Machakos", "Nairobi", "Outside Kenya"]);
  });
});

describe("countBy", () => {
  it("counts jobs per category", () => {
    expect(countBy(jobs, "category")).toEqual({ Healthcare: 1, "IT & Tech": 2 });
  });
});

describe("filterJobs", () => {
  it("lists newest first by default", () => {
    expect(filterJobs(jobs, NO_FILTERS, today).map((j) => j.title)).toEqual(["Developer", "Intern", "Nurse"]);
  });

  it("searches title, company and more, case-insensitively", () => {
    expect(filterJobs(jobs, { ...NO_FILTERS, q: "kilimall" }, today)).toEqual([dev]);
  });

  it("filters by place, category and type", () => {
    expect(filterJobs(jobs, { ...NO_FILTERS, loc: "Kisumu" }, today)).toEqual([nurse]);
  });

  it("shows a Tala job under Machakos, and nationwide jobs under every county", () => {
    const tala = job({ title: "Teacher", location: "Tala, Machakos County", counties: ["Machakos"] });
    const nationwide = job({ title: "Sales rep", location: "All counties", counties: ["All counties"] });
    const all = [tala, nationwide, nurse];
    expect(filterJobs(all, { ...NO_FILTERS, loc: "Machakos" }, today)).toEqual([tala, nationwide]);
    expect(filterJobs(all, { ...NO_FILTERS, loc: "Kisumu" }, today)).toEqual([nationwide, nurse]);
    // An older shared link with a town still works, and so does searching for the town
    expect(filterJobs(all, { ...NO_FILTERS, loc: "Tala" }, today)).toEqual([tala]);
    expect(filterJobs(all, { ...NO_FILTERS, q: "tala" }, today)).toEqual([tala]);
  });

  it("filters by category and type", () => {
    expect(filterJobs(jobs, { ...NO_FILTERS, cat: "Healthcare" }, today)).toEqual([nurse]);
    expect(filterJobs(jobs, { ...NO_FILTERS, types: ["Graduate / Internship"] }, today)).toEqual([intern]);
  });

  it("finds jobs closing within a week, and sorts by closing date with open-ended jobs last", () => {
    expect(filterJobs(jobs, { ...NO_FILTERS, soon: true }, today)).toEqual([nurse]);
    expect(filterJobs(jobs, { ...NO_FILTERS, sort: "closing" }, today).map((j) => j.title)).toEqual([
      "Nurse",
      "Developer",
      "Intern",
    ]);
  });
});

describe("search by tag", () => {
  it("finds a job by one of its search tags", () => {
    const cpa = job({ title: "Accounts Assistant", tags: ["CPA", "Entry level"] });
    expect(filterJobs([cpa, job({ title: "Driver" })], { ...NO_FILTERS, q: "cpa" }, today)).toEqual([cpa]);
  });
});
