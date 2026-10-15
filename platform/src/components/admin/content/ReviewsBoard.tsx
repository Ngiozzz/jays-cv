"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/components/icons/Icon";
import {
  addReviewAction,
  changeReviewAction,
  editReviewTextAction,
} from "@/app/(admin)/admin/(signed-in)/content/actions";
import type { ReviewMove } from "@/modules/content/admin/reviews";
import { MAX_ON_HOMEPAGE } from "@/modules/content/admin/reviews";
import type { AdminReview } from "@/modules/content/admin/reviews.service";
import { SaveBar, useSave } from "./useSave";

const stars = (rating: number) => "★".repeat(rating) + "☆".repeat(5 - rating);

// Waiting → Published (up to 3 on the homepage) → Hidden & private, as in the design preview
export function ReviewsBoard({ reviews }: { reviews: AdminReview[] }) {
  const waiting = reviews.filter((review) => review.status === "PENDING");
  const published = reviews.filter((review) => review.status === "APPROVED");
  const hidden = reviews.filter((review) => review.status === "HIDDEN");

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2>
            Waiting for approval <span className="count-pill">{waiting.length}</span>
          </h2>
          <span className="hint-sm">From clients&apos; tracking pages after their order is complete</span>
        </div>
        <div className="panel-body review-grid">
          {waiting.map((review) => (
            <ReviewCard key={JSON.stringify(review)} review={review} />
          ))}
          {waiting.length === 0 && <p className="empty-note">No new reviews.</p>}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>
            Published <span className="count-pill">{published.length}</span>
          </h2>
          <span className="hint-sm">
            Up to {MAX_ON_HOMEPAGE} can be shown on the homepage and Samples page ·{" "}
            <a href="/#testimonials" target="_blank" rel="noopener">
              View ↗
            </a>
          </span>
        </div>
        <div className="panel-body review-grid">
          {published.map((review) => (
            <ReviewCard key={JSON.stringify(review)} review={review} />
          ))}
          {published.length === 0 && <p className="empty-note">None yet.</p>}
        </div>
      </section>

      {hidden.length > 0 && (
        <details className="panel hidden-reviews">
          <summary className="panel-head">
            <h2>
              Hidden &amp; private <span className="count-pill">{hidden.length}</span>
            </h2>
          </summary>
          <div className="panel-body review-grid">
            {hidden.map((review) => (
              <ReviewCard key={JSON.stringify(review)} review={review} />
            ))}
          </div>
        </details>
      )}

      {/* key: an empty form again after each review is added */}
      <AddReview key={reviews.length} />
    </>
  );
}

function ReviewCard({ review }: { review: AdminReview }) {
  const save = useSave();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(review.text);
  const move = (to: ReviewMove) => save.run(() => changeReviewAction(review.id, to));
  const label = (action: string) => `${action}: review from ${review.name}`;

  const button = (to: ReviewMove, text: string, primary = false) => (
    <button
      type="button"
      className={`btn ${primary ? "btn-primary" : "btn-ghost"} btn-sm`}
      disabled={save.pending}
      onClick={() => move(to)}
      aria-label={label(text)}
    >
      {text}
    </button>
  );

  return (
    <article className={review.featured ? "review-card featured" : "review-card"}>
      <div className="review-top">
        <span className="stars" aria-label={`${review.rating} out of 5 stars`}>
          {stars(review.rating)}
        </span>
        {review.consent ? (
          <span className="mini-pill ok">✓ May publish</span>
        ) : (
          <span className="mini-pill no">✗ Private: no permission to publish</span>
        )}
      </div>
      {editing ? (
        <>
          <textarea
            className="review-edit"
            rows={4}
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-label={`Wording of ${review.name}'s review`}
          />
          {save.error("text")}
        </>
      ) : (
        <p className="review-text">&ldquo;{review.text}&rdquo;</p>
      )}
      <p className="review-who">
        <strong>{review.name}</strong>
        {review.role && ` · ${review.role}`}
        <small>{review.source}</small>
      </p>
      {/* The AI's screening of a client's review, shown while the owner decides */}
      {review.status === "PENDING" && review.aiFlag && (
        <p className={review.aiFlag === "check" ? "review-ai check" : "review-ai ok"}>
          <Icon name={review.aiFlag === "check" ? "alert" : "check"} size={16} />
          <span>
            <strong>{review.aiFlag === "check" ? "AI: check this." : "AI: looks genuine."}</strong> {review.aiReason}
          </span>
        </p>
      )}
      <div className="review-actions">
        {review.status === "PENDING" && (
          <>
            {review.consent ? button("approve", "Publish", true) : button("private", "Keep (private)")}
            {button("hide", "Hide")}
          </>
        )}
        {review.status === "APPROVED" &&
          (editing ? (
            <>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={save.pending}
                onClick={() => save.run(() => editReviewTextAction(review.id, text))}
              >
                Save wording
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setEditing(false);
                  setText(review.text);
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {review.featured ? button("unfeature", "★ On homepage", true) : button("feature", "☆ Show on homepage")}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setEditing(true)}
                aria-label={label("Edit")}
              >
                Edit
              </button>
              {button("hide", "Unpublish")}
            </>
          ))}
        {review.status === "HIDDEN" && button("restore", "Move back to waiting")}
      </div>
    </article>
  );
}

// For reviews that came in another way, e.g. a client's WhatsApp message
function AddReview() {
  const save = useSave();
  const [open, setOpen] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save.run(() => addReviewAction(form));
  };

  const cls = (name: string, extra = "") => `f${extra}${save.errors[name] ? " invalid" : ""}`;

  return (
    <details className="panel" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="panel-head">
        <h2>Add a review</h2>
        <span className="hint-sm">For reviews sent on WhatsApp, Google or by email</span>
      </summary>
      <form className="panel-body" noValidate onSubmit={submit}>
        <div className="fgrid">
          <div className={cls("name")}>
            <label htmlFor="rv-name">Client&apos;s name</label>
            <input id="rv-name" name="name" type="text" />
            {save.error("name")}
          </div>
          <div className={cls("role")}>
            <label htmlFor="rv-role">
              Job title <small>(optional)</small>
            </label>
            <input id="rv-role" name="role" type="text" placeholder="e.g. Accountant, KCB" />
            {save.error("role")}
          </div>
          <div className={cls("rating")}>
            <label htmlFor="rv-rating">Rating</label>
            <select id="rv-rating" name="rating" defaultValue="5">
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {stars(n)} ({n})
                </option>
              ))}
            </select>
            {save.error("rating")}
          </div>
          <div className={cls("source")}>
            <label htmlFor="rv-source">Where it came from</label>
            <input id="rv-source" name="source" type="text" defaultValue="WhatsApp" />
            {save.error("source")}
          </div>
          <div className={cls("text", " full")}>
            <label htmlFor="rv-text">What they said</label>
            <textarea id="rv-text" name="text" rows={4} />
            {save.error("text")}
          </div>
          <div className="f full checks">
            <label className="inline-check">
              <input type="checkbox" name="consent" /> The client agreed to this review being shown on the website
            </label>
          </div>
        </div>
        <p className="hint-sm">Without the client&apos;s permission the review is kept private and never shown.</p>
        <SaveBar save={save} label="Add review" />
      </form>
    </details>
  );
}
