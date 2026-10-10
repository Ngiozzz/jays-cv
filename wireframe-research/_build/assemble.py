"""Assemble Jay CVS pages: shared head/header/footer + per-page body files."""
import re
from pathlib import Path

HERE = Path(__file__).parent
SITE = Path(__file__).resolve().parent.parent  # the wireframe-research folder
WA = "https://wa.me/254725912186"

PAGES = {
    "index": ("Jay CVS | Professional CV Writing &amp; Career Services in Kenya",
              "Professional CV writing, cover letters, LinkedIn profile revamps, career coaching and job application support in Nairobi, Kenya. CV draft in [48 hours]. Pay via M-Pesa."),
    "services": ("Services | Jay CVS",
                 "CV writing, cover letters, LinkedIn revamps, career coaching and job application support in Kenya."),
    "how-it-works": ("How It Works | Jay CVS",
                     "How to order your professional CV from Jay CVS: share your details, pay via M-Pesa, receive your draft and finalise. Everything online."),
    "pricing": ("Pricing | Jay CVS",
                "Transparent prices for CV writing, cover letters, LinkedIn revamps and career coaching in Kenya. Pay securely by M-Pesa or card."),
    "samples": ("CV Samples | Jay CVS",
                "Before-and-after CV samples written by Jay CVS for accountants, engineers, nurses, NGO professionals and more."),
    "blog": ("Career Tips | Jay CVS",
             "CV tips, LinkedIn advice, interview preparation and job search guides from Jay CVS HR experts."),
    "jobs": ("Find a Job in Kenya | Jay CVS",
             "Latest job vacancies in Kenya, shared daily by Jay CVS. Search by keyword, location and category, and see exactly how to apply."),
    "job": ("Job Vacancy | Jay CVS",
            "Job vacancy details, requirements and how to apply, shared by Jay CVS."),
    "order": ("Order Your CV | Jay CVS",
              "Order a professional CV in three steps: choose a service, pick a package and upload your CV. Pay by M-Pesa or card."),
    "track": ("Track Your Order | Jay CVS",
              "Follow your Jay CVS order, download your drafts and approve or request changes."),
    "article": ("[7 CV Mistakes That Get You Rejected in Kenya] | Jay CVS",
                "[What recruiters notice in the first six seconds of reading your CV, and how to fix the most common mistakes.]"),
}

NAV = [
    ("jobs.html", "Find a job"),
    ("services.html", "Services"),
    ("how-it-works.html", "How it works"),
    ("pricing.html", "Pricing"),
    ("samples.html", "Samples"),
    ("blog.html", "Career tips"),
]
# Which nav item is highlighted on each page
ACTIVE = {"article": "blog.html", "job": "jobs.html"}
# Pages that show job listings load the jobs data and script
JOB_PAGES = {"index", "jobs", "job"}


# ---------------------------------------------------------------------------
# Packages: defined once, rendered as cards, summary table and payment amounts
# ---------------------------------------------------------------------------
PACKAGES = [
    dict(name="[Basic CV]", short="Basic", best="Graduates &amp; entry-level roles", price="[X,XXX]",
         draft="[48 hours]", revisions="[1 round]", featured=False,
         features=["Professionally written CV", "ATS-friendly format", "Draft in [48 hours]", "[1] round of revisions", "Word &amp; PDF formats"]),
    dict(name="[Professional]", short="Professional", best="Mid-level professionals", price="[X,XXX]",
         draft="[24 hours]", revisions="[2 rounds]", featured=True,
         features=["Everything in Basic", "Tailored cover letter", "Achievement-focused rewrite", "[2] rounds of revisions", "Priority [24-hour] delivery"]),
    dict(name="[Executive Pack]", short="Executive", best="Senior leaders &amp; career changers", price="[X,XXX]",
         draft="[24 hours]", revisions="[Unlimited, 14 days]", featured=False,
         features=["Everything in Professional", "LinkedIn profile revamp", "[1-hour] career coaching call", "Unlimited revisions for [14 days]", "Written personally by Jay"]),
]


def wa_order(pkg):
    return f"{WA}?text=" + f"Hi Jay CVS, I'd like the {pkg['short']} package".replace(" ", "%20").replace("'", "%27")


