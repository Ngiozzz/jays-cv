"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { placeOrderAction } from "@/app/(public)/[tenant]/order/actions";
import { Icon } from "@/components/icons/Icon";
import { formatKes } from "@/lib/money";
import { NEEDS, type NeedKey } from "@/modules/orders/place-order";
import { PayBox } from "@/components/pay/PayBox";
import type { PlaceOrderResult } from "@/modules/orders/place-order.service";

export type CardPackage = {
  id: string;
  shortName: string;
  name: string;
  price: number;
  bestFor: string;
  draft: string;
};
export type CardService = { id: string; name: string; note: string; price: number; needsJobAdvert: boolean };
// The job a tailored CV is for, when the client came from its page on the jobs board
export type CardJob = { slug: string; title: string; company: string };

type Props = {
  packages: CardPackage[];
  services: CardService[];
  whatsappHref: string;
  businessName: string;
  waNumber: string;
  job: CardJob | null;
};
type Placed = Extract<PlaceOrderResult, { ok: true }>;

const STEPS = ["Choose a service", "Pick a package", "Your details & CV"];

// The website's order card: 1) what do you need, 2) which package, 3) details and CV → the order is
// created and the client gets their order number and private tracking link.
export function OrderCard({ packages, services, whatsappHref, businessName, waNumber, job }: Props) {
  const params = useSearchParams();
  const wantedPackage = packages.find((pkg) => pkg.shortName.toLowerCase() === params.get("pkg")?.toLowerCase());
  // From a job page: straight to the tailored CV, with the job already chosen
  const tailoring = services.find((service) => service.needsJobAdvert);
  const wantedService = (job && tailoring) || services.find((service) => service.id === params.get("service"));
  const needFor = (index: number) => NEEDS.find((need) => need.packageIndex === index)?.key ?? "cv";

  const [step, setStep] = useState(job && tailoring ? 3 : wantedPackage || wantedService ? 2 : 1);
  const [need, setNeed] = useState<NeedKey>(
    wantedService ? "single" : wantedPackage ? needFor(packages.indexOf(wantedPackage)) : "cv-letter",
  );
  const [item, setItem] = useState(
    wantedService
      ? `service:${wantedService.id}`
      : `package:${(wantedPackage ?? packages[1] ?? packages[0])?.id ?? ""}`,
  );
  const [placed, setPlaced] = useState<Placed | null>(null);
  const top = useRef<HTMLElement>(null);

  const single = need === "single";
  const chooseNeed = (key: NeedKey) => {
    setNeed(key);
    const choice = NEEDS.find((n) => n.key === key)!;
    if (choice.packageIndex !== null && packages[choice.packageIndex])
      setItem(`package:${packages[choice.packageIndex].id}`);
    else if (choice.packageIndex === null && services[0] && !item.startsWith("service:"))
      setItem(`service:${services[0].id}`);
  };
  const chosen =
    packages
      .map((pkg) => ({ key: `package:${pkg.id}`, name: `${pkg.name} package`, price: pkg.price }))
      .find((p) => p.key === item) ??
    services.map((s) => ({ key: `service:${s.id}`, name: s.name, price: s.price })).find((s) => s.key === item);
  const needsJob = services.some((service) => `service:${service.id}` === item && service.needsJobAdvert);

  const go = (next: number) => {
    setStep(next);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="order-card" aria-label="Order in 3 steps" ref={top}>
      <nav className="order-steps" aria-label="Order steps">
        <ol>
          {STEPS.map((label, i) => (
            <li key={label} className={i + 1 === step ? "current" : i + 1 < step ? "done" : undefined}>
              <button
                type="button"
                onClick={() => !placed && go(i + 1)}
                aria-current={i + 1 === step ? "step" : undefined}
                disabled={Boolean(placed)}
              >
                <span className="j-num">{i + 1}</span>
                <span className="j-text">
                  <small>Step {i + 1}</small>
                  {label}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <div className="order-body">
        {step === 1 && (
          <div className="order-panel active" role="group" aria-labelledby="order-t1">
            <h2 className="order-title" id="order-t1">
              What do you need?
            </h2>
            <p className="order-sub">Pick the closest match. We&apos;ll suggest the right package next.</p>
            <div className="opt-grid">
              {NEEDS.filter((n) => (n.packageIndex === null ? services.length > 0 : packages[n.packageIndex])).map(
                (n) => (
                  <label key={n.key} className="opt">
                    <input type="radio" name="need" checked={need === n.key} onChange={() => chooseNeed(n.key)} />
                    <span className="opt-body">
                      <strong>{n.title}</strong>
                      <small>{n.note}</small>
                    </span>
                  </label>
                ),
              )}
            </div>
            <div className="order-nav">
              <span></span>
              <button type="button" className="btn btn-primary" onClick={() => go(2)}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="order-panel active" role="group" aria-labelledby="order-t2">
            <h2 className="order-title" id="order-t2">
              {single ? "Pick a service" : "Pick a package"}
            </h2>
            <p className="order-sub">
              One-off price, paid by M-Pesa. <Link href="/pricing#compare">Compare what&apos;s included</Link>.
            </p>
            <div className="opt-list">
              {single
                ? services.map((service) => (
                    <label key={service.id} className="opt">
                      <input
                        type="radio"
                        name="item"
                        checked={item === `service:${service.id}`}
                        onChange={() => setItem(`service:${service.id}`)}
                      />
                      <span className="opt-body">
                        <strong>{service.name}</strong>
                        {service.note && <small>{service.note}</small>}
                      </span>
                      <span className="opt-price">{formatKes(service.price)}</span>
                    </label>
                  ))
                : packages.map((pkg, i) => {
                    const suggested = NEEDS.find((n) => n.key === need)?.packageIndex === i;
                    return (
                      <label key={pkg.id} className={suggested ? "opt recommended" : "opt"}>
                        <input
                          type="radio"
                          name="item"
                          checked={item === `package:${pkg.id}`}
                          onChange={() => setItem(`package:${pkg.id}`)}
                        />
                        <span className="opt-body">
                          <strong>{pkg.name}</strong>
                          <small>
                            {pkg.bestFor} · draft in {pkg.draft}
                          </small>
                        </span>
                        <span className="opt-price">{formatKes(pkg.price)}</span>
                      </label>
                    );
                  })}
            </div>
            <div className="order-nav">
              <button type="button" className="btn btn-ghost" onClick={() => go(1)}>
                Back
              </button>
              <button type="button" className="btn btn-primary" onClick={() => go(3)} disabled={!chosen}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 &&
          (placed ? (
            <Done placed={placed} businessName={businessName} waNumber={waNumber} />
          ) : (
            <DetailsStep
              item={item}
              need={need}
              chosen={chosen}
              tailoring={needsJob}
              job={needsJob ? job : null}
              whatsappHref={whatsappHref}
              onBack={() => go(2)}
              onPlaced={(result) => {
                setPlaced(result);
                top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
          ))}
      </div>
    </section>
  );
}

function DetailsStep(props: {
  item: string;
  need: NeedKey;
  chosen: { name: string; price: number } | undefined;
  // A CV tailored to a job: the job it came from, or the advert asked for here
  tailoring: boolean;
  job: CardJob | null;
  whatsappHref: string;
  onBack: () => void;
  onPlaced: (result: Placed) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<{ text: string; fields: Record<string, string> } | null>(null);
  const [cvName, setCvName] = useState<{ name: string; size: number } | null>(null);
  const [advertName, setAdvertName] = useState("");
  const [noCvTicked, setNoCv] = useState(false);
  // Tailoring needs a CV to tailor
  const noCv = noCvTicked && !props.tailoring;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set("item", props.item);
    data.set("need", props.need);
    if (props.job) data.set("jobSlug", props.job.slug);
    startTransition(async () => {
      const result = await placeOrderAction(data);
      if (result.ok) props.onPlaced(result);
      else setError({ text: result.error, fields: result.fieldErrors ?? {} });
    });
  };
  const fieldError = (name: string) =>
    error?.fields[name] && (
      <small className="field-error" role="alert">
        {error.fields[name]}
      </small>
    );

  return (
    <div className="order-panel active" role="group" aria-labelledby="order-t3">
      <h2 className="order-title" id="order-t3">
        Your details &amp; CV
      </h2>
      <p className="order-sub">
        We&apos;ll create your order and a private link where you can pay, follow progress and download your drafts.
      </p>
      <div className="order-summary">
        <div>
          <span>Your order</span>
          <strong>{props.chosen?.name}</strong>
        </div>
        <div className="order-amount">
          <span>Amount</span>
          <strong>{props.chosen ? formatKes(props.chosen.price) : ""}</strong>
        </div>
      </div>
      {props.job && (
        <div className="od-job">
          <Icon name="briefcase" />
          <span>
            <small>Tailored to this job</small>
            <strong>
              {props.job.title} at {props.job.company}
            </strong>
          </span>
          <Link href={`/jobs/${props.job.slug}`}>View the job</Link>
        </div>
      )}
      <form className="order-details" noValidate onSubmit={submit}>
        <div className="od-grid">
          <div className="od-field">
            <label htmlFor="od-name">
              Full name <em>*</em>
            </label>
            <input
              id="od-name"
              name="name"
              autoComplete="name"
              placeholder="e.g. Faith Njeri"
              maxLength={80}
              required
            />
            {fieldError("name")}
          </div>
          <div className="od-field">
            <label htmlFor="od-phone">
              WhatsApp number <em>*</em>
            </label>
            <input
              id="od-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="07XX XXX XXX"
              required
            />
            {fieldError("phone")}
          </div>
          <div className="od-field">
            <label htmlFor="od-email">
              Email <small>(optional)</small>
            </label>
            <input id="od-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
            {fieldError("email")}
          </div>
          <div className="od-field">
            <label htmlFor="od-role">
              Job you&apos;re targeting <small>(optional)</small>
            </label>
            <input
              id="od-role"
              name="targetRole"
              placeholder="e.g. Procurement Officer"
              maxLength={100}
              defaultValue={props.job?.title}
            />
            {fieldError("targetRole")}
          </div>
          <div className="od-field od-wide">
            <label htmlFor="od-notes">
              Anything we should know? <small>(optional)</small>
            </label>
            <textarea
              id="od-notes"
              name="notes"
              rows={3}
              maxLength={1000}
              placeholder="e.g. I'm moving from teaching into HR; I have a job advert I'm applying for"
            />
            {fieldError("notes")}
          </div>
        </div>
        {props.tailoring && !props.job && (
          <div className="od-advert">
            <div className="od-field">
              <label htmlFor="od-advert">
                The job advert <em>*</em>
              </label>
              <textarea
                id="od-advert"
                name="jobAdvert"
                rows={4}
                maxLength={5000}
                placeholder="Paste the job advert here, or a link to it (e.g. https://careers.company.co.ke/jobs/123)"
              />
              {fieldError("jobAdvert")}
            </div>
            <label className={advertName ? "cv-drop has-file" : "cv-drop"}>
              <input
                type="file"
                name="advert"
                accept=".pdf,image/*"
                onChange={(event) => setAdvertName(event.target.files?.[0]?.name ?? "")}
              />
              <Icon name="image" />
              <span>
                <strong>{advertName || "Or upload a photo of the advert"}</strong>
                <small>A screenshot or PDF of the job poster · optional if you pasted it above</small>
              </span>
            </label>
            {fieldError("advert")}
          </div>
        )}
        {!noCv && (
          <label className={cvName ? "cv-drop has-file" : "cv-drop"}>
            <input
              type="file"
              name="cv"
              accept=".pdf,.doc,.docx,image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setCvName(file ? { name: file.name, size: file.size } : null);
              }}
            />
            <Icon name="upload" />
            <span>
              {cvName ? (
                <>
                  <strong>{cvName.name}</strong>
                  <small>{Math.max(1, Math.round(cvName.size / 1024))} KB · tap to change</small>
                </>
              ) : (
                <>
                  <strong>{props.tailoring ? "Upload the CV to tailor" : "Upload your current CV"}</strong>
                  <small>PDF, Word, or a clear photo of it · up to 10 MB</small>
                </>
              )}
            </span>
          </label>
        )}
        {fieldError("cv")}
        {!props.tailoring && (
          <label className="od-check">
            <input type="checkbox" name="noCv" checked={noCv} onChange={(event) => setNoCv(event.target.checked)} /> I
            don&apos;t have a CV yet. Send me a short questionnaire instead.
          </label>
        )}
        <label className="od-check">
          <input type="checkbox" name="whatsappUpdates" defaultChecked /> Send me updates about this order on WhatsApp
        </label>
        {error && (
          <p className="od-error" role="alert">
            {error.text}
          </p>
        )}
        <div className="order-nav">
          <button type="button" className="btn btn-ghost" onClick={props.onBack} disabled={pending}>
            Back
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            <Icon name="upload" />
            {pending ? "Creating your order…" : noCv ? "Place my order" : "Upload CV & place my order"}
          </button>
        </div>
      </form>
      <p className="order-note">
        Your CV is only seen by your writer and the owner. Questions first?{" "}
        <a href={props.whatsappHref} target="_blank" rel="noopener">
          Chat with us on WhatsApp
        </a>
        .
      </p>
    </div>
  );
}

function Done({ placed, businessName, waNumber }: { placed: Placed; businessName: string; waNumber: string }) {
  const [copied, setCopied] = useState("Copy");
  const trackPath = `/track/${placed.ref}`;
  // The client sends this to the business, so the link stays in their own WhatsApp chat
  const saveText = `Hi ${businessName}, I've placed order ${placed.ref} (${placed.itemName}). My private tracking link: ${placed.trackingUrl}`;
  return (
    <div className="order-panel active">
      <div className="od-success">
        <span className="od-tick">
          <Icon name="check" />
        </span>
        <div>
          <h2 className="order-title">
            Order {placed.ref} created, {placed.firstName}!
          </h2>
          <p className="order-sub">
            {placed.itemName}
            {placed.forJob && ` for ${placed.forJob}`}
            {placed.cvName ? ` · CV received (${placed.cvName})` : " · we'll send you a short questionnaire"}
          </p>
        </div>
      </div>
      <div className="od-link">
        <span>Your private tracking link</span>
        <div className="od-link-row">
          <code>{placed.trackingUrl}</code>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(placed.trackingUrl);
                setCopied("Copied!");
              } catch {
                setCopied("Select & copy");
              }
            }}
          >
            <Icon name="copy" />
            <span>{copied}</span>
          </button>
        </div>
        <small>
          <Icon name="lock" />
          Only you have this link. Don&apos;t share it in groups or channels.
        </small>
      </div>
      <div className="od-actions">
        <a
          className="btn btn-wa btn-lg"
          href={`https://wa.me/${waNumber}?text=${encodeURIComponent(saveText)}`}
          target="_blank"
          rel="noopener"
        >
          <Icon name="whatsapp" />
          Save link to my WhatsApp
        </a>
        <Link className="btn btn-ghost btn-lg" href={trackPath}>
          Open my tracking page
        </Link>
      </div>
      <div className="od-pay">
        <strong>Next: pay to start your order</strong>
        <PayBox
          info={{
            ref: placed.ref,
            amountDue: placed.amountDue,
            phone: placed.payPhone,
            paybill: placed.paybill,
            businessName,
            pretend: placed.pretendMpesa,
          }}
        />
        <small>
          Your writer starts as soon as the payment is confirmed. You can also pay later from your tracking page.
        </small>
      </div>
    </div>
  );
}
