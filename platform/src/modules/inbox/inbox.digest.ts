import { formatDay } from "@/modules/jobs/jobs.rules";

// "Today's WhatsApp channel post": every job approved today in one message, linking back to the website

type DigestJob = { title: string; company: string; location: string; deadline: string | null; slug: string };

export function dailyDigest(jobs: DigestJob[], today: string, siteUrl: string): string {
  if (!jobs.length) return "";
  const lines = [`🔥 *NEW JOBS TODAY* (${formatDay(today)})`, ""];
  jobs.forEach((job, index) => {
    lines.push(
      `${index + 1}. *${job.title}*: ${job.company}, ${job.location}`,
      `⏳ ${job.deadline ? `Deadline: ${formatDay(job.deadline)}` : "Open until filled"}`,
      `👉 ${siteUrl}/jobs/${job.slug}`,
      "",
    );
  });
  lines.push(
    `🔎 All open jobs: ${siteUrl}/jobs`,
    `✍🏾 Is your CV ready? Get one that gets you shortlisted: ${siteUrl}/services`,
  );
  return lines.join("\n");
}