def package_cards():
    cards = []
    for i, p in enumerate(PACKAGES):
        ribbon = '\n            <span class="ribbon">Most popular</span>' if p["featured"] else ""
        feats = "\n".join(f"              <li>{f}</li>" for f in p["features"])
        btn = "btn-primary" if p["featured"] else "btn-ghost"
        cards.append(f"""          <article class="price-card{' price-card-featured' if p['featured'] else ''} reveal" data-pkg-card="{i}">{ribbon}
            <h3 data-f="name">{p['name']}</h3>
            <p class="price-desc" data-f="best">For {p['best'][0].lower() + p['best'][1:]}.</p>
            <p class="price"><span class="currency">KES</span> <span data-f="price">{p['price']}</span></p>
            <ul class="price-features" data-f="features">
{feats}
            </ul>
            <a class="btn {btn} btn-block" href="{wa_order(p)}" target="_blank" rel="noopener">Choose {p['short']}</a>
            <p class="price-pay">One-off payment · M-Pesa or card · <a href="pricing.html#payment">How to pay</a></p>
          </article>""")
    return '        <div class="pricing-grid">\n' + "\n\n".join(cards) + "\n        </div>"


def package_table():
    rows = "\n".join(f"""              <tr{' class="row-featured"' if p['featured'] else ''} data-pkg-row="{i}">
                <th scope="row"><span data-f="name">{p['name']}</span>{' <span class="mini-badge">Popular</span>' if p['featured'] else ''}</th>
                <td data-f="best">{p['best']}</td><td data-f="draft">{p['draft']}</td><td data-f="rounds">{p['revisions']}</td>
                <td><strong data-f="price">KES {p['price']}</strong></td>
                <td><a class="btn btn-primary btn-sm" href="{wa_order(p)}" target="_blank" rel="noopener">Order</a></td>
              </tr>""" for i, p in enumerate(PACKAGES))
    return f"""        <div class="table-wrap">
          <table class="compare package-table">
            <thead><tr><th scope="col">Package</th><th scope="col">Best for</th><th scope="col">First draft</th><th scope="col">Revisions</th><th scope="col">Price</th><th scope="col"><span class="sr-only">Order</span></th></tr></thead>
            <tbody>
{rows}
            </tbody>
          </table>
        </div>
        <p class="pricing-note"><a href="pricing.html">Compare everything included in each package →</a></p>"""


def payment_section(show_process_link=True):
    amounts = "\n".join(f"""              <li data-pkg-amount="{i}"><div><strong data-f="name">{p['name']}</strong><small data-f="best">{p['best']}</small></div><span class="amount" data-f="price">KES {p['price']}</span></li>"""
                        for i, p in enumerate(PACKAGES))
    process = '\n        <p class="pricing-note"><a href="how-it-works.html">See the full ordering process →</a></p>' if show_process_link else ""
    return f"""
    <!-- ============ PAYMENT ============ -->
    <section class="section section-alt" id="payment">
      <div class="container">
        <div class="section-head">
          <p class="eyebrow">Payment</p>
          <h2>What you pay, and how to pay</h2>
          <p>One upfront payment by M-Pesa, straight to Jay CVS. No hidden charges, and revisions are included.</p>
        </div>

        <div class="two-col">
          <div class="card mpesa-card reveal">
            <div class="card-title-row">
              <span class="icon-box icon-green"><svg><use href="#i-phone"/></svg></span>
              <h3>Pay with M-Pesa</h3>
            </div>
            <ol>
              <li><strong>Upload your CV</strong> and get your private tracking link (step 3 of the order card)</li>
              <li>Tap <strong>Pay with M-Pesa</strong> and enter your M-Pesa number</li>
              <li>A prompt pops up on your phone. <strong>Enter your PIN.</strong></li>
              <li><strong>That's it.</strong> Payment is confirmed automatically and your writer starts. No codes or SMS to forward.</li>
            </ol>
            <p class="paybill-box"><span>Prefer the M-Pesa menu? <b>Pay Bill <span data-c="paybill">4027127</span></b> · Account number: <b>your order number</b> (e.g. JC-1048)</span></p>
          </div>

          <div class="card reveal">
            <div class="card-title-row">
              <span class="icon-box"><svg><use href="#i-doc"/></svg></span>
              <h3>What you're paying for</h3>
            </div>
            <ul class="amount-list">
{amounts}
              <li><div><strong>Single services</strong><small>Cover letter, LinkedIn, coaching &amp; more</small></div><a class="amount" href="pricing.html#individual" data-c="singles-from">from KES [X,XXX]</a></li>
            </ul>
            <p class="form-note">Every package includes a professional writer, revisions, and your final CV in Word and PDF. Not sure which to pick? <a href="{WA}?text=Hi%20Jay%20CVS%2C%20which%20package%20should%20I%20choose%3F" target="_blank" rel="noopener">Ask us</a> and we'll recommend one before you pay.</p>
          </div>
        </div>

        <h3 class="after-pay-title">After you pay</h3>
        <ol class="after-pay">
          <li class="reveal"><span class="step-num">1</span><div><strong>Payment confirmed</strong><p>Confirmed automatically the moment you pay, and your writer is assigned.</p></div></li>
          <li class="reveal"><span class="step-num">2</span><div><strong>First draft in [48 hours]</strong><p>Your writer may call with a few questions, then sends your draft.</p></div></li>
          <li class="reveal"><span class="step-num">3</span><div><strong>Revise &amp; receive</strong><p>Request changes, then get your final CV in Word and PDF.</p></div></li>
        </ol>{process}
      </div>
    </section>
"""


