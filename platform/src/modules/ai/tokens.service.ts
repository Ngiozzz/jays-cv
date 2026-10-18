import "server-only";
import { findSettings } from "@/modules/content/content.repo";
import { tokenBalance, type TokenBalance } from "./tokens";
import { sumGrantedTokens, sumTokenDeltas } from "./tokens.repo";

export async function getTokenBalance(tenantId: string): Promise<TokenBalance> {
  const [remaining, granted, settings] = await Promise.all([
    sumTokenDeltas(tenantId),
    sumGrantedTokens(tenantId),
    findSettings(tenantId),
  ]);
  return tokenBalance(remaining, granted, settings.aiWarnPct, settings.aiPaused);
}
