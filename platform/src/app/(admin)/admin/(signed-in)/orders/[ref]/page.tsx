import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentToasts } from "@/components/admin/content/useSave";
import { NotAllowed } from "@/components/admin/NotAllowed";
import {
  AcceptButton,
  CompleteButton,
  CopyLink,
  ExtendButton,
  LogChanges,
  NoteForm,
  Reassign,
  RecordPayment,
  SendDraft,
} from "@/components/admin/orders/OrderControls";
import { Icon } from "@/components/icons/Icon";
import { OrderFileGroups } from "@/components/orders/OrderFileGroups";
import { formatKes } from "@/lib/money";
import { whatsappLink } from "@/modules/content/contact";
import { loadOrderForTeam, type TeamOrder } from "@/modules/orders/order-detail.service";
import { span } from "@/modules/orders/orders.rules";
import { greetingName } from "@/modules/orders/tracking";
import { requireMember } from "@/modules/team/current-member";
import { can } from "@/modules/team/permissions";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[ref]">): Promise<Metadata> {
  return { title: `Order ${decodeURIComponent((await params).ref)}` };
}

const ago = (iso: string | null, now: Date) => {
  if (!iso) return "";
  const ms = now.getTime() - new Date(iso).getTime();
  return ms < 60_000 ? "just now" : `${span(ms)} ago`;
};
const STEPS = [
  ["PAID", "Paid"],
  ["WRITING", "Writing"],
  ["DRAFT_SENT", "Draft sent"],
  ["REVISIONS", "Revisions"],
  ["DELIVERED", "Delivered"],
] as const;
const STEP_INDEX: Record<TeamOrder["status"], number> = {
  NEW: -1,
  ABANDONED: -1,
  PAID: 0,
  WRITING: 1,
  DRAFT_SENT: 2,
  REVISIONS: 3,
  DELIVERED: 4,
};

