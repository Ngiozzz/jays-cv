"use client";

import { useState, useTransition, type FormEvent } from "react";
import { leaveReviewAction } from "@/app/(public)/[tenant]/track/feedback-actions";
import { Icon } from "@/components/icons/Icon";
import type { ClientResult } from "@/modules/orders/client-feedback.service";

type Failed = Extract<ClientResult, { ok: false }>;

const STAR_WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

// "How did we do?" once the order is complete. The review waits for the owner's approval, and is only
// ever shown on the website if the client ticks the box.
export function ReviewForm({ orderRef, name }: { orderRef: string; name: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState<Failed | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setFailed(null);
    startTransition(async () => {
      const result = await leaveReviewAction(orderRef, data);
      // On success the page reloads and shows the thank-you
      if (!result.ok) setFailed(result);
    });
  };

  const fieldError = (field: string) =>
    failed?.fieldErrors?.[field] && (
      <small className="field-error" role="alert">
        {failed.fieldErrors[field]}
      </small>
    );
  const shown = hover || rating;

  return (
    <section className="track-card review-box">
      <h3>How did we do?</h3>
      <p>Your review helps other job seekers, and tells us what to keep doing.</p>
      <form className="client-review-form" onSubmit={submit} noValidate>
        <fieldset className="star-pick" onMouseLeave={() => setHover(0)}>
          <legend className="sr-only">Your rating</legend>
          {[1, 2, 3, 4, 5].map((star) => (
            <label key={star} className={star <= shown ? "on" : undefined} onMouseEnter={() => setHover(star)}>
              <input
                type="radio"
                name="rating"
                value={star}
                checked={rating === star}
                onChange={() => setRating(star)}
                className="sr-only"
              />
              <span aria-hidden="true">★</span>
              <span className="sr-only">
                {star} {star === 1 ? "star" : "stars"}
              </span>
            </label>
          ))}
          <span className="star-word">{STAR_WORDS[shown]}</span>
        </fieldset>
        {fieldError("rating")}
        <div className="od-field">
          <label htmlFor="rv-text">Tell others about your experience</label>
          <textarea
            id="rv-text"
            name="text"
            rows={3}
            maxLength={600}
            placeholder="e.g. They rewrote my CV in 2 days and I got 3 interview calls."
            aria-invalid={Boolean(failed?.fieldErrors?.text)}
            required
          />
          {fieldError("text")}
        </div>
        <div className="od-grid">
          <div className="od-field">
            <label htmlFor="rv-name">Your name</label>
            <input id="rv-name" name="name" defaultValue={name} maxLength={60} autoComplete="name" required />
            {fieldError("name")}
          </div>
          <div className="od-field">
            <label htmlFor="rv-role">
              Your job title <small>(optional)</small>
            </label>
            <input id="rv-role" name="role" maxLength={60} placeholder="e.g. Accountant" />
            {fieldError("role")}
          </div>
        </div>
        <label className="od-check">
          <input type="checkbox" name="consent" /> You may show my review on the website
        </label>
        {failed && !failed.fieldErrors && (
          <p className="od-error" role="alert">
            {failed.error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={pending}>
          <Icon name="send" />
          {pending ? "Sending…" : "Send review"}
        </button>
      </form>
    </section>
  );
}
