import "server-only";
import { headers } from "next/headers";

// The visitor's internet address, as the hosting passes it on (used only for limits, then hashed)
export async function requestIp(): Promise<string> {
  const requestHeaders = await headers();
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
}