# ---------------------------------------------------------------------------
# Order card: 3 steps that swap in place (Choose a service → Pick a package → Pay)
# ---------------------------------------------------------------------------
STEPS = ["Choose a service", "Pick a package", "Upload CV &amp; track"]

# Step 1 choices. "pkg" is the index of the package it recommends, or "single".
NEEDS = [
    ("A professional CV", "A new CV, or a rewrite of your current one", 0),
    ("CV + cover letter", "Everything you need to start applying", 1),
    ("Full career makeover", "CV, cover letter, LinkedIn &amp; a coaching call", 2),
    ("Just one service", "Cover letter, LinkedIn, coaching, interview prep…", "single"),
]
SINGLES = [
    ("Cover letter", "[X,XXX]"),
    ("Motivation letter / personal statement", "[X,XXX]"),
    ("LinkedIn profile revamp", "[X,XXX]"),
    ("Career coaching session", "[X,XXX]"),
    ("Mock interview", "[X,XXX]"),
    ("Job application support", "[X,XXX]"),
]
DEFAULT_NEED = 1  # "CV + cover letter" → the most popular package


def order_card(start):
    tabs = "\n".join(
        f'            <li><button type="button" data-go="{i}"><span class="j-num">{i}</span>'
        f'<span class="j-text"><small>Step {i}</small>{label}</span></button></li>'
        for i, label in enumerate(STEPS, 1))

    needs = "\n".join(f"""              <label class="opt">
                <input type="radio" name="need" value="{i}" data-pkg="{pkg}"{' checked' if i == DEFAULT_NEED else ''}>
                <span class="opt-body"><strong>{title}</strong><small>{desc}</small></span>
              </label>""" for i, (title, desc, pkg) in enumerate(NEEDS))

    default_pkg = NEEDS[DEFAULT_NEED][2]
    pkgs = "\n".join(f"""              <label class="opt{' recommended' if i == default_pkg else ''}">
                <input type="radio" name="item" value="pkg-{i}" data-name="{p['name']} package" data-pkg="{p['short']}" data-price="{p['price']}"{' checked' if i == default_pkg else ''}>
                <span class="opt-body"><strong>{p['name']}</strong><small>{p['best']} · draft in {p['draft']}</small></span>
                <span class="opt-price">KES {p['price']}</span>
              </label>""" for i, p in enumerate(PACKAGES))

    singles = "\n".join(f"""              <label class="opt">
                <input type="radio" name="item" value="single-{i}" data-name="{name}" data-pkg="{name}" data-price="{price}">
                <span class="opt-body"><strong>{name}</strong></span>
                <span class="opt-price">KES {price}</span>
              </label>""" for i, (name, price) in enumerate(SINGLES))

    first = PACKAGES[default_pkg]
    return f"""    <div class="container journey-wrap">
      <section class="order-card" data-start="{start}" aria-label="Order in 3 steps">
        <nav class="order-steps" aria-label="Order steps">
          <ol>
{tabs}
          </ol>
        </nav>

        <div class="order-body">
          <!-- Step 1 -->
          <div class="order-panel" data-step="1" role="group" aria-labelledby="order-t1">
            <h2 class="order-title" id="order-t1" tabindex="-1">What do you need?</h2>
            <p class="order-sub">Pick the closest match. We'll suggest the right package next.</p>
            <div class="opt-grid">
{needs}
            </div>
            <div class="order-nav"><span></span><button type="button" class="btn btn-primary" data-go="2">Continue</button></div>
          </div>

          <!-- Step 2 -->
          <div class="order-panel" data-step="2" role="group" aria-labelledby="order-t2">
            <h2 class="order-title" id="order-t2" tabindex="-1">Pick a package</h2>
            <p class="order-sub">One-off price, paid by M-Pesa or card. <a href="pricing.html#compare">Compare what's included</a>.</p>
            <div class="opt-list" data-group="packages">
{pkgs}
            </div>
            <div class="opt-list" data-group="singles" hidden>
{singles}
            </div>
            <div class="order-nav"><button type="button" class="btn btn-ghost" data-go="1">Back</button><button type="button" class="btn btn-primary" data-go="3">Continue</button></div>
          </div>

          <!-- Step 3: upload CV → order created → private tracking link -->
          <div class="order-panel" data-step="3" role="group" aria-labelledby="order-t3">
            <div data-state="form">
              <h2 class="order-title" id="order-t3" tabindex="-1">Upload your CV &amp; get your tracking link</h2>
              <p class="order-sub">We'll create your order and a private link where you can pay, follow progress, download drafts and ask for changes.</p>
              <div class="order-summary">
                <div><span>Your order</span><strong data-out="name">{first['name']} package</strong></div>
                <div class="order-amount"><span>Amount</span><strong>KES <span data-out="price">{first['price']}</span></strong></div>
              </div>
              <form class="order-details" data-order-form novalidate>
                <div class="od-grid">
                  <div class="od-field"><label for="od-name">Full name <em>*</em></label><input id="od-name" name="name" autocomplete="name" placeholder="e.g. Faith Njeri" required></div>
                  <div class="od-field"><label for="od-phone">WhatsApp number <em>*</em></label><input id="od-phone" name="phone" type="tel" autocomplete="tel" placeholder="07XX XXX XXX" required></div>
                  <div class="od-field"><label for="od-email">Email <small>(optional)</small></label><input id="od-email" name="email" type="email" autocomplete="email" placeholder="you@example.com"></div>
                  <div class="od-field"><label for="od-role">Job you're targeting <small>(optional)</small></label><input id="od-role" name="role" placeholder="e.g. Procurement Officer"></div>
                </div>
                <label class="cv-drop" data-cv-drop>
                  <input type="file" name="cv" accept=".pdf,.doc,.docx,image/*">
                  <svg aria-hidden="true"><use href="#i-upload"/></svg>
                  <span data-cv-label><strong>Upload your current CV</strong><small>PDF, Word, or a clear photo of it</small></span>
                </label>
                <label class="od-check"><input type="checkbox" name="nocv"> I don't have a CV yet. Send me a short questionnaire instead.</label>
                <label class="od-check"><input type="checkbox" name="consent" checked> Send me updates about this order on WhatsApp</label>
                <p class="od-error" data-od-error hidden></p>
                <div class="order-nav">
                  <button type="button" class="btn btn-ghost" data-go="2">Back</button>
                  <button type="submit" class="btn btn-primary">
                    <svg aria-hidden="true" width="18" height="18"><use href="#i-upload"/></svg>
                    Upload CV &amp; get my tracking link
                  </button>
                </div>
              </form>
              <p class="order-note">Your CV is only seen by your writer. Questions first? <a href="{WA}?text=Hi%20Jay%20CVS%2C%20I%20have%20a%20question%20before%20I%20order" target="_blank" rel="noopener">Chat with us on WhatsApp</a>.</p>
            </div>

            <div data-state="done" hidden>
              <div class="od-success">
                <span class="od-tick"><svg aria-hidden="true"><use href="#i-check"/></svg></span>
                <div><h2 class="order-title" tabindex="-1" data-done-title>Order created</h2><p class="order-sub" data-done-sub></p></div>
              </div>
              <div class="od-link">
                <span>Your private tracking link</span>
                <div class="od-link-row"><code data-done-link></code><button type="button" class="btn btn-ghost btn-sm" data-copy-link><svg aria-hidden="true" width="16" height="16"><use href="#i-copy"/></svg><span>Copy</span></button></div>
                <small><svg aria-hidden="true" width="14" height="14"><use href="#i-lock"/></svg>Only you have this link. Don't share it in groups or channels.</small>
              </div>
              <div class="od-actions">
                <a class="btn btn-wa btn-lg" data-done-wa href="{WA}" target="_blank" rel="noopener"><svg aria-hidden="true" width="20" height="20"><use href="#i-whatsapp"/></svg>Save link to my WhatsApp</a>
                <a class="btn btn-ghost btn-lg" data-done-open href="track.html">Open my tracking page</a>
              </div>
              <div class="od-pay">
                <strong>Next: pay to start your order</strong>
                <div data-pay-box>
                  <div class="pay-cta"><div><span>Amount</span><strong data-done-amount>KES 0</strong></div><button type="button" class="btn btn-primary btn-lg" data-pay-now>Pay with M-Pesa</button></div>
                  <small><svg aria-hidden="true" width="14" height="14"><use href="#i-lock"/></svg> Paid directly to Jay CVS: an M-Pesa prompt pops up on your phone, just enter your PIN. Or use <b>Pay Bill <span data-c="paybill">4027127</span></b> with your order number as the account. You can also pay later from your tracking page.</small>
                </div>
                <div class="od-paid" data-paid hidden><span class="od-tick sm"><svg aria-hidden="true"><use href="#i-check"/></svg></span><div><strong>Payment received 🎉</strong><p data-paid-text></p></div></div>
              </div>
              <button type="button" class="link-btn" data-new-order>Start another order</button>
            </div>
          </div>
        </div>
      </section>
    </div>
"""


