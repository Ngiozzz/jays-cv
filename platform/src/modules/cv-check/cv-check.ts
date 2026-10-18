import { z } from "zod";

// "Check it yourself": a client pays a small fee and the AI tells them how well their CV fits one
// job, so they can improve it themself. Feedback only: the AI never writes or rewrites the CV.
// Pure: the feedback's shape, the instructions, and the checks on what the client sends.

export const cvFeedbackSchema = z.object({
  // false when the upload isn't a CV at all (a photo, an ID, a certificate…)
  isCv: z.boolean(),
  // How well the CV fits this job, 0–100
  matchPercent: z.number().int().min(0).max(100),
  // One plain sentence the client reads first
  verdict: z.string(),
  // What already fits the job (3–5 short points)
  strengths: z.array(z.string()),
  // What the job asks for that the CV doesn't show (3–6 short points)
  gaps: z.array(z.string()),
  // Words from the advert that recruiters and screening software look for, missing from the CV
  missingKeywords: z.array(z.string()),
  // Concrete things to change, in order of impact (3–5)
  tips: z.array(z.string()),
});

export type CvFeedback = z.infer<typeof cvFeedbackSchema>;

// What the AI returns: the feedback, plus the name and email written on the CV, so "Let us tailor it"
// can start the order with them filled in. Kept apart from the feedback (it's not shown as feedback).
export const cvCheckAnswerSchema = cvFeedbackSchema.extend({ name: z.string(), email: z.string() });
export type CvCheckAnswer = z.infer<typeof cvCheckAnswerSchema>;

// After the check, the CV is kept privately this long in case the client orders a tailored CV;
// then it's deleted. Ordering moves it to the order.
export const CHECK_CV_KEEP_HOURS = 48;

export const checkCvKeptUntil = (doneAt: Date) => new Date(doneAt.getTime() + CHECK_CV_KEEP_HOURS * 3_600_000);

// "Sun 20 Oct, 2:15 pm" in Kenyan time (the same on the server and in the browser)
export const keptUntilText = (iso: string) =>
  new Intl.DateTimeFormat("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Nairobi",
  }).format(new Date(iso));

export type CheckJob = {
  title: string;
  company: string;
  location: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
};

export function cvCheckPrompt(job: CheckJob): string {
  const list = (items: string[]) => (items.length ? items.map((item) => `- ${item}`).join("\n") : "- (not listed)");
  const lines = [
    "You are an experienced Kenyan recruiter. The attached document is a job seeker's CV.",
    "Compare it with the job below and tell the job seeker how well they fit and what to improve.",
    "",
    `JOB: ${job.title} at ${job.company} (${job.location || "location not given"})`,
    ...(job.summary ? [`About the role: ${job.summary}`] : []),
    "Responsibilities:",
    list(job.responsibilities),
    "",
    "Requirements:",
    list(job.requirements),
    "",
    "Rules:",
    "- Give feedback only. Never write, rewrite or return a CV, a profile or bullet points for them to paste in.",
    "- Judge only on what the CV shows. Never assume experience, qualifications or results it doesn't mention.",
    "- matchPercent: how well the CV as it stands fits this job's requirements (0–100). Be honest, not encouraging.",
    "- verdict: one plain sentence, e.g. 'A good fit on experience, but your CV hides the payroll work this job asks for.'",
    "- strengths: 3–5 short points of what already fits. gaps: 3–6 short points the job asks for that the CV doesn't show.",
    "- missingKeywords: up to 8 words or short phrases from the job that the CV lacks (skills, tools, certifications).",
    "- tips: 3–5 concrete changes in order of impact, written to the job seeker as 'you'. Plain English, no jargon.",
    "- name and email: the job seeker's full name and email address exactly as written on the CV; empty strings if it doesn't show them.",
    "- If the document is not a CV, set isCv to false, matchPercent to 0, leave the lists empty, and leave name and email empty.",
  ];
  return lines.join("\n");
}

// A PDF or a clear photo: Claude reads both directly (Word files would need converting first)
export const CHECK_CV_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export type CheckCvType = (typeof CHECK_CV_TYPES)[number];
export const CHECK_CV_MAX_BYTES = 10 * 1024 * 1024;

export function checkCvProblem(file: { size: number; type: string } | null): string | null {
  if (!file || file.size === 0) return "Please upload your CV.";
  if (!(CHECK_CV_TYPES as readonly string[]).includes(file.type))
    return "Upload your CV as a PDF or a clear photo. (In Word? Save it as PDF first.)";
  if (file.size > CHECK_CV_MAX_BYTES) return "That file is over 10 MB. Please upload a smaller file or a photo.";
  return null;
}

// How the match reads at a glance
export function matchBand(percent: number): { label: string; tone: "good" | "fair" | "low" } {
  if (percent >= 75) return { label: "Strong match", tone: "good" };
  if (percent >= 50) return { label: "Partial match", tone: "fair" };
  return { label: "Weak match", tone: "low" };
}

// "Pretend" mode (no Claude key yet): a sample, so the whole flow can be tried without spending tokens
export const PRETEND_FEEDBACK: CvFeedback = {
  isCv: true,
  matchPercent: 58,
  verdict: "You have the admin experience this job needs, but your CV doesn't show the HR side it asks for.",
  strengths: [
    "5 years of office administration, close to the admin half of this role",
    "Experience supervising a small team",
    "A diploma in Business Administration",
  ],
  gaps: [
    "No recruitment, onboarding or staff discipline experience shown",
    "No mention of payroll or compensation and benefits",
    "No HR qualification (e.g. a certificate or membership of IHRM)",
    "Duties are listed, but no results or numbers",
  ],
  missingKeywords: ["Recruitment", "Payroll", "HR policies", "Labour laws", "Staff discipline", "IHRM"],
  tips: [
    "Add any recruitment or interviewing you have done, even informally, to your latest job.",
    "Mention payroll, leave records or staff files if you handled them.",
    "Turn duties into results, e.g. 'cut supply costs by 15%' instead of 'handled procurement'.",
    "Put a short profile at the top that says you're moving into HR and Admin leadership.",
  ],
};
