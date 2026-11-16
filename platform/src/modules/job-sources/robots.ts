// robots.txt: where a site says which pages robots may read. A job source follows it: a page the
// site has closed to robots is never read. Pure, so it can be tested without the internet.

export const BOT_NAME = "JayCVSJobsBot";

type Rule = { allow: boolean; pattern: string };

// The rules that apply to our robot: the group naming it if there is one, else the "*" group
function rulesFor(robotsTxt: string, bot: string): Rule[] {
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let current: { agents: string[]; rules: Rule[] } | null = null;
  let lastWasAgent = false;
  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const match = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((key === "allow" || key === "disallow") && current) {
      // "Disallow:" with nothing after it allows everything
      if (value) current.rules.push({ allow: key === "allow", pattern: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  const name = bot.toLowerCase();
  const own = groups.filter((group) => group.agents.some((agent) => agent !== "*" && name.includes(agent)));
  const chosen = own.length ? own : groups.filter((group) => group.agents.includes("*"));
  return chosen.flatMap((group) => group.rules);
}

// "/careers/*.pdf$" → a regular expression for the start of a path
function patternToRegExp(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

// Whether our robot may read this address. The longest matching rule wins; on a tie, Allow wins.
export function robotsAllows(robotsTxt: string, url: string, bot = BOT_NAME): boolean {
  let path: string;
  try {
    const parsed = new URL(url);
    path = decodeURI(parsed.pathname) + parsed.search;
  } catch {
    return false;
  }
  let best: Rule | null = null;
  for (const rule of rulesFor(robotsTxt, bot)) {
    if (!patternToRegExp(rule.pattern).test(path)) continue;
    if (
      !best ||
      rule.pattern.length > best.pattern.length ||
      (rule.pattern.length === best.pattern.length && rule.allow)
    ) {
      best = rule;
    }
  }
  return best ? best.allow : true;
}