def fill_partials(body, page):
    body = body.replace("        <!-- PACKAGE_CARDS -->", package_cards())
    body = body.replace("        <!-- PACKAGE_TABLE -->", package_table())
    body = body.replace("                <!-- STEP_PRICES -->", "\n".join(
        f'                <li data-pkg-step="{i}"><span data-f="name">{p["name"]}</span><strong data-f="price">KES {p["price"]}</strong></li>' for i, p in enumerate(PACKAGES)))
    body = body.replace("    <!-- PAYMENT -->\n", payment_section(show_process_link=page != "how-it-works"))
    for step in (1, 2, 3):
        body = body.replace(f"    <!-- JOURNEY:{step} -->\n", order_card(step))
    return body


def cta_band(page):
    if page == "pricing":
        second = '<a class="btn btn-outline-light btn-lg" href="#payment">How to pay</a>'
    else:
        second = '<a class="btn btn-outline-light btn-lg" href="pricing.html">See packages &amp; prices</a>'
    return CTA_BAND.replace("        </a>\n      </div>\n    </section>", f"        </a>\n        {second}\n      </div>\n    </section>")


def head(title, desc):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:type" content="website">
  <link rel="icon" href="img/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>

  <a class="skip-link" href="#main">Skip to content</a>
"""


def header(active):
    items = "\n".join(
        f'          <li><a href="{href}"{" aria-current=\"page\"" if href == active else ""}>{label}</a></li>'
        for href, label in NAV
    )
    return f"""
  <!-- ============ HEADER ============ -->
  <header class="site-header" id="top">
    <div class="container header-inner">
      <a href="index.html" class="logo" aria-label="Jay CVS home">
        <!-- PLACEHOLDER: replace with <img src="img/logo.svg" alt="Jay CVS"> -->
        <span class="logo-mark">J</span>
        <span class="logo-text">Jay<strong>CVS</strong></span>
      </a>

      <nav class="main-nav" id="main-nav" aria-label="Main">
        <ul>
{items}
        </ul>
        <a class="btn btn-primary btn-sm nav-cta" href="{WA}?text=Hi%20Jay%20CVS%2C%20I%27d%20like%20help%20with%20my%20CV" target="_blank" rel="noopener">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><use href="#i-whatsapp"/></svg>
          WhatsApp us
        </a>
      </nav>

      <button class="nav-toggle" aria-controls="main-nav" aria-expanded="false" aria-label="Open menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>
