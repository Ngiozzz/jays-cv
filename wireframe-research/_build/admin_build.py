"""Build the Jay CVS admin mock screens into <site>/admin/."""
import re
from pathlib import Path

HERE = Path(__file__).parent
SITE = Path(__file__).resolve().parent.parent  # the wireframe-research folder
OUT = SITE / "admin"
OUT.mkdir(exist_ok=True)

# Reuse the site's icon sprite and add admin-only icons
site_sprite = re.search(r"<defs>(.*?)</defs>", (HERE / "index-original.html").read_text(encoding="utf-8"), re.S).group(1)
S = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
ADMIN_ICONS = f"""
      <symbol id="i-grid" {S}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></symbol>
      <symbol id="i-list" {S}><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></symbol>
      <symbol id="i-plus" {S}><path d="M12 5v14M5 12h14"/></symbol>
      <symbol id="i-image" {S}><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></symbol>
      <symbol id="i-sparkle" {S}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></symbol>
      <symbol id="i-eye" {S}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></symbol>
      <symbol id="i-eye-off" {S}><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></symbol>
      <symbol id="i-trash" {S}><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></symbol>
      <symbol id="i-cart" {S}><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></symbol>
      <symbol id="i-layout" {S}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></symbol>
      <symbol id="i-globe" {S}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></symbol>
      <symbol id="i-logout" {S}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3"/></symbol>
      <symbol id="i-menu" {S}><path d="M4 6h16M4 12h16M4 18h16"/></symbol>
      <symbol id="i-inbox" {S}><path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5.5 5h13L21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z"/></symbol>
      <symbol id="i-keyboard" {S}><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></symbol>
      <symbol id="i-alert" {S}><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.01"/></symbol>
"""
SPRITE = f"""
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <defs>{site_sprite}{ADMIN_ICONS}    </defs>
  </svg>
"""


def head(title, page, body_class="admin"):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>{title} | Jay CVS Admin</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/styles.css">
  <link rel="stylesheet" href="../css/admin.css">
</head>
<body class="{body_class}" data-page="{page}">
"""


FOOT = SPRITE + """
  <script src="../js/jobs-data.js"></script>
  <script src="../js/inbox-data.js"></script>
  <script src="../js/orders-data.js"></script>
  <script src="../js/team-store.js"></script>
  <script src="../js/content-store.js"></script>
  <script src="../js/orders-core.js"></script>
  <script src="../js/mpesa-mock.js"></script>
  <script src="../js/doc-viewer.js"></script>
  <script src="../js/admin.js"></script>
  <script src="../js/admin-content.js"></script>
</body>
</html>
"""

NAV = [("index.html", "grid", "Dashboard", "dashboard"), ("jobs.html", "list", "Jobs", "jobs"), ("inbox.html", "inbox", "Jobs inbox", "inbox"), ("post-job.html", "plus", "Post a job", "post-job"),
       ("orders.html", "cart", "Orders", "orders"), ("team.html", "users", "Team", "team"), ("finance.html", "cash", "Finance", "finance"), ("content.html", "layout", "Website content", "content"),
       ("flow.html", "refresh", "Order flow demo", "flow")]
ACTIVE_ALIAS = {"order": "orders"}


def shell(page, title, crumb, content, top_actions=""):
    items = []
    for href, ic, label, key in NAV:
        cur = ' aria-current="page"' if key == ACTIVE_ALIAS.get(page, page) else ""
        badge = {"jobs": '<span class="count" data-jobs-badge></span>', "inbox": '<span class="count alert" data-inbox-badge hidden></span>', "orders": '<span class="count alert" data-orders-badge></span>'}.get(key, "")
        gate = ' data-owner-only' if key in ("team", "finance") else ' data-jobs-only' if key in ("jobs", "inbox", "post-job") else ""
        items.append(f'        <a href="{href}"{cur}{gate}><svg aria-hidden="true"><use href="#i-{ic}"/></svg>{label}{badge}</a>')
    nav = "\n".join(items)
    return head(title, page) + f"""
  <div class="admin-shell">
    <aside class="admin-side" id="admin-side" aria-label="Admin menu">
      <a href="index.html" class="admin-logo">
        <span class="logo-mark">J</span><span class="logo-text">Jay<strong>CVS</strong></span>
        <span class="admin-badge">Admin</span>
      </a>
      <nav class="side-nav">
{nav}
      </nav>
      <div class="side-foot">
        <a href="../index.html" target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#i-globe"/></svg>View website</a>
        <a href="login.html"><svg aria-hidden="true"><use href="#i-logout"/></svg>Sign out</a>
        <button type="button" id="reset-demo"><svg aria-hidden="true"><use href="#i-refresh"/></svg>Reset demo data</button>
      </div>
    </aside>

    <div class="admin-main">
      <div class="demo-strip"><svg aria-hidden="true"><use href="#i-info"/></svg>Design preview: changes are saved in this browser only.</div>
      <header class="admin-top">
        <button type="button" class="side-toggle" aria-label="Open menu" aria-controls="admin-side"><svg aria-hidden="true"><use href="#i-menu"/></svg></button>
        <div class="top-titles">
          <nav class="crumbs" id="crumbs" aria-label="Breadcrumb" hidden></nav>
          <p class="crumb" id="page-crumb">{crumb}</p>
          <h1 id="page-title">{title}</h1>
        </div>
        <div class="admin-top-actions">
          {top_actions}
          <div class="user-chip"><span class="avatar" data-me-initials>JA</span><div><label for="me" class="me-label">Signed in as <em>(demo)</em></label><select id="me" class="me-select"></select></div></div>
        </div>
      </header>
      <main class="admin-content" id="main">
{content}
      </main>
    </div>
  </div>
  <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
