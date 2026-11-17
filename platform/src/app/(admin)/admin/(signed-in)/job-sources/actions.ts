"use server";

import {
  addJobSource,
  addStarterSources,
  addSuggestedSources,
  hideSuggestion,
  setMorningRun,
  checkJobSourceNow,
  removeJobSource,
  saveBannedSites,
  setJobSourceEnabled,
} from "@/modules/job-sources/job-sources.admin";
import { checkNextFinds } from "@/modules/job-sources/find-check.service";
import { requirePermission } from "@/modules/team/current-member";

// Thin wrappers: who is asking, then the job sources service. The screen refreshes itself afterwards.

export async function addJobSourceAction(form: FormData) {
  const member = await requirePermission("manageJobSources");
  return addJobSource(member, { name: String(form.get("name") ?? ""), url: String(form.get("url") ?? "") });
}

export async function checkJobSourceAction(id: string) {
  const member = await requirePermission("manageJobSources");
  return checkJobSourceNow(member, String(id));
}

export async function setJobSourceEnabledAction(id: string, enabled: boolean) {
  const member = await requirePermission("manageJobSources");
  return setJobSourceEnabled(member, String(id), enabled === true);
}

export async function removeJobSourceAction(id: string) {
  const member = await requirePermission("manageJobSources");
  return removeJobSource(member, String(id));
}

export async function saveBannedSitesAction(text: string) {
  const member = await requirePermission("manageJobSources");
  return saveBannedSites(member, String(text ?? "").slice(0, 5000));
}

export async function addStarterSourcesAction(ids: string[]) {
  const member = await requirePermission("manageJobSources");
  return addStarterSources(member, (Array.isArray(ids) ? ids : []).map(String).slice(0, 100));
}

export async function addSuggestedSourcesAction(sites: string[]) {
  const member = await requirePermission("manageJobSources");
  return addSuggestedSources(member, (Array.isArray(sites) ? sites : []).map(String).slice(0, 30));
}

export async function hideSuggestionAction(site: string) {
  const member = await requirePermission("manageJobSources");
  return hideSuggestion(member, String(site ?? ""));
}

export async function setMorningRunAction(on: boolean) {
  const member = await requirePermission("manageJobSources");
  return setMorningRun(member, on === true);
}

// AI check: the next batch of found jobs (the screen calls it again until none are left)
export async function checkFindsAction() {
  const member = await requirePermission("manageJobSources");
  return checkNextFinds(member.tenant.id, member.id);
}