"""


CTA_BAND = f"""
    <!-- ============ FINAL CTA ============ -->
    <section class="cta-band">
      <div class="container cta-inner">
        <h2>Ready for a CV that opens doors?</h2>
        <p>Send us your current CV on WhatsApp for a free review. We usually reply within 5 minutes.</p>
        <a class="btn btn-light btn-lg" href="{WA}?text=Hi%20Jay%20CVS%2C%20I%27d%20like%20a%20free%20CV%20review" target="_blank" rel="noopener">
          <svg aria-hidden="true" width="20" height="20"><use href="#i-whatsapp"/></svg>
          Get a free CV review
        </a>
      </div>
    </section>
"""

FOOTER = f"""
  <!-- ============ FOOTER ============ -->
  <footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-brand">
        <a href="index.html" class="logo logo-light" aria-label="Jay CVS home">
          <span class="logo-mark">J</span>
          <span class="logo-text">Jay<strong>CVS</strong></span>
        </a>
        <p>Professional CV writing and career services, helping Kenyans land the jobs they deserve since 2018.</p>
        <div class="socials">
          <a href="#" aria-label="LinkedIn" data-social="linkedin"><svg><use href="#i-linkedin"/></svg></a>
          <a href="#" aria-label="Facebook" data-social="facebook"><svg><use href="#i-facebook"/></svg></a>
          <a href="#" aria-label="Instagram" data-social="instagram"><svg><use href="#i-instagram"/></svg></a>
          <a href="#" aria-label="X (Twitter)" data-social="x"><svg><use href="#i-x"/></svg></a>
        </div>
      </div>
      <div>
        <h4>Services</h4>
        <ul>
          <li><a href="services.html#cv-writing">CV writing</a></li>
          <li><a href="services.html#cover-letters">Cover letters</a></li>
          <li><a href="services.html#linkedin">LinkedIn revamp</a></li>
          <li><a href="services.html#career-coaching">Career coaching</a></li>
          <li><a href="services.html#job-applications">Job applications</a></li>
        </ul>
      </div>
      <div>
        <h4>Company</h4>
        <ul>
          <li><a href="jobs.html">Find a job</a></li>
          <li><a href="how-it-works.html">How it works</a></li>
          <li><a href="pricing.html">Pricing</a></li>
          <li><a href="samples.html">Samples</a></li>
          <li><a href="blog.html">Career tips</a></li>
          <li><a href="#">[About us]</a></li>
          <li><a href="#">[Privacy policy]</a></li>
        </ul>
      </div>
      <div>
        <h4>Get in touch</h4>
        <ul class="contact-list">
          <li><a href="tel:+254725912186">(+254) 725 912 186</a></li>
          <li><a href="mailto:info@jaycvs.co.ke">info@jaycvs.co.ke</a></li>
          <li data-c="address">[Office address], Nairobi, Kenya</li>
          <li class="paybill">Pay by M-Pesa: <strong>Pay Bill <span data-c="paybill">4027127</span></strong></li>
        </ul>
      </div>
    </div>
    <div class="container footer-bottom">
      <p>© 2018–<span id="year">2026</span> Jay CVS HR Consultancy. All rights reserved.</p>
    </div>
  </footer>

  <!-- Floating WhatsApp button -->
  <a class="wa-float" href="{WA}?text=Hi%20Jay%20CVS" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">
    <svg aria-hidden="true"><use href="#i-whatsapp"/></svg>
  </a>
