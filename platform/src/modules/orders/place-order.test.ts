import { describe, expect, it } from "vitest";
import {
  cvProblem,
  kenyanMobile,
  orderDetailsSchema,
  orderFormToInput,
  parseItem,
  tailoringProblems,
} from "./place-order";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

describe("kenyanMobile", () => {
  it("stores every way of writing a number the same way", () => {
    for (const typed of ["0712345678", "+254 712 345 678", "254-712-345-678", "0712 345 678"])
      expect(kenyanMobile(typed)).toBe("0712 345 678");
    expect(kenyanMobile("0110 123 456")).toBe("0110 123 456");
  });

  it("refuses numbers that aren't Kenyan mobiles", () => {
    expect(kenyanMobile("0212345678")).toBeNull();
    expect(kenyanMobile("071234567")).toBeNull();
  });
});

describe("orderDetailsSchema", () => {
  it("reads the card's form", () => {
    const parsed = orderDetailsSchema.parse(
      orderFormToInput(
        form({
          item: "package:pkg_123",
          need: "cv-letter",
          name: " Faith Njeri ",
          phone: "+254712345678",
          email: " Faith@Example.com ",
          whatsappUpdates: "on",
        }),
      ),
    );
    expect(parsed).toMatchObject({
      item: "package:pkg_123",
      need: "cv-letter",
      name: "Faith Njeri",
      phone: "0712 345 678",
      email: "faith@example.com",
      targetRole: "",
      noCv: false,
      whatsappUpdates: true,
    });
  });

  it("names each problem", () => {
    const result = orderDetailsSchema.safeParse(
      orderFormToInput(form({ item: "nonsense", name: "Jo", phone: "12345", email: "not-an-email" })),
    );
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.map((issue) => issue.path[0]).sort()).toEqual(["email", "item", "name", "phone"]);
  });

  it("only accepts well-formed items", () => {
    expect(parseItem("service:abc-1")).toEqual({ type: "service", id: "abc-1" });
    expect(parseItem("package:../../x")).toBeNull();
  });
});

describe("cvProblem", () => {
  it("needs a CV unless the client has none yet", () => {
    expect(cvProblem(null, false)).toContain("upload your CV");
    expect(cvProblem(null, true)).toBeNull();
    expect(cvProblem({ size: 2000, type: "application/pdf" }, false)).toBeNull();
    expect(cvProblem({ size: 2000, type: "application/zip" }, false)).toContain("PDF, Word document or photo");
    expect(cvProblem({ size: 11 * 1024 * 1024, type: "image/jpeg" }, false)).toContain("over 10 MB");
  });
});

describe("tailoringProblems", () => {
  const order = { hasCv: true, fromJobPage: false, jobAdvert: "", hasAdvertFile: false };

  it("is ready from a job page with a CV", () => {
    expect(tailoringProblems({ ...order, fromJobPage: true })).toEqual({});
  });

  it("takes the advert pasted in, a link, or a photo of it", () => {
    expect(tailoringProblems({ ...order, jobAdvert: "https://careers.kengen.co.ke/jobs/123" })).toEqual({});
    expect(tailoringProblems({ ...order, hasAdvertFile: true })).toEqual({});
    expect(tailoringProblems(order)).toEqual({
      jobAdvert: "Paste the job advert or a link to it, or upload a photo of it.",
    });
  });

  it("needs the CV to tailor", () => {
    expect(tailoringProblems({ ...order, hasCv: false, fromJobPage: true })).toEqual({
      cv: "Please upload the CV you'd like tailored.",
    });
  });
});
