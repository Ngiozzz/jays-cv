// Jay CVS: jobs board (homepage "Latest jobs", Find a job page, single job page).
// Reads window.JOBS from jobs-data.js. Expired jobs are hidden automatically.
(() => {
  // Design preview: jobs posted in the admin mock are kept in this browser's storage.
  // (The real version will load jobs from the server.) Drafts are never shown publicly.
  const JOBS = (() => {
    try {
      const saved = localStorage.getItem('jaycvs-mock-jobs');
      if (saved) return JSON.parse(saved);
    } catch (e) { /* use the sample data */ }
    return window.JOBS || [];
  })().filter((j) => j.status !== 'draft');
  const WA = 'https://wa.me/254725912186';
  const DAY = 86400000;

  // ---------- helpers ----------
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = new Date(new Date().toDateString());
  const parse = (d) => new Date(`${d}T00:00:00`);
  const daysLeft = (job) => (job.deadline ? Math.round((parse(job.deadline) - today) / DAY) : null);
  const isOpen = (job) => job.deadline === null || daysLeft(job) >= 0;
  const fmtDate = (d) => parse(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const icon = (id) => `<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;

  const deadlineInfo = (job) => {
    const n = daysLeft(job);
    if (n === null) return { text: 'Open until filled', cls: '' };
    if (n < 0) return { text: `Closed ${fmtDate(job.deadline)}`, cls: 'closed' };
    if (n === 0) return { text: 'Closes today', cls: 'urgent' };
    if (n === 1) return { text: 'Closes tomorrow', cls: 'urgent' };
    if (n <= 3) return { text: `Closes in ${n} days`, cls: 'urgent' };
    return { text: `Closes ${fmtDate(job.deadline)}`, cls: '' };
  };
  const leftText = (job) => {
    const n = daysLeft(job);
    if (n === null) return 'Open until filled';
    if (n < 0) return 'Closed';
    return n === 0 ? 'Closes today' : n === 1 ? '1 day left' : `${n} days left`;
  };
  const postedText = (job) => {
    const n = Math.round((today - parse(job.posted)) / DAY);
    return n <= 0 ? 'Posted today' : n === 1 ? 'Posted yesterday' : `Posted ${n} days ago`;
  };
  const APPLY = {
    email: ['mail', 'Apply by email'],
    link: ['link', 'Apply online'],
    whatsapp: ['whatsapp', 'Apply via WhatsApp'],
    'in-person': ['pin', 'Apply in person'],
    other: ['doc', 'See how to apply'],
  };
  const initials = (name) =>
    name.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const hue = (name) => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const logo = (job) => `<div class="job-logo" style="--h:${hue(job.company)}" aria-hidden="true">${esc(initials(job.company))}</div>`;
  const jobUrl = (job) => `job.html?id=${encodeURIComponent(job.id)}`;

  const card = (job) => {
    const d = deadlineInfo(job);
    const [ai, al] = APPLY[job.apply.method] || APPLY.other;
    return `
      <article class="job-card">
        ${logo(job)}
        <div class="job-main">
          <h3><a href="${jobUrl(job)}">${esc(job.title)}</a></h3>
          <p class="job-company">${esc(job.company)}</p>
          <ul class="job-meta">
            <li>${icon('pin')}${esc(job.location)}</li>
            <li>${icon('briefcase')}${esc(job.type)}</li>
            ${job.salary ? `<li>${icon('cash')}${esc(job.salary)}</li>` : ''}
          </ul>
          <div class="job-tags"><span class="tag">${esc(job.category)}</span><span class="apply-tag">${icon(ai)}${al}</span></div>
        </div>
        <div class="job-side">
          <span class="deadline ${d.cls}">${icon('clock')}${d.text}</span>
          <span class="posted">${postedText(job)}</span>
        </div>
      </article>`;
  };

  const newest = (a, b) => parse(b.posted) - parse(a.posted);
  const closingFirst = (a, b) => (daysLeft(a) ?? 9999) - (daysLeft(b) ?? 9999);
  const open = JOBS.filter(isOpen);

  // ---------- Homepage: latest jobs ----------
  const latest = document.querySelector('[data-jobs-latest]');
  if (latest) {
    const n = Number(latest.dataset.jobsLatest) || 6;
    latest.innerHTML = open.slice().sort(newest).slice(0, n).map(card).join('');
    const count = document.querySelector('[data-jobs-count]');
    if (count) count.textContent = open.length;
  }

  // ---------- Find a job page ----------
  const results = document.getElementById('job-results');
  if (results) {
    const params = new URLSearchParams(location.search);
    const q = document.getElementById('job-q');
    const loc = document.getElementById('job-loc');
    const sort = document.getElementById('job-sort');
    const soon = document.getElementById('job-soon');
    const cats = document.querySelector('[data-job-cats]');
    const types = document.querySelector('[data-job-types]');
    const countEl = document.getElementById('job-count');
    const empty = document.getElementById('job-empty');
    let cat = params.get('cat') || '';

    // Options are built from the jobs themselves
    const places = [...new Set(open.flatMap((j) => j.location.split('(')[0].split(/&|,/).map((s) => s.trim())))]
      .filter((p) => p && !p.startsWith('['))
      .sort();
    loc.insertAdjacentHTML('beforeend', places.map((p) => `<option>${esc(p)}</option>`).join(''));
    const countBy = (key) => open.reduce((m, j) => ((m[j[key]] = (m[j[key]] || 0) + 1), m), {});
    const catCounts = countBy('category');
    cats.innerHTML =
      `<button type="button" class="filter-btn" data-cat="">All jobs <span>${open.length}</span></button>` +
      Object.keys(catCounts).sort().map((c) => `<button type="button" class="filter-btn" data-cat="${esc(c)}">${esc(c)} <span>${catCounts[c]}</span></button>`).join('');
    const typeCounts = countBy('type');
    types.innerHTML = Object.keys(typeCounts).sort().map((t) =>
      `<label class="check"><input type="checkbox" value="${esc(t)}"> ${esc(t)} <span>${typeCounts[t]}</span></label>`).join('');

    q.value = params.get('q') || '';
    loc.value = places.includes(params.get('loc')) ? params.get('loc') : '';

    const promo = `
      <aside class="job-promo">
        <div><strong>Found a job you like? Make sure your CV is ready.</strong>
        <p>Recruiters spend about 6 seconds on a CV. We'll write one that gets you shortlisted, in [48 hours].</p></div>
        <a class="btn btn-primary" href="services.html">Get my CV done</a>
      </aside>`;

    const render = () => {
      const term = q.value.trim().toLowerCase();
      const place = loc.value;
      const picked = [...types.querySelectorAll('input:checked')].map((i) => i.value);
      let list = open.filter((j) =>
        (!term || [j.title, j.company, j.category, j.location, j.summary].join(' ').toLowerCase().includes(term)) &&
        (!place || j.location.includes(place)) &&
        (!cat || j.category === cat) &&
        (!picked.length || picked.includes(j.type)) &&
        (!soon.checked || (daysLeft(j) !== null && daysLeft(j) <= 7))
      );
      list.sort(sort.value === 'closing' ? closingFirst : newest);

      const html = list.map(card);
      if (html.length > 3) html.splice(3, 0, promo);
      results.innerHTML = html.join('');
      countEl.textContent = `${list.length} ${list.length === 1 ? 'job' : 'jobs'} found`;
      empty.hidden = list.length > 0;
      cats.querySelectorAll('.filter-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));

      // Keep the address bar shareable, e.g. jobs.html?cat=Healthcare
      const next = new URLSearchParams();
      if (q.value.trim()) next.set('q', q.value.trim());
      if (place) next.set('loc', place);
      if (cat) next.set('cat', cat);
      history.replaceState(null, '', next.toString() ? `?${next}` : location.pathname);
    };

    document.getElementById('job-search').addEventListener('submit', (e) => { e.preventDefault(); render(); });
    q.addEventListener('input', render);
    [loc, sort, soon].forEach((el) => el.addEventListener('change', render));
    types.addEventListener('change', render);
    cats.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (b) { cat = b.dataset.cat; render(); }
    });
    document.getElementById('job-reset').addEventListener('click', () => {
      q.value = ''; loc.value = ''; cat = ''; soon.checked = false;
      types.querySelectorAll('input').forEach((i) => (i.checked = false));
      render();
    });
    render();
  }

  // ---------- Single job page ----------
  const detail = document.getElementById('job-detail');
  if (detail) {
    const job = JOBS.find((j) => j.id === new URLSearchParams(location.search).get('id'));
    if (!job) {
      detail.innerHTML = `<div class="job-missing"><h1>Job not found</h1><p>This advert may have been removed.</p><a class="btn btn-primary" href="jobs.html">Browse all jobs</a></div>`;
      return;
    }
    document.title = `${job.title} at ${job.company} | Jay CVS Jobs`;
    const crumb = document.querySelector('[data-job-crumb]');
    if (crumb) crumb.textContent = job.title;

    const d = deadlineInfo(job);
    const a = job.apply;
    const copy = (value) => `<button type="button" class="copy-btn" data-copy="${esc(value)}">${icon('copy')}<span>Copy</span></button>`;
    const attach = a.attach && a.attach.length
      ? `<div class="apply-row"><span>Attach</span><ul class="ticks">${a.attach.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
    const notes = a.notes ? `<p class="apply-notes">${icon('info')}${esc(a.notes)}</p>` : '';
    let how = '';
    if (a.method === 'email') {
      how = `
        <p>Send your application by email:</p>
        <div class="apply-row"><span>Send to</span><strong>${esc(a.email)}</strong>${copy(a.email)}</div>
        ${a.subject ? `<div class="apply-row"><span>Subject</span><strong>${esc(a.subject)}</strong>${copy(a.subject)}</div>` : ''}
        ${attach}${notes}
        <a class="btn btn-primary btn-block" href="mailto:${esc(a.email)}?subject=${encodeURIComponent(a.subject || job.title)}">${icon('mail')}Open in my email app</a>`;
    } else if (a.method === 'link') {
      how = `<p>Apply through the employer's online application page.</p>${notes}
        <a class="btn btn-primary btn-block" href="${esc(a.link)}" target="_blank" rel="noopener nofollow">${icon('link')}Apply on the employer's website</a>`;
    } else if (a.method === 'whatsapp') {
      how = `<p>Send your CV on WhatsApp:</p>
        <div class="apply-row"><span>Number</span><strong>${esc(a.phone)}</strong>${copy(a.phone)}</div>${notes}`;
    } else if (a.method === 'in-person') {
      how = `<p>Apply in person:</p>
        <div class="apply-row"><span>Where</span><strong>${esc(a.address)}</strong></div>
        ${a.when ? `<div class="apply-row"><span>When</span><strong>${esc(a.when)}</strong></div>` : ''}
        ${attach.replace('Attach', 'Bring')}${notes}`;
    } else {
      how = notes || '<p>See the original advert for how to apply.</p>';
    }

    const list = (title, items) => (items && items.length ? `<h2>${title}</h2><ul class="job-list">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '');
    const shareText = encodeURIComponent(`${job.title} at ${job.company}. Apply by ${job.deadline ? fmtDate(job.deadline) : 'soon'}: ${location.href}`);

    detail.innerHTML = `
      ${d.cls === 'closed' ? `<div class="job-closed">${icon('info')}This job has closed. <a href="jobs.html">See open jobs →</a></div>` : ''}
      <div class="job-layout">
        <article class="job-article">
          <header class="job-header card">
            ${logo(job)}
            <div>
              <span class="tag">${esc(job.category)}</span>
              <h1>${esc(job.title)}</h1>
              <p class="job-company">${esc(job.company)}</p>
            </div>
            <dl class="job-facts">
              <div><dt>${icon('pin')}Location</dt><dd>${esc(job.location)} · ${esc(job.workMode)}</dd></div>
              <div><dt>${icon('briefcase')}Job type</dt><dd>${esc(job.type)}</dd></div>
              <div><dt>${icon('clock')}Deadline</dt><dd class="deadline ${d.cls}">${job.deadline ? `${fmtDate(job.deadline)}<small>${leftText(job)}</small>` : d.text}</dd></div>
              ${job.salary ? `<div><dt>${icon('cash')}Salary</dt><dd>${esc(job.salary)}</dd></div>` : ''}
            </dl>
          </header>

          <div class="job-body card">
            <h2>About the role</h2>
            <p>${esc(job.summary)}</p>
            ${list('Responsibilities', job.responsibilities)}
            ${list('Requirements', job.requirements)}
          </div>

          <section class="apply-box card" id="how-to-apply">
            <h2>${icon((APPLY[a.method] || APPLY.other)[0])}How to apply</h2>
            ${how}
            <p class="apply-deadline">${icon('clock')}${job.deadline ? `Deadline: <strong>${fmtDate(job.deadline)}</strong> (${leftText(job).toLowerCase()})` : 'Open until filled. Apply early.'}</p>
          </section>

          ${job.poster ? `
          <section class="card job-poster">
            <h2>Original advert</h2>
            <img src="${esc(job.poster)}" alt="Original job advert poster for ${esc(job.title)} at ${esc(job.company)}" loading="lazy">
          </section>` : ''}

          <p class="job-source">Source: ${esc(job.source)} · ${postedText(job)}</p>
        </article>

        <aside class="job-aside">
          <div class="cv-cta">
            <span class="cv-cta-eyebrow">Before you apply</span>
            <h3>Is your CV ready for this job?</h3>
            <p>We'll tailor your CV to this role and have a draft ready in [48 hours], well before the deadline.</p>
            <a class="btn btn-light btn-block" href="${WA}?text=${encodeURIComponent(`Hi Jay CVS, I'd like my CV ready for the ${job.title} job at ${job.company}.`)}" target="_blank" rel="noopener">${icon('whatsapp')}Get my CV ready</a>
            <a class="cv-cta-link" href="pricing.html">See packages &amp; prices →</a>
          </div>
          <div class="card aside-card">
            <h3>Share this job</h3>
            <div class="share-row">
              <a class="btn btn-ghost btn-sm" href="https://wa.me/?text=${shareText}" target="_blank" rel="noopener">${icon('whatsapp')}WhatsApp</a>
              <button type="button" class="btn btn-ghost btn-sm" data-copy="${esc(location.href)}">${icon('copy')}<span>Copy link</span></button>
            </div>
          </div>
          <div class="card aside-card safety">
            <h3>${icon('shield')}Stay safe</h3>
            <p>Never pay anyone to get a job or an interview. Genuine employers don't charge application fees.</p>
            <a href="${WA}?text=${encodeURIComponent(`Hi Jay CVS, I'd like to report this job advert: ${job.title} at ${job.company}.`)}" target="_blank" rel="noopener">Report this advert</a>
          </div>
        </aside>
      </div>`;

    const similar = document.getElementById('similar-jobs');
    if (similar) {
      const others = open.filter((j) => j.id !== job.id).sort((x, y) => (y.category === job.category) - (x.category === job.category) || newest(x, y)).slice(0, 3);
      similar.innerHTML = others.map(card).join('');
    }
  }

  // Copy buttons (job page)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn || !navigator.clipboard) return;
    navigator.clipboard.writeText(btn.dataset.copy).then(() => {
      const label = btn.querySelector('span');
      if (!label) return;
      const old = label.textContent;
      label.textContent = 'Copied!';
      setTimeout(() => (label.textContent = old), 1500);
    });
  });
})();
