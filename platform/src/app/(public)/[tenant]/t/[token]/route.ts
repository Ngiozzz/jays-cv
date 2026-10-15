import { NextResponse, type NextRequest } from "next/server";
import { openTrackingLink } from "@/modules/orders/tracking.service";
import { getTenant } from "@/modules/tenants/tenants.service";

// The private tracking link sent to the client: lets them straight into their order
export async function GET(request: NextRequest, { params }: RouteContext<"/[tenant]/t/[token]">) {
  const { tenant: slug, token } = await params;
  const opened = await openTrackingLink(await getTenant(slug), token);
  const to = !opened
    ? "/track?link=invalid"
    : opened.cancelled
      ? `/track?cancelled=${opened.cancelled}`
      : `/track/${opened.ref}`;
  const response = NextResponse.redirect(new URL(to, request.nextUrl.origin));
  if (opened?.pass) response.cookies.set(opened.pass);
  return response;
}
