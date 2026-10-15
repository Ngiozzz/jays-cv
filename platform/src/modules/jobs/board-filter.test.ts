import { describe, expect, it } from "vitest";
import { NO_FILTERS, countBy, filterJobs, placesOf, type BoardJob } from "./board-filter";

const today = "2026-10-12";
const job = (patch: Partial<BoardJob>): BoardJob => ({
  title: "Job",
  company: "Co",
  location: "Nairobi",
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
  location: "Kisumu",
  deadline: "2026-10-14",
  postedDay: "2026-10-01",
});
const dev = job({ title: "Developer", company: "Kilimall", deadline: "2026-11-30", postedDay: "2026-10-11" });
const intern = job({ title: "Intern", type: "Graduate / Internship", postedDay: "2026-10-05" });
const jobs = [nurse, dev, intern];

describe("placesOf", () => {
  it("splits combined locations and drops details in brackets", () => {
    expect(placesOf("Nairobi (Mombasa Road) & Kisumu")).toEqual(["Nairobi"]);
    expect(placesOf("Nairobi, Mombasa & Kisumu")).toEqual(["Nairobi", "Mombasa", "Kisumu"]);
    expect(placesOf("[Location]")).toEqual([]);
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
