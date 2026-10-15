import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TrackView } from "@/components/track/TrackView";
import { loadTrackedOrder, wasCancelled } from "@/modules/orders/tracking.service";
import { getTenant } from "@/modules/tenants/tenants.service";

// Private to the client: never indexed
export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

export default function TrackedOrderPage({ params }: PageProps<"/[tenant]/track/[ref]">) {
  return (
    <div className="track-page">
      <div className="container track-wrap">
        <Suspense fallback={<p className="track-meta">Loading your order…</p>}>
          <TrackedOrder params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function TrackedOrder({ params }: { params: PageProps<"/[tenant]/track/[ref]">["params"] }) {
  const { tenant: slug, ref } = await params;
  const tenant = await getTenant(slug);
  const order = await loadTrackedOrder(tenant, decodeURIComponent(ref));
  if (!order) {
    if (await wasCancelled(tenant, decodeURIComponent(ref))) redirect(`/track?cancelled=${encodeURIComponent(ref)}`);
    // No pass for this order in this browser: ask for the order number and phone first
    redirect(`/track?order=${encodeURIComponent(ref)}`);
  }
  return <TrackView order={order} businessName={tenant.name} />;
}