""" + FOOT


# ---------------------------------------------------------------------------
LOGIN = head("Sign in", "login", "login-page") + """
  <main class="login-card">
    <a href="../index.html" class="logo" aria-label="Jay CVS website">
      <span class="logo-mark">J</span><span class="logo-text">Jay<strong>CVS</strong></span>
    </a>
    <h1>Admin sign in</h1>
    <p>Manage job posts and your website.</p>
    <form id="login-form">
      <div class="f">
        <label for="email">Email</label>
        <input type="email" id="email" autocomplete="username" placeholder="you@jaycvs.co.ke">
      </div>
      <div class="f">
        <label for="pw">Password</label>
        <div class="pw-wrap">
          <input type="password" id="pw" autocomplete="current-password" placeholder="••••••••">
          <button type="button" class="pw-toggle">Show</button>
        </div>
      </div>
      <div class="login-row">
        <label class="inline-check"><input type="checkbox"> Keep me signed in</label>
        <a href="#">Forgot password?</a>
      </div>
      <button class="btn btn-primary btn-lg btn-block" type="submit"><svg aria-hidden="true" width="18" height="18"><use href="#i-lock"/></svg>Sign in</button>
    </form>
    <p class="login-note">Design preview: any details will sign you in.</p>
  </main>
""" + FOOT.replace('</body>', '  <a class="login-back" href="../index.html">← Back to website</a>\n</body>')

# ---------------------------------------------------------------------------
DASHBOARD = """        <div class="welcome">
          <div>
            <h2><span id="greeting">Hello</span>, <span id="greet-name">Jay CVS team</span> 👋</h2>
            <p id="greet-sub">Here's what's happening with your job posts and orders.</p>
          </div>
          <a class="btn btn-primary" href="post-job.html" data-jobs-only><svg aria-hidden="true" width="18" height="18"><use href="#i-plus"/></svg>Post a job</a>
        </div>

        <section class="biz" id="biz" hidden></section>
        <section class="panel open-panel" id="open-panel" hidden></section>
        <div class="stat-grid" data-jobs-only>
          <a class="stat-card" href="jobs.html?status=published" style="text-decoration:none">
            <span class="icon-box"><svg><use href="#i-globe"/></svg></span>
            <div><strong id="stat-published">0</strong><span>Live on the website</span></div>
          </a>
          <div class="stat-card warn">
            <span class="icon-box"><svg><use href="#i-clock"/></svg></span>
            <div><strong id="stat-soon">0</strong><span>Closing in 7 days</span></div>
          </div>
          <a class="stat-card muted" href="jobs.html?status=draft" style="text-decoration:none">
            <span class="icon-box"><svg><use href="#i-edit"/></svg></span>
            <div><strong id="stat-drafts">0</strong><span>Drafts</span></div>
          </a>
          <a class="stat-card red" href="jobs.html?status=expired" style="text-decoration:none">
            <span class="icon-box"><svg><use href="#i-eye-off"/></svg></span>
            <div><strong id="stat-expired">0</strong><span>Expired (auto-hidden)</span></div>
          </a>
        </div>

        <section class="panel progress-panel">
          <div class="panel-head">
            <div><h2 id="prog-title">CV progress</h2><p class="hint-sm" id="prog-sub" style="margin:2px 0 0"></p></div>
            <div class="seg-toggle" role="group" aria-label="Show as"><button type="button" data-view="chart" aria-pressed="true">Chart</button><button type="button" data-view="table" aria-pressed="false">Table</button></div>
          </div>
          <div class="panel-body" id="prog-body"></div>
        </section>

        <div class="dash-grid">
          <div>
            <div class="quick-post" data-jobs-only>
              <span class="icon-box" style="background:rgba(230,200,119,.15);color:var(--gold);margin:0"><svg><use href="#i-image"/></svg></span>
              <div>
                <h3>Got a new job poster?</h3>
                <p>Drop today's posters in the Jobs inbox. AI reads them, flags scams and duplicates, and you approve each one in seconds.</p>
              </div>
              <a class="btn btn-light" href="inbox.html">Open jobs inbox</a>
            </div>
            <section class="panel" data-jobs-only>
              <div class="panel-head"><h2>Recently posted</h2><a href="jobs.html">All jobs →</a></div>
              <div class="panel-body"><ul class="mini-list" id="recent-list"></ul></div>
            </section>
          </div>
          <div style="display:grid;gap:20px">
            <section class="panel" data-jobs-only>
              <div class="panel-head"><h2>Closing soon</h2><a href="jobs.html?status=published">View →</a></div>
              <div class="panel-body"><ul class="mini-list" id="closing-list"></ul></div>
            </section>
            <section class="panel">
              <div class="panel-head"><h2>Orders needing attention</h2><a href="orders.html">All orders →</a></div>
              <div class="panel-body"><ul class="mini-list" id="attention-list"></ul></div>
            </section>
            <section class="panel">
              <div class="panel-head"><h2><svg aria-hidden="true" class="h-icon"><use href="#i-sparkle"/></svg>AI usage this month</h2></div>
              <div class="panel-body" id="ai-usage"></div>
            </section>
          </div>
        </div>"""

# ---------------------------------------------------------------------------
JOBS = """        <section class="panel">
          <div class="table-tools">
            <div class="tabs" role="group" aria-label="Filter by status">
              <button type="button" data-tab="all">All<span></span></button>
              <button type="button" data-tab="published">Published<span></span></button>
              <button type="button" data-tab="draft">Drafts<span></span></button>
              <button type="button" data-tab="expired">Expired<span></span></button>
            </div>
            <label class="table-search">
              <svg aria-hidden="true"><use href="#i-search"/></svg>
              <span class="sr-only">Search jobs</span>
              <input type="search" id="jobs-q" placeholder="Search title, company, location…">
            </label>
          </div>
          <div class="table-wrap-admin">
            <table class="admin-table">
              <thead><tr><th>Job</th><th class="col-cat">Category</th><th>Deadline</th><th>Status</th><th>Posted</th><th>Views</th><th><span class="sr-only">Actions</span></th></tr></thead>
              <tbody id="jobs-body"></tbody>
            </table>
          </div>
        </section>"""

# ---------------------------------------------------------------------------
CATEGORIES = ["IT & Tech", "Finance & Accounting", "Healthcare", "NGO & Development", "Sales & Marketing",
              "Hospitality", "Engineering & Safety", "Education", "Admin & Office", "Transport & Logistics", "Other"]
cat_opts = "".join(f"<option>{c.replace('&', '&amp;')}</option>" for c in CATEGORIES)
TYPES = ["Full-time", "Part-time", "Contract", "Graduate / Internship", "Volunteer"]
type_opts = "".join(f"<option>{t}</option>" for t in TYPES)
MODES = ["On-site", "Hybrid", "Remote", "Field"]
mode_opts = "".join(f"<option>{m}</option>" for m in MODES)
ATTACH = ["CV", "Cover letter", "Certificates", "ID copy", "Portfolio / GitHub", "Testimonials"]
attach = "".join(f'<label><input type="checkbox" name="attach" value="{a}"> {a}</label>' for a in ATTACH)
METHODS = [("email", "mail", "Email"), ("link", "link", "Online link"), ("whatsapp", "whatsapp", "WhatsApp"),
           ("in-person", "pin", "In person"), ("other", "doc", "Other")]
methods = "".join(f'<label><input type="radio" name="method" value="{v}"><svg aria-hidden="true"><use href="#i-{i}"/></svg>{l}</label>' for v, i, l in METHODS)

POST = f"""        <form id="job-form" class="post-layout" novalidate>
          <div class="post-form">

            <!-- 1. Poster -->
            <section class="form-section">
              <h2><span class="n">1</span>Job poster <small style="font-weight:600;color:var(--muted)">(optional)</small></h2>
              <p class="hint">Upload the advert image and let the system read it for you, or skip this and type the details below.</p>
              <div class="dropzone" id="dropzone">
                <svg aria-hidden="true"><use href="#i-upload"/></svg>
                <strong>Drop the poster here, or click to choose</strong>
                <small>JPG or PNG, e.g. a screenshot from WhatsApp or Facebook</small>
                <input type="file" id="poster-input" accept="image/*" aria-label="Upload job poster">
              </div>
              <p id="sample-hint" style="margin:10px 0 0;font-size:.88rem">No poster handy? <button type="button" class="link-btn" id="use-sample">Try the Kilimall sample poster</button></p>
              <div class="poster-loaded" id="poster-loaded" hidden>
                <div class="poster-thumb"><img id="poster-img" alt="Uploaded job poster"></div>
                <div class="poster-actions">
                  <button type="button" class="btn btn-ai" id="read-poster"><svg aria-hidden="true"><use href="#i-sparkle"/></svg> Read poster &amp; fill in details</button>
                  <p>Fills in the title, company, location, deadline and how to apply. Always check the details before publishing.</p>
                  <div class="ai-result" id="ai-result" hidden>
                    <svg aria-hidden="true"><use href="#i-sparkle"/></svg>
                    <span><strong>Details filled in.</strong> Fields highlighted in yellow came from the poster. Please check them. <em>(Preview: fills in the Kilimall sample. The real version reads your poster.)</em></span>
                  </div>
                  <button type="button" class="link-btn danger" id="remove-poster">Remove poster</button>
                </div>
              </div>
            </section>

            <!-- 2. Basics -->
            <section class="form-section">
              <h2><span class="n">2</span>The job</h2>
              <p class="hint">What it is, who's hiring and where.</p>
              <div class="fgrid">
                <div class="f full"><label for="f-title">Job title <em>*</em></label><input type="text" id="f-title" name="title" placeholder="e.g. I.T Specialist"></div>
                <div class="f"><label for="f-company">Company <em>*</em></label><input type="text" id="f-company" name="company" placeholder="e.g. Kilimall"><small>If the advert hides the name, describe it, e.g. "Private hospital, Nairobi".</small></div>
                <div class="f"><label for="f-location">Location <em>*</em></label><input type="text" id="f-location" name="location" placeholder="e.g. Nairobi (Mombasa Road)"></div>
                <div class="f"><label for="f-category">Category</label><select id="f-category" name="category"><option value="">Choose a category</option>{cat_opts}</select></div>
                <div class="f"><label for="f-type">Job type</label><select id="f-type" name="type">{type_opts}</select></div>
                <div class="f"><label for="f-mode">Work setting</label><select id="f-mode" name="workMode">{mode_opts}</select></div>
                <div class="f"><label for="f-salary">Salary</label><input type="text" id="f-salary" name="salary" placeholder="Only if the advert says, e.g. KES 60,000"></div>
              </div>
            </section>

            <!-- 3. Details -->
            <section class="form-section">
              <h2><span class="n">3</span>Details</h2>
              <p class="hint">Written text helps people find the job on Google. Put one item per line.</p>
              <div class="fgrid">
                <div class="f full"><label for="f-summary">About the role</label><textarea id="f-summary" name="summary" rows="3" placeholder="One or two sentences about the job"></textarea></div>
                <div class="f"><label for="f-resp">Responsibilities</label><textarea id="f-resp" name="responsibilities" rows="6" placeholder="One per line"></textarea></div>
                <div class="f"><label for="f-req">Requirements</label><textarea id="f-req" name="requirements" rows="6" placeholder="One per line"></textarea></div>
              </div>
            </section>

            <!-- 4. Deadline -->
            <section class="form-section">
              <h2><span class="n">4</span>Deadline</h2>
              <p class="hint">The job hides from the website automatically after this date.</p>
              <div class="fgrid">
                <div class="f"><label for="f-deadline">Application deadline <em>*</em></label><input type="date" id="f-deadline" name="deadline"></div>
                <div class="f" style="justify-content:flex-end"><label class="inline-check" style="padding-bottom:12px"><input type="checkbox" name="openEnded"> Open until filled (no deadline)</label></div>
              </div>
            </section>

            <!-- 5. How to apply -->
            <section class="form-section">
              <h2><span class="n">5</span>How to apply</h2>
              <p class="hint">Choose how the employer wants applications. Only the fields you need will show.</p>
              <div class="method-picker" role="radiogroup" aria-label="Application method">{methods}</div>
              <div class="fgrid">
                <div class="f" data-for="email"><label for="f-email">Send applications to <em>*</em></label><input type="email" id="f-email" name="email" placeholder="recruitment@company.com"></div>
                <div class="f" data-for="email"><label for="f-subject">Email subject line</label><input type="text" id="f-subject" name="subject" placeholder="e.g. I.T SPECIALIST"></div>
                <div class="f full" data-for="link"><label for="f-link">Application link <em>*</em></label><input type="url" id="f-link" name="link" placeholder="https://"></div>
                <div class="f" data-for="whatsapp"><label for="f-phone">WhatsApp / phone number <em>*</em></label><input type="tel" id="f-phone" name="phone" placeholder="07XX XXX XXX"></div>
                <div class="f" data-for="in-person"><label for="f-address">Where to apply <em>*</em></label><input type="text" id="f-address" name="address" placeholder="Address or building"></div>
                <div class="f" data-for="in-person"><label for="f-when">When</label><input type="text" id="f-when" name="when" placeholder="e.g. Monday 6 Oct, 9am–1pm"></div>
                <div class="f full" data-for="email in-person"><span class="label">What to send or bring</span><div class="chip-checks">{attach}</div></div>
                <div class="f full"><label for="f-notes">Special instructions</label><textarea id="f-notes" name="notes" rows="2" placeholder="e.g. State your current and expected salary. Only shortlisted candidates will be contacted."></textarea></div>
                <div class="f full"><label for="f-source">Where did you find this advert?</label><input type="text" id="f-source" name="source" placeholder="e.g. Company's LinkedIn page"><small>Shown on the job page so readers can see the original source.</small></div>
              </div>
            </section>
          </div>

          <aside class="post-aside">
            <section class="panel panel-body">
              <p class="preview-label">Live preview</p>
              <div id="preview"></div>
            </section>
            <section class="panel panel-body">
              <p class="preview-label">Ready to publish?</p>
              <ul class="checklist">
                <li id="chk-basics">Title, company &amp; location</li>
                <li id="chk-details">Job details</li>
                <li id="chk-deadline">Deadline</li>
                <li id="chk-apply">How to apply</li>
                <li id="chk-poster">Poster (optional)</li>
              </ul>
            </section>
            <section class="panel panel-body publish-box">
              <div class="publish-meta"><span>Status</span><span id="publish-status"></span></div>
              <button type="submit" class="btn btn-primary"><svg aria-hidden="true" width="18" height="18"><use href="#i-globe"/></svg>Publish job</button>
              <button type="button" class="btn btn-ghost" id="save-draft">Save as draft</button>
              <div class="publish-foot">
                <a id="view-live" href="#" target="_blank" rel="noopener" hidden style="font-size:.88rem;font-weight:700">View on website ↗</a>
                <button type="button" class="link-btn danger" id="delete-job" hidden>Delete job</button>
              </div>
            </section>
          </aside>
        </form>

        <dialog class="admin-dialog" id="published-dialog" aria-labelledby="published-title">
          <div class="dialog-body">
            <div class="dialog-icon"><svg aria-hidden="true"><use href="#i-check"/></svg></div>
            <h2 id="published-title">Job published 🎉</h2>
            <p id="published-note"></p>
            <label class="preview-label" for="wa-text">Post it to your WhatsApp channel</label>
            <textarea class="wa-text" id="wa-text" readonly></textarea>
            <div class="dialog-actions">
              <a class="btn btn-ghost" href="post-job.html">Post another job</a>
              <a class="btn btn-ghost" id="published-view" href="#" target="_blank" rel="noopener">View job page ↗</a>
              <button type="button" class="btn btn-wa" id="copy-wa"><svg aria-hidden="true" width="18" height="18"><use href="#i-whatsapp"/></svg> Copy for WhatsApp</button>
            </div>
          </div>
        </dialog>"""

ORDERS = """        <div class="stat-grid quick-grid" role="group" aria-label="Quick filters">
          <button type="button" class="stat-card warn" data-quick="action" aria-pressed="false">
            <span class="icon-box"><svg><use href="#i-alert"/></svg></span>
            <div><strong id="ost-action">0</strong><span>Need action</span></div>
          </button>
          <button type="button" class="stat-card" data-quick="writing" aria-pressed="false">
            <span class="icon-box"><svg><use href="#i-edit"/></svg></span>
            <div><strong id="ost-progress">0</strong><span>Being written</span></div>
          </button>
          <button type="button" class="stat-card red" data-quick="due24" aria-pressed="false">
            <span class="icon-box"><svg><use href="#i-clock"/></svg></span>
            <div><strong id="ost-due">0</strong><span>Due within 24h</span></div>
          </button>
          <button type="button" class="stat-card muted" data-quick="paid" aria-pressed="false">
            <span class="icon-box" style="background:#dcfce7;color:#15803d"><svg><use href="#i-phone"/></svg></span>
            <div><strong id="ost-revenue">KES 0</strong><span>Paid this month</span></div>
          </button>
        </div>
        <p class="quick-hint">Tip: click a card to filter the list. Click it again to clear.</p>

        <section class="panel">
          <div class="table-tools">
            <div class="tabs" role="group" aria-label="Filter by status">
              <button type="button" data-tab="all">All<span></span></button>
              <button type="button" data-tab="new">Awaiting payment<span></span></button>
              <button type="button" data-tab="paid" class="tab-alert">⚠ Not accepted<span></span></button>
              <button type="button" data-tab="writing">Writing<span></span></button>
              <button type="button" data-tab="draft-sent">Draft sent<span></span></button>
              <button type="button" data-tab="revisions">Revisions<span></span></button>
              <button type="button" data-tab="delivered">Delivered<span></span></button>
              <button type="button" data-tab="mine">My orders<span></span></button>
            </div>
            <label class="table-search">
              <svg aria-hidden="true"><use href="#i-search"/></svg>
              <span class="sr-only">Search orders</span>
              <input type="search" id="orders-q" placeholder="Search name, phone, payment ref…">
            </label>
          </div>
          <div class="filter-row">
            <div class="flt-bar" id="flt-bar"></div>
          </div>
          <div class="filter-summary">
            <span id="flt-count" aria-live="polite"></span>
            <div class="chips" id="flt-chips"></div>
            <button type="button" class="link-btn" id="flt-clear" hidden>Clear all</button>
          </div>
          <div class="table-wrap-admin">
            <table class="admin-table orders-table">
              <thead><tr><th>Order</th><th>Client</th><th>Package</th><th>Payment</th><th>Status</th><th>Writer</th><th>Due</th><th><span class="sr-only">Open</span></th></tr></thead>
              <tbody id="orders-body"></tbody>
            </table>
          </div>
        </section>"""

ORDER = """        <div class="order-layout">
          <div class="order-main">
            <section class="panel panel-body order-head" id="order-head"></section>

            <section class="panel">
              <div class="panel-head"><h2>Client's brief</h2></div>
              <div class="panel-body" id="brief"></div>
            </section>

            <section class="panel ai-panel">
              <div class="panel-head"><h2><svg aria-hidden="true" class="h-icon"><use href="#i-sparkle"/></svg>AI assistant</h2><span class="ai-badge">Helps the writer · doesn't replace them</span></div>
              <div class="panel-body">
                <div class="ai-actions">
                  <button type="button" class="ai-btn" data-ai="analyse">
                    <svg aria-hidden="true"><use href="#i-search"/></svg>
                    <span><strong>Analyse the client's CV</strong><small>Score, what to fix and keywords for the target role</small><em class="ai-est"></em></span>
                  </button>
                  <button type="button" class="ai-btn" data-ai="summary">
                    <svg aria-hidden="true"><use href="#i-edit"/></svg>
                    <span><strong>Draft a professional summary</strong><small>A starting point the writer edits</small><em class="ai-est"></em></span>
                  </button>
                </div>
                <div id="ai-out" class="ai-out" aria-live="polite"></div>
              </div>
            </section>

            <section class="panel">
              <div class="panel-head"><h2>Files</h2>
                <label class="btn btn-ghost btn-sm upload-btn"><svg aria-hidden="true" width="16" height="16"><use href="#i-upload"/></svg>Upload
                  <input type="file" id="deliverable" hidden>
                </label>
              </div>
              <div class="panel-body">
                <ul class="file-list" id="files"></ul>
                <div class="upload-kind"><label for="deliverable-kind">Upload as</label>
                  <select id="deliverable-kind"><option value="draft">Next draft</option><option value="final">Final version</option></select></div>
              </div>
            </section>
          </div>

          <aside class="order-aside">
            <section class="panel panel-body">
              <p class="preview-label">Payment</p>
              <div id="pay-box"></div>
            </section>
            <section class="panel panel-body">
              <p class="preview-label">Writer</p>
              <div id="writer-box"></div>
            </section>
            <section class="panel panel-body">
              <p class="preview-label">Client's tracking link</p>
              <div id="track-link"></div>
            </section>
            <section class="panel panel-body">
              <p class="preview-label">Client</p>
              <div class="client-card" id="client"></div>
              <p class="preview-label" style="margin-top:16px">Quick WhatsApp messages</p>
              <div class="wa-tpls" id="wa-templates"></div>
            </section>
            <section class="panel panel-body">
              <p class="preview-label">Activity</p>
              <form id="note-form" class="note-form"><input type="text" id="note" placeholder="Add an internal note…" aria-label="Internal note"><button class="btn btn-primary btn-sm" type="submit">Add</button></form>
              <ul class="timeline-mini" id="timeline"></ul>
            </section>
          </aside>
        </div>"""

FLOW = head("Order flow demo", "flow", "flow-page") + """
  <header class="flow-top">
    <a href="index.html" class="admin-logo"><span class="logo-mark">J</span><span class="logo-text">Jay<strong>CVS</strong></span><span class="admin-badge">Flow demo</span></a>
    <div class="flow-controls">
      <div class="seg-toggle flow-modes" role="group" aria-label="What to compare">
        <button type="button" data-fmode="client" aria-pressed="true">Team + client</button>
        <button type="button" data-fmode="roles" aria-pressed="false">Jay vs a writer</button>
      </div>
      <label for="me" data-only="client">Team member</label>
      <select id="me" data-only="client"></select>
      <label for="cmp-writer" data-only="roles" hidden>Writer</label>
      <select id="cmp-writer" data-only="roles" hidden></select>
      <label for="cmp-screen" data-only="roles" hidden>Screen</label>
      <select id="cmp-screen" data-only="roles" hidden><option value="order">The order</option><option value="index">Dashboard</option><option value="orders">Orders list</option><option value="content">Website content</option><option value="team">Team</option><option value="finance">Finance</option></select>
      <label for="flow-order">Order</label>
      <select id="flow-order"></select>
      <button type="button" class="btn btn-primary btn-sm" id="flow-start">▶ New client</button>
      <button type="button" class="btn btn-ghost btn-sm" id="flow-new" title="Skip the order card and create an unpaid test order instantly"><svg aria-hidden="true" width="16" height="16"><use href="#i-plus"/></svg>Quick test order</button>
      <button type="button" class="btn btn-ghost btn-sm" id="flow-24h" title="Pretend 24 hours have passed for this order">⏩ Skip 24 hours</button>
      <button type="button" class="btn btn-ghost btn-sm" id="flow-5d" title="Pretend 5 days have passed for this order">⏩ Skip 5 days</button>
      <button type="button" class="btn btn-ghost btn-sm" id="flow-reset">Reset</button>
      <a class="btn btn-ghost btn-sm" href="orders.html">← Admin</a>
    </div>
  </header>

  <section class="flow-map" aria-label="How an order moves">
    <ol id="flow-steps"></ol>
    <div class="flow-now" id="flow-now" aria-live="polite"></div>
  </section>
  <section class="roles-diff" id="roles-diff" hidden></section>

  <div class="flow-panes">
    <section class="flow-pane">
      <div class="pane-label team" id="team-pane-label"><svg aria-hidden="true"><use href="#i-users"/></svg><span id="team-name">Team view</span> <small id="team-label">admin/order.html</small></div>
      <iframe id="team-frame" title="Team view of the order"></iframe>
    </section>
    <section class="flow-pane">
      <div class="pane-label client" id="client-pane-label"><svg aria-hidden="true"><use href="#i-phone"/></svg><span id="client-name">Client view</span> <small id="client-label">tracking link</small></div>
      <iframe id="client-frame" title="Client view of the order"></iframe>
    </section>
  </div>
  <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