export default async function OrderPage({ params }: PageProps<"/admin/orders/[ref]">) {
  const member = await requireMember();
  if (!can(member, "acceptOrders")) return <NotAllowed what="orders" />;
  const now = new Date();
  const order = await loadOrderForTeam(member, decodeURIComponent((await params).ref), now);
  if (!order) notFound();
  const { you } = order;

  return (
    <ContentToasts>
      <p className="crumb-back">
        <Link href="/admin/orders">← All orders</Link>
      </p>
      <div className="order-layout">
        <div className="order-main">
          <OrderHead order={order} now={now} />

          <section className="panel">
            <div className="panel-head">
              <h2>Client&apos;s brief</h2>
            </div>
            <div className="panel-body">
              <dl className="brief-grid">
                <div>
                  <dt>Target role</dt>
                  <dd>{order.brief.targetRole || "Not given"}</dd>
                </div>
                <div>
                  <dt>Industry</dt>
                  <dd>{order.brief.industry || "Not given"}</dd>
                </div>
                <div>
                  <dt>Experience</dt>
                  <dd>{order.brief.experience || "Not given"}</dd>
                </div>
                <div className="wide">
                  <dt>Client&apos;s notes</dt>
                  <dd>{order.brief.notes || "None"}</dd>
                </div>
              </dl>
              {order.brief.noCv && (
                <p className="role-note">
                  <Icon name="info" />
                  <span>The client has no CV yet: send them the CV questionnaire.</span>
                </p>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Files</h2>
            </div>
            <div className="panel-body">
              <OrderFileGroups
                groups={[
                  {
                    title: "From the client",
                    hint: "What the client sent with their order: their current CV and any job advert.",
                    files: order.files.fromClient,
                    empty: order.brief.noCv ? "None: the client has no CV yet." : "The client hasn't sent any files.",
                    canOpen: order.canOpenClientFiles,
                    lockedNote: "Only the writer on this order and the owner can open the client's files",
                  },
                  {
                    title: "From us",
                    hint: "Drafts and the final version we sent. The client sees these, with their messages, on their tracking page.",
                    files: order.files.fromUs,
                    empty: "No drafts sent yet.",
                    canOpen: true,
                  },
                ]}
              />
            </div>
          </section>
        </div>

        <aside className="order-aside">
          <section className="panel panel-body">
            <p className="preview-label">Payment</p>
            <PaymentBox order={order} />
          </section>

          <section className="panel panel-body">
            <p className="preview-label">Writer</p>
            <WriterBox order={order} now={now} />
          </section>

          <section className="panel panel-body">
            <p className="preview-label">Client&apos;s tracking link</p>
            {order.trackingUrl ? (
              <>
                <p className="hint-sm">Private link the client uses to follow their order and open their drafts.</p>
                <div className="track-row">
                  <code>{order.trackingUrl}</code>
                </div>
                <div className="track-actions">
                  <CopyLink url={order.trackingUrl} />
                </div>
              </>
            ) : (
              <p className="role-note">
                <Icon name="lock" />
                <span>
                  {you.works
                    ? "This order has no private link. The client can track it with the order number and their phone."
                    : `Only ${order.writer ? order.writer.name : "the writer who accepts this order"} and the owner can see the client's private link.`}
                </span>
              </p>
            )}
          </section>

          <section className="panel panel-body">
            <p className="preview-label">Client</p>
            <ClientBox order={order} />
          </section>

          <section className="panel panel-body">
            <p className="preview-label">Activity</p>
            {you.works && <NoteForm orderId={order.id} />}
            <ul className="timeline-mini">
              {order.events.map((event, i) => (
                <li key={i}>
                  <span className={`dot ${event.tone}`}></span>
                  <div>
                    <p>
                      <b>{event.who}</b> {event.text}
                    </p>
                    <small>
                      {ago(event.at, now)}
                      {event.client && " · visible to client"}
                    </small>
                  </div>
                </li>
              ))}
              {order.events.length === 0 && <li className="empty-note">No activity yet.</li>}
            </ul>
          </section>
        </aside>
      </div>
    </ContentToasts>
  );
}

function OrderHead({ order, now }: { order: TeamOrder; now: Date }) {
  const index = STEP_INDEX[order.status];
  const done = order.status === "DELIVERED";
  return (
    <section className="panel panel-body order-head">
      <div className="order-head-top">
        <div>
          <p className="order-meta">
            {order.ref} · placed {ago(order.createdAt.toISOString(), now)}
          </p>
          <h2>
            {order.itemName}
            {order.amount !== null && <span className="order-amount"> {formatKes(order.amount)}</span>}
          </h2>
        </div>
        <div className="order-head-right">
          <span className={`ostatus ${order.statusTone}`}>{order.statusText}</span>
          <span className={`due ${order.due.tone}`}>{order.due.text}</span>
        </div>
      </div>
      <ol className="stepper">
        {STEPS.map(([key, label], i) => {
          const skipped = key === "REVISIONS" && order.revisions === 0;
          const state = i < index || done ? (skipped ? "skipped" : "done") : i === index ? "current" : "";
          return (
            <li key={key} className={state || undefined}>
              <span>{state === "done" ? <Icon name="check" /> : i + 1}</span>
              {label}
              {key === "REVISIONS" && (
                <small>
                  {order.revisions ? `${order.revisions} round${order.revisions > 1 ? "s" : ""}` : "if needed"}
                </small>
              )}
            </li>
          );
        })}
      </ol>
      {order.status === "REVISIONS" && order.lastChange && (
        <blockquote className="change-request">
          <strong>Changes requested ({order.lastChange.by}):</strong> &ldquo;{order.lastChange.text}&rdquo;
          <small>{order.roundsLabel}</small>
        </blockquote>
      )}
      <div className="next-step">
        <span className="next-label">What happens next</span>
        <p>
          <strong>{order.next.who}:</strong> {order.next.what}
        </p>
        <p className="next-how">
          <Icon
            name={order.next.automatic === "yes" ? "refresh" : order.next.automatic === "partly" ? "sparkle" : "info"}
          />
          {order.next.how}
        </p>
      </div>
      <div className="order-actions">
        <HeadActions order={order} />
      </div>
    </section>
  );
}

function HeadActions({ order }: { order: TeamOrder }) {
  const { you } = order;
  const writer = order.writer?.name.split(/\s+/)[0];
  if (!you.owner && (order.status === "NEW" || order.status === "ABANDONED"))
    return (
      <p className="role-note">
        <Icon name="lock" />
        <span>Waiting for the client to pay. Payments and reminders are handled by the owner.</span>
      </p>
    );
  if (!you.works && order.writer && order.status !== "DELIVERED")
    return (
      <p className="role-note">
        <Icon name="lock" />
        <span>
          This is <b>{writer}&apos;s</b> order. You can read it, but only {writer} or the owner can work on it.
        </span>
      </p>
    );
  switch (order.status) {
    case "NEW":
    case "ABANDONED":
      return (
        <p className="hint-sm">
          Waiting for payment. Send a reminder from the Client box, or record a payment that came another way.
        </p>
      );
    case "PAID":
      return <AcceptButton orderId={order.id} label={`Accept this order (as ${you.name.split(/\s+/)[0]})`} />;
    case "WRITING":
    case "REVISIONS":
      return <SendDraft orderId={order.id} />;
    case "DRAFT_SENT":
      return (
        <>
          <LogChanges orderId={order.id} roundsLabel={order.roundsLabel} />
          <CompleteButton orderId={order.id} />
        </>
      );
    default:
      return (
        <span className="complete">
          <Icon name="check" />
          Order complete
        </span>
      );
  }
}

function PaymentBox({ order }: { order: TeamOrder }) {
  const { you, payment } = order;
  if (!you.money)
    return payment.paid ? (
      <div className="pay-confirmed">
        <Icon name="check" />
        <div>
          <strong>Paid</strong>
          <small>Amounts and payments are visible to the owner only</small>
        </div>
      </div>
    ) : (
      <p className="role-note">
        <Icon name="lock" />
        <span>Not paid yet. The owner follows up on payments.</span>
      </p>
    );
  if (payment.paid)
    return (
      <>
        <div className="pay-confirmed">
          <Icon name="check" />
          <div>
            <strong>{formatKes(payment.details?.amount ?? order.amount ?? 0)} received</strong>
            <small>{payment.details?.channel ?? "Paid"}</small>
          </div>
        </div>
        <dl className="pay-details">
          {payment.details?.receipt && (
            <div>
              <dt>Reference</dt>
              <dd>{payment.details.receipt}</dd>
            </div>
          )}
          <div>
            <dt>Account no.</dt>
            <dd>{payment.details?.account ?? order.ref}</dd>
          </div>
          <div>
            <dt>Paid to</dt>
            <dd>Paybill {payment.paybill}</dd>
          </div>
        </dl>
      </>
    );
  return (
    <>
      <p className="hint-sm">
        Waiting for the client to pay <strong>{formatKes(order.amount ?? 0)}</strong> by M-Pesa: Paybill{" "}
        <b>{payment.paybill}</b>, account <b>{order.ref}</b>. It confirms automatically once M-Pesa is connected.
      </p>
      {you.canRecordPayment && <RecordPayment orderId={order.id} />}
    </>
  );
}

function WriterBox({ order, now }: { order: TeamOrder; now: Date }) {
  const { you, writer } = order;
  const closed = order.status === "DELIVERED" || order.status === "ABANDONED";
  return (
    <>
      {writer ? (
        <>
          <div className="accepted-by">
            <span className="avatar">{writer.name.slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>
                {writer.how} {writer.name}
              </strong>
              <small>
                {ago(writer.at, now)}
                {writer.isYou && " · that's you"}
              </small>
            </div>
          </div>
          {you.owner && !closed && order.writers.length > 0 && <Reassign orderId={order.id} writers={order.writers} />}
        </>
      ) : you.canAccept ? (
        <>
          <p className="open-order">
            <Icon name="alert" />
            <span>
              <strong>⚠ Not accepted · waiting {ago(order.waitingSince, now).replace(" ago", "")}</strong>
              <small>
                The client has paid. Any writer can accept; the first to accept takes it, and their name and the time
                are recorded.
              </small>
            </span>
          </p>
          <AcceptButton orderId={order.id} label={`Accept as ${you.name.split(/\s+/)[0]}`} block />
        </>
      ) : (
        <p className="hint-sm">Writers can accept this order once it&apos;s paid.</p>
      )}
      {you.canExtend && (
        <div className="owner-tools">
          <span className="ot-label">
            <Icon name="shield" />
            Owner tools
          </span>
          <ExtendButton orderId={order.id} />
        </div>
      )}
    </>
  );
}

function ClientBox({ order }: { order: TeamOrder }) {
  const { client, you } = order;
  if (!you.works || !client.phone)
    return (
      <>
        <div className="client-card">
          <strong>{client.name}</strong>
          <span className="masked">07•• ••• •••</span>
        </div>
        <p className="role-note">
          <Icon name="lock" />
          <span>
            {order.writer
              ? `Contact details are shown to ${order.writer.name} (the writer on this order) and the owner.`
              : "Accept the order to see the client's contact details."}
          </span>
        </p>
      </>
    );
  const first = greetingName(client.name);
  const link = order.trackingUrl ?? "your tracking page";
  const templates = [
    ...(!order.payment.paid && you.owner
      ? [
          {
            title: "Payment reminder",
            note: "Paybill, account number and amount",
            text: `Hi ${first}, a reminder to pay for your order ${order.ref}${order.amount !== null ? ` (${formatKes(order.amount)})` : ""}: M-Pesa Paybill ${order.payment.paybill}, account ${order.ref}. Track it here: ${link}`,
          },
        ]
      : []),
    {
      title: "Order update",
      note: "Draft time and tracking link",
      text: `Hi ${first}, your writer is working on your order ${order.ref}. Follow its progress here: ${link}`,
    },
    {
      title: "Draft ready",
      note: "Link to open & respond",
      text: `Hi ${first}, your draft is ready! Open it and tell us if you're happy or would like changes: ${link}`,
    },
    {
      title: "Final version sent",
      note: "Thanks, and asks for a review",
      text: `Hi ${first}, your final version is ready: ${link}. All the best with your applications! If you're happy, please leave us a quick review.`,
    },
  ];
  return (
    <>
      <div className="client-card">
        <strong>{client.name}</strong>
        <a href={`tel:${client.phone.replace(/\s/g, "")}`}>{client.phone}</a>
        {client.email && <a href={`mailto:${client.email}`}>{client.email}</a>}
      </div>
      <p className="preview-label" style={{ marginTop: 16 }}>
        Quick WhatsApp messages
      </p>
      <div className="wa-tpls">
        {templates.map((template) => (
          <a
            key={template.title}
            className="wa-tpl"
            href={whatsappLink(client.phone!, template.text)}
            target="_blank"
            rel="noopener"
          >
            <Icon name="whatsapp" />
            <span>
              <strong>{template.title}</strong>
              <small>{template.note}</small>
            </span>
          </a>
        ))}
      </div>
    </>
  );
}