"""


def sprite_and_script(index_html):
    # Reuse the icon sprite exactly as written in the original homepage
    m = re.search(r"  <!-- ============ ICON SPRITE ============ -->.*?</svg>\n(?=\n  <script)", index_html, re.S)
    return "\n" + m.group(0) + '\n  <script src="js/content-store.js"></script>\n  <script src="js/content-live.js"></script>\n  <script src="js/main.js"></script>\n</body>\n</html>\n'


def index_main(index_html):
    """Pull the homepage <main> and point its links at the new pages."""
    main = re.search(r"  <main id=\"main\">.*?  </main>\n", index_html, re.S).group(0)
    main = re.sub(r"\n    <!-- ============ FINAL CTA ============ -->.*?</section>\n", "\n", main, flags=re.S)
    card_links = {
        "CV writing &amp; design": "services.html#cv-writing",
        "Cover &amp; motivation letters": "services.html#cover-letters",
        "LinkedIn profile revamp": "services.html#linkedin",
        "Career coaching": "services.html#career-coaching",
        "Job applications &amp; assessments": "services.html#job-applications",
    }
    for title, href in card_links.items():
        main = re.sub(
            r'<a class="card service-card reveal" href="#[a-z-]+">(\s*<span class="icon-box"><svg><use href="#i-[a-z]+"/></svg></span>\s*<h3>'
            + re.escape(title) + "</h3>)",
            f'<a class="card service-card reveal" href="{href}">\\1',
            main,
        )
    main = main.replace('href="#pricing">I\'m a job seeker', 'href="pricing.html">I\'m a job seeker')
    main = main.replace('href="#samples">See CV samples', 'href="samples.html">See CV samples')
    main = main.replace('<a class="btn btn-ghost" href="#">View all articles</a>', '<a class="btn btn-ghost" href="blog.html">View all articles</a>')
    main = main.replace('<h3><a href="#">', '<h3><a href="article.html">')
    # "See more" links under homepage sections
    main = main.replace(
        "        </ol>\n      </div>\n    </section>",
        '        </ol>\n        <p class="pricing-note"><a href="how-it-works.html">See the full process, what we need from you and payment steps →</a></p>\n      </div>\n    </section>',
    )
    main = main.replace(
        '<p class="pricing-note">Need just a cover letter or LinkedIn revamp? <a href="https://wa.me/254725912186?text=Hi%2C%20I%27d%20like%20a%20quote" target="_blank" rel="noopener">Ask for a quote on WhatsApp</a>.</p>',
        '<p class="pricing-note">Need just a cover letter or LinkedIn revamp? <a href="pricing.html#individual">See individual service prices →</a></p>',
    )
    main = main.replace(
        "          </figure>\n        </div>\n      </div>\n    </section>",
        '          </figure>\n        </div>\n        <p class="pricing-note"><a href="samples.html">See more samples →</a></p>\n      </div>\n    </section>',
    )
    return main


def main():
    index_src = (HERE / "index-original.html").read_text(encoding="utf-8")
    tail = sprite_and_script(index_src)
    bodies = {"index": index_main(index_src)}
    for name in PAGES:
        if name != "index":
            bodies[name] = (HERE / "pages" / f"{name}.html").read_text(encoding="utf-8")

    for name, (title, desc) in PAGES.items():
        body = bodies[name]
        body = fill_partials(body, name)
        assert "<!-- STEP_PRICES" not in body and "<!-- PACKAGE_" not in body and "<!-- PAYMENT" not in body and "<!-- JOURNEY" not in body, name
        if "<!-- NO-CTA -->" not in body:
            body = body.replace("  </main>\n", cta_band(name) + "\n  </main>\n")
        body = body.replace("<!-- NO-CTA -->\n", "")
        active = ACTIVE.get(name, f"{name}.html")
        page_tail = tail
        if name in JOB_PAGES:
            page_tail = tail.replace('  <script src="js/main.js"></script>',
                                     '  <script src="js/jobs-data.js"></script>\n  <script src="js/jobs.js"></script>\n  <script src="js/main.js"></script>')
        if name in ("services", "pricing", "how-it-works", "order"):
            page_tail = tail.replace('  <script src="js/main.js"></script>',
                                     '  <script src="js/orders-data.js"></script>\n  <script src="js/orders-core.js"></script>\n  <script src="js/mpesa-mock.js"></script>\n  <script src="js/main.js"></script>')
        if name == "track":
            page_tail = tail.replace('  <script src="js/main.js"></script>',
                                     '  <script src="js/orders-data.js"></script>\n  <script src="js/orders-core.js"></script>\n  <script src="js/mpesa-mock.js"></script>\n  <script src="js/doc-viewer.js"></script>\n  <script src="js/track.js"></script>\n  <script src="js/main.js"></script>')
        page_head = head(title, desc)
        if name == "track":  # private per-client page: keep it out of search engines
            page_head = page_head.replace('  <meta name="description"', '  <meta name="robots" content="noindex, nofollow">\n  <meta name="description"', 1)
        html = page_head + header(active) + "\n" + body + FOOTER + page_tail
        (SITE / f"{name}.html").write_text(html, encoding="utf-8", newline="\n")
        print("wrote", f"{name}.html", len(html), "bytes")


if __name__ == "__main__":
    main()
