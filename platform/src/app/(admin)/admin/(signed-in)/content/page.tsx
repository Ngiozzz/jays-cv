import type { Metadata } from "next";
import Link from "next/link";
import { FaqsForm } from "@/components/admin/content/FaqsForm";
import { HomepageForm } from "@/components/admin/content/HomepageForm";
import { PackageEditor } from "@/components/admin/content/PackageEditor";
import { PostEditor } from "@/components/admin/content/PostEditor";
import { RecentChanges } from "@/components/admin/content/RecentChanges";
import { ReviewsBoard } from "@/components/admin/content/ReviewsBoard";
import { SamplesBoard } from "@/components/admin/content/SamplesBoard";
import { SettingsForm } from "@/components/admin/content/SettingsForm";
import { ServicesForm } from "@/components/admin/content/ServicesForm";
import { ContentToasts } from "@/components/admin/content/useSave";
import { NotAllowed } from "@/components/admin/NotAllowed";
import { Icon } from "@/components/icons/Icon";
import type { IconName } from "@/components/icons/IconSprite";
import { formatKes } from "@/lib/money";
import {
  canEditSection,
  loadPrices,
  loadRecentChanges,
  type PricesData,
} from "@/modules/content/admin/content-admin.service";
import type { Section } from "@/modules/content/admin/history";
import type { StoredFaq } from "@/modules/content/admin/faqs";
import { loadFaqs } from "@/modules/content/admin/faqs.service";
import type { StoredHomepage } from "@/modules/content/admin/homepage";
import { loadHomepage } from "@/modules/content/admin/homepage.service";
import { STATUS_LABEL } from "@/modules/content/admin/posts";
import { loadPost, loadPosts, type AdminPost, type AdminPostRow } from "@/modules/content/admin/posts.service";
import { loadReviews } from "@/modules/content/admin/reviews.service";
import { loadSamples, type AdminSample } from "@/modules/content/admin/samples.service";
import { loadSettings, type AdminSettings } from "@/modules/content/admin/settings.service";
import { revisionsLabel } from "@/modules/content/packages";
import { requireMember } from "@/modules/team/current-member";

export const metadata: Metadata = { title: "Website content" };

const TABS: { key: Section; label: string; icon: IconName }[] = [
  { key: "packages", label: "Packages & prices", icon: "cash" },
  { key: "reviews", label: "Reviews", icon: "sparkle" },
  { key: "samples", label: "Sample CVs", icon: "image" },
  { key: "posts", label: "Career tips", icon: "edit" },
  { key: "faqs", label: "FAQs", icon: "info" },
  { key: "home", label: "Homepage", icon: "layout" },
  { key: "settings", label: "Business settings", icon: "lock" },
];

export default async function ContentPage({ searchParams }: PageProps<"/admin/content">) {
  const member = await requireMember();
  const tabs = TABS.filter((tab) => canEditSection(member, tab.key));
  if (tabs.length === 0) return <NotAllowed what="the website content" />;

  const params = await searchParams;
  const tab = tabs.find((t) => t.key === params.tab) ?? tabs[0];
  const owner = canEditSection(member, "settings");

  return (
    <ContentToasts>
      <p className="content-intro">
        Change what clients see on the website. Changes go live as soon as you press <b>Save &amp; publish</b>.
      </p>
      <div className="content-layout">
        <div className="content-main">
          <nav className="content-tabs" aria-label="Website content sections">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={`/admin/content?tab=${t.key}`}
                aria-current={t.key === tab.key ? "page" : undefined}
              >
                <Icon name={t.icon} />
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="content-root">
            {tab.key === "packages" ? (
              <PackagesTab
                prices={await loadPrices(member)}
                selected={typeof params.pkg === "string" ? params.pkg : undefined}
              />
            ) : tab.key === "reviews" ? (
              <ReviewsBoard reviews={await loadReviews(member)} />
            ) : tab.key === "posts" ? (
              <PostsTab
                posts={await loadPosts(member)}
                selected={
                  params.post === "new"
                    ? "new"
                    : typeof params.post === "string"
                      ? await loadPost(member, params.post)
                      : null
                }
                owner={owner}
                siteHost={member.tenant.domain ?? "your website"}
              />
            ) : tab.key === "faqs" ? (
              <FaqsTab faqs={await loadFaqs(member)} />
            ) : tab.key === "home" ? (
              <HomeTab homepage={await loadHomepage(member)} />
            ) : tab.key === "samples" ? (
              <SamplesTab samples={await loadSamples(member)} />
            ) : (
              <SettingsTab settings={await loadSettings(member)} />
            )}
          </div>
        </div>
        {owner && <RecentChanges changes={await loadRecentChanges(member)} />}
      </div>
    </ContentToasts>
  );
}

