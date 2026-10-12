// When a job's poster may be deleted: once the job has been closed for longer than the business's
// retention setting. Jobs still on the website keep their poster, however old.

type JobForRetention = { status: string; deadline: string | null; updatedDay: string };

// The day the job stopped being live: its deadline, or (open-ended jobs) the day it was taken down
export function closedOn(job: JobForRetention, today: string): string | null {
  if (job.deadline && job.deadline < today) return job.deadline;
  if (!job.deadline && job.status !== "PUBLISHED") return job.updatedDay;
  return null;
}

// "2026-10-12" minus 3 months → "2026-07-12"
export function monthsBefore(day: string, months: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString().slice(0, 10);
}

export function posterExpired(job: JobForRetention, today: string, retentionMonths: number): boolean {
  const closed = closedOn(job, today);
  return closed !== null && closed < monthsBefore(today, retentionMonths);
}
