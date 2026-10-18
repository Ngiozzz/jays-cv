import { describe, expect, it } from "vitest";
import { canChangeMember, initialsOf, inviteMessage, whatsappTo } from "./team.rules";
import { inviteFormToInput, inviteSchema, memberTermsSchema } from "./team.schema";

describe("canChangeMember", () => {
  const owner = { id: "jay", role: "OWNER" as const };
  const grace = { id: "grace", role: "WRITER" as const };

  it("lets the owner change writers, but never the owner or themselves", () => {
    expect(canChangeMember(owner, grace)).toBe(true);
    expect(canChangeMember(owner, owner)).toBe(false);
    expect(canChangeMember(grace, grace)).toBe(false);
  });
});

describe("inviteSchema", () => {
  const form = (fields: Record<string, string>) => {
    const data = new FormData();
    for (const [k, v] of Object.entries(fields)) data.set(k, v);
    return inviteFormToInput(data);
  };

  it("accepts a complete invite and tidies the email and phone", () => {
    const parsed = inviteSchema.parse(
      form({
        name: "Grace Wanjiku",
        email: " Grace.W@Gmail.com ",
        phone: "0712 345 678",
        canWrite: "on",
        payPercent: "40",
      }),
    );
    expect(parsed).toEqual({
      name: "Grace Wanjiku",
      email: "grace.w@gmail.com",
      phone: "0712345678",
      canWrite: true,
      canPostJobs: false,
      payPercent: 40,
    });
  });

  it("explains what's wrong", () => {
    const result = inviteSchema.safeParse(form({ name: "G", email: "not-email", phone: "12345", payPercent: "140" }));
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.path[0]);
    expect(messages).toEqual(expect.arrayContaining(["name", "email", "phone", "payPercent"]));
  });

  it("allows no phone number", () => {
    const brian = { name: "Brian", email: "b@x.com", phone: "", canWrite: "on", payPercent: "35" };
    expect(inviteSchema.safeParse(form(brian)).success).toBe(true);
  });

  it("needs at least one thing they can do", () => {
    const base = { name: "Brian", email: "b@x.com", phone: "", payPercent: "35" };
    const nothing = inviteSchema.safeParse(form(base));
    expect(nothing.success ? [] : nothing.error.issues.map((issue) => [issue.path[0], issue.message])).toEqual([
      ["canWrite", "Tick at least one: Write CVs or Post jobs"],
    ]);
    expect(inviteSchema.safeParse(form({ ...base, canPostJobs: "on" })).success).toBe(true);
  });
});

describe("memberTermsSchema", () => {
  it("only allows whole percentages from 0 to 100", () => {
    expect(memberTermsSchema.safeParse({ canWrite: true, canPostJobs: false, payPercent: 35.5 }).success).toBe(false);
    expect(memberTermsSchema.safeParse({ canWrite: true, canPostJobs: false, payPercent: 100 }).success).toBe(true);
  });
});

describe("inviteMessage", () => {
  it("names the Google account to use", () => {
    const text = inviteMessage(
      { name: "Grace Wanjiku", email: "grace@gmail.com", canWrite: true },
      "https://jaycvs.co.ke/admin/login",
      "Jay CVS",
    );
    expect(text).toContain("Hi Grace, I've added you to the Jay CVS team as a writer");
    expect(text).toContain(
      'open https://jaycvs.co.ke/admin/login and choose "Continue with Google" using grace@gmail.com',
    );
  });
});

describe("whatsappTo / initialsOf", () => {
  it("builds a WhatsApp link to a Kenyan number", () => {
    expect(whatsappTo("0712 345 678", "Hi")).toBe("https://wa.me/254712345678?text=Hi");
  });

  it("makes initials", () => {
    expect(initialsOf("Grace Wanjiku")).toBe("GW");
  });
});

describe("inviteMessage for the owner", () => {
  it("doesn't call the owner a writer", () => {
    const text = inviteMessage(
      { name: "Jay", email: "jay@gmail.com", canWrite: true, role: "OWNER" },
      "https://jaycvs.co.ke/admin/login",
      "Jay CVS",
    );
    expect(text).toContain("you're the owner");
    expect(text).not.toContain("as a writer");
  });
});