function PackagesTab({ prices, selected }: { prices: PricesData; selected?: string }) {
  const current =
    prices.packages.find((pkg) => pkg.id === selected) ??
    prices.packages.find((pkg) => pkg.popular) ??
    prices.packages[0];
  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2>Packages</h2>
          <a href="/pricing" target="_blank" rel="noopener">
            View pricing page ↗
          </a>
        </div>
        <div className="table-wrap-admin">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Package</th>
                <th>Price</th>
                <th>First draft</th>
                <th>Revisions</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {prices.packages.map((pkg) => (
                <tr key={pkg.id} className={pkg.id === current?.id ? "row-selected" : undefined}>
                  <td>
                    <strong className="cell-strong">{pkg.name}</strong>
                    {pkg.popular && <span className="mini-pill">★ Most popular</span>}
                  </td>
                  <td className="cell-price">
                    <strong className="cell-strong">{formatKes(pkg.price)}</strong>
                  </td>
                  <td className="cell-muted">{pkg.firstDraftHours} hours</td>
                  <td className="cell-muted">{revisionsLabel(pkg)}</td>
                  <td>
                    {pkg.visible ? (
                      <span className="status status-published">Visible</span>
                    ) : (
                      <span className="status status-draft">Hidden</span>
                    )}
                  </td>
                  <td>
                    <Link
                      className="btn btn-ghost btn-sm"
                      href={`/admin/content?tab=packages&pkg=${pkg.id}`}
                      aria-label={`Edit ${pkg.name}`}
                      scroll={false}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* key: a fresh form for each package, and after each save */}
      {current && <PackageEditor key={JSON.stringify(current)} pkg={current} />}

      <section className="panel">
        <div className="panel-head">
          <h2>Single services</h2>
          <a href="/pricing#individual" target="_blank" rel="noopener">
            View ↗
          </a>
        </div>
        <ServicesForm key={JSON.stringify(prices.services)} services={prices.services} />
      </section>
    </>
  );
}

// key: fresh form values after each save
function SamplesTab({ samples }: { samples: AdminSample[] }) {
  return <SamplesBoard key={JSON.stringify(samples)} samples={samples} />;
}

const STATUS_CLASS = { DRAFT: "status-draft", REVIEW: "st-paid", PUBLISHED: "status-published" } as const;

function PostsTab(props: {
  posts: AdminPostRow[];
  selected: AdminPost | "new" | null;
  owner: boolean;
  siteHost: string;
}) {
  const { posts, selected, owner, siteHost } = props;
  const waiting = posts.filter((post) => post.status === "REVIEW").length;
  const editing = selected === "new" ? null : selected;
  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2>
            {owner ? "Articles" : "Your articles"}
            {owner && waiting > 0 && <span className="mini-pill">{waiting} waiting for you</span>}
          </h2>
          <Link className="btn btn-primary btn-sm" href="/admin/content?tab=posts&post=new" scroll={false}>
            <Icon name="plus" />
            New article
          </Link>
        </div>
        <div className="table-wrap-admin">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Author</th>
                <th>Status</th>
                <th>Updated</th>
                <th>
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className={post.id === editing?.id ? "row-selected" : undefined}>
                  <td>
                    <strong className="cell-strong">{post.title}</strong>
                  </td>
                  <td className="cell-muted">{post.category}</td>
                  <td className="cell-muted">{post.authorName}</td>
                  <td>
                    <span className={`status ${STATUS_CLASS[post.status]}`}>{STATUS_LABEL[post.status]}</span>
                  </td>
                  <td className="cell-muted">
                    {new Date(post.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </td>
                  <td>
                    {post.editable ? (
                      <Link
                        className="btn btn-ghost btn-sm"
                        href={`/admin/content?tab=posts&post=${post.id}`}
                        aria-label={`Edit ${post.title}`}
                        scroll={false}
                      >
                        Edit
                      </Link>
                    ) : (
                      <a className="btn btn-ghost btn-sm" href={`/blog/${post.slug}`} target="_blank" rel="noopener">
                        View ↗
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-note">
                    No articles yet. Press New article to write one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* key: a fresh form for each article, and after each save */}
      {selected && <PostEditor key={JSON.stringify(editing)} post={editing} owner={owner} siteHost={siteHost} />}
    </>
  );
}

// key: fresh rows after each save (and after an undo)
function FaqsTab({ faqs }: { faqs: StoredFaq[] }) {
  return <FaqsForm key={JSON.stringify(faqs)} faqs={faqs} />;
}

// key: fresh values after each save (and after an undo)
function HomeTab({ homepage }: { homepage: StoredHomepage }) {
  return <HomepageForm key={JSON.stringify(homepage)} homepage={homepage} />;
}

// key: fresh values after each save (and after an undo)
function SettingsTab({ settings }: { settings: AdminSettings }) {
  return <SettingsForm key={JSON.stringify(settings)} settings={settings} />;
}
