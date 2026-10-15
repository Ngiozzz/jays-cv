import { describe, expect, it } from "vitest";
import {
  acceptStep,
  completeStep,
  DAY,
  autoStepCutoffs,
  filesCutoff,
  filesDeleteOn,
  deleteAbandonedAt,
  deleteStep,
  dueAutoSteps,
  dueClock,
  extendStep,
  firstDraftDue,
  HOUR,
  orderRef,
  payStep,
  reassignStep,
  requestChangesStep,
  revisionDue,
  roundsLabel,
  sendDraftStep,
  type OrderTimings,
  type RuleOrder,
} from "./orders.rules";

const timings: OrderTimings = { unpaidHours: 24, reminderDays: 2, autoCompleteDays: 5, revisionHours: 24 };
const start = new Date("2026-10-14T08:00:00Z");
const at = (hours: number) => new Date(start.getTime() + hours * HOUR);

const order = (patch: Partial<RuleOrder> = {}): RuleOrder => ({
  status: "NEW",
  createdAt: start,
  paidAt: null,
  draftSentAt: null,
  remindedAt: null,
  writerId: null,
  firstDraftHours: 24,
  extraHours: 0,
  revisionRounds: 2,
  revisionWindowDays: null,
  revisions: [],
  ...patch,
});

const paid = (patch: Partial<RuleOrder> = {}) => order({ status: "PAID", paidAt: at(1), ...patch });

describe("orderRef", () => {
  it("joins the prefix and number", () => expect(orderRef("JC", 1048)).toBe("JC-1048"));
});

describe("paying and accepting", () => {
  it("pays a new or abandoned order once", () => {
    expect(payStep(order(), at(1))).toEqual({ ok: true, change: { status: "PAID", paidAt: at(1) } });
    expect(payStep(order({ status: "ABANDONED" }), at(30)).ok).toBe(true);
    expect(payStep(paid(), at(2))).toEqual({ ok: false, error: "This order is already paid." });
  });

  it("lets the first writer accept a paid order, and nobody after", () => {
    expect(acceptStep(order(), "w1", at(2)).ok).toBe(false);
    const accepted = acceptStep(paid(), "w1", at(2));
    expect(accepted).toEqual({ ok: true, change: { status: "WRITING", writerId: "w1", acceptedAt: at(2) } });
    expect(acceptStep(paid({ writerId: "w1" }), "w2", at(3))).toEqual({
      ok: false,
      error: "Another writer already accepted this order.",
    });
  });

  it("reassigns only accepted, open orders to someone else", () => {
    expect(reassignStep(paid(), "w2").ok).toBe(false);
    expect(reassignStep(order({ status: "WRITING", writerId: "w1" }), "w1").ok).toBe(false);
    expect(reassignStep(order({ status: "DELIVERED", writerId: "w1" }), "w2").ok).toBe(false);
    expect(reassignStep(order({ status: "WRITING", writerId: "w1" }), "w2")).toEqual({
      ok: true,
      change: { writerId: "w2" },
    });
  });
});

describe("drafts, changes and completing", () => {
  const writing = order({ status: "WRITING", paidAt: at(1), writerId: "w1" });

  it("needs a file to send a draft", () => {
    expect(sendDraftStep(writing, false, at(5))).toEqual({ ok: false, error: "Upload the draft file first." });
    expect(sendDraftStep(writing, true, at(5)).ok).toBe(true);
    expect(sendDraftStep(paid(), true, at(5)).ok).toBe(false);
  });

  it("counts revision rounds and stops at the package limit", () => {
    const sent = { ...writing, status: "DRAFT_SENT" as const, draftSentAt: at(10) };
    expect(requestChangesStep(sent, "  Add my internship  ", at(12))).toEqual({
      ok: true,
      change: { status: "REVISIONS", round: 1, text: "Add my internship", extraHours: 0 },
    });
    expect(requestChangesStep(sent, " ", at(12)).ok).toBe(false);
    const used = { ...sent, revisions: [at(11), at(15)] };
    expect(requestChangesStep(used, "One more thing", at(20))).toEqual({
      ok: false,
      error: "All 2 revision rounds are used. Extra rounds can be offered as a paid add-on.",
    });
    expect(roundsLabel(used)).toBe("2 of 2 revision rounds used");
  });

  it("allows unlimited rounds only inside the window", () => {
    const sent = { ...writing, status: "DRAFT_SENT" as const, revisionRounds: null, revisionWindowDays: 14 };
    const many = { ...sent, revisions: [at(2), at(3), at(4), at(5)] };
    expect(requestChangesStep(many, "Tweak the summary", at(13 * 24)).ok).toBe(true);
    expect(requestChangesStep(many, "Tweak the summary", at(15 * 24)).ok).toBe(false);
    expect(roundsLabel(many)).toBe("Unlimited rounds (14 days)");
  });

  it("completes only an order whose draft is with the client", () => {
    expect(completeStep(writing, at(9)).ok).toBe(false);
    expect(completeStep({ ...writing, status: "DRAFT_SENT" }, at(9))).toEqual({
      ok: true,
      change: { status: "DELIVERED", deliveredAt: at(9) },
    });
  });
});

