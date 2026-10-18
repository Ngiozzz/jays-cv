import { receive, runCommand } from "@/modules/command-center/command-center.service";
import { command } from "@/modules/command-center/messages";

const NO_STORE = { "cache-control": "no-store" };

// The Command Center sends one command at a time (add tokens, pause or resume the AI)
export async function POST(request: Request) {
  const body = await request.text();
  const business = await receive(request, body);
  if (!business) return Response.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return Response.json({ error: "bad_command" }, { status: 400, headers: NO_STORE });
  }
  const parsed = command.safeParse(json);
  if (!parsed.success) return Response.json({ error: "bad_command" }, { status: 400, headers: NO_STORE });

  const outcome = await runCommand(business, parsed.data);
  if (outcome.status === "conflict") {
    return Response.json({ error: "id_taken" }, { status: 409, headers: NO_STORE });
  }
  return Response.json(outcome, { headers: NO_STORE });
}
