// Jay CVS: applies the owner's Website content (prices, contact details, homepage text, reviews, FAQs,
// announcement) to the page. DESIGN PREVIEW ONLY: in the real Next.js build the server renders these
// values directly into the page, so there is no flash or extra script.
(() => {
  const JC = window.JayContent;
  if (!JC) return;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (n) => Number(n || 0).toLocaleString('en-KE');
  const set = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
  const roundsText = (r) => (Number(r) >= 99 ? 'Unlimited (14 days)' : `${r} round${Number(r) === 1 ? '' : 's'}`);
  const ORIGINAL_WA = '254725912186';

  function apply() {
    const c = JC.get();
    const pk = c.packages;
    const s = c.settings;

    // ---------- Packages & prices ----------
    $$('[data-pkg-card]').forEach((card) => {
      const p = pk[card.dataset.pkgCard];
      if (!p) return;
      card.hidden = !p.visible;
      set(card.querySelector('[data-f="name"]'), p.name);
      set(card.querySelector('[data-f="best"]'), `For ${p.best.charAt(0).toLowerCase()}${p.best.slice(1)}.`);
      set(card.querySelector('[data-f="price"]'), num(p.price));
      const ul = card.querySelector('[data-f="features"]');
      if (ul) ul.innerHTML = p.features.map((f) => `<li>${esc(f)}</li>`).join('');
      card.classList.toggle('price-card-featured', !!p.popular);
      let ribbon = card.querySelector('.ribbon');
      if (p.popular && !ribbon) { ribbon = document.createElement('span'); ribbon.className = 'ribbon'; ribbon.textContent = 'Most popular'; card.prepend(ribbon); }
      if (ribbon) ribbon.hidden = !p.popular;
      const btn = card.querySelector('.btn');
      if (btn) { btn.classList.toggle('btn-primary', !!p.popular); btn.classList.toggle('btn-ghost', !p.popular); }
    });
    $$('[data-pkg-row]').forEach((row) => {
      const p = pk[row.dataset.pkgRow];
      if (!p) return;
      row.hidden = !p.visible;
      set(row.querySelector('[data-f="name"]'), p.name);
      set(row.querySelector('[data-f="best"]'), p.best);
      set(row.querySelector('[data-f="draft"]'), p.draft);
      set(row.querySelector('[data-f="rounds"]'), roundsText(p.rounds));
      set(row.querySelector('[data-f="price"]'), `KES ${num(p.price)}`);
      row.classList.toggle('row-featured', !!p.popular);
    });
    $$('[data-pkg-amount], [data-pkg-step], [data-pkg-price]').forEach((el) => {
      const i = el.dataset.pkgAmount ?? el.dataset.pkgStep ?? el.dataset.pkgPrice;
      const p = pk[i];
      if (!p) return;
      const nameEl = el.querySelector('[data-f="name"]');
      if (nameEl) set(nameEl, p.name);
      const bestEl = el.querySelector('[data-f="best"]');
      if (bestEl) set(bestEl, p.best);
      const priceEl = el.querySelector('[data-f="price"]') || el;
      set(priceEl, `KES ${num(p.price)}`);
    });
    // Order card options (what the client picks, and what the order + checkout will charge)
    $$('.order-card input[name="item"]').forEach((input) => {
      const opt = input.closest('.opt');
      const isPkg = input.value.startsWith('pkg-');
      const item = isPkg ? pk[Number(input.value.split('-')[1])] : c.services.find((x) => x.name === input.dataset.pkg);
      if (!item) return;
      input.dataset.price = num(item.price);
      if (isPkg) input.dataset.name = `${item.name} package`;
      opt.hidden = !item.visible;
      set(opt.querySelector('.opt-price'), `KES ${num(item.price)}`);
      if (isPkg) {
        set(opt.querySelector('.opt-body strong'), item.name);
        set(opt.querySelector('.opt-body small'), `${item.best} · draft in ${item.draft}`);
      }
    });
    const active = document.querySelector('.order-card input[name="item"]:checked');
    if (active) {
      $$('.order-card [data-out="price"]').forEach((el) => set(el, active.dataset.price));
      $$('.order-card [data-out="name"]').forEach((el) => set(el, active.dataset.name));
    }
    // Single services price list (Pricing page)
    $$('.price-list .price-row').forEach((row) => {
      const sv = c.services.find((x) => x.name === row.querySelector('strong')?.textContent.trim());
      if (!sv) return;
      row.hidden = !sv.visible;
      set(row.querySelector('small'), sv.note);
      set(row.querySelector('.amount'), `KES ${num(sv.price)}`);
    });
    const visibleServices = c.services.filter((x) => x.visible);
    const minService = visibleServices.length ? Math.min(...visibleServices.map((x) => Number(x.price))) : 0;
    $$('[data-c="singles-from"]').forEach((el) => set(el, `from KES ${num(minService)}`));
    // "From KES …" on the Services page
    const FROM = { 'cv-writing': () => Math.min(...pk.filter((p) => p.visible).map((p) => Number(p.price))), 'cover-letters': 'Cover letter', linkedin: 'LinkedIn profile revamp', 'career-coaching': 'Career coaching session', 'job-applications': 'Job application support' };
    Object.entries(FROM).forEach(([id, src]) => {
      const el = document.querySelector(`#${id} .service-meta strong a, #${id} .service-meta strong`);
      if (!el) return;
      const v = typeof src === 'function' ? src() : (c.services.find((x) => x.name === src) || {}).price;
      if (v !== undefined && Number.isFinite(Number(v))) set(el, `KES ${num(v)}${id === 'career-coaching' ? ' / session' : id === 'job-applications' ? ' / application' : ''}`);
    });

    // ---------- Business settings: contact details used everywhere ----------
    const wa = JC.waDigits(s.whatsapp);
    $$('a[href*="wa.me/"]').forEach((a) => {
      const h = a.getAttribute('href');
      const fixed = h.replace(/wa\.me\/(\d{9,15})/, (m, d) => (d === ORIGINAL_WA || a.dataset.waOwner ? (a.dataset.waOwner = '1', `wa.me/${wa}`) : m));
      if (fixed !== h) a.setAttribute('href', fixed);
    });
    $$('a[href^="tel:"]').forEach((a) => {
      if (!a.closest('.contact-list, .hero-ctas, .site-footer')) return;
      a.setAttribute('href', `tel:+${wa}`);
      if (/\d{3}/.test(a.textContent)) set(a, `(+254) ${wa.slice(3, 6)} ${wa.slice(6, 9)} ${wa.slice(9)}`);
    });
    $$('a[href^="mailto:info@"], a[data-c="email"]').forEach((a) => { a.dataset.c = 'email'; a.setAttribute('href', `mailto:${s.email}`); if (a.textContent.includes('@')) set(a, s.email); });
    $$('[data-c="address"]').forEach((el) => set(el, s.address));
    $$('[data-c="paybill"]').forEach((el) => set(el, s.paybill || '4027127'));
    $$('[data-c="channel"]').forEach((a) => {
      if (s.channelLink) a.setAttribute('href', s.channelLink);
      else a.setAttribute('href', '#');
    });
    ['linkedin', 'facebook', 'instagram', 'x'].forEach((k) => $$(`[data-social="${k}"]`).forEach((a) => { a.setAttribute('href', s[k] || '#'); a.hidden = !s[k] && a.closest('.socials')?.dataset.hideEmpty === '1'; }));

    // ---------- Homepage ----------
    const h = c.home;
    const hl = document.querySelector('[data-c="headline"]');
    if (hl) hl.innerHTML = `${esc(h.headline)} <span class="highlight">${esc(h.highlight)}</span>`;
    set(document.querySelector('[data-c="lead"]'), h.lead);
    $$('[data-c="stat"]').forEach((el, i) => {
      if (!h.stats[i]) return;
      set(el.querySelector('strong'), h.stats[i].value);
      set(el.querySelector('span'), h.stats[i].label);
    });
    // Announcement bar across the top of every page
    let bar = document.getElementById('announce');
    if (h.announcement && h.announcement.on && h.announcement.text) {
      if (!bar) { bar = document.createElement('div'); bar.id = 'announce'; bar.className = 'announce-bar'; document.body.prepend(bar); }
      bar.innerHTML = `<span>📣 ${esc(h.announcement.text)}</span>${h.announcement.link ? ` <a href="${esc(h.announcement.link)}">Learn more →</a>` : ''}`;
    } else if (bar) bar.remove();

    // ---------- Reviews (approved + featured) ----------
    const featured = c.reviews.filter((r) => r.status === 'approved' && r.featured && r.consent).slice(0, 3);
    $$('[data-c="reviews"]').forEach((grid) => {
      if (!featured.length) return;
      grid.innerHTML = featured.map((r) => `
        <blockquote class="card testimonial">
          <p class="stars" aria-label="${r.rating} out of 5 stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</p>
          <p>"${esc(r.text)}"</p>
          <footer>
            <div class="avatar" aria-hidden="true">${esc(r.name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '★')}</div>
            <div><strong>${esc(r.name)}</strong><span>${esc(r.role)}</span></div>
          </footer>
        </blockquote>`).join('');
    });

    // ---------- Homepage FAQs ----------
    $$('[data-c="faqs"]').forEach((list) => {
      list.innerHTML = c.faqs.filter((f) => f.visible).map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('');
    });

    // ---------- Sample CV captions (Samples page + homepage) ----------
    $$('[data-sample]').forEach((fig) => {
      const sm = c.samples.find((x) => x.slug === fig.dataset.sample);
      if (!sm) return;
      fig.hidden = !sm.published;
      const cap = fig.querySelector('figcaption');
      if (cap) cap.innerHTML = `${fig.querySelector('.sample-tag') ? `<span class="sample-tag">${esc(sm.tag)}</span><br>` : ''}<strong>${esc(sm.role)}</strong> · ${esc(sm.caption)}`;
    });
  }

  apply();
  JC.onChange(apply); // the owner saved in the admin (another tab) → update this page straight away
  window.JayContentApply = apply;
})();