describe("deadlines", () => {
  it("starts the first-draft clock at payment and adds the owner's extra time", () => {
    expect(firstDraftDue(order())).toBeNull();
    expect(firstDraftDue(paid())).toEqual(at(25));
    expect(firstDraftDue(paid({ extraHours: 6 }))).toEqual(at(31));
  });

  it("gives a revised draft revisionHours from the latest request", () => {
    const revising = order({ status: "REVISIONS", paidAt: at(1), revisions: [at(10), at(40)] });
    expect(revisionDue(revising, timings)).toEqual(at(64));
  });

  it("shows the team's clock", () => {
    expect(dueClock(paid(), timings, at(5))).toEqual({ text: "Due in 20h", tone: "" });
    expect(dueClock(paid(), timings, at(22))).toEqual({ text: "Due in 3h", tone: "soon" });
    expect(dueClock(paid(), timings, at(27))).toEqual({ text: "Overdue 2h", tone: "late" });
    expect(dueClock(order(), timings, at(4)).text).toBe("Unpaid · abandons in 20h");
    expect(dueClock(order({ status: "DELIVERED" }), timings, at(4)).tone).toBe("done");
  });

  it("lets the owner extend a running deadline only", () => {
    expect(extendStep(paid(), 12, timings)).toEqual({ ok: true, change: { extraHours: 12 } });
    expect(extendStep(paid(), 0, timings).ok).toBe(false);
    expect(extendStep(order({ status: "DELIVERED" }), 12, timings).ok).toBe(false);
  });
});

describe("dueAutoSteps", () => {
  it("abandons unpaid orders after the set hours", () => {
    expect(dueAutoSteps(order(), timings, at(23))).toEqual([]);
    expect(dueAutoSteps(order(), timings, at(24))).toEqual(["abandon"]);
  });

  it("reminds once, then completes when the client never replies", () => {
    const sent = order({ status: "DRAFT_SENT", paidAt: at(1), draftSentAt: at(10) });
    expect(dueAutoSteps(sent, timings, new Date(at(10).getTime() + DAY))).toEqual([]);
    expect(dueAutoSteps(sent, timings, new Date(at(10).getTime() + 2 * DAY))).toEqual(["remind"]);
    const reminded = { ...sent, remindedAt: new Date(at(10).getTime() + 2 * DAY) };
    expect(dueAutoSteps(reminded, timings, new Date(at(10).getTime() + 3 * DAY))).toEqual([]);
    expect(dueAutoSteps(reminded, timings, new Date(at(10).getTime() + 5 * DAY))).toEqual(["autoComplete"]);
  });
});

describe("deleting unpaid orders", () => {
  it("allows only abandoned orders with nothing paid", () => {
    expect(deleteStep(order({ status: "ABANDONED" }), 0).ok).toBe(true);
    expect(deleteStep(order({ status: "NEW" }), 0)).toMatchObject({ ok: false });
    expect(deleteStep(order({ status: "PAID" }), 0)).toMatchObject({ ok: false });
    expect(deleteStep(order({ status: "ABANDONED" }), 500)).toEqual({
      ok: false,
      error: "Part of this order was paid, so it can't be deleted.",
    });
  });

  it("deletes abandoned orders the set number of days after they were placed", () => {
    expect(deleteAbandonedAt(order(), 30)).toEqual(new Date(start.getTime() + 30 * DAY));
  });
});

describe("autoStepCutoffs", () => {
  it("looks back far enough for the earliest reminder or auto-complete", () => {
    const now = at(100);
    expect(autoStepCutoffs(timings, now)).toEqual({
      unpaidBefore: at(76),
      draftSentBefore: new Date(now.getTime() - 2 * DAY),
    });
    expect(autoStepCutoffs({ ...timings, reminderDays: 7 }, now).draftSentBefore).toEqual(
      new Date(now.getTime() - 5 * DAY),
    );
  });
});

describe("client files after delivery", () => {
  it("are deleted the set number of calendar months after delivery", () => {
    expect(filesDeleteOn(new Date("2026-10-15T08:00:00Z"), 6)).toEqual(new Date("2027-04-15T08:00:00Z"));
    expect(filesDeleteOn(new Date("2026-10-15T08:00:00Z"), 0)).toBeNull();
    expect(filesDeleteOn(null, 6)).toBeNull();
  });

  it("finds orders delivered long enough ago", () => {
    expect(filesCutoff(new Date("2027-04-15T08:00:00Z"), 6)).toEqual(new Date("2026-10-15T08:00:00Z"));
    expect(filesCutoff(new Date("2027-04-15T08:00:00Z"), 0)).toBeNull();
  });
});
