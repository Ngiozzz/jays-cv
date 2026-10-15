"use server";

import { refresh, updateTag } from "next/cache";
import { aboutFormToInput } from "@/modules/content/admin/about";
import { saveAbout } from "@/modules/content/admin/about.service";
import { savePackage, saveServices, undoChange } from "@/modules/content/admin/content-admin.service";
import { saveFaqs } from "@/modules/content/admin/faqs.service";
import { homepageFormToInput } from "@/modules/content/admin/homepage";
import { saveHomepage } from "@/modules/content/admin/homepage.service";
import { postFormToInput, type PostIntent } from "@/modules/content/admin/posts";
import { deletePost, savePost } from "@/modules/content/admin/posts.service";
import { packageFormToInput, servicesFormToInput } from "@/modules/content/admin/prices";
import { newReviewFormToInput, type ReviewMove } from "@/modules/content/admin/reviews";
import { addReview, changeReview, editReviewText } from "@/modules/content/admin/reviews.service";
import { newSampleFormToInput, samplesFormToInput } from "@/modules/content/admin/samples";
import { addSample, moveSample, saveSamples } from "@/modules/content/admin/samples.service";
import { settingsFormToInput } from "@/modules/content/admin/settings";
import { saveSettings } from "@/modules/content/admin/settings.service";
import { contentTag } from "@/modules/content/content.service";
import { requireMember } from "@/modules/team/current-member";

// Thin wrappers: who's asking, then the content service; a successful save refreshes the
// public website's cache (so it's live at once) and this screen

async function published<T extends { ok: boolean }>(tenantId: string, result: T): Promise<T> {
  if (result.ok) {
    updateTag(contentTag(tenantId));
    refresh();
  }
  return result;
}

export async function savePackageAction(packageId: string, form: FormData) {
  const member = await requireMember();
  return published(member.tenant.id, await savePackage(member, packageId, packageFormToInput(form)));
}

export async function saveServicesAction(serviceIds: string[], form: FormData) {
  const member = await requireMember();
  return published(member.tenant.id, await saveServices(member, servicesFormToInput(form, serviceIds)));
}

export async function changeReviewAction(reviewId: string, move: ReviewMove) {
  const member = await requireMember();
  return published(member.tenant.id, await changeReview(member, reviewId, move));
}

export async function editReviewTextAction(reviewId: string, text: string) {
  const member = await requireMember();
  return published(member.tenant.id, await editReviewText(member, reviewId, { text }));
}

export async function addReviewAction(form: FormData) {
  const member = await requireMember();
  return published(member.tenant.id, await addReview(member, newReviewFormToInput(form)));
}

export async function saveSamplesAction(sampleIds: string[], form: FormData) {
  const member = await requireMember();
  return published(member.tenant.id, await saveSamples(member, samplesFormToInput(form, sampleIds)));
}

export async function moveSampleAction(sampleId: string, direction: "earlier" | "later") {
  const member = await requireMember();
  return published(member.tenant.id, await moveSample(member, sampleId, direction === "earlier" ? "earlier" : "later"));
}

export async function addSampleAction(form: FormData) {
  const member = await requireMember();
  const image = (name: string) => {
    const value = form.get(name);
    return value instanceof File ? value : null;
  };
  const images = { before: image("before"), after: image("after") };
  return published(member.tenant.id, await addSample(member, newSampleFormToInput(form), images));
}

export async function savePostAction(postId: string | null, intent: PostIntent, form: FormData) {
  const member = await requireMember();
  return published(member.tenant.id, await savePost(member, postId, intent, postFormToInput(form)));
}

export async function deletePostAction(postId: string) {
  const member = await requireMember();
  return published(member.tenant.id, await deletePost(member, postId));
}

export async function saveFaqsAction(rows: unknown) {
  const member = await requireMember();
  return published(member.tenant.id, await saveFaqs(member, rows));
}

export async function saveHomepageAction(form: FormData) {
  const member = await requireMember();
  return published(member.tenant.id, await saveHomepage(member, homepageFormToInput(form)));
}

export async function saveAboutAction(form: FormData) {
  const member = await requireMember();
  const photo = form.get("photo");
  return published(
    member.tenant.id,
    await saveAbout(member, aboutFormToInput(form), {
      file: photo instanceof File ? photo : null,
      remove: form.get("removePhoto") === "on",
    }),
  );
}

export async function saveSettingsAction(form: FormData) {
  const member = await requireMember();
  return published(member.tenant.id, await saveSettings(member, settingsFormToInput(form)));
}

export async function undoChangeAction(changeId: string) {
  const member = await requireMember();
  return published(member.tenant.id, await undoChange(member, changeId));
}
