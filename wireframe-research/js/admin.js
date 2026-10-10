// Jay CVS admin: DESIGN PREVIEW.
// There is no server yet: jobs are kept in this browser's localStorage (key below),
// starting from the sample data in jobs-data.js. The public jobs pages read the same key,
// so a job "published" here shows up on jobs.html in the same browser.
(() => {
  const KEY = 'jaycvs-mock-jobs';
  const SITE = 'https://www.jaycvs.co.ke';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id) => `<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const page = document.body.dataset.page;
  let withAs = (url) => url; // set below: keeps a flow-demo pane signed in as the same person

  // ---------- dates ----------
  const DAY = 86400000;
  const today = new Date(new Date().toDateString());
  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (d) => new Date(`${d}T00:00:00`);
  const daysLeft = (j) => (j.deadline ? Math.round((parse(j.deadline) - today) / DAY) : null);
  const fmt = (d) => parse(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const statusOf = (j) => (j.status === 'draft' ? 'draft' : j.deadline && daysLeft(j) < 0 ? 'expired' : 'published');
  const STATUS_LABEL = { published: 'Published', draft: 'Draft', expired: 'Expired' };
  const deadlineText = (j) => {
    const n = daysLeft(j);
    if (n === null) return { text: 'Open until filled', cls: '' };
    if (n < 0) return { text: `Closed ${fmt(j.deadline)}`, cls: 'closed' };
    if (n <= 3) return { text: n === 0 ? 'Closes today' : n === 1 ? 'Closes tomorrow' : `Closes in ${n} days`, cls: 'urgent' };
    return { text: `Closes ${fmt(j.deadline)}`, cls: '' };
  };
  const postedAgo = (j) => {
    const n = Math.round((today - parse(j.posted)) / DAY);
    return n <= 0 ? 'Today' : n === 1 ? 'Yesterday' : `${n} days ago`;
  };

  // ---------- Breadcrumb: starts at a sidebar section and adds a level each step deeper (kept per browser tab) ----------
  const crumbs = (() => {
    const none = { leaf() {} };
    if (page === 'login' || page === 'flow' || new URLSearchParams(location.search).has('embed')) return none;
    const KEY = 'jaycvs-admin-path';
    const ROOT_FLAG = 'jaycvs-admin-root';
    const file = (u) => u.split('?')[0];
    const here = () => location.pathname.split('/').pop() + location.search;
    const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || []; } catch (e) { return []; } };
    const write = (t) => { try { sessionStorage.setItem(KEY, JSON.stringify(t.slice(-5))); } catch (e) { /* ignore */ } };
    const SECTIONS = { 'index.html': 'Dashboard', 'jobs.html': 'Jobs', 'inbox.html': 'Jobs inbox', 'post-job.html': 'Post a job', 'orders.html': 'Orders', 'team.html': 'Team', 'finance.html': 'Finance', 'content.html': 'Website content' };
    // Pages that live inside a section (opened directly, they still show their parent)
    const PARENT = { 'order.html': 'orders.html' };
    const QUICK = { action: 'Need action', writing: 'Being written', due24: 'Due within 24h', paid: 'Paid this month' };
    const TAB = { packages: 'Packages & prices', reviews: 'Reviews', samples: 'Sample CVs', posts: 'Career tips', faqs: 'FAQs', home: 'Homepage', settings: 'Business settings' };
    let leafLabel = '';

    // The level(s) one address adds: a section, then its filter / tab / item
    const levels = (url) => {
      const f = file(url);
      const p = new URLSearchParams(url.split('?')[1] || '');
      if (f === 'orders.html') {
        const bits = [];
        if (p.get('quick')) bits.push(QUICK[p.get('quick')]);
        ['status', 'pkg', 'writer', 'pay', 'due', 'placed'].forEach((k) => p.get(k) && bits.push(k === 'status' && p.get(k) === 'paid' ? 'Not accepted' : String(p.get(k)).split(' (')[0]));
        if (p.get('q')) bits.push(`"${p.get('q')}"`);
        return bits.length ? [{ label: 'Orders', href: 'orders.html' }, { label: bits.join(', '), href: url }] : [{ label: 'Orders', href: url }];
      }
      if (f === 'content.html') return [{ label: 'Website content', href: 'content.html' }, { label: TAB[p.get('tab') || 'packages'], href: url }];
      if (f === 'order.html') return [{ label: p.get('id') || 'Order', href: url }];
      if (f === 'inbox.html') return [{ label: 'Jobs inbox', href: 'inbox.html' }, { label: { check: 'To check', flagged: 'Flagged', reading: 'Reading', approved: 'Approved today', discarded: 'Discarded' }[p.get('show') || 'check'], href: `inbox.html?show=${p.get('show') || 'check'}` }];
      if (f === 'post-job.html' && p.get('id')) return [{ label: 'Edit job', href: url }];
      return [{ label: SECTIONS[f] || f, href: url }];
    };

    // Work out the path for this page
    let path = read();
    let fromSidebar = false;
    try { fromSidebar = sessionStorage.getItem(ROOT_FLAG) === '1'; sessionStorage.removeItem(ROOT_FLAG); } catch (e) { /* ignore */ }
    const at = path.findIndex((u) => file(u) === file(here()));
    if (fromSidebar || !path.length) path = [here()];                    // a sidebar click starts again at that section
    else if (at >= 0) path = path.slice(0, at).concat(here());          // going back up: drop the deeper levels
    else path.push(here());                                             // going deeper: add a level
    if (PARENT[file(path[0])]) path.unshift(PARENT[file(path[0])]);     // e.g. an order opened from a link still sits under Orders
    write(path);

    const render = () => {
      const nav = $('#crumbs');
      if (!nav) return;
      const flat = [];
      path.forEach((u) => levels(u).forEach((l) => { if (!flat.length || flat[flat.length - 1].label !== l.label) flat.push({ ...l }); }));
      if (leafLabel) flat[flat.length - 1].label = leafLabel;
      nav.innerHTML = `<ol>${flat.map((l, i) => (i === flat.length - 1
        ? `<li><span aria-current="page">${esc(l.label)}</span></li>`
        : `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`)).join('')}</ol>`;
      nav.hidden = false;
      const old = $('#page-crumb');
      if (old) old.hidden = true;
      // The order page's "All orders" button returns to the filtered list in the path
      const allBtn = $('.admin-top-actions a[href^="orders.html"]');
      const list = path.slice().reverse().find((u) => file(u) === 'orders.html');
      if (allBtn && list && list !== 'orders.html') { allBtn.href = list; allBtn.textContent = '← Filtered orders'; }
    };

    // Filters and tabs change the address without reloading: keep the current level in step
    const replace = history.replaceState.bind(history);
    history.replaceState = (...args) => {
      replace(...args);
      path[path.length - 1] = here();
      write(path);
      render();
    };
    // Sidebar and logo start a fresh path
    document.addEventListener('click', (e) => {
      if (e.target.closest('.side-nav a, .admin-logo')) { try { sessionStorage.setItem(ROOT_FLAG, '1'); } catch (err) { /* ignore */ } }
    });
    render();
    // Pages can name their own last level once their data has loaded (e.g. "JC-1046 · Grace Wanjiru")
    return { leaf(label) { leafLabel = label; render(); } };
  })();

  // ---------- store ----------
  const DEMO_VIEWS = [412, 389, 256, 198, 301, 144, 97, 233, 120, 540];
  const store = {
    load() {
      try {
        const saved = localStorage.getItem(KEY);
        if (saved) return JSON.parse(saved);
      } catch (e) { /* fall through to sample data */ }
      return (window.JOBS || []).map((j, i) => ({ status: 'published', views: DEMO_VIEWS[i % DEMO_VIEWS.length], ...j }));
    },
    save(list) {
      try {
        localStorage.setItem(KEY, JSON.stringify(list));
        return true;
      } catch (e) {
        toast('Could not save: this browser\'s storage is full', true);
        return false;
      }
    },
    reset() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } },
  };
  let jobs = store.load();
  // Jobs inbox (posters waiting to be checked), shared by the inbox page and the sidebar badge
  const inbox = {
    load() { try { return JSON.parse(localStorage.getItem('jaycvs-mock-inbox')) || []; } catch (e) { return []; } },
    save(list) {
      try { localStorage.setItem('jaycvs-mock-inbox', JSON.stringify(list)); return true; } catch (e) { toast('Could not save: the browser storage is full', true); return false; }
    },
  };
  const updateInboxBadge = () => {
    const b = $('[data-inbox-badge]');
    if (!b) return;
    const n = inbox.load().filter((it) => it.state === 'check' || it.state === 'reading').length;
    b.textContent = n;
    b.hidden = !n;
  };
  updateInboxBadge();
  const findJob = (id) => jobs.find((j) => j.id === id);

  // ---------- shared UI ----------
  const initials = (name) =>
    String(name || '?').replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  const hue = (name) => [...String(name || '')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const logo = (j) => `<div class="job-logo" style="--h:${hue(j.company)}" aria-hidden="true">${esc(initials(j.company))}</div>`;
  const statusPill = (j) => `<span class="status status-${statusOf(j)}">${STATUS_LABEL[statusOf(j)]}</span>`;

  let toastTimer;
  function toast(msg, isError) {
    let el = $('#toast');
    if (!el) return;
    el.innerHTML = `${icon(isError ? 'info' : 'check')}<span>${esc(msg)}</span>`;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 2600);
  }

  // Confirmation dialog (no browser alert/confirm popups)
  function confirmBox({ title, text, ok = 'Delete', danger = true }) {
    return new Promise((resolve) => {
      const d = document.createElement('dialog');
      d.className = 'admin-dialog';
      d.innerHTML = `<div class="dialog-body">
        <div class="dialog-icon ${danger ? 'danger' : ''}">${icon(danger ? 'trash' : 'info')}</div>
        <h2>${esc(title)}</h2><p>${esc(text)}</p>
        <div class="dialog-actions"><button type="button" class="btn btn-ghost" data-r="0">Cancel</button>
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-r="1">${esc(ok)}</button></div></div>`;
      document.body.append(d);
      d.addEventListener('click', (e) => {
        const b = e.target.closest('[data-r]');
        if (b || e.target === d) { d.close(); resolve(b ? b.dataset.r === '1' : false); }
      });
      d.addEventListener('close', () => d.remove());
      d.showModal();
    });
  }

  // Sidebar: mobile toggle, job count, demo reset
  const side = $('#admin-side');
  $('.side-toggle')?.addEventListener('click', () => side.classList.toggle('open'));
  const countBadge = $('[data-jobs-badge]');
  if (countBadge) countBadge.textContent = jobs.filter((j) => statusOf(j) === 'published').length;
  $('#reset-demo')?.addEventListener('click', async () => {
    const ok = await confirmBox({ title: 'Reset demo data?', text: 'All jobs, orders, AI usage and website content changed in this preview will go back to the original sample data.', ok: 'Reset', danger: true });
    if (!ok) return;
    store.reset();
    try { ['jaycvs-mock-orders', 'jaycvs-mock-ai-tokens', 'jaycvs-mock-content', 'jaycvs-mock-inbox', 'jaycvs-mock-team'].forEach((k) => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
    location.reload();
  });

  // WhatsApp channel post text
  function waText(j) {
    const a = j.apply || {};
    const lines = [`🔥 *${j.title.toUpperCase()}*`, `🏢 ${j.company}`, `📍 ${j.location}${j.type ? ` · ${j.type}` : ''}`];
    if (j.salary) lines.push(`💰 ${j.salary}`);
    lines.push(`⏳ Deadline: ${j.deadline ? fmt(j.deadline) : 'Open until filled'}`);
    const attach = a.attach && a.attach.length ? a.attach.join(' & ') : 'your CV';
    if (a.method === 'email') lines.push(`📧 Apply: send ${attach} to ${a.email}${a.subject ? ` (Subject: ${a.subject})` : ''}`);
    if (a.method === 'link') lines.push(`🔗 Apply online: ${a.link}`);
    if (a.method === 'whatsapp') lines.push(`📱 Send your CV on WhatsApp: ${a.phone}`);
    if (a.method === 'in-person') lines.push(`📌 Apply in person: ${a.address}${a.when ? `, ${a.when}` : ''}`);
    lines.push('', `👉 Full details: ${SITE}/job.html?id=${j.id}`, '', `✍🏾 Is your CV ready? Get one that gets you shortlisted: ${SITE}/services.html`);
    return lines.join('\n');
  }

  // =====================================================================
  // Sign in (mock)
  // =====================================================================
  if (page === 'login') {
    $('#login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      location.href = 'index.html';
    });
    $('.pw-toggle').addEventListener('click', (e) => {
      const input = $('#pw');
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      e.currentTarget.textContent = show ? 'Hide' : 'Show';
    });
  }

  // =====================================================================
  // Dashboard
  // =====================================================================
  if (page === 'dashboard') {
    const by = (s) => jobs.filter((j) => statusOf(j) === s);
    const published = by('published');
    const soon = published.filter((j) => daysLeft(j) !== null && daysLeft(j) <= 7).sort((a, b) => daysLeft(a) - daysLeft(b));
    $('#stat-published').textContent = published.length;
    $('#stat-soon').textContent = soon.length;
    $('#stat-drafts').textContent = by('draft').length;
    $('#stat-expired').textContent = by('expired').length;

    const h = new Date().getHours();
    $('#greeting').textContent = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

    const row = (j, right) => `<li>${logo(j)}<div class="mini-main"><a href="post-job.html?id=${encodeURIComponent(j.id)}">${esc(j.title)}</a><small>${esc(j.company)} · ${esc(j.location)}</small></div>${right}</li>`;
    $('#closing-list').innerHTML = soon.length
      ? soon.slice(0, 5).map((j) => { const d = deadlineText(j); return row(j, `<span class="deadline ${d.cls}">${d.text}</span>`); }).join('')
      : '<li class="empty-note">No published jobs close in the next 7 days.</li>';
    const recent = jobs.slice().sort((a, b) => parse(b.posted) - parse(a.posted)).slice(0, 5);
    $('#recent-list').innerHTML = recent.map((j) => row(j, statusPill(j))).join('');
  }

  // =====================================================================
  // Jobs list
  // =====================================================================
  if (page === 'jobs') {
    let tab = new URLSearchParams(location.search).get('status') || 'all';
    const q = $('#jobs-q');
    const tbody = $('#jobs-body');

    const render = () => {
      const counts = { all: jobs.length, published: 0, draft: 0, expired: 0 };
      jobs.forEach((j) => counts[statusOf(j)]++);
      $$('.tabs button').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.tab === tab));
        b.querySelector('span').textContent = counts[b.dataset.tab];
      });
      const term = q.value.trim().toLowerCase();
      const list = jobs
        .filter((j) => tab === 'all' || statusOf(j) === tab)
        .filter((j) => !term || `${j.title} ${j.company} ${j.location} ${j.category}`.toLowerCase().includes(term))
        .sort((a, b) => parse(b.posted) - parse(a.posted));

      tbody.innerHTML = list.length ? list.map((j) => {
        const d = deadlineText(j);
        const st = statusOf(j);
        const toggle = st === 'draft'
          ? `<button type="button" class="icon-btn" data-act="publish" data-id="${esc(j.id)}" title="Publish">${icon('upload')}</button>`
          : `<button type="button" class="icon-btn" data-act="unpublish" data-id="${esc(j.id)}" title="Move to drafts">${icon('eye-off')}</button>`;
        return `<tr>
          <td><div class="cell-job">${logo(j)}<div><a href="post-job.html?id=${encodeURIComponent(j.id)}">${esc(j.title)}</a><small>${esc(j.company)} · ${esc(j.location)}</small></div></div></td>
          <td class="cell-muted col-cat">${esc(j.category)}</td>
          <td><span class="deadline ${d.cls}">${d.text}</span></td>
          <td>${statusPill(j)}</td>
          <td class="cell-muted">${postedAgo(j)}</td>
          <td class="cell-muted">${j.views ?? 0}</td>
          <td><div class="cell-actions">
            <a class="icon-btn" href="post-job.html?id=${encodeURIComponent(j.id)}" title="Edit">${icon('edit')}</a>
            <a class="icon-btn" href="../job.html?id=${encodeURIComponent(j.id)}" target="_blank" rel="noopener" title="View on website">${icon('eye')}</a>
            ${toggle}
            <button type="button" class="icon-btn danger" data-act="delete" data-id="${esc(j.id)}" title="Delete">${icon('trash')}</button>
          </div></td></tr>`;
      }).join('') : `<tr><td colspan="7" class="table-empty">No jobs here yet. <a href="post-job.html">Post a job</a></td></tr>`;
    };

    $('.tabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]');
      if (b) { tab = b.dataset.tab; render(); }
    });
    q.addEventListener('input', render);
    tbody.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const j = findJob(b.dataset.id);
      if (!j) return;
      if (b.dataset.act === 'delete') {
        const ok = await confirmBox({ title: 'Delete this job?', text: `"${j.title}" at ${j.company} will be removed from the website. This can't be undone.` });
        if (!ok) return;
        jobs = jobs.filter((x) => x !== j);
        toast('Job deleted');
      } else if (b.dataset.act === 'publish') {
        j.status = 'published';
        toast(statusOf(j) === 'expired' ? 'Published, but the deadline has passed so it stays hidden' : 'Job published');
      } else {
        j.status = 'draft';
        toast('Moved to drafts: hidden from the website');
      }
      store.save(jobs);
      render();
    });
    render();
  }

  // =====================================================================
  // Post / edit a job
  // =====================================================================
  if (page === 'post-job') {
    const form = $('#job-form');
    const editId = new URLSearchParams(location.search).get('id');
    let editing = editId ? findJob(editId) : null;
    let poster = editing ? editing.poster : null;
    const f = (name) => form.elements[name];

    $('#page-title').textContent = editing ? 'Edit job' : 'Post a job';
    if (editing) crumbs.leaf(`Edit: ${editing.title}`);
    if (editing) {
      $('#delete-job').hidden = false;
      $('#view-live').hidden = statusOf(editing) !== 'published';
      $('#view-live').href = `../job.html?id=${encodeURIComponent(editing.id)}`;
    }

    // ----- fill the form from a job object -----
    const lines = (arr) => (arr || []).join('\n');
    function fill(j, markAi) {
      const set = (name, value) => {
        const el = f(name);
        if (!el) return;
        el.value = value ?? '';
        if (markAi && value) el.classList.add('ai-filled');
      };
      set('title', j.title); set('company', j.company); set('location', j.location);
      set('category', j.category); set('type', j.type); set('workMode', j.workMode); set('salary', j.salary);
      set('summary', j.summary); set('responsibilities', lines(j.responsibilities)); set('requirements', lines(j.requirements));
      f('openEnded').checked = !j.deadline;
      set('deadline', j.deadline || '');
      f('deadline').disabled = !j.deadline;
      const a = j.apply || { method: 'email' };
      $$('input[name="method"]').forEach((r) => (r.checked = r.value === a.method));
      set('email', a.email); set('subject', a.subject); set('link', a.link); set('phone', a.phone);
      set('address', a.address); set('when', a.when); set('notes', a.notes);
      $$('input[name="attach"]').forEach((c) => (c.checked = (a.attach || []).includes(c.value)));
      set('source', j.source);
      showMethod();
    }

    // ----- read the form into a job object -----
    const splitLines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);
    function read() {
      const v = (name) => (f(name)?.value || '').trim();
      const method = ($('input[name="method"]:checked') || {}).value || 'email';
      const apply = { method, notes: v('notes') };
      if (method === 'email') Object.assign(apply, { email: v('email'), subject: v('subject') });
      if (method === 'link') apply.link = v('link');
      if (method === 'whatsapp') apply.phone = v('phone');
      if (method === 'in-person') Object.assign(apply, { address: v('address'), when: v('when') });
      if (method === 'email' || method === 'in-person') apply.attach = $$('input[name="attach"]:checked').map((c) => c.value);
      return {
        ...(editing || {}),
        title: v('title'), company: v('company'), location: v('location'),
        category: v('category'), type: v('type'), workMode: v('workMode'), salary: v('salary') || null,
        summary: v('summary'), responsibilities: splitLines(v('responsibilities')), requirements: splitLines(v('requirements')),
        deadline: f('openEnded').checked ? null : v('deadline') || null,
        apply, poster, source: v('source') || 'Shared on the Jay CVS Job Vacancies channel',
        posted: editing ? editing.posted : isoDate(today),
      };
    }

    // ----- apply method: only show the fields that method needs -----
    function showMethod() {
      const m = ($('input[name="method"]:checked') || {}).value;
      $$('[data-for]').forEach((el) => (el.hidden = !el.dataset.for.split(' ').includes(m)));
    }
    form.addEventListener('change', (e) => {
      if (e.target.name === 'method') showMethod();
      if (e.target.name === 'openEnded') {
        f('deadline').disabled = e.target.checked;
        if (e.target.checked) f('deadline').value = '';
      }
    });

    // ----- live preview + checklist -----
    const card = (j) => {
      const d = deadlineText(j);
      return `<article class="job-card">${logo(j)}<div class="job-main">
        <h3><a>${esc(j.title || 'Job title')}</a></h3><p class="job-company">${esc(j.company || 'Company')}</p>
        <ul class="job-meta"><li>${icon('pin')}${esc(j.location || 'Location')}</li><li>${icon('briefcase')}${esc(j.type)}</li></ul>
        <div class="job-tags"><span class="tag">${esc(j.category)}</span><span class="deadline ${d.cls}">${icon('clock')}${d.text}</span></div>
      </div></article>`;
    };
    const applyReady = (a) =>
      (a.method === 'email' && a.email) || (a.method === 'link' && a.link) || (a.method === 'whatsapp' && a.phone) ||
      (a.method === 'in-person' && a.address) || (a.method === 'other' && a.notes);
    function update() {
      const j = read();
      $('#preview').innerHTML = card(j);
      const checks = {
        'chk-basics': j.title && j.company && j.location,
        'chk-details': j.summary || j.responsibilities.length || j.requirements.length,
        'chk-deadline': j.deadline || f('openEnded').checked,
        'chk-apply': applyReady(j.apply),
        'chk-poster': !!poster,
      };
      Object.entries(checks).forEach(([id, ok]) => $(`#${id}`).classList.toggle('ok', !!ok));
      $('#publish-status').innerHTML = editing ? statusPill(editing) : '<span class="status status-draft">New</span>';
    }
    form.addEventListener('input', (e) => { e.target.classList.remove('ai-filled'); clearError(e.target); update(); });
    form.addEventListener('change', update);

    // ----- poster upload -----
    const zone = $('#dropzone');
    const loaded = $('#poster-loaded');
    function showPoster(srcPath) {
      poster = srcPath;
      const url = srcPath.startsWith('data:') || srcPath.startsWith('http') ? srcPath : `../${srcPath}`;
      $('#poster-img').src = url;
      zone.hidden = true;
      $('#sample-hint').hidden = true;
      loaded.hidden = false;
      $('#ai-result').hidden = true;
      update();
    }
    function readFile(file) {
      if (!file || !file.type.startsWith('image/')) { toast('Please choose an image file (JPG or PNG)', true); return; }
      // Shrink the image so the preview fits in browser storage
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 900 / img.width);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        showPoster(c.toDataURL('image/jpeg', 0.82));
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    }
    $('#poster-input').addEventListener('change', (e) => readFile(e.target.files[0]));
    ['dragenter', 'dragover'].forEach((t) => zone.addEventListener(t, (e) => { e.preventDefault(); zone.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach((t) => zone.addEventListener(t, (e) => { e.preventDefault(); zone.classList.remove('drag'); }));
    zone.addEventListener('drop', (e) => readFile(e.dataTransfer.files[0]));
    $('#use-sample').addEventListener('click', () => showPoster('img/jobs/kilimall-it-specialist.jpeg'));
    $('#remove-poster').addEventListener('click', () => {
      poster = null;
      zone.hidden = false;
      $('#sample-hint').hidden = false;
      loaded.hidden = true;
      $('#poster-input').value = '';
      update();
    });

    // "Read poster": simulated in this preview (fills in the Kilimall sample)
    $('#read-poster').addEventListener('click', () => {
      if (aiLeft() < POSTER_TOKENS) { outOfTokens(); return; }
      const btn = $('#read-poster');
      const thumb = $('.poster-thumb');
      btn.disabled = true;
      btn.lastChild.textContent = ' Reading poster…';
      thumb.classList.add('scanning');
      setTimeout(() => {
        thumb.classList.remove('scanning');
        btn.disabled = false;
        btn.lastChild.textContent = ' Read poster again';
        logAi('Poster reading', 1650, 475);
        const sample = (window.JOBS || []).find((j) => j.id === 'kilimall-it-specialist');
        if (sample) fill({ ...sample, source: 'Kilimall hiring poster' }, true);
        $('#ai-result').hidden = false;
        update();
      }, 1600);
    });

    // ----- validation -----
    function clearError(el) {
      const wrap = el.closest('.f');
      if (!wrap) return;
      wrap.classList.remove('invalid');
      wrap.querySelector('.field-error')?.remove();
    }
    function setError(name, msg) {
      const el = f(name);
      const wrap = el.closest('.f');
      wrap.classList.add('invalid');
      if (!wrap.querySelector('.field-error')) wrap.insertAdjacentHTML('beforeend', `<span class="field-error">${esc(msg)}</span>`);
      return el;
    }
    function validate(j) {
      $$('.f.invalid').forEach((w) => { w.classList.remove('invalid'); w.querySelector('.field-error')?.remove(); });
      const bad = [];
      if (!j.title) bad.push(setError('title', 'Add the job title'));
      if (!j.company) bad.push(setError('company', 'Add the company (or e.g. "Private hospital, Nairobi")'));
      if (!j.location) bad.push(setError('location', 'Add where the job is'));
      if (!j.deadline && !f('openEnded').checked) bad.push(setError('deadline', 'Pick the deadline, or tick "Open until filled"'));
      const a = j.apply;
      if (a.method === 'email' && !a.email) bad.push(setError('email', 'Add the email address to apply to'));
      if (a.method === 'link' && !a.link) bad.push(setError('link', 'Add the application link'));
      if (a.method === 'whatsapp' && !a.phone) bad.push(setError('phone', 'Add the phone number'));
      if (a.method === 'in-person' && !a.address) bad.push(setError('address', 'Add where to apply'));
      if (a.method === 'other' && !a.notes) bad.push(setError('notes', 'Explain how to apply'));
      if (bad.length) {
        bad[0].focus();
        bad[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        toast(`Please fix ${bad.length} ${bad.length === 1 ? 'field' : 'fields'} before publishing`, true);
      }
      return !bad.length;
    }

    // ----- save -----
    const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    function persist(j, status) {
      j.status = status;
      if (!editing) {
        let id = slug(`${j.company} ${j.title}`) || 'job';
        let n = 2;
        const base = id;
        while (findJob(id)) id = `${base}-${n++}`;
        j.id = id;
        j.views = 0;
        jobs.unshift(j);
      } else {
        const i = jobs.indexOf(editing);
        jobs[i] = j;
      }
      if (!store.save(jobs)) return false;
      editing = j;
      history.replaceState(null, '', `?id=${encodeURIComponent(j.id)}`);
      $('#page-title').textContent = 'Edit job';
      crumbs.leaf(`Edit: ${j.title}`);
      $('#delete-job').hidden = false;
      $('#view-live').hidden = statusOf(j) !== 'published';
      $('#view-live').href = `../job.html?id=${encodeURIComponent(j.id)}`;
      update();
      return true;
    }

    $('#save-draft').addEventListener('click', () => {
      const j = read();
      if (!j.title) { setError('title', 'Add at least a job title to save a draft').focus(); return; }
      if (persist(j, 'draft')) toast('Draft saved: not visible on the website yet');
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const j = read();
      if (!validate(j) || !persist(j, 'published')) return;
      const d = $('#published-dialog');
      $('#wa-text').value = waText(j);
      $('#published-view').href = `../job.html?id=${encodeURIComponent(j.id)}`;
      $('#published-note').textContent = statusOf(j) === 'expired'
        ? 'Note: the deadline has already passed, so this job is hidden from the website.'
        : `"${j.title}" is now live on the Find a job page.`;
      d.showModal();
    });
    $('#copy-wa').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      try { await navigator.clipboard.writeText($('#wa-text').value); }
      catch (err) { $('#wa-text').select(); }
      btn.lastChild.textContent = ' Copied!';
      setTimeout(() => (btn.lastChild.textContent = ' Copy for WhatsApp'), 1600);
    });
    $('#published-dialog').addEventListener('click', (e) => {
      if (e.target.closest('[data-close]') || e.target === e.currentTarget) e.currentTarget.close();
    });

    $('#delete-job').addEventListener('click', async () => {
      if (!editing) return;
      const ok = await confirmBox({ title: 'Delete this job?', text: `"${editing.title}" will be removed from the website. This can't be undone.` });
      if (!ok) return;
      jobs = jobs.filter((x) => x !== editing);
      store.save(jobs);
      location.href = 'jobs.html';
    });

    // ----- start -----
    if (editing) {
      fill(editing, false);
      if (poster) showPoster(poster);
    } else {
      fill({ type: 'Full-time', workMode: 'On-site', category: '', apply: { method: 'email', attach: ['CV', 'Cover letter'] } }, false);
    }
    update();
  }

  // =====================================================================
  // AI usage (demo counter, kept in this browser)
  // =====================================================================
  // ---------- AI tokens: Jay's balance from the developer (no money shown to Jay) ----------
  const AI_KEY = 'jaycvs-mock-ai-tokens';
  const aiGranted = () => (window.AI_TOKENS && window.AI_TOKENS.starter) || 1000000;
  const aiUsed = () => Object.values(aiUsage()).reduce((n, v) => n + v.inTokens + v.outTokens, 0);
  const aiLeft = () => Math.max(0, aiGranted() - aiUsed());
  const aiWarnPct = () => Number(window.JayContent && window.JayContent.get().settings.aiWarnPct) || (window.AI_TOKENS && window.AI_TOKENS.warnPct) || 20;
  const POSTER_TOKENS = 2030; // about one poster read
  const outOfTokens = () => toast(isOwner() ? 'Out of AI tokens. Ask your developer to add more.' : 'Out of AI tokens. Jay needs to top up.', true);
  function aiUsage() {
    try {
      const saved = localStorage.getItem(AI_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) { /* use seed */ }
    return JSON.parse(JSON.stringify(window.AI_USAGE_SEED || {}));
  }
  function logAi(feature, inTokens, outTokens) {
    const u = aiUsage();
    u[feature] = u[feature] || { runs: 0, inTokens: 0, outTokens: 0 };
    u[feature].runs += 1;
    u[feature].inTokens += inTokens;
    u[feature].outTokens += outTokens;
    try { localStorage.setItem(AI_KEY, JSON.stringify(u)); } catch (e) { /* ignore */ }
  }
  // AI money (rates, dollars) lives only on the developer's pages; Jay's admin works in tokens
  const fmtTokens = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n));

  // =====================================================================
  // Orders (rules live in orders-core.js, shared with the client tracking page)
  // =====================================================================
  const JO = window.JayOrders;
  if (!JO) return;
  let orders = JO.load();
  const oPill = (o) => `<span class="ostatus ${JO.STATUS[o.status].cls}">${JO.STATUS[o.status].team}</span>`;
  const needsAction = (o) => ['new', 'paid', 'revisions'].includes(o.status) || JO.due(o).cls === 'late';
  const isOpenOrder = (o) => o.status === 'paid' && !o.writer;
  const waiting = (o) => (o.paidAt ? JO.span(Date.now() - new Date(o.paidAt).getTime()) : '');
  const deadline = (o) => ({ paid: JO.firstDraftDue(o), writing: JO.firstDraftDue(o), revisions: JO.revisionDue(o) }[o.status] || Infinity);
  const ordersBadge = $('[data-orders-badge]');
  if (ordersBadge) ordersBadge.textContent = orders.filter(needsAction).length;
  // Who is signed in (preview: pick a team member; the real version uses staff logins with roles)
  const OWNER = 'Jay (owner)';
  const STAFF = [OWNER, ...(window.WRITERS || [])];
  // In the flow demo each pane can be signed in as a different person (?as=jay, ?as=grace)
  const AS = new URLSearchParams(location.search).get('as');
  const asUser = AS && STAFF.find((s) => s.toLowerCase().startsWith(AS.toLowerCase()));
  try { if (localStorage.getItem('jaycvs-mock-user') === 'Grace (senior writer)') localStorage.setItem('jaycvs-mock-user', 'Grace'); } catch (e) { /* ignore */ }
  const me = () => { if (asUser) return asUser; try { const v = localStorage.getItem('jaycvs-mock-user'); return STAFF.includes(v) ? v : OWNER; } catch (e) { return OWNER; } };
  const isOwner = () => me() === OWNER;
  const meMember = () => (window.JayTeam ? window.JayTeam.member(me()) : null);
  const canJobs = () => isOwner() || !!(meMember() && meMember().canJobs);
  // Sidebar and dashboard: the team and money are Jay's; job areas need the "Posts jobs" permission
  $$('[data-owner-only]').forEach((el) => { if (!isOwner()) el.remove(); });
  $$('[data-jobs-only]').forEach((el) => { if (!canJobs()) el.remove(); });
  const lockMsg = !isOwner() && ['team', 'finance'].includes(page) ? 'Only Jay can open this page. It holds the team and the business money.'
    : !canJobs() && ['jobs', 'inbox', 'post-job'].includes(page) ? 'Jay hasn\'t given you access to job posts. Ask him if you need it.' : '';
  const locked = !!lockMsg;
  // Money: what the business took in, paid out and kept (owner screens only)
  const rateOf = (w) => { const m = window.JayTeam && window.JayTeam.member(w); return m ? m.rate : 0; };
  const inPeriod = (iso, p) => {
    if (!iso) return false;
    const t = new Date(iso);
    if (p === 'all') return true;
    if (p === 'month') { const n = new Date(); return t.getMonth() === n.getMonth() && t.getFullYear() === n.getFullYear(); }
    return Date.now() - t.getTime() <= 30 * DAY;
  };
  const writerShare = (o) => (o.writer && o.writer !== OWNER ? Math.round((o.amount * rateOf(o.writer)) / 100) : 0);
  function finances(p) {
    orders = JO.load();
    const paid = orders.filter((o) => o.payment && o.payment.status === 'confirmed' && inPeriod(o.paidAt, p));
    const delivered = orders.filter((o) => o.status === 'delivered' && o.writer && inPeriod(o.deliveredAt, p));
    const takings = paid.reduce((n, o) => n + o.amount, 0);
    const fees = paid.reduce((n, o) => n + (o.payment.fee || 0), 0);
    const writerPay = delivered.reduce((n, o) => n + writerShare(o), 0);
    return { paid, delivered, takings, fees, writerPay, keep: takings - fees - writerPay };
  }
  // Writer pay owed overall: earned on delivered CVs minus payouts Jay recorded
  function owedByWriter() {
    const out = {};
    JO.load().filter((o) => o.status === 'delivered' && o.writer && o.writer !== OWNER).forEach((o) => {
      const w = shortName(o.writer);
      out[w] = out[w] || { earned: 0, paid: 0, owed: 0 };
      out[w].earned += writerShare(o);
    });
    (window.JayTeam ? window.JayTeam.payouts() : []).forEach((x) => { out[x.writer] = out[x.writer] || { earned: 0, paid: 0, owed: 0 }; out[x.writer].paid += x.amount; });
    Object.values(out).forEach((v) => { v.owed = Math.max(0, v.earned - v.paid); });
    return out;
  }
  const shortName = (n) => String(n || '').split(' (')[0];
  const meSelect = $('#me');
  if (meSelect) {
    meSelect.innerHTML = STAFF.map((s) => `<option${s === me() ? ' selected' : ''}>${esc(s)}</option>`).join('');
    meSelect.addEventListener('change', () => {
      try { localStorage.setItem('jaycvs-mock-user', meSelect.value); } catch (e) { /* ignore */ }
      toast(`Signed in as ${shortName(meSelect.value)}`);
      setTimeout(() => location.reload(), 400);
    });
    const av = $('[data-me-initials]');
    if (av) av.textContent = shortName(me()).slice(0, 2).toUpperCase();
  }
  const embed = new URLSearchParams(location.search).has('embed');
  if (embed) document.body.classList.add('embed');
  // Keep the pane's person (and embed mode) when moving between admin pages inside a flow-demo pane
  withAs = (url) => {
    if (!asUser || !/^[a-z-]+\.html/.test(url)) return url;
    const u = new URL(url, location.href);
    u.searchParams.set('as', AS);
    u.searchParams.set('embed', '1');
    return u.pathname.split('/').pop() + u.search;
  };
  if (locked) {
    const main = $('.admin-content');
    if (main) main.innerHTML = `<section class="panel lock-page">${icon('lock')}<h2>Not available</h2><p>${esc(lockMsg)}</p><a class="btn btn-primary" href="${withAs('index.html')}">Back to the dashboard</a></section>`;
  }
  if (asUser) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (a && a.target !== '_blank') a.setAttribute('href', withAs(a.getAttribute('href')));
    }, true);
    // Who this pane is signed in as, and what that role can do
    const main = $('.admin-content');
    if (main) {
      const bar = document.createElement('div');
      bar.className = `role-bar ${isOwner() ? 'owner' : 'writer'}`;
      bar.innerHTML = isOwner()
        ? `<span class="avatar">JA</span><span><b>Signed in as Jay</b> · Owner (super admin)</span><small>Senior writer · the only one who sees the money · can act on every order</small>`
        : `<span class="avatar">${esc(shortName(me()).slice(0, 2).toUpperCase())}</span><span><b>Signed in as ${esc(shortName(me()))}</b> · Writer</span><small>Accepts orders and works only on their own · no access to money</small>`;
      main.prepend(bar);
    }
  }

  // =====================================================================
  // Dashboard: orders + AI usage panels
  // =====================================================================
  if (page === 'dashboard') {
    $('#greet-sub').textContent = isOwner() ? 'Here\'s your business today: money, team and orders.' : 'Here\'s your work today.';
    const renderBiz = () => {
      const box = $('#biz');
      if (!isOwner()) return;
      const f = finances('month');
      const owed = Object.values(owedByWriter()).filter((v) => v.owed > 0);
      const open = JO.load().filter(isOpenOrder).length;
      const team = window.JayTeam ? window.JayTeam.load().members : [];
      const n = (s) => team.filter((m) => m.status === s).length;
      box.hidden = false;
      box.innerHTML = `<div class="biz-head"><h2>This month</h2><span>Only you see this</span></div>
        <div class="biz-cards">
          <a class="biz-card" href="${withAs('finance.html')}"><span>Takings</span><strong>${JO.kes(f.takings)}</strong><small>${f.paid.length} order${f.paid.length === 1 ? '' : 's'} paid</small></a>
          <a class="biz-card keep" href="${withAs('finance.html')}"><span>You keep</span><strong>${JO.kes(f.keep)}</strong><small>after fees and writer pay</small></a>
          <a class="biz-card" href="${withAs('finance.html')}"><span>Writer pay owed</span><strong>${JO.kes(owed.reduce((s, v) => s + v.owed, 0))}</strong><small>${owed.length ? `to ${owed.length} writer${owed.length > 1 ? 's' : ''}` : 'all paid up'}</small></a>
          <a class="biz-card${open ? ' alert' : ''}" href="${withAs('orders.html?status=paid')}"><span>${open ? '⚠ ' : ''}Not accepted</span><strong>${open}</strong><small>paid, waiting for a writer</small></a>
          <a class="biz-card tokens${aiLeft() / aiGranted() * 100 <= aiWarnPct() ? ' alert' : ''}" href="#ai-usage"><span>AI tokens</span><strong>${aiLeft().toLocaleString()}</strong><small>left of ${aiGranted().toLocaleString()} · ≈ ${Math.floor(aiLeft() / POSTER_TOKENS).toLocaleString()} posters</small></a>
          <a class="biz-card" href="${withAs('team.html')}"><span>Team</span><strong>${n('active')} writer${n('active') === 1 ? '' : 's'}</strong><small>${n('invited')} invited · ${n('paused')} paused</small></a>
        </div>`;
    };
    const renderOpen = () => {
      if (isOwner()) return;
      const box = $('#open-panel');
      const open = JO.load().filter(isOpenOrder).sort((a, b) => new Date(a.paidAt) - new Date(b.paidAt));
      const paused = meMember() && meMember().status === 'paused';
      box.hidden = false;
      box.innerHTML = `<div class="panel-head"><div><h2>Orders you can accept</h2><p class="panel-sub">Paid and waiting. The first writer to accept gets the order.</p></div></div>
        <div class="panel-body">${paused ? `<p class="role-note">${icon('lock')}<span>Jay has paused your account. You can finish the CVs you have, but can't accept new ones.</span></p>` : ''}
        <ul class="mini-list">${open.length ? open.map((o) => `<li class="is-open"><div class="mini-main"><a href="${withAs(`order.html?id=${o.id}`)}">${esc(o.id)} · ${esc(o.package)}</a><small>${esc(o.brief.targetRole)} · ${esc(o.brief.industry)} · waiting ${esc(waiting(o))}</small></div>
          ${paused ? '' : `<a class="btn btn-primary btn-sm" href="${withAs(`order.html?id=${o.id}`)}">Open &amp; accept</a>`}</li>`).join('') : '<li class="empty-note">Nothing waiting right now. New paid orders show up here.</li>'}</ul></div>`;
    };
    renderBiz();
    renderOpen();
    JO.onChange(() => { renderBiz(); renderOpen(); });
    const list = $('#attention-list');
    if (list) {
      const items = orders.filter(needsAction).sort((a, b) => (isOpenOrder(b) - isOpenOrder(a)) || deadline(a) - deadline(b)).slice(0, 5);
      list.innerHTML = items.length ? items.map((o) => {
        const d = JO.due(o);
        const flag = isOpenOrder(o) ? `<span class="flag critical">⚠ Not accepted · ${esc(waiting(o))}</span>` : `<span class="due ${d.cls}">${d.text.replace(/ ·.*/, '')}</span>`;
        return `<li class="${isOpenOrder(o) ? 'is-open' : ''}"><div class="mini-main"><a href="order.html?id=${o.id}">${esc(o.id)} · ${esc(o.client.name)}</a><small>${esc(o.package)} · ${JO.STATUS[o.status].team}</small></div>${flag}</li>`;
      }).join('') : '<li class="empty-note">All caught up. No orders need action.</li>';
    }
    const ai = $('#ai-usage');
    if (ai && !isOwner()) ai.closest('.panel').remove(); // AI spending is a business cost: owner only
    else if (ai) {
      const u = aiUsage();
      const used = aiUsed();
      const left = aiLeft();
      const leftPct = Math.round((left / aiGranted()) * 100);
      const low = leftPct <= aiWarnPct();
      const rows = Object.entries(u).map(([name, v]) => `<tr><td>${esc(name)}</td><td>${v.runs.toLocaleString()}</td><td>${fmtTokens(v.inTokens + v.outTokens)}</td></tr>`).join('');
      ai.closest('.panel').querySelector('h2').lastChild.textContent = 'AI tokens';
      ai.innerHTML = `
        <div class="ai-total"><div><strong>${left.toLocaleString()}</strong><span>tokens left</span></div>
        <div><strong>≈ ${Math.floor(left / POSTER_TOKENS).toLocaleString()}</strong><span>posters' worth</span></div></div>
        <div class="budget${low ? ' low' : ''}"><div class="budget-bar"><span style="width:${leftPct}%"></span></div>
        <small>${leftPct}% left of your ${aiGranted().toLocaleString()} starter tokens · ${used.toLocaleString()} used</small></div>
        ${low ? `<p class="ai-low">${icon('alert')}<span>${left ? 'Running low.' : 'Out of tokens: AI buttons are paused.'} Ask your developer to add more tokens.</span></p>` : ''}
        <table class="ai-table"><thead><tr><th>Used for</th><th>Times</th><th>Tokens</th></tr></thead><tbody>${rows}</tbody></table>`;
    }
  }

  // =====================================================================
  // Dashboard: CV progress chart (own CVs for writers, whole team for the owner)
  // =====================================================================
  if (page === 'dashboard' && $('#prog-body')) {
    // Ordinal brand-gold ramp (one hue, light → dark = further along). Validated with the dataviz checker:
    // monotone lightness, visible step gaps, light end 2.3:1 on white → segments carry direct labels.
    const STAGES = [
      { key: 'writing', label: 'Writing', color: '#CFA651', ink: '#0D0D0D' },
      { key: 'draft-sent', label: 'With client', color: '#A9842F', ink: '#0D0D0D' },
      { key: 'revisions', label: 'Revisions', color: '#7A5E22', ink: '#ffffff' },
      { key: 'delivered', label: 'Delivered (30 days)', color: '#3B2C0E', ink: '#ffffff' },
    ];
    const since30 = Date.now() - 30 * 24 * JO.HOUR;
    const stageKey = (o) => {
      if (o.status === 'delivered') return o.deliveredAt && new Date(o.deliveredAt).getTime() >= since30 ? 'delivered' : null;
      return ['writing', 'draft-sent', 'revisions'].includes(o.status) ? o.status : null;
    };
    const owner = isOwner();
    let view = 'chart';
    if ($('#greet-name')) $('#greet-name').textContent = shortName(me());
    const rowsFor = () => {
      const people = owner ? [...(window.WRITERS || [])] : [me()];
      if (owner && orders.some((o) => o.writer === me())) people.unshift(me());
      return people.map((p) => {
        const mine = orders.filter((o) => o.writer === p && stageKey(o));
        return { person: p, total: mine.length, stages: STAGES.map((s) => ({ ...s, orders: mine.filter((o) => stageKey(o) === s.key) })) };
      });
    };

    function renderProgress() {
      orders = JO.load();
      const rows = rowsFor();
      const max = Math.max(1, ...rows.map((r) => r.total));
      const totals = STAGES.map((s, i) => rows.reduce((n, r) => n + r.stages[i].orders.length, 0));
      $('#prog-title').textContent = owner ? 'Team CV progress' : `Your CVs, ${shortName(me())}`;
      $('#prog-sub').textContent = owner ? 'Every writer\'s CVs by stage. Hover a bar for the orders.' : 'CVs you\'ve accepted, by stage';
      const legend = `<ul class="prog-legend">${STAGES.map((s, i) => `<li><span class="sw" style="background:${s.color}"></span>${s.label} <b>${totals[i]}</b></li>`).join('')}</ul>`;

      let main;
      if (!rows.some((r) => r.total)) {
        const open = orders.filter((o) => o.status === 'paid' && !o.writer).length;
        main = `<p class="empty-note">${owner ? 'No CVs are in progress.' : 'You have no CVs in progress.'} ${open ? `<a href="orders.html?status=paid">${open} order${open > 1 ? 's are' : ' is'} open to accept →</a>` : ''}</p>`;
      } else if (view === 'table') {
        main = `<div class="table-wrap-admin"><table class="admin-table prog-table"><thead><tr><th>${owner ? 'Writer' : ''}</th>${STAGES.map((s) => `<th>${s.label}</th>`).join('')}<th>Total</th></tr></thead>
          <tbody>${rows.map((r) => `<tr><th scope="row">${esc(shortName(r.person))}</th>${r.stages.map((s) => `<td>${s.orders.length}</td>`).join('')}<td><b>${r.total}</b></td></tr>`).join('')}</tbody></table></div>`;
      } else {
        main = `<div class="prog-chart" role="img" aria-label="${esc(rows.map((r) => `${shortName(r.person)}: ${r.stages.map((s) => `${s.orders.length} ${s.label}`).join(', ')}`).join('. '))}">
          ${rows.map((r) => `
            <div class="prog-row">
              <span class="prog-who">${esc(shortName(r.person))}${r.person === me() ? ' <small>(you)</small>' : ''}</span>
              <div class="prog-track">
                <div class="prog-bar" style="width:${(r.total / max) * 100}%">
                  ${r.stages.filter((s) => s.orders.length).map((s) => `<button type="button" class="prog-seg" style="flex:${s.orders.length};background:${s.color};color:${s.ink}"
                      data-tip="${esc(`${shortName(r.person)} · ${s.label}: ${s.orders.length} (${s.orders.map((o) => o.id).join(', ')})`)}"
                      aria-label="${esc(`${shortName(r.person)}, ${s.label}: ${s.orders.length} order${s.orders.length === 1 ? '' : 's'}`)}">${s.orders.length}</button>`).join('')}
                </div>
              </div>
              <span class="prog-total">${r.total}</span>
            </div>`).join('')}
        </div>`;
      }

      // The signed-in person's own CVs, each with its progress and deadline
      const mineActive = orders.filter((o) => o.writer === me() && ['writing', 'draft-sent', 'revisions'].includes(o.status))
        .sort((a, b) => deadline(a) - deadline(b));
      const stepIdx = { writing: 0, 'draft-sent': 1, revisions: 2 };
      const list = mineActive.length ? `<h3 class="prog-list-title">${owner ? 'CVs you\'ve accepted' : 'Your CVs in progress'}</h3>
        <ul class="prog-list">${mineActive.map((o) => {
          const d = JO.due(o);
          const flag = d.cls === 'late' ? `<span class="flag critical">⚠ ${esc(d.text)}</span>` : d.cls === 'soon' ? `<span class="flag warning">⏱ ${esc(d.text)}</span>` : `<span class="flag">${esc(d.text.replace(/ ·.*/, ''))}</span>`;
          return `<li><a href="order.html?id=${o.id}"><strong>${esc(o.id)}</strong> · ${esc(o.client.name)}<small>${esc(o.package)}</small></a>
            <div class="mini-track" aria-label="Stage: ${esc(JO.STATUS[o.status].team)}">${STAGES.map((s, i) => `<span style="background:${i <= stepIdx[o.status] ? s.color : 'var(--line)'}"></span>`).join('')}<em>${esc(STAGES[stepIdx[o.status]].label)}</em></div>
            ${flag}</li>`;
        }).join('')}</ul>` : '';
      // Paid orders nobody has accepted: always red, with ⚠ and words (never colour alone)
      const open = orders.filter(isOpenOrder).sort((a, b) => new Date(a.paidAt) - new Date(b.paidAt));
      let openBlock = '';
      if (open.length) {
        const ids = open.map((o) => `${o.id} (${waiting(o)})`).join(', ');
        openBlock = owner && view === 'chart'
          ? `<div class="prog-chart prog-open-chart"><div class="prog-row prog-open">
              <span class="prog-who">⚠ Not accepted</span>
              <div class="prog-track"><div class="prog-bar" style="width:100%">
                <button type="button" class="prog-seg seg-open" style="flex:1" data-open="1" data-tip="${esc(`Paid, waiting for a writer: ${ids}`)}" aria-label="${esc(`${open.length} paid order${open.length > 1 ? 's' : ''} not accepted`)}">Waiting for a writer · oldest ${esc(waiting(open[0]))}</button>
              </div></div>
              <span class="prog-total">${open.length}</span>
            </div></div>`
          : '';
        const openRow = openBlock;
        openBlock = `<a class="open-alert" href="orders.html?status=paid">
            <span class="oa-icon" aria-hidden="true">⚠</span>
            <span><strong>${open.length} paid order${open.length > 1 ? 's are' : ' is'} not accepted yet</strong>
            <small>Longest waiting: ${esc(open[0].id)} · ${esc(waiting(open[0]))}. ${owner ? 'Remind the team or reassign.' : 'The first writer to accept takes it.'}</small></span>
            <span class="oa-cta">${owner ? 'View' : 'Accept one'} →</span>
          </a>`;
        main = openRow + main;
      }
      const openLegend = open.length && owner && view === 'chart' ? '<li><span class="sw" style="background:#d03b3b"></span>⚠ Not accepted <b>' + open.length + '</b></li>' : '';
      $('#prog-body').innerHTML = `${openBlock}${rows.some((r) => r.total) || openLegend ? legend.replace('</ul>', `${openLegend}</ul>`) : ''}${main}${list}`;
      $$('.seg-toggle button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    }

    // Hover / focus tooltip for bar segments
    const tip = document.createElement('div');
    tip.className = 'prog-tip';
    tip.hidden = true;
    document.body.append(tip);
    const showTip = (seg) => {
      tip.textContent = seg.dataset.tip;
      tip.hidden = false;
      const r = seg.getBoundingClientRect();
      tip.style.left = `${Math.max(8, r.left + r.width / 2 + window.scrollX)}px`;
      tip.style.top = `${r.top + window.scrollY - 8}px`;
    };
    $('#prog-body').addEventListener('mouseover', (e) => { const s = e.target.closest('.prog-seg'); if (s) showTip(s); });
    $('#prog-body').addEventListener('focusin', (e) => { const s = e.target.closest('.prog-seg'); if (s) showTip(s); });
    $('#prog-body').addEventListener('mouseout', (e) => { if (e.target.closest('.prog-seg')) tip.hidden = true; });
    $('#prog-body').addEventListener('focusout', () => { tip.hidden = true; });
    $('#prog-body').addEventListener('click', (e) => {
      const s = e.target.closest('.prog-seg');
      if (s && s.dataset.open) { location.href = withAs('orders.html?status=paid'); return; }
      if (s) location.href = withAs(`orders.html?writer=${encodeURIComponent(rowsFor().find((r) => s.dataset.tip.startsWith(shortName(r.person))).person)}`);
    });
    $$('.seg-toggle button').forEach((b) => b.addEventListener('click', () => { view = b.dataset.view; renderProgress(); }));
    JO.onChange(renderProgress);
    renderProgress();
  }

  // =====================================================================
  // Orders list
  // =====================================================================
  if (page === 'orders') {
    const params = new URLSearchParams(location.search);
    const body = $('#orders-body');
    const q = $('#orders-q');
    // ---------- Filter state (kept in the address bar so a view can be bookmarked or shared) ----------
    const F = {
      tab: params.get('status') || 'all',
      quick: params.get('quick') || '', // set by clicking a summary card
      pkg: params.get('pkg') || '',
      writer: params.get('writer') || '',
      pay: params.get('pay') || '',
      due: params.get('due') || '',
      placed: params.get('placed') || '',
      sort: params.get('sort') || 'newest',
    };
    q.value = params.get('q') || '';

    const TABS = {
      all: (o) => o.status !== 'abandoned',
      new: (o) => o.status === 'new' || o.status === 'abandoned',
      paid: (o) => o.status === 'paid' && !o.writer,
      mine: (o) => o.writer === me() && o.status !== 'abandoned',
      writing: (o) => o.status === 'writing',
      'draft-sent': (o) => o.status === 'draft-sent',
      revisions: (o) => o.status === 'revisions',
      delivered: (o) => o.status === 'delivered',
    };
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const left = (o) => deadline(o) - Date.now();
    // The four summary cards are filters too
    const QUICK = {
      action: { label: 'Need action', test: needsAction },
      writing: { label: 'Being written', test: (o) => ['writing', 'revisions'].includes(o.status) },
      due24: { label: 'Due within 24h', test: (o) => left(o) < 24 * JO.HOUR },
      paid: { label: 'Paid this month', test: (o) => o.payment.status === 'confirmed' && o.paidAt && new Date(o.paidAt).getTime() >= monthStart },
    };
    const pkgNames = () => (window.JayContent ? window.JayContent.get().packages.map((p) => p.short) : ['Basic', 'Professional', 'Executive']);
    const FILTERS = {
      pkg: {
        label: 'Package',
        options: () => [['', 'All packages'], ...pkgNames().map((p) => [p, p]), ['single', 'Single services']],
        test: (o, v) => (v === 'single' ? !pkgNames().includes(o.package) : o.package === v),
      },
      writer: {
        label: 'Writer',
        options: () => [['', 'All writers'], ['open', 'Open: not accepted'], ['mine', `Mine (${shortName(me())})`], ...(window.WRITERS || []).map((w) => [w, shortName(w)])],
        test: (o, v) => (v === 'open' ? !o.writer && o.status === 'paid' : v === 'mine' ? o.writer === me() : o.writer === v),
      },
      pay: {
        label: 'Payment',
        options: () => [['', 'Any payment'], ['paid', 'Paid'], ['unpaid', 'Not paid yet'], ['M-Pesa', 'Paid by M-Pesa'], ['Card', 'Paid by card'], ['Manual', 'Recorded manually']],
        test: (o, v) => {
          const paid = o.payment.status === 'confirmed';
          if (v === 'paid') return paid;
          if (v === 'unpaid') return !paid;
          if (v === 'Manual') return paid && o.payment.method === 'Manual';
          return paid && o.payment.channel === v;
        },
      },
      due: {
        label: 'Due',
        options: () => [['', 'Any time'], ['overdue', 'Overdue'], ['6h', 'Due within 6h'], ['24h', 'Due within 24h'], ['client', 'With client (waiting for reply)']],
        test: (o, v) => (v === 'overdue' ? left(o) < 0 : v === '6h' ? left(o) < 6 * JO.HOUR : v === '24h' ? left(o) < 24 * JO.HOUR : o.status === 'draft-sent'),
      },
      placed: {
        label: 'Placed',
        options: () => [['', 'Any date'], ['today', 'Today'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days']],
        test: (o, v) => {
          const t = new Date(o.created).getTime();
          if (v === 'today') return new Date(o.created).toDateString() === new Date().toDateString();
          return Date.now() - t <= (v === '7d' ? 7 : 30) * 24 * JO.HOUR;
        },
      },
    };
    const SORTS = {
      newest: ['Newest first', (a, b) => new Date(b.created) - new Date(a.created)],
      oldest: ['Oldest first', (a, b) => new Date(a.created) - new Date(b.created)],
      due: ['Due soonest', (a, b) => left(a) - left(b) || new Date(b.created) - new Date(a.created)],
      amount: ['Highest amount', (a, b) => b.amount - a.amount],
    };
    if (!isOwner()) delete SORTS.amount; // money is for the owner only

    // Build the dropdowns
    $('#flt-bar').innerHTML = Object.entries(FILTERS).map(([k, f]) => `
      <label class="flt"><span>${f.label}</span><select data-filter="${k}">${f.options().map(([v, l]) => `<option value="${esc(v)}"${F[k] === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`).join('')
      + `<label class="flt"><span>Sort</span><select data-filter="sort">${Object.entries(SORTS).map(([v, [l]]) => `<option value="${v}"${F.sort === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`;

    const term = () => q.value.trim().toLowerCase();
    const matchSearch = (o) => !term() || `${o.id} ${o.client.name} ${o.client.phone} ${o.package} ${o.payment.reference} ${o.payment.receipt} ${o.writer}`.toLowerCase().includes(term());
    // Everything except the status tab (used for the tab counts) …
    const baseFilter = (o) => matchSearch(o)
      && (!F.quick || QUICK[F.quick].test(o))
      && Object.keys(FILTERS).every((k) => !F[k] || FILTERS[k].test(o, F[k]));
    // … and everything including it (used for the table)
    const fullFilter = (o) => TABS[F.tab](o) && baseFilter(o);

    const syncUrl = () => {
      const p = new URLSearchParams();
      if (F.tab !== 'all') p.set('status', F.tab);
      ['quick', 'pkg', 'writer', 'pay', 'due', 'placed'].forEach((k) => F[k] && p.set(k, F[k]));
      if (F.sort !== 'newest') p.set('sort', F.sort);
      if (term()) p.set('q', q.value.trim());
      history.replaceState(null, '', p.toString() ? `?${p}` : location.pathname);
    };

    const render = () => {
      orders = JO.load();
      // Summary cards: counts + "pressed" state
      $('#ost-action').textContent = orders.filter(QUICK.action.test).length;
      $('#ost-progress').textContent = orders.filter(QUICK.writing.test).length;
      $('#ost-due').textContent = orders.filter(QUICK.due24.test).length;
      const paidMonth = orders.filter(QUICK.paid.test);
      // Writers see how many orders came in, not how much money
      $('#ost-revenue').textContent = isOwner() ? JO.kes(paidMonth.reduce((s, o) => s + o.amount, 0)) : `${paidMonth.length} order${paidMonth.length === 1 ? '' : 's'}`;
      $$('[data-quick]').forEach((card) => card.setAttribute('aria-pressed', String(card.dataset.quick === F.quick)));
      // Tabs: counts respect the other filters
      $$('.tabs button').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.tab === F.tab));
        b.querySelector('span').textContent = orders.filter((o) => TABS[b.dataset.tab](o) && baseFilter(o)).length;
      });
      // The "Not accepted" tab is only red when something is actually waiting
      const alertTab = $('.tabs .tab-alert');
      if (alertTab) alertTab.classList.toggle('zero', !orders.filter((o) => TABS.paid(o)).length);
      $$('#flt-bar select').forEach((s) => { s.value = F[s.dataset.filter]; s.classList.toggle('on', s.dataset.filter !== 'sort' && !!F[s.dataset.filter]); });

      // Active filter chips
      const chips = [];
      if (F.quick) chips.push(['quick', QUICK[F.quick].label]);
      if (F.tab !== 'all') chips.push(['tab', $(`.tabs [data-tab="${F.tab}"]`).firstChild.textContent.trim()]);
      Object.entries(FILTERS).forEach(([k, f]) => { if (F[k]) chips.push([k, `${f.label}: ${(f.options().find(([v]) => v === F[k]) || [])[1] || F[k]}`]); });
      if (term()) chips.push(['q', `"${q.value.trim()}"`]);
      $('#flt-chips').innerHTML = chips.map(([k, l]) => `<button type="button" class="chip" data-chip="${k}">${esc(l)}<span aria-hidden="true">×</span><span class="sr-only">Remove filter</span></button>`).join('');
      $('#flt-clear').hidden = !chips.length;

      const all = orders.filter(TABS.all).length;
      const list = orders.filter(fullFilter).sort(SORTS[F.sort][1]);
      $('#flt-count').textContent = chips.length ? `Showing ${list.length} of ${all} orders` : `${all} orders`;
      body.innerHTML = list.length ? list.map((o) => {
        const d = JO.due(o);
        const pay = o.payment.status === 'confirmed'
          ? `<span class="pay ok">${icon('check')}${esc(o.payment.channel)}<small>${esc(o.payment.reference)}</small></span>`
          : `<span class="pay wait">${icon('clock')}Waiting</span>`;
        return `<tr data-href="order.html?id=${o.id}"${isOpenOrder(o) ? ' class="row-open"' : ''}>
          <td><a class="order-id" href="order.html?id=${o.id}">${esc(o.id)}</a><small class="cell-sub">${JO.ago(o.created)}</small></td>
          <td><strong class="cell-strong">${esc(o.client.name)}</strong><small class="cell-sub">${esc(o.client.phone)}</small></td>
          <td>${esc(o.package)}${isOwner() ? `<small class="cell-sub">${JO.kes(o.amount)}</small>` : ''}</td>
          <td>${pay}</td>
          <td>${oPill(o)}</td>
          <td class="cell-muted">${o.writer ? esc(o.writer.split(' (')[0]) : isOpenOrder(o) ? `<em class="not-accepted">⚠ Not accepted<small>waiting ${esc(waiting(o))}</small></em>` : '—'}</td>
          <td><span class="due ${d.cls}">${d.text.replace(/ ·.*/, '')}</span></td>
          <td><a class="icon-btn" href="order.html?id=${o.id}" title="Open order">${icon('arrow')}</a></td></tr>`;
      }).join('') : `<tr><td colspan="8" class="table-empty">No orders match these filters. <button type="button" class="link-btn" data-clear>Clear all filters</button></td></tr>`;
      syncUrl();
    };

    const clearAll = () => {
      Object.assign(F, { tab: 'all', quick: '', pkg: '', writer: '', pay: '', due: '', placed: '', sort: 'newest' });
      q.value = '';
      render();
    };
    // Summary cards: click to filter, click again to clear
    $$('[data-quick]').forEach((card) => card.addEventListener('click', () => {
      F.quick = F.quick === card.dataset.quick ? '' : card.dataset.quick;
      if (F.quick) F.tab = 'all'; // the card decides which orders show; status tabs narrow it further
      render();
    }));
    $('.tabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]');
      if (b) { F.tab = b.dataset.tab; render(); }
    });
    $('#flt-bar').addEventListener('change', (e) => {
      const s = e.target.closest('[data-filter]');
      if (s) { F[s.dataset.filter] = s.value; render(); }
    });
    $('#flt-chips').addEventListener('click', (e) => {
      const chip = e.target.closest('[data-chip]');
      if (!chip) return;
      const k = chip.dataset.chip;
      if (k === 'tab') F.tab = 'all'; else if (k === 'q') q.value = ''; else F[k] = '';
      render();
    });
    $('#flt-clear').addEventListener('click', clearAll);
    q.addEventListener('input', render);
    body.addEventListener('click', (e) => {
      if (e.target.closest('[data-clear]')) return clearAll();
      if (e.target.closest('a, button')) return undefined;
      const tr = e.target.closest('tr[data-href]');
      if (tr) location.href = withAs(tr.dataset.href);
      return undefined;
    });
    JO.onChange(render);
    render();
  }

  // =====================================================================
  // Single order (team view)
  // =====================================================================
  if (page === 'order') {
    const id = new URLSearchParams(location.search).get('id');
    let o;
    const refresh = () => { orders = JO.load(); o = orders.find((x) => x.id === id) || orders[0]; };
    // Roles: the owner sees money and can act on every order; a writer works only on orders they accepted
    const canWork = () => isOwner() || (o.writer && o.writer === me());
    // Writers never see amounts, including in the activity log ("Payment received: KES 6,000…")
    const noMoney = (t) => (isOwner() ? t : String(t).replace(/:?\s*KES\s?[\d,.]+/g, ''));
    refresh();
    const first = () => o.client.name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/, '').split(' ')[0];
    const waLink = (text) => {
      // Sample numbers are masked (07XX…), so WhatsApp will ask which chat to use
      const target = /X/i.test(o.client.phone) ? '' : o.client.phone.replace(/\D/g, '');
      return `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
    };
    const trackAbs = () => new URL(`../${JO.trackUrl(o)}`, location.href).href;
    const commit = (res, msg) => {
      if (!res.ok) { toast(res.error, true); return false; }
      JO.save(orders);
      toast(msg);
      render();
      return true;
    };

    const STEPS = [['paid', 'Paid'], ['writing', 'Writing'], ['draft-sent', 'Draft sent'], ['revisions', 'Revisions'], ['delivered', 'Delivered']];
    const IDX = { new: -1, abandoned: -1, paid: 0, writing: 1, 'draft-sent': 2, revisions: 3, delivered: 4 };

    const actionsHtml = () => {
      const w = o.writer ? o.writer.split(' (')[0] : '';
      if (!isOwner()) {
        if (o.status === 'new' || o.status === 'abandoned') return `<p class="role-note">${icon('lock')}<span>Waiting for the client to pay. Payments and reminders are handled by Jay.</span></p>`;
        if (o.writer && o.writer !== me() && o.status !== 'delivered') return `<p class="role-note">${icon('lock')}<span>This is <b>${esc(w)}'s</b> order. You can read it, but only ${esc(w)} or Jay can work on it.</span></p>`;
      }
      switch (o.status) {
        case 'new':
        case 'abandoned':
          return `<button type="button" class="btn btn-ghost" data-do="focus-pay">Paid another way?</button>
            <a class="btn btn-primary" target="_blank" rel="noopener" href="${waLink(`Hi ${first()}, just a reminder that your Jay CVS order ${o.id} (${o.package}) is waiting for payment of ${JO.kes(o.amount)}. Pay securely by M-Pesa or card here: ${trackAbs()}`)}">${icon('whatsapp')}Send payment reminder</a>`;
        case 'paid':
          return `<button type="button" class="btn btn-primary" data-do="accept">${icon('check')}Accept this order (as ${esc(shortName(me()))})</button>`;
        case 'writing':
        case 'revisions':
          return `<label class="btn btn-primary">${icon('upload')}Upload draft &amp; send to client<input type="file" data-send-draft hidden></label>`;
        case 'draft-sent':
          return `<button type="button" class="btn btn-ghost" data-do="changes">${icon('edit')}Client asked for changes…</button>
            <button type="button" class="btn btn-primary" data-do="approve">${icon('check')}Client approved: complete</button>`;
        default:
          return `<span class="complete">${icon('check')}Order complete</span>`;
      }
    };

    function render() {
      refresh();
      $('#page-title').textContent = `Order ${o.id}`;
      crumbs.leaf(`${o.id} · ${o.client.name}`);
      const d = JO.due(o);
      const idx = IDX[o.status];
      const stepCls = (k, i) => {
        if (i < idx || o.status === 'delivered') return k === 'revisions' && !o.revisions.length ? 'skipped' : 'done';
        return i === idx ? 'current' : '';
      };
      const n = JO.nextStep(o);
      const rev = o.revisions[o.revisions.length - 1];
      $('#order-head').innerHTML = `
        <div class="order-head-top">
          <div><p class="order-meta">${esc(o.id)} · placed ${JO.ago(o.created)}</p>
          <h2>${esc(o.package)}${isOwner() ? ` <span class="order-amount">${JO.kes(o.amount)}</span>` : ''}</h2></div>
          <div class="order-head-right">${oPill(o)}<span class="due ${d.cls}">${d.text}</span></div>
        </div>
        <ol class="stepper">${STEPS.map(([k, label], i) => {
          const c = stepCls(k, i);
          return `<li class="${c}"><span>${c === 'done' ? icon('check') : i + 1}</span>${label}${k === 'revisions' ? `<small>${o.revisions.length ? `${o.revisions.length} round${o.revisions.length > 1 ? 's' : ''}` : 'if needed'}</small>` : ''}</li>`;
        }).join('')}</ol>
        ${o.status === 'revisions' && rev ? `<blockquote class="change-request"><strong>Changes requested (${esc(rev.by)}):</strong> "${esc(rev.text)}"<small>${JO.roundsLabel(o)}</small></blockquote>` : ''}
        <div class="next-step">
          <span class="next-label">What happens next</span>
          <p><strong>${esc(n.who)}:</strong> ${esc(noMoney(n.what))}</p>
          <p class="next-how">${n.auto === 'yes' ? icon('refresh') : n.auto === 'partly' ? icon('sparkle') : icon('info')}${esc(n.how)}</p>
        </div>
        <div class="order-actions">${actionsHtml()}</div>`;

      $('#brief').innerHTML = `<dl class="brief-grid">
        <div><dt>Target role</dt><dd>${esc(o.brief.targetRole)}</dd></div>
        <div><dt>Industry</dt><dd>${esc(o.brief.industry)}</dd></div>
        <div><dt>Experience</dt><dd>${esc(o.brief.experience)}</dd></div>
        <div class="wide"><dt>Client's notes</dt><dd>${esc(o.brief.notes || 'None')}</dd></div></dl>`;

      const ours = (f) => /^(Draft|Final)/.test(f.kind);
      // The client's own files hold their contact details: only the writer on the order and Jay can open them
      $('#files').innerHTML = o.files.map((f, i) => `<li>${icon(/jpg|png|jpeg/i.test(f.name) ? 'image' : 'doc')}<div><strong>${esc(f.name)}</strong><small>${esc(f.kind)} · ${esc(f.size)}</small></div><span class="file-kind k-${ours(f) ? 'ours' : 'client'}">${ours(f) ? 'From us' : 'From client'}</span>
        ${canWork() || ours(f) ? `<button type="button" class="btn btn-ghost btn-sm file-view" data-view="${i}" aria-label="View ${esc(f.name)}">${icon('eye')}View</button>` : `<span class="file-locked" title="Only ${o.writer ? esc(shortName(o.writer)) : 'the writer who accepts it'} and Jay can open the client's files">${icon('lock')}</span>`}</li>`).join('');

      const writerPay = () => (o.payment.status === 'confirmed'
        ? `<div class="pay-confirmed">${icon('check')}<div><strong>Paid</strong><small>Amounts, fees and payouts are visible to Jay only</small></div></div>`
        : `<p class="role-note">${icon('lock')}<span>Not paid yet. Jay follows up on payments.</span></p>`);
      $('#pay-box').innerHTML = !isOwner() ? writerPay() : o.payment.status === 'confirmed'
        ? `<div class="pay-confirmed">${icon('check')}<div><strong>${JO.kes(o.amount)} received</strong><small>${esc(o.payment.method)} · ${esc(o.payment.channel)}</small></div></div>
           <dl class="pay-details">${o.payment.receipt ? `<div><dt>M-Pesa code</dt><dd>${esc(o.payment.receipt)}</dd></div>` : ''}<div><dt>Account no.</dt><dd>${esc(o.payment.reference || o.id)}</dd></div><div><dt>Paid to</dt><dd>Paybill ${esc(JO.paybill())}</dd></div><div><dt>Middleman fee</dt><dd>None</dd></div></dl>`
        : `<p class="hint-sm">Waiting for the client to pay <strong>${JO.kes(o.amount)}</strong> by M-Pesa: the prompt on their phone, or Paybill <b>${esc(JO.paybill())}</b> with account <b>${esc(o.id)}</b>. It confirms automatically.</p>
           <a class="btn btn-primary btn-block" target="_blank" rel="noopener" href="${waLink(`Hi ${first()}, a reminder to pay for your Jay CVS order ${o.id} (${JO.kes(o.amount)}). Tap "Pay with M-Pesa" here: ${trackAbs()} or use Paybill ${JO.paybill()}, account ${o.id}. – Jay CVS`)}">${icon('whatsapp')}Send payment reminder</a>
           <details class="manual-pay"><summary>Client paid but it's not showing?</summary>
             <div class="f"><label for="mpesa-code">M-Pesa code (or cash / bank reference)</label><input type="text" id="mpesa-code" placeholder="e.g. UJ4K7Q2XMB" style="text-transform:uppercase"></div>
             <button type="button" class="btn btn-ghost btn-block btn-sm" data-do="confirm-pay" style="margin-top:8px">Check &amp; record payment</button>
             <small class="hint-sm">The real system checks the code with M-Pesa first. One code can only pay one order.</small></details>`;

      // Latest ownership event: either the writer accepted it, or the owner reassigned it
      const ownEv = o.log.filter((l) => l.text.startsWith('Accepted the order') || l.text.startsWith('Reassigned the order')).pop();
      const reassigned = ownEv && ownEv.text.startsWith('Reassigned');
      $('#writer-box').innerHTML = o.writer
        ? `<div class="accepted-by"><span class="avatar">${esc(shortName(o.writer).slice(0, 2).toUpperCase())}</span><div><strong>${reassigned ? 'Assigned to' : 'Accepted by'} ${esc(shortName(o.writer))}</strong><small>${ownEv ? `${reassigned ? `reassigned by ${esc(ownEv.actor)} · ` : ''}${JO.ago(ownEv.at)}` : ''}${o.writer === me() ? ' · that\'s you' : ''}</small></div></div>
           ${isOwner() && !['delivered', 'abandoned'].includes(o.status) ? `<div class="f reassign"><label for="reassign">Reassign (owner only)</label><select id="reassign"><option value="">Choose a writer…</option>${(window.WRITERS || []).filter((x) => x !== o.writer).map((x) => `<option>${esc(x)}</option>`).join('')}</select></div>` : ''}`
        : o.status === 'paid'
          ? `<p class="open-order">${icon('alert')}<span><strong>⚠ Not accepted · waiting ${esc(waiting(o))}</strong><small>The client has paid. Any writer can accept; the first to accept takes it, and their name and the time are recorded.</small></span></p>
             <button type="button" class="btn btn-primary btn-block" data-do="accept">Accept as ${esc(shortName(me()))}</button>`
          : '<p class="hint-sm">Writers can accept this order once it\'s paid.</p>';
      // Owner tools (super admin): change deadlines, refund, nudge the team
      if (isOwner() && !['delivered', 'abandoned', 'new'].includes(o.status)) {
        $('#writer-box').insertAdjacentHTML('beforeend', `<div class="owner-tools"><span class="ot-label">${icon('shield')}Owner tools</span>
          ${o.status === 'paid' && !o.writer ? `<button type="button" class="btn btn-ghost btn-sm" data-do="nudge">${icon('whatsapp')}Nudge the writers</button>` : ''}
          ${['paid', 'writing', 'revisions'].includes(o.status) ? `<button type="button" class="btn btn-ghost btn-sm" data-do="extend">${icon('clock')}Give 24 more hours</button>` : ''}
          <button type="button" class="btn btn-ghost btn-sm ot-danger" data-do="refund">Refund &amp; cancel</button></div>`);
      }

      $('#track-link').innerHTML = !canWork() ? `<p class="role-note">${icon('lock')}<span>Only ${o.writer ? esc(shortName(o.writer)) : 'the writer who accepts this order'} and Jay can see the client's private link.</span></p>` : `<p class="hint-sm">Private link the client uses to follow their order, download drafts and approve or request changes.</p>
        <div class="track-row"><code>${esc(JO.trackUrl(o))}</code></div>
        <div class="track-actions"><a class="btn btn-ghost btn-sm" href="../${JO.trackUrl(o)}" target="_blank" rel="noopener">${icon('eye')}Open as client</a>
        <button type="button" class="btn btn-ghost btn-sm" data-do="copy-track">${icon('copy')}<span>Copy</span></button></div>`;

      const doc = o.package === 'Cover letter' ? 'cover letter' : o.package === 'LinkedIn revamp' ? 'LinkedIn profile content' : 'CV';
      const dueTxt = JO.firstDraftDue(o) ? JO.when(JO.firstDraftDue(o)) : 'soon';
      const tpl = {
        paid: `Hi ${first()}, we've received your payment${isOwner() ? ` of ${JO.kes(o.amount)}` : ''} (ref ${o.payment.reference || '…'}). Your writer has started on your ${o.package} order. Expect your draft by ${dueTxt}. Track it here: ${trackAbs()} – Jay CVS`,
        draft: `Hi ${first()}, your ${doc} draft is ready! Download it and tell us if you're happy or would like changes here: ${trackAbs()} – Jay CVS`,
        final: `Hi ${first()}, your final ${doc} is ready in Word and PDF: ${trackAbs()}. All the best with your applications! If you're happy, please leave us a quick review. – Jay CVS`,
      };
      $('.ai-panel').style.display = canWork() ? '' : 'none';
      $('#deliverable').closest('label').style.display = canWork() ? '' : 'none';
      if (!canWork()) {
        $('#client').innerHTML = `<strong>${esc(o.client.name)}</strong><span class="masked">07•• ••• •••</span><span class="masked">•••••@•••••</span>`;
        $('#wa-templates').innerHTML = `<p class="role-note">${icon('lock')}<span>${o.writer ? `Contact details are shown to ${esc(shortName(o.writer))} (the writer on this order) and Jay.` : 'Accept the order to see the client\'s contact details.'}</span></p>`;
      } else {
      $('#client').innerHTML = `<strong>${esc(o.client.name)}</strong><a href="tel:${esc(o.client.phone)}">${esc(o.client.phone)}</a><a href="mailto:${esc(o.client.email)}">${esc(o.client.email)}</a>`;
      $('#wa-templates').innerHTML = `
        <a class="wa-tpl" href="${waLink(tpl.paid)}" target="_blank" rel="noopener">${icon('whatsapp')}<span><strong>Payment received</strong><small>Confirms payment, draft time &amp; tracking link</small></span></a>
        <a class="wa-tpl" href="${waLink(tpl.draft)}" target="_blank" rel="noopener">${icon('whatsapp')}<span><strong>Draft ready</strong><small>Link to download &amp; respond</small></span></a>
        <a class="wa-tpl" href="${waLink(tpl.final)}" target="_blank" rel="noopener">${icon('whatsapp')}<span><strong>Final version sent</strong><small>Asks for a review</small></span></a>`;
      }

      $('#timeline').innerHTML = o.log.slice().sort((a, b) => new Date(b.at) - new Date(a.at))
        .map((h) => `<li><span class="dot ${h.actor === 'System' || h.actor === 'M-Pesa' ? 'sys' : h.actor.startsWith('Client') ? 'client' : ''}"></span><div><p><b>${esc(h.actor)}</b> ${esc(noMoney(h.text))}</p><small>${JO.ago(h.at)}${h.client ? ' · visible to client' : ''}</small></div></li>`).join('')
        || '<li class="empty-note">No activity yet.</li>';
    }

    // Change-request dialog (team records what the client asked for on a call or WhatsApp)
    function changesDialog() {
      const dlg = document.createElement('dialog');
      dlg.className = 'admin-dialog';
      dlg.innerHTML = `<form class="dialog-body" method="dialog">
        <h2>What did the client ask for?</h2>
        <p>${esc(JO.roundsLabel(o))}. Write the changes exactly as agreed, so everyone knows what was promised.</p>
        <div class="f"><label for="chg-text">Requested changes</label><textarea id="chg-text" rows="4" placeholder="e.g. Add the 2022 sales award; shorten page 2"></textarea></div>
        <div class="f" style="margin-top:12px"><label for="chg-by">How did they ask?</label>
          <select id="chg-by"><option>Client (WhatsApp call)</option><option>Client (WhatsApp chat)</option><option>Client (email)</option></select></div>
        <div class="dialog-actions"><button type="button" class="btn btn-ghost" value="cancel" data-close>Cancel</button><button type="button" class="btn btn-primary" data-save>Move to revisions</button></div>
      </form>`;
      document.body.append(dlg);
      dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
      dlg.querySelector('[data-save]').addEventListener('click', () => {
        const res = JO.requestChanges(o, $('#chg-text', dlg).value, $('#chg-by', dlg).value);
        if (commit(res, 'Moved to revisions: revised draft due in 24h')) dlg.close();
      });
      dlg.addEventListener('close', () => dlg.remove());
      dlg.showModal();
    }

    document.addEventListener('click', async (e) => {
      const v = e.target.closest('[data-view]');
      if (v && window.DocViewer) {
        const f = o.files[Number(v.dataset.view)];
        window.DocViewer.openFile(o, f, { base: '../', note: `Private view for the Jay CVS team: opened through a link that expires in 10 minutes. ${/^(Draft|Final)/.test(f.kind) ? 'This is what the client sees on their tracking page.' : 'Uploaded by the client with their order.'}` });
        return;
      }
      const b = e.target.closest('[data-do]');
      if (!b) return;
      const act = b.dataset.do;
      if (act === 'focus-pay') { const d = $('.manual-pay'); if (d) d.open = true; return $('#mpesa-code')?.focus(); }
      if (act === 'confirm-pay') { const used = JO.codeUsedBy(JO.load(), $('#mpesa-code').value); if (used) return toast(`That M-Pesa code was already used for ${used}`, true); }
      if (act === 'confirm-pay') return commit(JO.confirmPayment(o, $('#mpesa-code').value, shortName(me())), 'Payment recorded. First-draft clock started');
      if (act === 'accept' && meMember() && meMember().status === 'paused') return toast('Jay has paused your account, so you can\'t accept new orders', true);
      if (act === 'accept') return commit(JO.accept(o, me()), `You accepted ${o.id}. It's yours now`);
      if (act === 'changes') return changesDialog();
      if (act === 'extend' && isOwner()) {
        o.extraHours = (o.extraHours || 0) + 24;
        o.log.push({ at: new Date().toISOString(), actor: shortName(me()), text: 'Gave the writer 24 more hours on the current deadline' });
        return commit({ ok: true }, 'Deadline moved by 24 hours');
      }
      if (act === 'nudge') return toast('In the real version this sends the writers a WhatsApp reminder about this order');
      if (act === 'refund') {
        const ok = await confirmBox({ title: `Refund ${o.client.name}?`, text: `In the real version this sends ${JO.kes(o.amount)} back to the client's M-Pesa from your Paybill and closes the order. Only the owner can do this.`, ok: 'OK', danger: true });
        if (ok) toast('Preview only: no refund was made');
        return;
      }
      if (act === 'approve') return commit(JO.deliver(o, o.writer ? o.writer.split(' (')[0] : 'Admin', 'Client approved the draft (confirmed on WhatsApp). Final version delivered'), 'Order completed 🎉');
      if (act === 'copy-track') {
        try { await navigator.clipboard.writeText(trackAbs()); b.querySelector('span').textContent = 'Copied!'; } catch (err) { /* ignore */ }
      }
    });
    document.addEventListener('change', (e) => {
      if (e.target.matches('[data-send-draft]')) {
        const f = e.target.files[0];
        if (f && window.DocViewer) window.DocViewer.remember(f); // so "View" opens the real file in this session
        if (f) commit(JO.sendDraft(o, f.name), 'Draft sent. The client can now review it on their tracking page');
      }
    });
    document.addEventListener('change', (e) => {
      if (e.target.id === 'reassign' && e.target.value) commit(JO.reassign(o, e.target.value, me()), `Reassigned to ${shortName(e.target.value)}`);
    });
    $('#note-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (commit(JO.note(o, $('#note').value, shortName(me())), 'Note added')) $('#note').value = '';
    });
    $('#deliverable').addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (window.DocViewer) window.DocViewer.remember(f);
      o.files.push({ name: f.name, kind: 'Supporting file', size: `${Math.max(1, Math.round(f.size / 1024))} KB` });
      o.log.push({ at: new Date().toISOString(), actor: 'Admin', text: `Uploaded ${f.name}` });
      e.target.value = '';
      commit({ ok: true }, 'File uploaded');
    });

    // AI assistant (simulated in the preview; the real version sends the CV text to the chosen model)
    const AI = {
      analyse: { feature: 'CV analysis', inT: 2050, outT: 560 },
      summary: { feature: 'Summary drafts', inT: 900, outT: 190 },
    };
    $$('[data-ai]').forEach((btn) => {
      const cfg = AI[btn.dataset.ai];
      btn.querySelector('.ai-est').textContent = isOwner() ? `≈ ${(cfg.inT + cfg.outT).toLocaleString()} tokens` : 'Suggestions for the writer';
      btn.addEventListener('click', () => {
        if (aiLeft() < cfg.inT + cfg.outT) { outOfTokens(); return; }
        const sample = o.aiSample || {
          score: 58,
          strengths: ['Relevant experience for the target role', 'Education section is complete'],
          issues: ['Profile summary missing or generic', 'Achievements not quantified (numbers, results)', 'Formatting may not pass screening software (ATS)', 'Unnecessary personal details included'],
          keywords: [o.brief.targetRole, o.brief.industry, 'Stakeholder management', 'Reporting', 'Team collaboration'],
          summary: `${o.brief.targetRole} with ${o.brief.experience} of experience in ${o.brief.industry}. [AI draft based on the client's CV: the writer edits this before use.]`,
        };
        const out = $('#ai-out');
        btn.disabled = true;
        out.innerHTML = `<div class="ai-loading"><span class="spinner"></span>Reading ${esc(o.files[0] ? o.files[0].name : 'the CV')}…</div>`;
        setTimeout(() => {
          btn.disabled = false;
          logAi(cfg.feature, cfg.inT, cfg.outT);
          const used = `<p class="ai-used">${icon('sparkle')}${isOwner() ? `Used ≈ ${(cfg.inT + cfg.outT).toLocaleString()} tokens · ${aiLeft().toLocaleString()} left. ` : ''}These are suggestions: the writer decides what to use.</p>`;
          if (btn.dataset.ai === 'analyse') {
            const tone = sample.score >= 70 ? 'good' : sample.score >= 55 ? 'ok' : 'weak';
            out.innerHTML = `
              <div class="ai-score ${tone}"><div class="score-ring" style="--p:${sample.score}"><strong>${sample.score}</strong><small>/100</small></div>
              <div><strong>Current CV score</strong><p>How well the client's existing CV fits "${esc(o.brief.targetRole)}" roles.</p></div></div>
              <div class="ai-cols">
                <div><h4>${icon('check')}Working well</h4><ul>${sample.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>
                <div><h4>${icon('alert')}To fix</h4><ul>${sample.issues.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>
              </div>
              <h4 class="kw-title">Keywords to include for this role</h4>
              <div class="kw">${sample.keywords.map((k) => `<span>${esc(k)}</span>`).join('')}</div>${used}`;
          } else {
            out.innerHTML = `<h4 class="kw-title">Draft professional summary</h4>
              <textarea class="ai-draft" rows="5" aria-label="AI draft summary">${esc(sample.summary)}</textarea>
              <div class="ai-draft-actions"><button type="button" class="btn btn-ghost btn-sm" id="copy-summary">${icon('copy')}<span>Copy</span></button></div>${used}`;
            $('#copy-summary').addEventListener('click', async (ev) => {
              const label = ev.currentTarget.querySelector('span');
              try { await navigator.clipboard.writeText($('.ai-draft').value); } catch (err) { $('.ai-draft').select(); }
              label.textContent = 'Copied!';
            });
          }
          o.log.push({ at: new Date().toISOString(), actor: 'AI assistant', text: `${cfg.feature} (≈ ${(cfg.inT + cfg.outT).toLocaleString()} tokens)` });
          JO.save(orders);
          render();
        }, 1300);
      });
    });

    JO.onChange(render); // the client acted on their tracking page → update instantly
    render();
  }

  // =====================================================================
  // Order flow demo: team view + client view of the same order, side by side
  // =====================================================================
  if (page === 'flow') {
    const sel = $('#flow-order');
    const team = $('#team-frame');
    const client = $('#client-frame');
    let current = new URLSearchParams(location.search).get('id');
    // 'new'   = a brand-new client: client side starts at the website's order card, team side shows the orders list
    // 'order' = follow one existing order: team side = that order, client side = its tracking page
    let mode = current ? 'order' : 'new';
    // 'client' = team view + client view; 'roles' = the same screen as Jay (left) and as a writer (right)
    const fp = new URLSearchParams(location.search);
    let fmode = fp.get('cmp') ? 'roles' : 'client';
    let cmpWriter = fp.get('cmp') || 'grace';
    let screen = fp.get('screen') || 'order';
    const writerKey = (w) => shortName(w).toLowerCase();
    const cmpName = () => shortName((window.WRITERS || []).find((w) => writerKey(w) === cmpWriter) || 'Grace');
    $('#cmp-writer').innerHTML = (window.WRITERS || []).map((w) => `<option value="${esc(writerKey(w))}"${writerKey(w) === cmpWriter ? ' selected' : ''}>${esc(shortName(w))}</option>`).join('');
    $('#cmp-screen').value = screen;
    const STAGES = [
      { key: 'new', title: 'Order placed', who: 'Client', trigger: 'Chooses a service and package, then uploads their CV. The order and private tracking link are created.', auto: 'Automatic' },
      { key: 'paid', title: 'Paid', who: 'Client → M-Pesa', trigger: 'Client enters their PIN on the M-Pesa prompt (or pays the Paybill with the order number); M-Pesa confirms it and the order turns Paid. Clock starts.', auto: 'Automatic' },
      { key: 'writing', title: 'Writing', who: 'Any writer', trigger: 'The first writer to press "Accept" takes the order; the system records who and when.', auto: 'Manual' },
      { key: 'draft-sent', title: 'Draft sent', who: 'Writer', trigger: 'Writer uploads the draft and presses "Send". The first-draft clock stops.', auto: 'Manual' },
      { key: 'revisions', title: 'Revisions', who: 'Client or team', trigger: 'Client presses "Request changes", or the team records a call. New 24h clock.', auto: 'Via tracking link' },
      { key: 'delivered', title: 'Delivered', who: 'Client, team or system', trigger: 'Client presses "I\'m happy", the team confirms, or no reply for 5 days.', auto: 'Partly automatic' },
    ];
    const stageOf = (o) => (o.status === 'abandoned' ? 'new' : o.status);
    const pick = () => {
      orders = JO.load();
      return mode === 'order' ? orders.find((x) => x.id === current) || orders[0] : null;
    };
    const setUrl = () => {
      const q = new URLSearchParams();
      if (mode === 'order') q.set('id', current);
      if (fmode === 'roles') { q.set('cmp', cmpWriter); if (screen !== 'order') q.set('screen', screen); }
      history.replaceState(null, '', q.toString() ? `?${q}` : location.pathname);
    };
    // What Jay can do that a writer can't (PROPOSED roles: the final list is agreed with Jay)
    const renderDiff = (o) => {
      const box = $('#roles-diff');
      box.hidden = fmode !== 'roles';
      if (box.hidden) return;
      const wFull = (window.WRITERS || []).find((w) => writerKey(w) === cmpWriter);
      const wn = cmpName();
      const yes = (t = '') => `<span class="rd-yes">✓</span>${t ? ` <small>${esc(t)}</small>` : ''}`;
      const no = (t = '') => `<span class="rd-no">✕</span>${t ? ` <small>${esc(t)}</small>` : ''}`;
      const part = (t) => `<span class="rd-part">◐</span> <small>${esc(t)}</small>`;
      const rows = [
        ['Money: order prices, revenue, M-Pesa payments, payouts', yes('the only one'), no('sees only "Paid"')],
        ['AI token balance', yes(), no()],
        ['Record a payment made another way', yes(), no()],
        ['Accept an open (paid) order', yes(), yes('first to accept gets it')],
        ['Send drafts, log changes, complete', yes('any order'), part(`only orders ${wn} accepted`)],
        ["Client's phone, email and tracking link", yes('every order'), part(`only on ${wn}'s orders`)],
        ['AI assistant', yes(), part(`only on ${wn}'s orders`)],
        ['Reassign to another writer', yes(), no()],
        ['Extend a deadline, refund, nudge the team', yes(), no()],
        ['Dashboard', yes("whole team's progress + red alerts"), part(`${wn}'s own CVs`)],
        ['Website prices and content', yes('edit and publish'), part('drafts career tips for Jay to approve')],
        ['Team: invite, pause, remove writers, set their pay', yes(), no()],
        ['Finance page: takings, payouts, CSV export', yes(), no('page is locked')],
      ];
      let now = '';
      if (o && screen === 'order') {
        if (o.status === 'new' || o.status === 'abandoned') now = `${o.id} isn't paid yet: Jay sees the payment tools; ${wn} just waits.`;
        else if (o.status === 'paid' && !o.writer) now = `Nobody has accepted ${o.id} yet. Press <b>Accept</b> as ${wn} on the right and watch Jay's side update.`;
        else if (o.writer === wFull) now = `${o.id} is ${wn}'s order, so ${wn} can work on it, but still doesn't see any money or the owner tools.`;
        else if (o.writer) now = `${o.id} belongs to ${esc(shortName(o.writer))}, so ${wn} can only read it. Contact details and the AI assistant are hidden.`;
      } else if (screen === 'index') now = `Jay's dashboard shows every writer's progress, the red "Not accepted" bar and the AI token balance; ${wn}'s shows only ${wn}'s CVs, with no money.`;
      else if (screen === 'content') now = `Jay can change prices and website text; ${wn} sees the same pages locked, except career-tip drafts.`;
      else if (screen === 'team') now = `Jay manages the team here; ${wn} doesn't even see Team in the menu, and opening the link shows a lock.`;
      else if (screen === 'finance') now = `Jay sees takings, fees, writer pay and what he keeps; for ${wn} the page is locked.`;
      else if (screen === 'orders') now = `Both see every order, so ${wn} can find work to accept. Jay sees prices and this month's takings; ${wn} sees only how many orders came in.`;
      box.innerHTML = `<details open><summary><b>What's different</b> <span>Jay (owner) vs ${esc(wn)} (writer)</span>${now ? `<em>${now}</em>` : ''}</summary>
        <table class="rd-table"><thead><tr><th scope="col">Can they…</th><th scope="col">Jay</th><th scope="col">${esc(wn)}</th></tr></thead>
        <tbody>${rows.map(([what, a, b]) => `<tr><th scope="row">${esc(what)}</th><td>${a}</td><td>${b}</td></tr>`).join('')}</tbody></table>
        <p class="rd-note">Proposed roles for the pitch: the final list is Jay's call.</p></details>`;
    };

    const renderMap = () => {
      const o = pick();
      if (o) current = o.id;
      sel.innerHTML = `<option value=""${o ? '' : ' selected'}>▶ New client (starts at CV upload)</option>`
        + orders.map((x) => `<option value="${esc(x.id)}"${o && x.id === o.id ? ' selected' : ''}>${esc(x.id)} · ${esc(x.client.name)} · ${esc(JO.STATUS[x.status].team)}</option>`).join('');
      const cur = o ? STAGES.findIndex((s) => s.key === stageOf(o)) : 0;
      $('#flow-steps').innerHTML = STAGES.map((s, i) => {
        const skipped = o && s.key === 'revisions' && i < cur && !o.revisions.length;
        const cls = i === cur ? 'current' : o && (i < cur || o.status === 'delivered') ? (skipped ? 'skipped' : 'done') : '';
        return `<li class="${cls}"><div class="fs-top"><span class="fs-n">${i + 1}</span><strong>${s.title}</strong><em>${s.auto}</em></div>
          <p><b>${esc(s.who)}:</b> ${esc(s.trigger)}</p></li>`;
      }).join('');
      renderDiff(o);
      if (!o) {
        $('#flow-now').innerHTML = `<span class="ostatus st-new">New client</span>
          <p><strong>Now · Client:</strong> on the website, choosing a service, picking a package and uploading their CV (right). The order appears on the team's list (left) the moment they press "Upload CV &amp; get my tracking link".</p>`;
        return;
      }
      const n = JO.nextStep(o);
      const d = JO.due(o);
      $('#flow-now').innerHTML = `<span class="ostatus ${JO.STATUS[o.status].cls}">${JO.STATUS[o.status].team}</span>
        <span class="due ${d.cls}">${d.text}</span>
        <p><strong>Next · ${esc(n.who)}:</strong> ${esc(n.what)}</p>`;
    };
    const paneLabels = (roles) => {
      $('#team-pane-label').className = `pane-label ${roles ? 'owner' : 'team'}`;
      $('#client-pane-label').className = `pane-label ${roles ? 'writer' : 'client'}`;
      $('#team-name').textContent = roles ? 'Jay · Owner (super admin)' : 'Team view';
      $('#client-name').textContent = roles ? `${cmpName()} · Writer` : 'Client view';
      $('#client-pane-label use').setAttribute('href', roles ? '#i-users' : '#i-phone');
      $$('[data-only]').forEach((el) => { el.hidden = el.dataset.only !== fmode; });
      $$('[data-fmode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.fmode === fmode)));
    };
    const loadFrames = () => {
      paneLabels(fmode === 'roles');
      if (fmode === 'roles') {
        if (screen === 'order') {
          if (mode === 'new') {
            // Start on an order someone else is writing: that shows the biggest difference
            orders = JO.load();
            const pickO = orders.find((x) => x.status === 'writing' && x.writer && writerKey(x.writer) !== cmpWriter) || orders.find((x) => x.status !== 'new') || orders[0];
            mode = 'order'; current = pickO.id; renderMap();
          }
          const o = pick();
          current = o.id;
          team.src = `order.html?id=${encodeURIComponent(o.id)}&embed=1&as=jay`;
          client.src = `order.html?id=${encodeURIComponent(o.id)}&embed=1&as=${cmpWriter}`;
          $('#team-label').textContent = $('#client-label').textContent = 'admin/order.html';
        } else {
          team.src = `${screen}.html?embed=1&as=jay`;
          client.src = `${screen}.html?embed=1&as=${cmpWriter}`;
          $('#team-label').textContent = $('#client-label').textContent = `admin/${screen}.html`;
        }
        setUrl();
        return;
      }
      if (mode === 'new') {
        team.src = 'orders.html?embed=1';
        client.src = '../order.html?embed=1';
        $('#client-label').textContent = 'website: order card';
        $('#team-label').textContent = 'admin/orders.html';
      } else {
        const o = pick();
        current = o.id;
        team.src = `order.html?id=${encodeURIComponent(o.id)}&embed=1`;
        client.src = `../${JO.trackUrl(o)}&embed=1`;
        $('#client-label').textContent = 'tracking link';
        $('#team-label').textContent = 'admin/order.html';
      }
      setUrl();
    };
    const startNewClient = () => { fmode = 'client'; mode = 'new'; current = null; renderMap(); loadFrames(); };
    $$('[data-fmode]').forEach((b) => b.addEventListener('click', () => {
      fmode = b.dataset.fmode;
      renderMap();
      loadFrames();
      if (fmode === 'roles') toast(`Left: signed in as Jay. Right: signed in as ${cmpName()}. Same order, same moment.`);
    }));
    $('#cmp-writer').addEventListener('change', (e) => { cmpWriter = e.target.value; renderMap(); loadFrames(); });
    $('#cmp-screen').addEventListener('change', (e) => { screen = e.target.value; renderMap(); loadFrames(); });

    sel.addEventListener('change', () => {
      if (!sel.value) return startNewClient();
      mode = 'order';
      current = sel.value;
      if (fmode === 'roles') screen = 'order';
      $('#cmp-screen').value = screen;
      renderMap();
      loadFrames();
    });
    $('#flow-start').addEventListener('click', () => { startNewClient(); toast('New client: start by choosing a service on the right'); });
    $('#flow-new').addEventListener('click', () => {
      orders = JO.load();
      const o = JO.createTestOrder(orders);
      JO.save(orders);
      mode = 'order';
      current = o.id;
      renderMap();
      loadFrames();
      toast(`Created ${o.id}: a new order waiting for payment`);
    });
    const skip = (hours, label) => {
      if (mode !== 'order') return toast('Create or pick an order first', true);
      orders = JO.load();
      const o = orders.find((x) => x.id === current);
      const before = o.status;
      JO.skipTime(o, hours);
      JO.save(orders);
      renderMap();
      loadFrames();
      toast(before !== o.status ? `${label} later: ${JO.STATUS[before].team} → ${JO.STATUS[o.status].team}` : `${label} later: no automatic change for this stage`);
    };
    $('#flow-24h').addEventListener('click', () => skip(24, '24 hours'));
    $('#flow-5d').addEventListener('click', () => skip(120, '5 days'));
    $('#flow-reset').addEventListener('click', async () => {
      const okReset = await confirmBox({ title: 'Reset all demo orders?', text: 'Orders go back to the original sample data.', ok: 'Reset', danger: true });
      if (!okReset) return;
      JO.reset();
      startNewClient();
    });

    // The client finished the order card in the client pane: the new order has just appeared on the
    // team's list (left). After a moment, both sides follow that order. The client keeps their success
    // screen (link + Pay button); the team side opens the order itself.
    window.addEventListener('message', (e) => {
      const m = e.data || {};
      if (m.type !== 'jaycvs:order-created' || !m.id) return;
      toast(`New order ${m.id} just arrived on the team's list`);
      setTimeout(() => {
        mode = 'order';
        current = m.id;
        renderMap();
        team.src = `order.html?id=${encodeURIComponent(m.id)}&embed=1`;
        $('#team-label').textContent = 'admin/order.html';
        $('#client-label').textContent = 'website → tracking link';
        setUrl();
      }, 1800);
    });

    JO.onChange(renderMap); // either side changed an order → move the highlight
    renderMap();
    loadFrames();
  }

  // =====================================================================
  // Jobs inbox: drop many posters → AI reads each → check → approve (publish) or discard
  // =====================================================================
  if (page === 'inbox' && !locked) {
    let items = inbox.load();
    const params = new URLSearchParams(location.search);
    let view = params.get('show') || 'check';
    let sel = params.get('item');
    const VIEWS = ['check', 'flagged', 'reading', 'approved', 'discarded'];
    const LABEL = { title: 'Job title', company: 'Company', location: 'Location', category: 'Category', type: 'Job type', workMode: 'Work setting', deadline: 'Deadline', target: 'How to apply', summary: 'About the role', requirements: 'Requirements' };
    const METHOD = { email: 'Email', link: 'Online link', whatsapp: 'WhatsApp / phone', 'in-person': 'In person' };
    const TARGET = { email: ['email', 'Send applications to', 'careers@company.co.ke'], link: ['link', 'Application link', 'https://'], whatsapp: ['phone', 'WhatsApp / phone number', '07XX XXX XXX'], 'in-person': ['address', 'Where to apply', 'Address or building'] };
    const CATS = ['IT & Tech', 'Finance & Accounting', 'Healthcare', 'NGO & Development', 'Sales & Marketing', 'Hospitality', 'Engineering & Safety', 'Education', 'Admin & Office', 'Transport & Logistics', 'Other'];
    const TYPES = ['Full-time', 'Part-time', 'Contract', 'Graduate / Internship', 'Volunteer'];
    const MODES = ['On-site', 'Hybrid', 'Remote', 'Field'];
    const AVG = [1600, 430]; // tokens in / out for one poster (measured on the sample batch)
    const posterSrc = (p) => (p && !p.startsWith('data:') ? `../${p}` : p);
    const save = () => { inbox.save(items); updateInboxBadge(); };

    // ---------- checks: scam, duplicate, deadline, unsure / missing fields ----------
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\b(ltd|limited|the|kenya|plc|co|posts?)\b/g, ' ').replace(/\s+/g, ' ').trim();
    const words = (s) => new Set(norm(s).split(' ').filter((w) => w.length > 2 && !/^\d+$/.test(w)));
    const similar = (a, b) => {
      const A = words(a); const B = words(b);
      if (!A.size || !B.size) return false;
      let n = 0;
      A.forEach((w) => { if (B.has(w)) n++; });
      return n / Math.min(A.size, B.size) >= 0.6;
    };
    const targetOf = (j) => { const a = j.apply || {}; return a[(TARGET[a.method] || TARGET.email)[0]] || ''; };
    const missingOf = (j) => ['title', 'company', 'location'].filter((k) => !String(j[k] || '').trim()).map((k) => LABEL[k])
      .concat(targetOf(j).trim() ? [] : ['How to apply']);
    const flagsFor = (it) => {
      const j = it.job;
      if (!j) return [];
      const f = [];
      const raw = it.raw || '';
      const scam = [];
      if (/(registration|processing|application|interview|medical)\s+fee|pay\s+(a\s+)?(fee|kes|ksh)|send\s+(money|kes|ksh)/i.test(raw)) scam.push('asks applicants to pay a fee');
      const pay = parseInt(String(j.salary || '').replace(/\D/g, ''), 10);
      if (/no experience/i.test(raw) && pay >= 60000) scam.push(`offers ${j.salary} with no experience needed`);
      if (/0\d{3}\s?\d{3}\s?\d{3}/.test(raw) && !/@|https?:|\.co\.ke|\.com|\.org/i.test(raw)) scam.push('gives only a personal phone number (no company email or website)');
      if (/urgent|hurry|slots only/i.test(raw)) scam.push('pushes people to act fast');
      if (scam.length >= 2) f.push({ lvl: 'critical', key: 'scam', text: 'Possible scam', more: `This advert ${scam.join('; ')}. Real employers never charge people to apply.` });
      const dup = jobs.find((x) => x.id !== it.jobId && statusOf(x) !== 'expired' && similar(x.company, j.company) && similar(x.title, j.title));
      const dupIn = !dup && items.find((o) => o.id !== it.id && o.job && ['check', 'approved'].includes(o.state) && o.addedAt < it.addedAt && similar(o.job.company, j.company) && similar(o.job.title, j.title));
      if (dup) f.push({ lvl: 'warning', key: 'dup', text: 'Duplicate', more: `Already on the website: ${dup.title} · ${dup.company} (posted ${fmt(dup.posted)}).`, jobId: dup.id });
      else if (dupIn) f.push({ lvl: 'warning', key: 'dup', text: 'Duplicate', more: `Same as another poster in the inbox: ${dupIn.job.title} · ${dupIn.job.company}.`, itemId: dupIn.id });
      if (!j.deadline && !j.openEnded) f.push({ lvl: 'warning', key: 'deadline', text: 'No deadline', more: 'The poster has no closing date. Set one, or tick "Open until filled".' });
      else if (j.deadline) {
        const d = daysLeft(j);
        if (d < 0) f.push({ lvl: 'critical', key: 'expired', text: 'Deadline passed', more: `Applications closed on ${fmt(j.deadline)}.` });
        else if (d <= 3) f.push({ lvl: 'info', key: 'soon', text: d === 0 ? 'Closes today' : `Closes in ${d} day${d > 1 ? 's' : ''}`, more: 'Worth sharing on the channel today.' });
      }
      const unsure = (it.unsure || []).filter((k) => !(it.checked || []).includes(k));
      if (unsure.length) f.push({ lvl: 'warning', key: 'unsure', text: `Check ${unsure.length} field${unsure.length > 1 ? 's' : ''}`, more: `The AI wasn't sure about: ${unsure.map((k) => LABEL[k]).join(', ')}. Compare with the poster.` });
      const missing = missingOf(j);
      if (missing.length) f.push({ lvl: 'warning', key: 'missing', text: 'Missing details', more: `Fill in: ${missing.join(', ')}.` });
      return f;
    };
    const isClean = (it) => !flagsFor(it).some((f) => f.lvl !== 'info');
    const inView = (it, v) => ({
      reading: it.state === 'reading',
      check: it.state === 'check' && isClean(it),
      flagged: it.state === 'check' && !isClean(it),
      approved: it.state === 'approved' && new Date(it.doneAt).toDateString() === new Date().toDateString(),
      discarded: it.state === 'discarded',
    })[v];
    // The poster you're working on stays in its list until you move on (fixing a flag shouldn't make it jump away)
    const listFor = (v, keep) => items.filter((it) => inView(it, v) || (keep && (v === 'check' || v === 'flagged') && it.id === sel && it.state === 'check' && it.view === v));
    const flagChips = (it) => flagsFor(it).map((f) => `<span class="iflag ${f.lvl}">${f.lvl === 'critical' ? '⚠ ' : f.lvl === 'warning' ? '! ' : '⏱ '}${esc(f.text)}</span>`).join('');

    // ---------- reading (simulated: 3 posters at a time, 1.5–3.5 s each) ----------
    items.forEach((it) => { if (it.state === 'reading') it.started = null; });
    const readNext = () => {
      const busy = items.filter((i) => i.state === 'reading' && i.started).length;
      items.filter((i) => i.state === 'reading' && !i.started).slice(0, Math.max(0, 3 - busy)).forEach((it) => {
        it.started = Date.now();
        const ms = 1500 + Math.random() * 2000;
        setTimeout(() => finishRead(it.id, ms), ms);
      });
    };
    function finishRead(id, ms) {
      const it = items.find((i) => i.id === id);
      if (!it || it.state !== 'reading') return;
      const sample = it.sample != null ? (window.INBOX_SAMPLES || [])[it.sample] : null;
      if (sample) {
        const live = sample.sampleId && (window.JOBS || []).find((j) => j.id === sample.sampleId);
        const base = sample.job || live || {};
        it.job = JSON.parse(JSON.stringify({ title: base.title, company: base.company, location: base.location, workMode: base.workMode, type: base.type, category: base.category, deadline: base.deadline, salary: base.salary, summary: base.summary, responsibilities: base.responsibilities || [], requirements: base.requirements || [], apply: base.apply }));
        it.tokens = sample.tokens;
      } else {
        // The preview cannot really read your own images; the real build sends them to the AI model
        it.job = { title: '', company: '', location: '', workMode: 'On-site', type: 'Full-time', category: '', deadline: null, salary: null, summary: '', responsibilities: [], requirements: [], apply: { method: 'email' } };
        it.tokens = AVG;
        it.note = 'This preview only reads the sample posters, so type the details from the poster. The real version reads any poster.';
      }
      it.readMs = Math.round(ms);
      it.state = 'check';
      it.started = null;
      logAi('Poster reading', it.tokens[0], it.tokens[1]);
      save();
      if (isOwner()) showEst();
      // Everything read: move on to the posters that need checking
      if (view === 'reading' && !listFor('reading').length) { view = listFor('check').length ? 'check' : 'flagged'; sel = null; }
      render();
      readNext();
    }
    const addItems = (list) => {
      if (aiLeft() < POSTER_TOKENS) { outOfTokens(); return; }
      const t = Date.now();
      list.forEach((x, i) => items.push({ id: `ib-${t}-${i}`, addedAt: t + i, state: 'reading', ...x }));
      save();
      if (view !== 'reading' && !listFor(view).length) view = 'reading';
      render();
      readNext();
      toast(`${list.length} poster${list.length > 1 ? 's' : ''} added. Reading now…`);
    };

    $('#load-sample').addEventListener('click', () => {
      addItems((window.INBOX_SAMPLES || []).map((s, i) => ({ sample: i, poster: s.poster, source: s.source, raw: s.raw, unsure: s.unsure.slice() })));
    });
    // Your own posters: shrunk in the browser before saving (photos from phones are large)
    const shrink = (file) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 900 / img.height, 720 / img.width);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
    const takeFiles = async (files) => {
      const imgs = [...files].filter((f) => f.type.startsWith('image/')).slice(0, 30);
      if (!imgs.length) { toast('Those files are not images', true); return; }
      const posters = (await Promise.all(imgs.map(shrink))).map((p, i) => (p ? { poster: p, source: 'Uploaded', name: imgs[i].name, raw: '', unsure: [] } : null)).filter(Boolean);
      addItems(posters);
    };
    const drop = $('#inbox-drop');
    $('#inbox-files').addEventListener('change', (e) => { takeFiles(e.target.files); e.target.value = ''; });
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('drag')));
    drop.addEventListener('drop', (e) => { e.preventDefault(); takeFiles(e.dataTransfer.files); });
    $('#intake-est').hidden = !isOwner();
    const showEst = () => { $('#intake-est').innerHTML = `<b>About ${(AVG[0] + AVG[1]).toLocaleString()} tokens per poster.</b> ${aiLeft().toLocaleString()} tokens left ≈ ${Math.floor(aiLeft() / (AVG[0] + AVG[1])).toLocaleString()} posters.`; };
    showEst();

    // ---------- publish / discard ----------
    const slug = (s) => norm(s).replace(/ /g, '-').slice(0, 60) || 'job';
    function publish(it) {
      const j = it.job;
      let id = slug(`${j.company} ${j.title.replace(/\(.*?\)/g, '')}`);
      while (findJob(id)) id += '-2';
      const lines = (a) => (Array.isArray(a) ? a : String(a || '').split('\n')).map((x) => x.trim()).filter(Boolean);
      const job = { ...j, id, deadline: j.openEnded ? null : j.deadline, responsibilities: lines(j.responsibilities), requirements: lines(j.requirements), status: 'published', posted: isoDate(today), views: 0, source: it.source === 'Uploaded' ? '' : it.source, poster: it.poster };
      delete job.openEnded;
      jobs.push(job);
      if (!store.save(jobs)) { jobs.pop(); return false; }
      Object.assign(it, { state: 'approved', jobId: id, doneAt: Date.now(), by: me() });
      return true;
    }
    async function approve(it, quiet) {
      if (!it || it.state !== 'check') return;
      readForm(it);
      const missing = missingOf(it.job);
      if (missing.length) { toast(`Fill in: ${missing.join(', ')}`, true); focusField(missing[0]); return; }
      const fl = flagsFor(it);
      const scam = fl.find((f) => f.key === 'scam');
      const dup = fl.find((f) => f.key === 'dup');
      const expired = fl.find((f) => f.key === 'expired');
      if (!quiet && (scam || dup || expired)) {
        const ok = await confirmBox(scam
          ? { title: 'Publish a possible scam?', text: 'This advert asks people to pay or shows other scam signs. Publishing it could hurt Jay CVS\'s name.', ok: 'Publish anyway', danger: true }
          : dup ? { title: 'Publish a duplicate?', text: `${dup.more} Only publish if it is a different job.`, ok: 'It\'s different: publish', danger: false }
            : { title: 'Publish an expired job?', text: expired.more, ok: 'Publish anyway', danger: false });
        if (!ok) return;
      }
      const next = neighbour(it, 1);
      if (!publish(it)) return;
      save();
      if (!quiet) {
        toast(`Published: ${it.job.title}. Added to today's channel post`);
        sel = next ? next.id : null;
        moveOnIfEmpty();
        render();
      }
    }
    const REASONS = [['scam', 'Possible scam'], ['dup', 'Duplicate'], ['expired', 'Deadline passed'], ['not-job', 'Not a job advert'], ['other', 'Other']];
    function discardBox(it) {
      return new Promise((resolve) => {
        const fl = flagsFor(it).map((f) => f.key);
        const pre = REASONS.find(([k]) => fl.includes(k)) || REASONS[3];
        const d = document.createElement('dialog');
        d.className = 'admin-dialog';
        d.innerHTML = `<form method="dialog" class="dialog-body">
          <div class="dialog-icon danger">${icon('trash')}</div>
          <h2>Discard this poster?</h2><p>It won't be published. You can restore it from "Discarded" today.</p>
          <fieldset class="reason-pick"><legend>Why?</legend>${REASONS.map(([k, l]) => `<label><input type="radio" name="r" value="${k}"${k === pre[0] ? ' checked' : ''}> ${l}</label>`).join('')}</fieldset>
          <div class="dialog-actions"><button type="button" class="btn btn-ghost" data-r="0">Cancel</button><button type="submit" class="btn btn-danger" data-r="1">Discard</button></div></form>`;
        document.body.append(d);
        let result = null;
        d.querySelector('[data-r="0"]').addEventListener('click', () => d.close());
        d.querySelector('form').addEventListener('submit', () => { result = d.querySelector('input[name="r"]:checked').value; });
        d.addEventListener('close', () => { d.remove(); resolve(result); });
        d.showModal();
      });
    }
    async function discard(it, reason) {
      if (!it || it.state !== 'check') return;
      readForm(it);
      const why = reason || await discardBox(it);
      if (!why) return;
      const next = neighbour(it, 1);
      Object.assign(it, { state: 'discarded', reason: why, doneAt: Date.now(), by: me() });
      save();
      toast(`Discarded: ${(REASONS.find(([k]) => k === why) || [0, why])[1]}`);
      sel = next ? next.id : null;
      moveOnIfEmpty();
      render();
    }

    // ---------- the form (edits are saved as you type) ----------
    const opt = (list, v) => list.map((x) => `<option${x === v ? ' selected' : ''}>${esc(x)}</option>`).join('');
    const unsureOf = (it, k) => (it.unsure || []).includes(k) && !(it.checked || []).includes(k);
    const field = (it, k, html, full) => `<div class="f${full ? ' full' : ''}${unsureOf(it, k) ? ' unsure' : ''}" data-k="${k}">${html}${unsureOf(it, k) ? `<small class="unsure-note">AI wasn't sure: check the poster. <button type="button" data-ok="${k}">Looks right</button></small>` : ''}</div>`;
    function formHtml(it) {
      const j = it.job;
      const a = j.apply || { method: 'email' };
      const [tk, tl, tp] = TARGET[a.method] || TARGET.email;
      return `<form class="d-form" id="d-form" novalidate>
        ${field(it, 'title', `<label for="i-title">Job title <em>*</em></label><input id="i-title" name="title" value="${esc(j.title)}">`, true)}
        ${field(it, 'company', `<label for="i-company">Company <em>*</em></label><input id="i-company" name="company" value="${esc(j.company)}">`)}
        ${field(it, 'location', `<label for="i-location">Location <em>*</em></label><input id="i-location" name="location" value="${esc(j.location)}">`)}
        ${field(it, 'category', `<label for="i-category">Category</label><select id="i-category" name="category"><option value="">Choose…</option>${opt(CATS, j.category)}</select>`)}
        ${field(it, 'type', `<label for="i-type">Job type</label><select id="i-type" name="type">${opt(TYPES, j.type)}</select>`)}
        ${field(it, 'workMode', `<label for="i-mode">Work setting</label><select id="i-mode" name="workMode">${opt(MODES, j.workMode)}</select>`)}
        ${field(it, 'deadline', `<label for="i-deadline">Deadline</label><input type="date" id="i-deadline" name="deadline" value="${esc(j.deadline || '')}"${j.openEnded ? ' disabled' : ''}>
          <label class="inline-check"><input type="checkbox" name="openEnded"${j.openEnded ? ' checked' : ''}> Open until filled</label>`)}
        ${field(it, 'method', `<label for="i-method">How to apply</label><select id="i-method" name="method">${Object.entries(METHOD).map(([k, l]) => `<option value="${k}"${k === a.method ? ' selected' : ''}>${l}</option>`).join('')}</select>`)}
        ${field(it, 'target', `<label for="i-target">${tl} <em>*</em></label><input id="i-target" name="target" data-key="${tk}" value="${esc(a[tk] || '')}" placeholder="${esc(tp)}">`, true)}
        ${field(it, 'summary', `<label for="i-summary">About the role</label><textarea id="i-summary" name="summary" rows="2">${esc(j.summary)}</textarea>`, true)}
        ${field(it, 'requirements', `<label for="i-req">Requirements <small>(one per line)</small></label><textarea id="i-req" name="requirements" rows="4">${esc((Array.isArray(j.requirements) ? j.requirements : [j.requirements || '']).join('\n'))}</textarea>`, true)}
      </form>`;
    }
    function readForm(it) {
      const form = $('#d-form');
      if (!form || !it || form.dataset.id !== it.id) return;
      const v = (n) => form.elements[n].value.trim();
      const j = it.job;
      Object.assign(j, { title: v('title'), company: v('company'), location: v('location'), category: v('category'), type: v('type'), workMode: v('workMode'), summary: v('summary') });
      j.openEnded = form.elements.openEnded.checked;
      j.deadline = j.openEnded ? null : (v('deadline') || null);
      j.requirements = form.elements.requirements.value.split('\n').map((x) => x.trim()).filter(Boolean);
      const method = v('method');
      j.apply = { ...(j.apply || {}), method };
      j.apply[form.elements.target.dataset.key] = v('target');
    }
    const focusField = (label) => {
      const k = Object.keys(LABEL).find((x) => LABEL[x] === label) || 'title';
      const el = $(`#d-form [data-k="${k}"] input, #d-form [data-k="${k}"] select, #d-form [data-k="${k}"] textarea`);
      if (el) el.focus();
    };

    // ---------- share: WhatsApp text + square image for one job ----------
    const shareImg = (j) => `<div class="share-img" role="img" aria-label="Image for WhatsApp and Instagram: ${esc(j.title)} at ${esc(j.company)}">
        <div class="si-top"><span class="si-logo">J</span><span>Jay<b>CVS</b></span><i>Jobs</i></div>
        <div class="si-kicker">NOW HIRING</div>
        <div class="si-title">${esc(j.title)}</div>
        <div class="si-co">${esc(j.company)}</div>
        <ul><li>📍 ${esc(j.location)}</li><li>⏳ ${j.deadline ? `Apply by ${esc(fmt(j.deadline))}` : 'Open until filled'}</li></ul>
        <div class="si-foot">Full details: jaycvs.co.ke/jobs<br><span>Need a CV that gets you shortlisted? We write it.</span></div>
      </div>`;

    // ---------- render ----------
    const neighbour = (it, step) => {
      const list = listFor(view, true);
      const i = list.findIndex((x) => x.id === it.id);
      return list[i + step] || list[i - step] || null;
    };
    const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.round(m / 60)}h ago`; };
    const flagsHtml = (fl) => fl.map((f) => `<div class="d-flag ${f.lvl}"><span class="d-flag-icon" aria-hidden="true">${f.lvl === 'info' ? '⏱' : '⚠'}</span><div><b>${esc(f.text)}</b><span>${esc(f.more)}</span></div>
          <div class="d-flag-acts">${f.key === 'scam' ? '<button type="button" class="btn btn-danger btn-sm" data-discard="scam">Discard as scam</button>' : ''}
          ${f.key === 'dup' ? `${f.jobId ? `<a class="btn btn-ghost btn-sm" href="../job.html?id=${encodeURIComponent(f.jobId)}" target="_blank" rel="noopener">See the live job ↗</a>` : `<button type="button" class="btn btn-ghost btn-sm" data-goto="${f.itemId}">See the other poster</button>`}<button type="button" class="btn btn-ghost btn-sm" data-discard="dup">Discard duplicate</button>` : ''}
          ${f.key === 'expired' ? '<button type="button" class="btn btn-ghost btn-sm" data-discard="expired">Discard</button>' : ''}</div></div>`).join('');
    function renderDetail(it) {
      const box = $('#detail');
      if (!it) {
        const waiting = listFor('check').length + listFor('flagged').length;
        box.innerHTML = `<div class="d-empty">${icon('inbox')}<h2>${items.length ? (waiting ? 'Pick a poster on the left' : 'All caught up') : 'No posters yet'}</h2>
          <p>${items.length ? (waiting ? `${waiting} poster${waiting > 1 ? 's are' : ' is'} still waiting under ${listFor('check').length ? 'To check' : 'Flagged'}.` : 'Every poster has been approved or discarded. Copy today\'s channel post below.') : 'Drop today\'s posters above, or load the sample batch to see how it works.'}</p></div>`;
        return;
      }
      const list = listFor(view, true);
      const pos = list.findIndex((x) => x.id === it.id);
      const nav = `<div class="d-nav"><button type="button" class="icon-btn" data-step="-1" aria-label="Previous poster"${pos <= 0 ? ' disabled' : ''}>‹</button><span>${pos + 1} of ${list.length}</span><button type="button" class="icon-btn" data-step="1" aria-label="Next poster"${pos >= list.length - 1 ? ' disabled' : ''}>›</button></div>`;
      const poster = `<figure class="d-poster${it.state === 'reading' ? ' scanning' : ''}"><img src="${esc(posterSrc(it.poster))}" alt="Job poster as received${it.job && it.job.title ? `: ${esc(it.job.title)}` : ''}">
        <figcaption>${esc(it.source)}${it.name ? ` · ${esc(it.name)}` : ''} · <a href="${esc(posterSrc(it.poster))}" target="_blank" rel="noopener">Open full size</a></figcaption></figure>`;
      if (it.state === 'reading') {
        box.innerHTML = `<div class="d-head"><div><span class="ipill reading">Reading…</span><small>The AI is reading this poster. Usually 2–4 seconds.</small></div>${nav}</div>
          <div class="d-grid">${poster}<div class="d-skel">${'<span></span>'.repeat(7)}</div></div>`;
        return;
      }
      const fl = flagsFor(it);
      const cost = it.tokens && isOwner() ? ` · ${(it.tokens[0] + it.tokens[1]).toLocaleString()} tokens` : '';
      const meta = `<small>${esc(it.source)} · read in ${(it.readMs / 1000).toFixed(1)}s${cost}</small>`;
      if (it.state === 'approved') {
        const job = findJob(it.jobId) || { ...it.job, id: it.jobId };
        box.innerHTML = `<div class="d-head"><div><span class="ipill live">✓ Live on the website</span><small>Approved by ${esc(shortName(it.by))} ${ago(it.doneAt)} · <a href="../job.html?id=${encodeURIComponent(it.jobId)}" target="_blank" rel="noopener">View job page ↗</a> · <a href="post-job.html?id=${encodeURIComponent(it.jobId)}">Edit</a></small></div>${nav}</div>
          <div class="share">
            <div><h3>Image for the channel</h3>${shareImg(job)}<button type="button" class="btn btn-ghost btn-sm" data-act="img">${icon('download')}Download image</button></div>
            <div><h3>Message text</h3><pre class="wa-text">${esc(waText(job))}</pre>
              <div class="share-actions"><button type="button" class="btn btn-primary btn-sm" data-act="copy">${icon('copy')}Copy text</button>
              <button type="button" class="btn btn-ghost btn-sm" data-act="unpublish">Unpublish</button></div></div>
          </div>`;
        return;
      }
      if (it.state === 'discarded') {
        box.innerHTML = `<div class="d-head"><div><span class="ipill gone">Discarded: ${esc((REASONS.find(([k]) => k === it.reason) || [0, it.reason])[1])}</span><small>By ${esc(shortName(it.by))} ${ago(it.doneAt)}</small></div>${nav}</div>
          <div class="d-grid">${poster}<div class="d-gone"><p>This poster was not published.</p><button type="button" class="btn btn-ghost" data-act="restore">Restore to inbox</button></div></div>`;
        return;
      }
      const flagHtml = flagsHtml(fl);
      box.innerHTML = `<div class="d-head"><div><span class="ipill ${isClean(it) ? 'ready' : 'flagged'}">${isClean(it) ? '✓ Ready to approve' : '⚠ Needs a look'}</span>${meta}</div>${nav}</div>
        ${it.note ? `<p class="d-note">${icon('info')}${esc(it.note)}</p>` : ''}
        <div id="d-flags" class="d-flags">${flagHtml}</div>
        <div class="d-grid">${poster}${formHtml(it)}</div>
        <div class="d-actions">
          <button type="button" class="btn btn-ghost" data-act="discard">${icon('trash')}Discard <kbd>D</kbd></button>
          <button type="button" class="btn btn-ghost" data-act="skip">Skip for now</button>
          <button type="button" class="btn btn-primary" data-act="approve">${icon('check')}Approve &amp; publish <kbd>A</kbd></button>
        </div>`;
      $('#d-form').dataset.id = it.id;
    }
    function renderQueue() {
      const list = listFor(view, true);
      $('#queue').innerHTML = list.length ? list.map((it) => `<li><button type="button" class="q-item${it.id === sel ? ' is-sel' : ''}" data-id="${it.id}" aria-current="${it.id === sel}">
          <img src="${esc(posterSrc(it.poster))}" alt="" loading="lazy">
          <span class="q-main">${it.state === 'reading'
            ? `<strong class="q-reading">Reading poster…</strong><small>${esc(it.source)}</small>`
            : `<strong>${esc(it.job.title || 'Untitled poster')}</strong><small>${esc(it.job.company || '—')} · ${esc(it.source)}</small>`}
            ${it.state === 'check' ? `<span class="q-flags">${flagChips(it)}</span>` : it.state === 'approved' ? '<span class="q-flags"><span class="iflag live">✓ Live</span></span>' : it.state === 'discarded' ? `<span class="q-flags"><span class="iflag gone">${esc((REASONS.find(([k]) => k === it.reason) || [0, ''])[1])}</span></span>` : ''}
          </span></button></li>`).join('')
        : `<li class="q-empty">${{ check: 'Nothing ready to approve.', flagged: 'Nothing flagged.', reading: 'Nothing being read.', approved: 'Nothing approved today yet.', discarded: 'Nothing discarded.' }[view]}</li>`;
    }
    function renderTabs() {
      $$('.inbox-tabs button').forEach((b) => {
        const n = listFor(b.dataset.st).length;
        b.setAttribute('aria-pressed', String(b.dataset.st === view));
        b.querySelector('span').textContent = n;
        if (b.classList.contains('tab-alert')) b.classList.toggle('zero', !n);
      });
      const clean = listFor('check');
      const btn = $('#approve-clean');
      btn.hidden = clean.length < 2;
      btn.innerHTML = `${icon('check')}Approve all ${clean.length} ready`;
    }
    function renderDigest() {
      const done = items.filter((it) => inView(it, 'approved')).sort((a, b) => a.doneAt - b.doneAt);
      $('#digest').hidden = !done.length;
      if (!done.length) return;
      const day = today.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      const lines = [`📢 *JOBS TODAY · ${day}*`, ''];
      done.forEach((it, i) => {
        const j = findJob(it.jobId) || it.job;
        lines.push(`*${i + 1}. ${j.title}*`, `🏢 ${j.company} · 📍 ${j.location}`, `⏳ ${j.deadline ? `Apply by ${fmt(j.deadline)}` : 'Open until filled'}`, `👉 ${SITE}/job.html?id=${it.jobId}`, '');
      });
      lines.push(`🔎 All jobs: ${SITE}/jobs.html`, `✍🏾 Is your CV ready? Get one that gets you shortlisted: ${SITE}/services.html`);
      $('#digest-text').textContent = lines.join('\n');
    }
    // After approving / discarding: if this list is now empty, go to whatever still needs a look
    const moveOnIfEmpty = () => { if (!listFor(view, true).length) { const v = ['check', 'flagged'].find((x) => listFor(x).length); if (v) { view = v; sel = null; } } };
    function render() {
      const list = listFor(view, true);
      if (!list.find((x) => x.id === sel)) sel = list[0] ? list[0].id : null;
      items.forEach((x) => { x.view = x.id === sel ? view : null; });
      $('.intake').classList.toggle('compact', items.length > 0);
      renderTabs();
      renderQueue();
      renderDetail(items.find((x) => x.id === sel));
      renderDigest();
      history.replaceState(null, '', `?show=${view}${sel ? `&item=${sel}` : ''}`);
    }
    const current = () => items.find((x) => x.id === sel);
    const go = (step) => { const it = current(); if (!it) return; const list = listFor(view, true); const i = list.findIndex((x) => x.id === it.id); const n = list[i + step]; if (n) { readForm(it); save(); sel = n.id; render(); } };

    // ---------- events ----------
    $('.inbox-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-st]');
      if (!b) return;
      readForm(current()); save();
      view = b.dataset.st; sel = null; render();
    });
    $('#queue').addEventListener('click', (e) => {
      const b = e.target.closest('.q-item');
      if (!b) return;
      readForm(current()); save();
      sel = b.dataset.id; render();
    });
    $('#approve-clean').addEventListener('click', async () => {
      const clean = listFor('check');
      const ok = await confirmBox({ title: `Publish ${clean.length} jobs?`, text: 'These have no warnings: no scam signs, no duplicates, deadlines set and every field read clearly. They go live on the website now.', ok: `Publish ${clean.length}`, danger: false });
      if (!ok) return;
      for (const it of clean) await approve(it, true); // eslint-disable-line no-await-in-loop
      save();
      toast(`${clean.length} jobs published. Today's channel post is ready below`);
      moveOnIfEmpty();
      render();
    });
    const detail = $('#detail');
    detail.addEventListener('click', async (e) => {
      const it = current();
      const t = e.target;
      const step = t.closest('[data-step]');
      if (step) { go(Number(step.dataset.step)); return; }
      const okBtn = t.closest('[data-ok]');
      if (okBtn) { readForm(it); it.checked = [...(it.checked || []), okBtn.dataset.ok]; save(); render(); return; }
      const dis = t.closest('[data-discard]');
      if (dis) { discard(it, dis.dataset.discard); return; }
      const gotoBtn = t.closest('[data-goto]');
      if (gotoBtn) { readForm(it); save(); const o = items.find((x) => x.id === gotoBtn.dataset.goto); if (o) { view = VIEWS.find((v) => inView(o, v)) || view; sel = o.id; render(); } return; }
      const act = t.closest('[data-act]');
      if (!act) return;
      const a = act.dataset.act;
      if (a === 'approve') approve(it);
      if (a === 'discard') discard(it);
      if (a === 'skip') go(1);
      if (a === 'restore') { Object.assign(it, { state: 'check', reason: null }); save(); view = isClean(it) ? 'check' : 'flagged'; render(); toast('Back in the inbox'); }
      if (a === 'unpublish') {
        const ok = await confirmBox({ title: 'Unpublish this job?', text: 'It comes off the website and goes back to the inbox.', ok: 'Unpublish', danger: true });
        if (!ok) return;
        jobs = jobs.filter((j) => j.id !== it.jobId); store.save(jobs);
        Object.assign(it, { state: 'check', jobId: null }); save(); view = isClean(it) ? 'check' : 'flagged'; render(); toast('Unpublished');
      }
      if (a === 'copy') { try { await navigator.clipboard.writeText(waText(findJob(it.jobId))); toast('Copied. Paste it in the WhatsApp channel'); } catch (err) { toast('Select the text and copy it', true); } }
      if (a === 'img') toast('In the real version this saves a 1080×1080 image for WhatsApp and Instagram');
    });
    // Typing updates the checks live (e.g. adding a deadline clears "No deadline")
    let typing;
    detail.addEventListener('input', (e) => {
      const it = current();
      if (!it || !e.target.closest('#d-form')) return;
      const k = e.target.closest('[data-k]')?.dataset.k;
      if (k && (it.unsure || []).includes(k) && !(it.checked || []).includes(k)) it.checked = [...(it.checked || []), k];
      clearTimeout(typing);
      typing = setTimeout(() => {
        readForm(it); save();
        const fl = flagsFor(it);
        renderTabs(); renderQueue();
        const pill = $('.d-head .ipill');
        if (pill) { pill.className = `ipill ${isClean(it) ? 'ready' : 'flagged'}`; pill.textContent = isClean(it) ? '✓ Ready to approve' : '⚠ Needs a look'; }
        $$('#d-form .unsure').forEach((f) => { if ((it.checked || []).includes(f.dataset.k)) { f.classList.remove('unsure'); f.querySelector('.unsure-note')?.remove(); } });
        const flags = $('#d-flags');
        if (flags) flags.innerHTML = flagsHtml(fl);
      }, 350);
    });
    detail.addEventListener('change', (e) => {
      const it = current();
      if (!it || !e.target.closest('#d-form')) return;
      if (e.target.name === 'method' || e.target.name === 'openEnded') { readForm(it); save(); render(); }
    });
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, textarea, select, dialog')) return;
      const k = e.key.toLowerCase();
      if (k === 'j') go(1);
      else if (k === 'k') go(-1);
      else if (k === 'a') approve(current());
      else if (k === 'd') discard(current());
      else return;
      e.preventDefault();
    });
    $('#copy-digest').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('#digest-text').textContent); toast('Copied. Paste it in the WhatsApp channel'); } catch (err) { toast('Select the text and copy it', true); }
    });
    // Another tab (or the dashboard) changed the inbox or jobs
    window.addEventListener('storage', (e) => {
      if (e.key === 'jaycvs-mock-inbox') { items = inbox.load(); render(); }
      if (e.key === KEY) jobs = store.load();
    });

    if (!VIEWS.includes(view)) view = 'check';
    if (!listFor(view).length) view = VIEWS.find((v) => listFor(v).length) || 'check';
    render();
    readNext();
  }

  // =====================================================================
  // Team (owner only): invite writers, set what they can do and their pay, pause or remove them
  // =====================================================================
  if (page === 'team' && !locked) {
    const T = window.JayTeam;
    const ACTIVE = ['writing', 'draft-sent', 'revisions'];
    const since30 = Date.now() - 30 * DAY;
    const statsFor = (name) => {
      const mine = orders.filter((o) => o.writer === name);
      const timed = mine.filter((o) => o.draftSentAt && JO.firstDraftDue(o));
      const onTime = timed.filter((o) => new Date(o.draftSentAt).getTime() <= JO.firstDraftDue(o)).length;
      return {
        active: mine.filter((o) => ACTIVE.includes(o.status)).length,
        delivered: mine.filter((o) => o.status === 'delivered' && o.deliveredAt && new Date(o.deliveredAt).getTime() >= since30).length,
        onTime: timed.length ? `${Math.round((onTime / timed.length) * 100)}%` : '—',
      };
    };
    const inviteLink = (m) => `${SITE}/admin/join?invite=${m.invite}`;
    const inviteText = (m) => `Hi ${m.name}, Jay here 👋 I've added you to the Jay CVS team${m.canWrite ? ' as a writer' : ''}. Set up your account here (the link works for 7 days): ${inviteLink(m)}`;
    const waTo = (m, text) => `https://wa.me/${/X/i.test(m.phone || '') ? '' : String(m.phone || '').replace(/\D/g, '').replace(/^0/, '254')}?text=${encodeURIComponent(text)}`;
    const cans = (m) => [m.canWrite ? '<span class="can">Writes CVs</span>' : '', m.canJobs ? '<span class="can">Posts jobs</span>' : ''].join('') || '<span class="can none">Nothing yet</span>';
    const STATUS = { active: ['Active', 'ok'], paused: ['Paused', 'paused'], invited: ['Invited', 'invited'] };

    function render() {
      orders = JO.load();
      const team = T.load().members;
      const jay = statsFor(OWNER);
      const open = orders.filter(isOpenOrder).length;
      const count = (s) => team.filter((m) => m.status === s).length;
      $('#team-stats').innerHTML = `
        <div class="stat-card"><span class="icon-box">${icon('users')}</span><div><strong>${count('active')}</strong><span>Active writers</span></div></div>
        <div class="stat-card muted"><span class="icon-box">${icon('send')}</span><div><strong>${count('invited')}</strong><span>Invited, not joined yet</span></div></div>
        <div class="stat-card"><span class="icon-box">${icon('edit')}</span><div><strong>${orders.filter((o) => ACTIVE.includes(o.status)).length}</strong><span>CVs in progress</span></div></div>
        <a class="stat-card red" href="orders.html?status=paid" style="text-decoration:none"><span class="icon-box">${icon('alert')}</span><div><strong>${open}</strong><span>${open ? '⚠ ' : ''}Paid, not accepted</span></div></a>`;
      const row = (m) => {
        const st = statsFor(m.name);
        const [label, cls] = STATUS[m.status] || ['—', ''];
        const acts = m.status === 'invited'
          ? `<a class="btn btn-ghost btn-sm" href="${waTo(m, inviteText(m))}" target="_blank" rel="noopener">${icon('whatsapp')}Resend</a>
             <button type="button" class="btn btn-ghost btn-sm" data-act="copy" data-name="${esc(m.name)}">${icon('copy')}Copy link</button>
             <button type="button" class="btn btn-ghost btn-sm" data-act="joined" data-name="${esc(m.name)}" title="Preview only: pretend they opened the link">Mark as joined</button>
             <button type="button" class="link-btn danger" data-act="cancel" data-name="${esc(m.name)}">Cancel invite</button>`
          : `<button type="button" class="btn btn-ghost btn-sm" data-act="edit" data-name="${esc(m.name)}">${icon('edit')}Edit</button>
             <button type="button" class="btn btn-ghost btn-sm" data-act="${m.status === 'paused' ? 'resume' : 'pause'}" data-name="${esc(m.name)}">${m.status === 'paused' ? 'Resume' : 'Pause'}</button>
             <button type="button" class="link-btn danger" data-act="remove" data-name="${esc(m.name)}">Remove</button>`;
        return `<tr class="${m.status === 'paused' ? 'row-paused' : ''}">
          <td><div class="member"><span class="avatar">${esc(m.name.slice(0, 2).toUpperCase())}</span><div><strong>${esc(m.name)}</strong><small>${esc(m.phone || '')}${m.email ? ` · ${esc(m.email)}` : ''}</small>
            <small>${m.status === 'invited' ? `Invited ${JO.ago(m.invitedAt)}` : `Joined ${new Date(m.joined).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} · last seen ${JO.ago(m.lastSeen || m.joined)}`}</small></div></div></td>
          <td>${cans(m)}</td>
          <td><span class="mstatus ${cls}">${label}</span></td>
          <td>${m.status === 'invited' ? '—' : st.active}</td>
          <td>${m.status === 'invited' ? '—' : st.delivered}</td>
          <td>${m.status === 'invited' ? '—' : st.onTime}</td>
          <td>${m.canWrite ? `${m.rate}% <small class="cell-sub">of the order price</small>` : '—'}</td>
          <td class="team-acts">${acts}</td></tr>`;
      };
      $('#team-body').innerHTML = `<tr class="row-owner">
          <td><div class="member"><span class="avatar owner">JA</span><div><strong>Jay</strong><small>Owner · senior writer</small><small>Writes Executive CVs personally</small></div></div></td>
          <td><span class="can all">Everything</span></td><td><span class="mstatus owner">Owner</span></td>
          <td>${jay.active}</td><td>${jay.delivered}</td><td>${jay.onTime}</td><td>—</td><td class="team-acts"><small class="hint-sm">Can't be changed</small></td></tr>`
        + team.map(row).join('');
    }

    // Invite / edit: one dialog
    function memberDialog(m) {
      const editing = !!m;
      const d = document.createElement('dialog');
      d.className = 'admin-dialog';
      d.innerHTML = `<form class="dialog-body member-form" method="dialog" novalidate>
        <h2>${editing ? `Edit ${esc(m.name)}` : 'Invite a writer'}</h2>
        <p>${editing ? 'Change what they can do and what they are paid. It applies from now on.' : 'They get a private link on WhatsApp and set up their own password.'}</p>
        ${editing ? '' : `<div class="fgrid">
          <div class="f"><label for="mi-name">Name <em>*</em></label><input id="mi-name" name="name" autocomplete="off" placeholder="e.g. Wanjiku"></div>
          <div class="f"><label for="mi-phone">WhatsApp number <em>*</em></label><input id="mi-phone" name="phone" type="tel" placeholder="07XX XXX XXX"></div>
          <div class="f full"><label for="mi-email">Email <small>(optional)</small></label><input id="mi-email" name="email" type="email" placeholder="name@example.com"></div></div>`}
        <fieldset class="perm"><legend>What can they do?</legend>
          <label><input type="checkbox" name="canWrite"${!editing || m.canWrite ? ' checked' : ''}><span><b>Write CVs</b><small>Accept paid orders and work on the ones they accept</small></span></label>
          <label><input type="checkbox" name="canJobs"${editing && m.canJobs ? ' checked' : ''}><span><b>Post jobs</b><small>Jobs inbox, post and edit job adverts</small></span></label>
          <p class="perm-note">${icon('lock')}Money, the team, prices and website settings stay with you.</p>
        </fieldset>
        <div class="f"><label for="mi-rate">Pay per CV (% of the order price)</label><input id="mi-rate" name="rate" type="number" min="0" max="100" step="5" value="${editing ? m.rate : 40}"><small>Only you see this. E.g. 40% of a KES 3,000 order = KES 1,200.</small></div>
        <p class="field-error" id="mi-error" hidden></p>
        <div class="dialog-actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="submit" class="btn btn-primary">${editing ? 'Save' : 'Create invite'}</button></div>
      </form>`;
      document.body.append(d);
      const f = d.querySelector('form');
      d.querySelector('[data-close]').addEventListener('click', () => d.close());
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const v = { canWrite: f.elements.canWrite.checked, canJobs: f.elements.canJobs.checked, rate: Number(f.elements.rate.value) || 0 };
        if (editing) {
          T.update(m.name, v);
          d.close();
          toast(`${m.name} updated`);
          return render();
        }
        const res = T.invite({ ...v, name: f.elements.name.value, phone: f.elements.phone.value, email: f.elements.email.value });
        if (!res.ok) { const er = $('#mi-error', d); er.textContent = res.error; er.hidden = false; return; }
        render();
        // Show the invite, ready to send
        f.innerHTML = `<div class="dialog-icon">${icon('check')}</div><h2>Invite ready for ${esc(res.member.name)}</h2>
          <p>Send it on WhatsApp. Until they open it, they show as "Invited" on your team list.</p>
          <pre class="wa-text">${esc(inviteText(res.member))}</pre>
          <div class="dialog-actions"><button type="button" class="btn btn-ghost" data-close>Done</button>
          <a class="btn btn-wa" href="${waTo(res.member, inviteText(res.member))}" target="_blank" rel="noopener">${icon('whatsapp')}Send on WhatsApp</a></div>`;
        f.querySelector('[data-close]').addEventListener('click', () => d.close());
      });
      d.addEventListener('close', () => d.remove());
      d.showModal();
      d.querySelector('input:not([type="checkbox"])')?.focus();
    }

    $('#invite-btn').addEventListener('click', () => memberDialog(null));
    $('#team-body').addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const name = b.dataset.name;
      const m = T.member(name);
      const act = b.dataset.act;
      if (act === 'edit') return memberDialog(m);
      if (act === 'copy') { try { await navigator.clipboard.writeText(inviteLink(m)); toast('Invite link copied'); } catch (err) { toast(inviteLink(m)); } return; }
      if (act === 'joined') { T.update(name, { status: 'active', joined: new Date().toISOString(), lastSeen: new Date().toISOString() }); toast(`${name} joined the team. They can now accept orders`); return render(); }
      if (act === 'cancel') { T.remove(name); toast('Invite cancelled'); return render(); }
      if (act === 'pause') {
        const ok = await confirmBox({ title: `Pause ${name}?`, text: `${name} can still sign in and finish the CVs they have, but can't accept new orders until you resume them.`, ok: 'Pause', danger: false });
        if (ok) { T.update(name, { status: 'paused' }); toast(`${name} is paused`); render(); }
        return;
      }
      if (act === 'resume') { T.update(name, { status: 'active' }); toast(`${name} can accept orders again`); return render(); }
      if (act === 'remove') {
        const theirs = JO.load().filter((o) => o.writer === name && ACTIVE.includes(o.status));
        const ok = await confirmBox({ title: `Remove ${name} from the team?`, text: `They won't be able to sign in any more.${theirs.length ? ` Their ${theirs.length} CV${theirs.length > 1 ? 's' : ''} in progress (${theirs.map((o) => o.id).join(', ')}) will move to you; you can reassign them after.` : ''}`, ok: 'Remove', danger: true });
        if (!ok) return;
        orders = JO.load();
        orders.filter((o) => o.writer === name && ACTIVE.includes(o.status)).forEach((o) => JO.reassign(o, OWNER, me()));
        JO.save(orders);
        T.remove(name);
        toast(`${name} removed${theirs.length ? `. ${theirs.length} CV${theirs.length > 1 ? 's' : ''} moved to you` : ''}`);
        render();
      }
    });
    window.addEventListener('storage', (e) => { if (e.key === 'jaycvs-mock-team' || e.key === 'jaycvs-mock-orders') render(); });
    render();
  }

  // =====================================================================
  // Finance (owner only): takings, fees, writer pay, AI costs, what Jay keeps
  // =====================================================================
  if (page === 'finance' && !locked) {
    let period = 'month';
    const T = window.JayTeam;
    const PERIOD_LABEL = { month: 'this month', 30: 'in the last 30 days', all: 'since the start' };
    const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
    // Ordinal gold ramp (validated earlier for the dashboard chart)
    const SPLIT_COLORS = ['#3B2C0E', '#7A5E22', '#A9842F', '#CFA651'];
    function render() {
      const f = finances(period);
      const when = PERIOD_LABEL[period];
      $$('#fin-period button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.p === String(period))));
      $('#fin-stats').innerHTML = `
        <div class="stat-card"><span class="icon-box">${icon('cash')}</span><div><strong>${JO.kes(f.takings)}</strong><span>Takings ${when} · ${f.paid.length} order${f.paid.length === 1 ? '' : 's'}</span></div></div>
        <div class="stat-card muted"><span class="icon-box">${icon('shield')}</span><div><strong>KES 0</strong><span>Middleman fees: paid straight to your Paybill</span></div></div>
        <div class="stat-card muted"><span class="icon-box">${icon('users')}</span><div><strong>${JO.kes(f.writerPay)}</strong><span>Writer pay earned</span></div></div>
        <div class="stat-card keep"><span class="icon-box">${icon('check')}</span><div><strong>${JO.kes(f.keep)}</strong><span>You keep (${pct(f.keep, f.takings)}%)</span></div></div>`;
      // Part-to-whole: one bar, every part labelled with its amount (never colour alone)
      const parts = [['You keep', f.keep], ['Writer pay', f.writerPay]].filter(([, v]) => v > 0);
      const total = parts.reduce((s, [, v]) => s + v, 0) || 1;
      $('#fin-split').innerHTML = f.takings ? `
        <div class="split-bar" role="img" aria-label="${esc(parts.map(([l, v]) => `${l}: ${JO.kes(v)}`).join(', '))}">
          ${parts.map(([l, v], i) => `<span style="flex:${v};background:${SPLIT_COLORS[i]}" title="${esc(`${l}: ${JO.kes(v)} (${pct(v, total)}%)`)}"></span>`).join('')}
        </div>
        <ul class="split-legend">${parts.map(([l, v], i) => `<li><span class="sw" style="background:${SPLIT_COLORS[i]}"></span>${esc(l)}<b>${JO.kes(v)}</b><small>${pct(v, total)}%</small></li>`).join('')}</ul>
        <p class="hint-sm">Writer pay counts CVs delivered ${when}.</p>`
        : `<p class="empty-note">No payments ${when} yet.</p>`;
      // Takings by package: one colour, value at the end of each bar
      const byPkg = {};
      f.paid.forEach((o) => { byPkg[o.package] = (byPkg[o.package] || 0) + o.amount; });
      const pk = Object.entries(byPkg).sort((a, b) => b[1] - a[1]);
      const max = Math.max(1, ...pk.map(([, v]) => v));
      $('#fin-pkg').innerHTML = pk.length ? `<ul class="hbars">${pk.map(([p, v]) => {
        const n = f.paid.filter((o) => o.package === p).length;
        return `<li><span class="hb-label">${esc(p)}</span><span class="hb-track"><span class="hb-bar" style="width:${(v / max) * 100}%" title="${esc(`${p}: ${JO.kes(v)} from ${n} order${n === 1 ? '' : 's'}`)}"></span></span><b>${JO.kes(v)}</b></li>`;
      }).join('')}</ul>` : `<p class="empty-note">No payments ${when} yet.</p>`;
      // Writer pay: earned in the period, and what's owed overall
      const w = owedByWriter();
      const rows = T.load().members.filter((m) => m.canWrite).map((m) => {
        const del = f.delivered.filter((o) => o.writer === m.name);
        const earned = del.reduce((s, o) => s + Math.round((o.amount * m.rate) / 100), 0);
        const x = w[m.name] || { earned: 0, paid: 0, owed: 0 };
        return `<tr><td><strong>${esc(m.name)}</strong>${m.status !== 'active' ? ` <span class="mstatus ${m.status}">${m.status === 'paused' ? 'Paused' : 'Invited'}</span>` : ''}</td><td>${m.rate}%</td><td>${del.length}</td><td>${JO.kes(earned)}</td>
          <td>${JO.kes(x.paid)}</td><td><b>${JO.kes(x.owed)}</b></td>
          <td>${x.owed > 0 ? `<button type="button" class="btn btn-primary btn-sm" data-pay="${esc(m.name)}" data-amount="${x.owed}">Record payout</button>` : '<small class="hint-sm">All paid</small>'}</td></tr>`;
      });
      $('#fin-writers').innerHTML = rows.join('') || '<tr><td colspan="7" class="empty-note">No writers yet. Invite one on the Team page.</td></tr>';
      // Payments list
      const list = f.paid.slice().sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
      $('#fin-count').textContent = `${list.length} payment${list.length === 1 ? '' : 's'} ${when}`;
      $('#fin-payments').innerHTML = list.map((o) => `<tr>
          <td>${new Date(o.paidAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
          <td><a class="order-id" href="${withAs(`order.html?id=${o.id}`)}">${esc(o.id)}</a></td><td>${esc(o.client.name)}</td><td>${esc(o.package)}</td>
          <td>${esc(o.payment.channel || o.payment.method || '')}</td><td>${esc(o.payment.receipt || '—')}</td><td class="num"><b>${JO.kes(o.amount)}</b></td></tr>`).join('')
        || `<tr><td colspan="8" class="empty-note">No payments ${when}.</td></tr>`;
      // Money waiting
      const unpaid = JO.load().filter((o) => o.status === 'new');
      const lost = JO.load().filter((o) => o.status === 'abandoned');
      $('#fin-unpaid').innerHTML = `<div><p class="preview-label">Waiting for payment</p><strong>${JO.kes(unpaid.reduce((s, o) => s + o.amount, 0))}</strong><small>${unpaid.length} order${unpaid.length === 1 ? '' : 's'} placed but not paid yet</small></div>
        <div><p class="preview-label">Abandoned</p><strong>${JO.kes(lost.reduce((s, o) => s + o.amount, 0))}</strong><small>${lost.length} order${lost.length === 1 ? '' : 's'} never paid (24h passed)</small></div>
        <a class="btn btn-ghost btn-sm" href="${withAs('orders.html?pay=unpaid')}">See unpaid orders →</a>`;
    }
    $('#fin-period').addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (b) { period = b.dataset.p; render(); } });
    $('#fin-writers').addEventListener('click', (e) => {
      const b = e.target.closest('[data-pay]');
      if (!b) return;
      const d = document.createElement('dialog');
      d.className = 'admin-dialog';
      d.innerHTML = `<form class="dialog-body" method="dialog" novalidate><h2>Record a payout to ${esc(b.dataset.pay)}</h2>
        <p>Send the money by M-Pesa as usual, then record it here so the balance is right.</p>
        <div class="fgrid"><div class="f"><label for="po-amt">Amount (KES)</label><input id="po-amt" type="number" min="1" value="${b.dataset.amount}"></div>
        <div class="f"><label for="po-ref">M-Pesa reference</label><input id="po-ref" placeholder="e.g. SJT7Q2KX4M" style="text-transform:uppercase"></div></div>
        <div class="dialog-actions"><button type="button" class="btn btn-ghost" data-close>Cancel</button><button type="submit" class="btn btn-primary">Record payout</button></div></form>`;
      document.body.append(d);
      d.querySelector('[data-close]').addEventListener('click', () => d.close());
      d.querySelector('form').addEventListener('submit', (ev) => {
        ev.preventDefault();
        const amt = Number($('#po-amt', d).value);
        if (!(amt > 0)) return;
        T.pay(b.dataset.pay, amt, $('#po-ref', d).value);
        d.close();
        toast(`Recorded ${JO.kes(amt)} paid to ${b.dataset.pay}`);
        render();
      });
      d.addEventListener('close', () => d.remove());
      d.showModal();
    });
    $('#fin-export').addEventListener('click', () => {
      const f = finances(period);
      const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const lines = [['Date', 'Order', 'Client', 'Package', 'How paid', 'M-Pesa code', 'Account no.', 'Amount (KES)'].map(q).join(',')]
        .concat(f.paid.map((o) => [o.paidAt.slice(0, 10), o.id, o.client.name, o.package, o.payment.channel || o.payment.method, o.payment.receipt || '', o.payment.reference || o.id, o.amount].map(q).join(',')));
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/csv' }));
      a.download = `jaycvs-payments-${isoDate(new Date())}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast('Payments downloaded (opens in Excel)');
    });
    window.addEventListener('storage', (e) => { if (['jaycvs-mock-team', 'jaycvs-mock-orders'].includes(e.key)) render(); });
    render();
  }
})();
