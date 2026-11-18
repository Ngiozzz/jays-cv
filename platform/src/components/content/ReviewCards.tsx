import type { SiteReview } from "@/modules/content/content.service";

// Reviews without a photo show the reviewer's initials instead
const initials = (name: string) =>
  name
    .replace(/[^A-Za-z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "J";

function Who({ review }: { review: SiteReview }) {
  return (
    <footer>
      {review.photo ? (
        <img className="avatar" src={review.photo} alt="" loading="lazy" />
      ) : (
        <span className="avatar" aria-hidden="true">
          {initials(review.name)}
        </span>
      )}
      <div>
        <b>{review.name}</b>
        {review.role && <span>{review.role}</span>}
      </div>
    </footer>
  );
}

// Client words: the first one large, the rest beside it. The rating stays in the accessible name; the
// stars aren't drawn, since a wall of five stars reads as filler.
export function ReviewCards({ reviews }: { reviews: SiteReview[] }) {
  const [lead, ...rest] = reviews;
  if (!lead) return null;
  return (
    <div className={rest.length ? "stories" : "stories single"}>
      <figure className="story lead-story testimonial" aria-label={`${lead.rating} out of 5`}>
        <blockquote>{lead.text}</blockquote>
        <Who review={lead} />
      </figure>
      {rest.length > 0 && (
        <div className="side">
          {rest.map((review) => (
            <figure key={review.id} className="story testimonial card" aria-label={`${review.rating} out of 5`}>
              <blockquote>{review.text}</blockquote>
              <Who review={review} />
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