""" + FOOT

CONTENT = """        <p class="content-intro">Change what clients see on the website. Changes go live as soon as you press <b>Save &amp; publish</b>. Website pages that are already open update by themselves.</p>
        <div class="content-layout">
          <div class="content-main">
            <nav class="content-tabs" id="content-tabs" aria-label="Website content sections"></nav>
            <div id="content-root" class="content-root"></div>
          </div>
          <aside class="panel content-aside">
            <div class="panel-head"><h2>Recent changes</h2></div>
            <ul class="change-list" id="content-history"></ul>
            <div class="panel-body"><a class="btn btn-ghost btn-block" href="../index.html" target="_blank" rel="noopener">Open the website ↗</a></div>
          </aside>
        </div>"""

INBOX = """        <section class="intake">
          <label class="dropzone intake-drop" id="inbox-drop">
            <input type="file" id="inbox-files" accept="image/*" multiple>
            <svg aria-hidden="true"><use href="#i-upload"/></svg>
            <strong>Drop today's posters here</strong>
            <small>Flyers, screenshots from LinkedIn or Facebook, phone photos. Up to 30 at once.</small>
          </label>
          <div class="intake-side">
            <button type="button" class="btn btn-primary" id="load-sample"><svg aria-hidden="true" width="18" height="18"><use href="#i-sparkle"/></svg>Load a sample batch (8 posters)</button>
            <p class="intake-est" id="intake-est"></p>
            <ul class="intake-points">
              <li>AI reads every poster in the background</li>
              <li>Scams, duplicates and missing deadlines are flagged</li>
              <li>Nothing goes live until someone approves it</li>
            </ul>
          </div>
        </section>

        <div class="inbox-bar">
          <div class="tabs inbox-tabs" role="group" aria-label="Show">
            <button type="button" data-st="check" aria-pressed="true">To check <span>0</span></button>
            <button type="button" data-st="flagged" class="tab-alert">Flagged <span>0</span></button>
            <button type="button" data-st="reading">Reading <span>0</span></button>
            <button type="button" data-st="approved">Approved today <span>0</span></button>
            <button type="button" data-st="discarded">Discarded <span>0</span></button>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" id="approve-clean" hidden></button>
        </div>

        <div class="inbox-layout">
          <aside class="panel inbox-queue" aria-label="Posters">
            <ul id="queue" class="queue"></ul>
          </aside>
          <section class="panel inbox-detail" id="detail" aria-live="polite"></section>
        </div>

        <p class="kbd-help"><svg aria-hidden="true"><use href="#i-keyboard"/></svg>Shortcuts: <kbd>J</kbd>/<kbd>K</kbd> next / previous · <kbd>A</kbd> approve &amp; publish · <kbd>D</kbd> discard</p>

        <section class="panel digest" id="digest" hidden>
          <div class="panel-head"><div><h2>Today's WhatsApp channel post</h2><p class="panel-sub">Every job approved today in one message, with links back to the website.</p></div>
            <button type="button" class="btn btn-primary btn-sm" id="copy-digest"><svg aria-hidden="true" width="16" height="16"><use href="#i-copy"/></svg>Copy post</button></div>
          <pre class="digest-text" id="digest-text"></pre>
        </section>"""


TEAM = """        <div class="stat-grid" id="team-stats"></div>
        <section class="panel">
          <div class="panel-head">
            <div><h2>Your team</h2><p class="panel-sub">Who can sign in, what they can do and what they're paid. Only you see this page.</p></div>
            <button type="button" class="btn btn-primary btn-sm" id="invite-btn"><svg aria-hidden="true" width="16" height="16"><use href="#i-plus"/></svg>Invite a writer</button>
          </div>
          <div class="table-wrap-admin">
            <table class="admin-table team-table">
              <thead><tr><th>Member</th><th>Can</th><th>Status</th><th>In progress</th><th>Delivered (30 days)</th><th>Drafts on time</th><th>Pay per CV</th><th><span class="sr-only">Actions</span></th></tr></thead>
              <tbody id="team-body"></tbody>
            </table>
          </div>
        </section>
        <div class="team-grid">
          <section class="panel panel-body">
            <p class="preview-label">How inviting works</p>
            <ol class="how-list">
              <li>You add their name, WhatsApp number and what they can do.</li>
              <li>They get a private link on WhatsApp (valid for 7 days) and set their own password.</li>
              <li>They can start accepting orders. You can pause or remove them at any time.</li>
            </ol>
          </section>
          <section class="panel panel-body">
            <p class="preview-label">Only you can</p>
            <ul class="owner-list">
              <li>See money: prices, takings, M-Pesa payments, writer pay</li>
              <li>See the AI token balance</li>
              <li>Invite, pause and remove team members, and set their pay</li>
              <li>Change prices and everything on the website</li>
              <li>Reassign orders, extend deadlines and refund clients</li>
            </ul>
          </section>
        </div>"""

FINANCE = """        <div class="fin-top">
          <div class="seg-toggle" id="fin-period" role="group" aria-label="Period">
            <button type="button" data-p="month" aria-pressed="true">This month</button>
            <button type="button" data-p="30" aria-pressed="false">Last 30 days</button>
            <button type="button" data-p="all" aria-pressed="false">All time</button>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" id="fin-export"><svg aria-hidden="true" width="16" height="16"><use href="#i-download"/></svg>Download payments (CSV)</button>
        </div>
        <div class="stat-grid fin-stats" id="fin-stats"></div>
        <div class="fin-grid">
          <section class="panel">
            <div class="panel-head"><div><h2>Where the money goes</h2><p class="panel-sub">Every shilling clients paid, split up.</p></div></div>
            <div class="panel-body" id="fin-split"></div>
          </section>
          <section class="panel">
            <div class="panel-head"><div><h2>Takings by package</h2><p class="panel-sub">Which services bring in the money.</p></div></div>
            <div class="panel-body" id="fin-pkg"></div>
          </section>
        </div>
        <section class="panel">
          <div class="panel-head"><div><h2>Writer pay</h2><p class="panel-sub">Earned when a CV is delivered, at each writer's rate. Send the money by M-Pesa as usual, then record it here.</p></div></div>
          <div class="table-wrap-admin">
            <table class="admin-table">
              <thead><tr><th>Writer</th><th>Rate</th><th>CVs delivered</th><th>Earned</th><th>Paid out</th><th>Owed now</th><th><span class="sr-only">Pay</span></th></tr></thead>
              <tbody id="fin-writers"></tbody>
            </table>
          </div>
        </section>
        <section class="panel">
          <div class="panel-head"><h2>Payments</h2><span class="hint-sm" id="fin-count"></span></div>
          <div class="table-wrap-admin">
            <table class="admin-table fin-table">
              <thead><tr><th>Date</th><th>Order</th><th>Client</th><th>Package</th><th>How paid</th><th>M-Pesa code</th><th class="num">Amount</th></tr></thead>
              <tbody id="fin-payments"></tbody>
            </table>
          </div>
        </section>
        <section class="panel panel-body fin-unpaid" id="fin-unpaid"></section>"""


pages = {
    "login.html": LOGIN,
    "index.html": shell("dashboard", "Dashboard", "Overview", DASHBOARD),
    "jobs.html": shell("jobs", "Jobs", "Manage job posts", JOBS,
                       '<a class="btn btn-primary btn-sm" href="post-job.html"><svg aria-hidden="true" width="16" height="16"><use href="#i-plus"/></svg>Post a job</a>'),
    "post-job.html": shell("post-job", "Post a job", "Jobs / New", POST),
    "inbox.html": shell("inbox", "Jobs inbox", "Posters waiting to be checked", INBOX,
                        '<a class="btn btn-ghost btn-sm" href="post-job.html">Type a job in instead</a>'),
    "orders.html": shell("orders", "Orders", "CV orders from the website", ORDERS),
    "content.html": shell("content", "Website content", "What clients see on the website", CONTENT),
    "team.html": shell("team", "Team", "Your writers and what they can do", TEAM),
    "finance.html": shell("finance", "Finance", "Only you can see this page", FINANCE),
    "flow.html": FLOW,
    "order.html": shell("order", "Order", "Orders", ORDER,
                        '<a class="btn btn-ghost btn-sm" href="orders.html">← All orders</a>'),
}
for name, html in pages.items():
    (OUT / name).write_text(html, encoding="utf-8", newline="\n")
    print("wrote admin/" + name, len(html), "bytes")
