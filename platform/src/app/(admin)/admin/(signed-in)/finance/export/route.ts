import { parsePeriod } from "@/modules/finance/finance.rules";
import { paymentsCsv } from "@/modules/finance/finance.service";
import { requireMember } from "@/modules/team/current-member";
import { can } from "@/modules/team/permissions";

// "Download payments (CSV)": the payments in the chosen period, ready to open in Excel
export async function GET(request: Request) {
  const member = await requireMember();
  if (!can(member, "manageFinance")) return new Response("Not allowed", { status: 403 });
  const period = parsePeriod(new URL(request.url).searchParams.get("period"));
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
  return new Response(await paymentsCsv(member, period), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${member.tenant.slug}-payments-${today}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
