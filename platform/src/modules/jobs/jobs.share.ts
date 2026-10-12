import { formatDay } from "./jobs.rules";
import type { JobInput } from "./jobs.schema";

// The ready-to-paste post for the Jay CVS Job Vacancies WhatsApp channel (same format as the preview)
export function channelPost(job: JobInput, links: { job: string; services: string }): string {
  const { apply } = job;
  const lines = [`🔥 *${job.title.toUpperCase()}*`, `🏢 ${job.company}`, `📍 ${job.location} · ${job.type}`];
  if (job.salary) lines.push(`💰 ${job.salary}`);
  lines.push(`⏳ Deadline: ${job.deadline ? formatDay(job.deadline) : "Open until filled"}`);
  const send = apply.attach.length ? apply.attach.join(" & ") : "your CV";
  if (apply.method === "email") {
    lines.push(`📧 Apply: send ${send} to ${apply.email}${apply.subject ? ` (Subject: ${apply.subject})` : ""}`);
  }
  if (apply.method === "link") lines.push(`🔗 Apply online: ${apply.url}`);
  if (apply.method === "whatsapp") lines.push(`📱 Send your CV on WhatsApp: ${apply.phone}`);
  if (apply.method === "in-person")
    lines.push(`📌 Apply in person: ${apply.address}${apply.when ? `, ${apply.when}` : ""}`);
  lines.push(
    "",
    `👉 Full details: ${links.job}`,
    "",
    `✍🏾 Is your CV ready? Get one that gets you shortlisted: ${links.services}`,
  );
  return lines.join("\n");
}
