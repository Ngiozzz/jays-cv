import Link from "next/link";
import { Icon } from "@/components/icons/Icon";

// For clients who already ordered: straight to their order's progress
export function HomeTrack() {
  return (
    <section className="track-strip" aria-label="Track your order">
      <div className="container track-strip-inner">
        <span className="icon-box">
          <Icon name="search" />
        </span>
        <div>
          <strong>Already placed an order?</strong>
          <p>See where your CV is, when your draft will be ready, and every update from your writer.</p>
        </div>
        <Link className="btn btn-primary" href="/track">
          Track my order
        </Link>
      </div>
    </section>
  );
}
