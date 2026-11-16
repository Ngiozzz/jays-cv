import { describe, expect, it } from "vitest";
import {
  aboutFormToInput,
  aboutPhotoPath,
  aboutPhotoProblem,
  aboutSchema,
  DEFAULT_ABOUT,
  describeAboutChanges,
  hasPlaceholders,
  ownerInitials,
  teamPhotoPath,
} from "./about";

const form = (fields: Record<string, string>, teamIds: string[] = []) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  for (const id of teamIds) data.append("team-id", id);
  return data;
};

const filled = {
  lead: "We turn your CV into interviews, for job seekers all over Kenya.",
  ownerName: "Jay Mwangi",
  ownerRole: "Founder, Jay CVS",
  story: "I started Jay CVS in 2018 after years of reading CVs that hid great people behind long lists of duties.",
  "stat-value-0": "2018",
  "stat-label-0": "In business since",
  "stat-value-1": "57,000+",
  "stat-label-1": "Follow our job channel",
  "stat-value-2": "4,000+",
  "stat-label-2": "CVs written",
  "stat-value-3": "6",
  "stat-label-3": "Writers on the team",
};

describe("aboutSchema", () => {
  it("reads the form", () => {
    const parsed = aboutSchema.parse(aboutFormToInput(form({ ...filled, story: `${filled.story}\r\n\r\nSecond.` })));
    expect(parsed.ownerName).toBe("Jay Mwangi");
    expect(parsed.story).toBe(`${filled.story}\n\nSecond.`);
    expect(parsed.stats[2]).toEqual({ value: "4,000+", label: "CVs written" });
  });

  it("refuses an empty story and missing numbers", () => {
    const result = aboutSchema.safeParse(aboutFormToInput(form({ ...filled, story: "Hi", "stat-value-3": "" })));
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(["story", "stats.3.value"]);
  });
});

describe("the team", () => {
  const people = {
    "team-name-b": "Wanjiru Kamau",
    "team-role-b": "Senior CV writer",
    "team-note-b": "With us since 2019",
    "team-name-a": "Otieno Ouma",
    "team-role-a": "CV writer",
    "team-note-a": "",
    "team-linkedin-b": "https://www.linkedin.com/in/wanjiru-kamau",
  };

  it("is read in the order the form lists it", () => {
    const parsed = aboutSchema.parse(aboutFormToInput(form({ ...filled, ...people }, ["b", "a"])));
    expect(parsed.team).toEqual([
      {
        id: "b",
        name: "Wanjiru Kamau",
        role: "Senior CV writer",
        note: "With us since 2019",
        linkedin: "https://www.linkedin.com/in/wanjiru-kamau",
      },
      { id: "a", name: "Otieno Ouma", role: "CV writer", note: "", linkedin: null },
    ]);
  });

  it("needs a name and role, and lists each person once", () => {
    const missing = aboutSchema.safeParse(
      aboutFormToInput(form({ ...filled, ...people, "team-name-a": "" }, ["b", "a"])),
    );
    expect(missing.success).toBe(false);
    if (!missing.success) expect(missing.error.issues.map((issue) => issue.path.join("."))).toEqual(["team.1.name"]);
    expect(aboutSchema.safeParse(aboutFormToInput(form({ ...filled, ...people }, ["a", "a"]))).success).toBe(false);
  });

  it("only takes LinkedIn links", () => {
    const result = aboutSchema.safeParse(
      aboutFormToInput(form({ ...filled, ...people, "team-linkedin-a": "https://example.com/otieno" }, ["b", "a"])),
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(["team.1.linkedin"]);
  });

  it("is empty until the owner adds someone", () => {
    expect(aboutSchema.parse(aboutFormToInput(form(filled))).team).toEqual([]);
  });

  it("stores photos under the business with a random name", () => {
    expect(teamPhotoPath("t1", "image/png", "abc")).toBe("t1/team-abc.png");
  });

  it("describes additions, removals, edits and moves", () => {
    const wanjiru = { id: "b", name: "Wanjiru Kamau", role: "CV writer", note: "", linkedin: null, photo: null };
    const otieno = { id: "a", name: "Otieno Ouma", role: "CV writer", note: "", linkedin: null, photo: null };
    const brian = { id: "c", name: "Brian Kip", role: "CV writer", note: "", linkedin: null, photo: null };
    const before = { ...DEFAULT_ABOUT, team: [wanjiru, otieno, brian] };
    expect(describeAboutChanges(DEFAULT_ABOUT, { ...DEFAULT_ABOUT, team: [wanjiru] })).toEqual([
      "added Wanjiru Kamau to the team",
    ]);
    expect(
      describeAboutChanges(before, { ...DEFAULT_ABOUT, team: [otieno, { ...wanjiru, photo: "t1/team-x.jpg" }] }),
    ).toEqual(["removed Brian Kip from the team", "changed Wanjiru Kamau on the team", "changed the team order"]);
  });
});

describe("the owner's links", () => {
  it("are optional, and each must be the right site", () => {
    expect(aboutSchema.parse(aboutFormToInput(form(filled))).ownerLinks).toEqual({
      linkedin: null,
      facebook: null,
      instagram: null,
      x: null,
    });
    const parsed = aboutSchema.safeParse(
      aboutFormToInput(
        form({ ...filled, "owner-linkedin": "https://linkedin.com/in/jay", "owner-facebook": "https://x.com/jay" }),
      ),
    );
    expect(parsed.success).toBe(false);
    if (!parsed.success)
      expect(parsed.error.issues.map((issue) => issue.path.join("."))).toEqual(["ownerLinks.facebook"]);
  });
});

describe("placeholders", () => {
  it("are found until the owner replaces them", () => {
    expect(hasPlaceholders(DEFAULT_ABOUT)).toBe(true);
    expect(hasPlaceholders(aboutSchema.parse(aboutFormToInput(form(filled))))).toBe(false);
  });
});

describe("the owner's photo", () => {
  it("accepts images up to 4 MB", () => {
    expect(aboutPhotoProblem({ type: "image/jpeg", size: 300_000 })).toBeNull();
    expect(aboutPhotoProblem({ type: "application/pdf", size: 300_000 })).toBe("Use a JPG, PNG or WebP photo");
    expect(aboutPhotoProblem({ type: "image/png", size: 5 * 1024 * 1024 })).toMatch(/too large/);
  });

  it("is stored under the business with a random name", () => {
    expect(aboutPhotoPath("t1", "image/jpeg", "abc")).toBe("t1/owner-abc.jpg");
  });
});

describe("describeAboutChanges", () => {
  it("lists what changed", () => {
    const after = { ...DEFAULT_ABOUT, ownerName: "Jay Mwangi", photo: "t1/owner-abc.jpg" };
    expect(describeAboutChanges(DEFAULT_ABOUT, after)).toEqual(["changed your name or role", "changed the photo"]);
  });
});

describe("ownerInitials", () => {
  it("uses the owner's name, or the business's while the name is a placeholder", () => {
    expect(ownerInitials("Jay Mwangi Kamau", "Jay CVS")).toBe("JM");
    expect(ownerInitials("[Your full name]", "Jay CVS")).toBe("JC");
  });
});
