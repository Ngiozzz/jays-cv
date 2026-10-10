import type { SiteReview } from "@/modules/content/content.service";

const stars = (rating: number) => "★".repeat(rating) + "☆".repeat(5 - rating);

// Reviews without a photo show the reviewer's initials instead
const initials = (name: string) =>
  name
    .replace(/[^A-Za-z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "★";

export function ReviewCards({ reviews }: { reviews: SiteReview[] }) {
  return (
    <div className="card-grid testimonials-grid">
      {reviews.map((review) => (
        <blockquote key={review.id} className="card testimonial reveal">
          <p className="stars" aria-label={`${review.rating} out of 5 stars`}>
            {stars(review.rating)}
          </p>
          <p>&ldquo;{review.text}&rdquo;</p>
          <footer>
            {review.photo ? (
              <img className="avatar" src={review.photo} alt="" loading="lazy" />
            ) : (
              <div className="avatar" aria-hidden="true">
                {initials(review.name)}
              </div>
            )}
            <div>
              <strong>{review.name}</strong>
              {review.role && <span>{review.role}</span>}
            </div>
          </footer>
        </blockquote>
      ))}
    </div>
  );
}
