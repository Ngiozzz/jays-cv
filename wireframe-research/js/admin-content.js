// Jay CVS admin: Website content (DESIGN PREVIEW).
// Everything here is saved with JayContent (content-store.js). Open website pages update straight away.
(() => {
  if (document.body.dataset.page !== 'content') return;
  const JC = window.JayContent;
  const root = document.getElementById('content-root');
  if (!JC || !root) return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const icon = (id) => `<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const num = (n) => Number(n || 0).toLocaleString('en-KE');
  const OWNER = 'Jay (owner)';
  // Flow demo panes can sign in as someone else (?as=jay / ?as=grace)
  const AS = new URLSearchParams(location.search).get('as');
  const asUser = AS && [OWNER, ...(window.WRITERS || [])].find((s) => s.toLowerCase().startsWith(AS.toLowerCase()));
  const me = () => { if (asUser) return asUser; try { return localStorage.getItem('jaycvs-mock-user') || OWNER; } catch (e) { return OWNER; } };
  const short = (n) => String(n || '').split(' (')[0];
  const isOwner = me() === OWNER;
  const roundsText = (r) => (Number(r) >= 99 ? 'Unlimited (14 days)' : `${r} round${Number(r) === 1 ? '' : 's'}`);
  const ago = (iso) => {
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
  };
  let toastTimer;
  const toast = (msg, err) => {
    const el = $('#toast');
    if (!el) return;
    el.innerHTML = `${icon(err ? 'info' : 'check')}<span>${esc(msg)}</span>`;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 2800);
  };

  let c = JC.get();
  const TABS = [
    ['packages', 'Packages & prices', 'cash'], ['reviews', 'Reviews', 'sparkle'], ['samples', 'Sample CVs', 'image'],
    ['posts', 'Career tips', 'edit'], ['faqs', 'FAQs', 'info'], ['home', 'Homepage', 'layout'], ['settings', 'Business settings', 'lock'],
  ];
  const WRITER_TABS = ['posts']; // writers can draft articles; everything else is owner-only
  let tab = new URLSearchParams(location.search).get('tab') || 'packages';
  if (!TABS.some((t) => t[0] === tab)) tab = 'packages';
  let pkgIndex = 1;
  let postId = null;

  // ---------- Saving + history ----------
  function save(section, value, what) {
    const res = JC.update(section, value, short(me()), what);
    if (!res) return toast('Could not save (browser storage full)', true);
    c = res;
    toast(`Saved & published: ${what}`);
    render();
  }
  function renderHistory() {
    const list = (c.history || []).slice(0, 12);
    $('#content-history').innerHTML = list.length
      ? list.map((h, i) => `<li><div><p><b>${esc(h.who)}</b> ${esc(h.what)}</p><small>${esc(TABS.find((t) => t[0] === h.section)?.[1] || h.section)} · ${ago(h.at)}</small></div>
          ${isOwner ? `<button type="button" class="link-btn" data-undo="${i}">Undo</button>` : ''}</li>`).join('')
      : '<li class="empty-note">No changes yet. Edits you save appear here, with undo.</li>';
  }

  // ---------- Tabs ----------
  function renderTabs() {
    const pending = c.reviews.filter((r) => r.status === 'pending').length;
    const drafts = c.posts.filter((p) => p.status !== 'published').length;
    $('#content-tabs').innerHTML = TABS.map(([k, label, ic]) => {
      const badge = k === 'reviews' && pending ? `<span class="count alert">${pending}</span>` : k === 'posts' && drafts ? `<span class="count">${drafts}</span>` : '';
      return `<button type="button" data-tab="${k}" aria-pressed="${k === tab}">${icon(ic)}${label}${badge}</button>`;
    }).join('');
  }

  const lockNote = () => (!isOwner && !WRITER_TABS.includes(tab)
    ? `<div class="lock-note">${icon('lock')}Only the owner can change this. You're signed in as <b>${esc(short(me()))}</b>. Switch to "Jay (owner)" at the top right to edit.</div>` : '');
  const lockIfNeeded = () => {
    if (isOwner || WRITER_TABS.includes(tab)) return;
    $$('input, select, textarea, button[data-act]', root).forEach((el) => (el.disabled = true));
  };

  // =====================================================================
  // 1. Packages & prices
  // =====================================================================
  function previewCard(p) {
    return `<article class="price-card${p.popular ? ' price-card-featured' : ''}">
      ${p.popular ? '<span class="ribbon">Most popular</span>' : ''}
      <h3>${esc(p.name)}</h3>
      <p class="price-desc">For ${esc(p.best.charAt(0).toLowerCase() + p.best.slice(1))}.</p>
      <p class="price"><span class="currency">KES</span> ${num(p.price)}</p>
      <ul class="price-features">${p.features.filter(Boolean).map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      <span class="btn ${p.popular ? 'btn-primary' : 'btn-ghost'} btn-block">Choose ${esc(p.short)}</span>
    </article>`;
  }
  function packagesTab() {
    const p = c.packages[pkgIndex];
    return `${lockNote()}
      <section class="panel">
        <div class="panel-head"><h2>Packages</h2><a href="../pricing.html" target="_blank" rel="noopener">View pricing page ↗</a></div>
        <div class="table-wrap-admin"><table class="admin-table">
          <thead><tr><th>Package</th><th>Price</th><th>First draft</th><th>Revisions</th><th>Status</th><th></th></tr></thead>
          <tbody>${c.packages.map((x, i) => `<tr class="${i === pkgIndex ? 'row-selected' : ''}">
            <td><strong class="cell-strong">${esc(x.name)}</strong>${x.popular ? ' <span class="mini-pill">★ Most popular</span>' : ''}</td>
            <td><strong class="cell-strong">KES ${num(x.price)}</strong></td><td class="cell-muted">${esc(x.draft)}</td><td class="cell-muted">${roundsText(x.rounds)}</td>
            <td>${x.visible ? '<span class="status status-published">Visible</span>' : '<span class="status status-draft">Hidden</span>'}</td>
            <td><button type="button" class="btn btn-ghost btn-sm" data-pick="${i}">Edit</button></td></tr>`).join('')}</tbody>
        </table></div>
      </section>

      <section class="panel editor-grid">
        <form class="panel-body" id="pkg-form">
          <h2 class="editor-title">Edit: ${esc(p.name)}</h2>
          <div class="fgrid">
            <div class="f"><label for="pk-name">Package name</label><input type="text" id="pk-name" name="name" value="${esc(p.name)}"></div>
            <div class="f"><label for="pk-price">Price (KES)</label><input type="text" inputmode="numeric" id="pk-price" name="price" value="${esc(p.price)}"></div>
            <div class="f full"><label for="pk-best">Best for</label><input type="text" id="pk-best" name="best" value="${esc(p.best)}"></div>
            <div class="f"><label for="pk-draft">First draft within</label><select id="pk-draft" name="draft">${['12 hours', '24 hours', '48 hours', '72 hours'].map((d) => `<option${d === p.draft ? ' selected' : ''}>${d}</option>`).join('')}</select></div>
            <div class="f"><label for="pk-rounds">Revision rounds</label><select id="pk-rounds" name="rounds">${[1, 2, 3, 99].map((r) => `<option value="${r}"${Number(p.rounds) === r ? ' selected' : ''}>${roundsText(r)}</option>`).join('')}</select></div>
            <div class="f full"><label for="pk-features">What's included <small>(one per line)</small></label><textarea id="pk-features" name="features" rows="6">${esc(p.features.join('\n'))}</textarea></div>
            <div class="f full checks">
              <label class="inline-check"><input type="checkbox" name="popular"${p.popular ? ' checked' : ''}> Mark as "Most popular" <small>(only one package can be)</small></label>
              <label class="inline-check"><input type="checkbox" name="visible"${p.visible ? ' checked' : ''}> Show on the website</label>
            </div>
          </div>
          <p class="hint-sm">Existing orders keep the price the client paid. The new price applies to new orders, the order card, checkout and every price on the site.</p>
          <div class="editor-actions"><button type="button" class="btn btn-ghost" data-act="pkg-cancel">Cancel</button><button type="submit" class="btn btn-primary" data-act="pkg-save">Save &amp; publish</button></div>
        </form>
        <div class="panel-body preview-col"><p class="preview-label">Live preview</p><div id="pkg-preview">${previewCard(p)}</div></div>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Single services</h2><a href="../pricing.html#individual" target="_blank" rel="noopener">View ↗</a></div>
        <form class="panel-body" id="svc-form">
          <div class="svc-grid">${c.services.map((s, i) => `
            <div class="svc-row">
              <div class="svc-name"><strong>${esc(s.name)}</strong><input type="text" name="note-${i}" value="${esc(s.note)}" aria-label="${esc(s.name)} description"></div>
              <label class="svc-price">KES <input type="text" inputmode="numeric" name="price-${i}" value="${esc(s.price)}" aria-label="${esc(s.name)} price"></label>
              <label class="inline-check"><input type="checkbox" name="visible-${i}"${s.visible ? ' checked' : ''}> Visible</label>
            </div>`).join('')}</div>
          <div class="editor-actions"><button type="submit" class="btn btn-primary" data-act="svc-save">Save &amp; publish services</button></div>
        </form>
      </section>`;
  }
  function readPkg() {
    const f = $('#pkg-form');
    const p = c.packages[pkgIndex];
    return {
      ...p,
      name: f.name.value.trim() || p.name,
      price: Number(String(f.price.value).replace(/[^\d]/g, '')) || 0,
      best: f.best.value.trim(),
      draft: f.draft.value,
      rounds: Number(f.rounds.value),
      features: f.features.value.split('\n').map((x) => x.trim()).filter(Boolean),
      popular: f.popular.checked,
      visible: f.visible.checked,
    };
  }
  function bindPackages() {
    const f = $('#pkg-form');
    f.addEventListener('input', () => { $('#pkg-preview').innerHTML = previewCard(readPkg()); });
    f.addEventListener('change', () => { $('#pkg-preview').innerHTML = previewCard(readPkg()); });
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const next = readPkg();
      if (!next.price) return toast('Enter a price', true);
      const old = c.packages[pkgIndex];
      const changes = [];
      if (old.name !== next.name) changes.push(`name → "${next.name}"`);
      if (Number(old.price) !== next.price) changes.push(`price ${num(old.price)} → ${num(next.price)}`);
      if (old.draft !== next.draft) changes.push(`first draft ${old.draft} → ${next.draft}`);
      if (Number(old.rounds) !== next.rounds) changes.push(`revisions ${roundsText(old.rounds)} → ${roundsText(next.rounds)}`);
      if (old.popular !== next.popular) changes.push(next.popular ? 'now "Most popular"' : 'no longer "Most popular"');
      if (old.visible !== next.visible) changes.push(next.visible ? 'shown' : 'hidden');
      if (old.best !== next.best || old.features.join('|') !== next.features.join('|')) changes.push('description updated');
      if (!changes.length) return toast('Nothing changed');
      const list = c.packages.map((x, i) => (i === pkgIndex ? next : next.popular ? { ...x, popular: false } : x));
      save('packages', list, `${old.name}: ${changes.join(', ')}`);
    });
    $('[data-act="pkg-cancel"]').addEventListener('click', () => render());
    $('#svc-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const f2 = e.target;
      const changes = [];
      const list = c.services.map((s, i) => {
        const price = Number(String(f2[`price-${i}`].value).replace(/[^\d]/g, '')) || 0;
        const visible = f2[`visible-${i}`].checked;
        const note = f2[`note-${i}`].value.trim();
        if (price !== Number(s.price)) changes.push(`${s.name} ${num(s.price)} → ${num(price)}`);
        if (visible !== s.visible) changes.push(`${s.name} ${visible ? 'shown' : 'hidden'}`);
        if (note !== s.note) changes.push(`${s.name} description`);
        return { ...s, price, visible, note };
      });
      if (!changes.length) return toast('Nothing changed');
      save('services', list, `Single services: ${changes.join(', ')}`);
    });
  }

  // =====================================================================
  // 2. Reviews
  // =====================================================================
  const stars = (n) => `<span class="stars">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;
  function reviewCard(r, mode) {
    const consent = r.consent
      ? '<span class="mini-pill ok">✓ May publish</span>'
      : '<span class="mini-pill no">✗ Private: no permission to publish</span>';
    let actions = '';
    if (mode === 'pending') {
      actions = `${r.consent ? `<button type="button" class="btn btn-primary btn-sm" data-act="rv-approve" data-id="${r.id}">Approve</button>` : `<button type="button" class="btn btn-ghost btn-sm" data-act="rv-private" data-id="${r.id}">Keep (private)</button>`}
        <button type="button" class="btn btn-ghost btn-sm" data-act="rv-hide" data-id="${r.id}">Hide</button>`;
    } else if (mode === 'approved') {
      actions = `<button type="button" class="btn ${r.featured ? 'btn-primary' : 'btn-ghost'} btn-sm" data-act="rv-feature" data-id="${r.id}">${r.featured ? '★ On homepage' : '☆ Show on homepage'}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="rv-edit" data-id="${r.id}">Edit</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="rv-hide" data-id="${r.id}">Unpublish</button>`;
    } else {
      actions = `<button type="button" class="btn btn-ghost btn-sm" data-act="rv-restore" data-id="${r.id}">Move back to waiting</button>`;
    }
    return `<article class="review-card${r.featured ? ' featured' : ''}" data-review="${r.id}">
      <div class="review-top">${stars(r.rating)}${consent}</div>
      <p class="review-text">"${esc(r.text)}"</p>
      <p class="review-who"><strong>${esc(r.name)}</strong>${r.role ? ` · ${esc(r.role)}` : ''}<small>${esc(r.source)}</small></p>
      <div class="review-actions">${actions}</div>
    </article>`;
  }
  function reviewsTab() {
    const pending = c.reviews.filter((r) => r.status === 'pending');
    const approved = c.reviews.filter((r) => r.status === 'approved');
    const hidden = c.reviews.filter((r) => r.status === 'hidden' || r.status === 'private');
    return `${lockNote()}
      <section class="panel"><div class="panel-head"><h2>Waiting for approval <span class="count-pill">${pending.length}</span></h2>
        <span class="hint-sm">From clients' tracking pages after their order is complete</span></div>
        <div class="panel-body review-grid">${pending.map((r) => reviewCard(r, 'pending')).join('') || '<p class="empty-note">No new reviews. 🎉</p>'}</div></section>
      <section class="panel"><div class="panel-head"><h2>Published <span class="count-pill">${approved.length}</span></h2>
        <span class="hint-sm">Up to 3 can be shown on the homepage and Samples page · <a href="../index.html#testimonials" target="_blank" rel="noopener">View ↗</a></span></div>
        <div class="panel-body review-grid">${approved.map((r) => reviewCard(r, 'approved')).join('') || '<p class="empty-note">None yet.</p>'}</div></section>
      ${hidden.length ? `<details class="panel hidden-reviews"><summary class="panel-head"><h2>Hidden &amp; private <span class="count-pill">${hidden.length}</span></h2></summary>
        <div class="panel-body review-grid">${hidden.map((r) => reviewCard(r, 'hidden')).join('')}</div></details>` : ''}`;
  }
  function bindReviews() {
    root.addEventListener('click', onReviewClick);
  }
  function onReviewClick(e) {
    if (tab !== 'reviews') return;
    const b = e.target.closest('[data-act^="rv-"]');
    if (!b) return;
    const list = c.reviews.map((r) => ({ ...r }));
    const r = list.find((x) => x.id === b.dataset.id);
    const who = r.name;
    switch (b.dataset.act) {
      case 'rv-approve': r.status = 'approved'; return save('reviews', list, `Approved review from ${who}`);
      case 'rv-private': r.status = 'private'; return save('reviews', list, `Kept ${who}'s review private (no permission to publish)`);
      case 'rv-hide': r.status = 'hidden'; r.featured = false; return save('reviews', list, `Hid review from ${who}`);
      case 'rv-restore': r.status = 'pending'; return save('reviews', list, `Moved ${who}'s review back to waiting`);
      case 'rv-feature': {
        if (!r.featured && list.filter((x) => x.featured).length >= 3) return toast('Only 3 reviews can be on the homepage. Remove one first.', true);
        r.featured = !r.featured;
        return save('reviews', list, `${r.featured ? 'Added' : 'Removed'} ${who}'s review ${r.featured ? 'to' : 'from'} the homepage`);
      }
      case 'rv-edit': {
        const card = b.closest('.review-card');
        const p = card.querySelector('.review-text');
        if (card.querySelector('textarea')) return;
        p.outerHTML = `<textarea class="review-edit" rows="3">${esc(r.text)}</textarea>`;
        b.textContent = 'Save text';
        b.dataset.act = 'rv-save';
        return undefined;
      }
      case 'rv-save': {
        const t = b.closest('.review-card').querySelector('textarea').value.trim();
        if (!t) return toast('Review text is empty', true);
        r.text = t;
        return save('reviews', list, `Edited the wording of ${who}'s review (typo fix)`);
      }
      default: return undefined;
    }
  }

  // =====================================================================
  // 3. Sample CVs
  // =====================================================================
  const TAGS = ['Finance', 'Healthcare', 'Tech & engineering', 'NGO & development', 'Graduates', 'International'];
  function samplesTab() {
    return `${lockNote()}
      <section class="panel"><div class="panel-head"><h2>Before &amp; after samples</h2><a href="../samples.html" target="_blank" rel="noopener">View samples page ↗</a></div>
        <form class="panel-body" id="smp-form">
          <p class="hint-sm">⚠️ Always blur names, phone numbers and ID numbers before uploading, and only use CVs the client agreed to share.</p>
          <div class="sample-admin-grid">${c.samples.map((s, i) => `
            <div class="sample-admin${s.published ? '' : ' off'}">
              <div class="sample-thumbs"><img src="../img/samples/${esc(s.slug)}-before.jpeg" alt="" onerror="this.style.visibility='hidden'"><img src="../img/samples/${esc(s.slug)}-after.jpeg" alt="" onerror="this.style.visibility='hidden'"></div>
              <div class="f"><label for="sm-role-${i}">Role</label><input type="text" id="sm-role-${i}" name="role-${i}" value="${esc(s.role)}"></div>
              <div class="f"><label for="sm-tag-${i}">Industry</label><select id="sm-tag-${i}" name="tag-${i}">${TAGS.map((t) => `<option${t === s.tag ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
              <div class="f"><label for="sm-cap-${i}">Result</label><input type="text" id="sm-cap-${i}" name="caption-${i}" value="${esc(s.caption)}"></div>
              <div class="sample-admin-foot">
                <label class="inline-check"><input type="checkbox" name="published-${i}"${s.published ? ' checked' : ''}> Published</label>
                <span><button type="button" class="icon-btn" data-act="sm-up" data-i="${i}" title="Move earlier"${i === 0 ? ' disabled' : ''}>↑</button>
                <button type="button" class="icon-btn" data-act="sm-down" data-i="${i}" title="Move later"${i === c.samples.length - 1 ? ' disabled' : ''}>↓</button></span>
              </div>
            </div>`).join('')}
            <label class="sample-add">${icon('upload')}<strong>Add a sample</strong><small>Upload the before &amp; after images (preview: not stored)</small><input type="file" accept="image/*" multiple hidden data-act="sm-add"></label>
          </div>
          <div class="editor-actions"><button type="submit" class="btn btn-primary" data-act="smp-save">Save &amp; publish samples</button></div>
        </form></section>`;
  }
  function readSamples() {
    const f = $('#smp-form');
    return c.samples.map((s, i) => ({ ...s, role: f[`role-${i}`].value.trim(), tag: f[`tag-${i}`].value, caption: f[`caption-${i}`].value.trim(), published: f[`published-${i}`].checked }));
  }
  function bindSamples() {
    const f = $('#smp-form');
    f.addEventListener('submit', (e) => { e.preventDefault(); save('samples', readSamples(), 'Updated sample CVs'); });
    f.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act="sm-up"], [data-act="sm-down"]');
      if (!b) return;
      const list = readSamples();
      const i = Number(b.dataset.i);
      const j = b.dataset.act === 'sm-up' ? i - 1 : i + 1;
      [list[i], list[j]] = [list[j], list[i]];
      save('samples', list, `Moved "${list[j].role}" ${b.dataset.act === 'sm-up' ? 'earlier' : 'later'}`);
    });
    f.querySelector('[data-act="sm-add"]').addEventListener('change', (e) => {
      if (!e.target.files.length) return;
      const list = readSamples();
      list.push({ slug: `new-${Date.now()}`, role: 'New sample', tag: 'Graduates', caption: 'Describe the result', published: false });
      save('samples', list, `Added a new sample (${e.target.files.length} image${e.target.files.length > 1 ? 's' : ''}): unpublished until reviewed`);
    });
  }

  // =====================================================================
  // 4. Career tips (blog)
  // =====================================================================
  const CATS = ['CV tips', 'LinkedIn', 'Interviews', 'Job search', 'Career growth'];
  const COVERS = ['blog-cv-mistakes', 'blog-linkedin', 'blog-tell-me-about-yourself', 'blog-ngo-jobs', 'blog-ats', 'blog-salary', 'blog-uk-canada-cv', 'blog-interview-questions', 'blog-fake-jobs', 'blog-career-change'];
  const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  function postsTab() {
    const p = c.posts.find((x) => x.id === postId);
    const list = `
      <section class="panel"><div class="panel-head"><h2>Articles</h2><button type="button" class="btn btn-primary btn-sm" data-act="post-new">${icon('plus')}New article</button></div>
        <div class="table-wrap-admin"><table class="admin-table">
          <thead><tr><th>Title</th><th>Category</th><th>Author</th><th>Status</th><th>Updated</th><th></th></tr></thead>
          <tbody>${c.posts.map((x) => `<tr class="${x.id === postId ? 'row-selected' : ''}"><td><strong class="cell-strong">${esc(x.title)}</strong></td><td class="cell-muted">${esc(x.category)}</td><td class="cell-muted">${esc(x.author)}</td>
            <td>${x.status === 'published' ? '<span class="status status-published">Published</span>' : x.status === 'review' ? '<span class="status st-paid">Waiting for owner</span>' : '<span class="status status-draft">Draft</span>'}</td>
            <td class="cell-muted">${esc(x.updated)}</td><td><button type="button" class="btn btn-ghost btn-sm" data-act="post-edit" data-id="${x.id}">Edit</button></td></tr>`).join('')}</tbody>
        </table></div></section>`;
    if (!p) return list;
    const canPublish = isOwner;
    return `${list}
      <section class="panel editor-grid">
        <form class="panel-body" id="post-form">
          <h2 class="editor-title">${p.title ? 'Edit article' : 'New article'}</h2>
          <div class="fgrid">
            <div class="f full"><label for="ps-title">Title</label><input type="text" id="ps-title" name="title" value="${esc(p.title)}" placeholder="e.g. 5 things recruiters look for in a graduate CV"></div>
            <div class="f"><label for="ps-cat">Category</label><select id="ps-cat" name="category">${CATS.map((x) => `<option${x === p.category ? ' selected' : ''}>${x}</option>`).join('')}</select></div>
            <div class="f"><label for="ps-cover">Cover image</label><select id="ps-cover" name="cover">${COVERS.map((x) => `<option value="img/photos/${x}.jpg"${p.cover === `img/photos/${x}.jpg` ? ' selected' : ''}>${x.replace('blog-', '').replace(/-/g, ' ')}</option>`).join('')}</select></div>
            <div class="f full"><label for="ps-excerpt">Short summary <small>(shown on the Career tips page and Google)</small></label><input type="text" id="ps-excerpt" name="excerpt" maxlength="160" value="${esc(p.excerpt)}"></div>
            <div class="f full"><label for="ps-body">Article <small>(## for a heading, - for a bullet)</small></label><textarea id="ps-body" name="body" rows="9">${esc(p.body)}</textarea></div>
          </div>
          <div class="editor-actions">
            <button type="button" class="btn btn-ghost" data-act="post-draft">Save draft</button>
            ${canPublish ? '<button type="submit" class="btn btn-primary" data-act="post-publish">Publish</button>' : '<button type="button" class="btn btn-primary" data-act="post-submit">Send to owner for review</button>'}
          </div>
          ${canPublish ? '' : '<p class="hint-sm">Writers can draft articles; the owner reviews and publishes them.</p>'}
        </form>
        <div class="panel-body preview-col">
          <p class="preview-label">How it looks on Google</p>
          <div class="serp" id="post-serp"></div>
          <p class="preview-label" style="margin-top:18px">Cover</p>
          <img class="post-cover-prev" id="post-cover" alt="">
        </div>
      </section>`;
  }
  function bindPosts() {
    $('[data-act="post-new"]').addEventListener('click', () => {
      postId = `p${Date.now()}`;
      const list = [{ id: postId, title: '', category: 'CV tips', status: 'draft', author: short(me()), updated: new Date().toISOString().slice(0, 10), cover: 'img/photos/blog-ats.jpg', excerpt: '', body: '' }, ...c.posts];
      c = { ...c, posts: list }; // not saved until "Save draft" / "Publish"
      render();
    });
    $$('[data-act="post-edit"]').forEach((b) => b.addEventListener('click', () => { postId = b.dataset.id; render(); }));
    const f = $('#post-form');
    if (!f) return;
    const serp = () => {
      const t = f.title.value.trim() || 'Article title';
      $('#post-serp').innerHTML = `<small>www.jaycvs.co.ke › career-tips › ${esc(slug(t) || 'article')}</small><strong>${esc(t)} | Jay CVS</strong><p>${esc(f.excerpt.value || 'Your short summary appears here.')}</p>`;
      $('#post-cover').src = `../${f.cover.value}`;
    };
    f.addEventListener('input', serp);
    f.addEventListener('change', serp);
    serp();
    const store = (status, verb) => {
      const title = f.title.value.trim();
      if (!title) return toast('Give the article a title', true);
      const list = c.posts.map((x) => (x.id === postId ? { ...x, title, category: f.category.value, cover: f.cover.value, excerpt: f.excerpt.value.trim(), body: f.body.value, status, updated: new Date().toISOString().slice(0, 10) } : x));
      if (!list.some((x) => x.id === postId)) return undefined;
      return save('posts', list, `${verb} "${title}"`);
    };
    f.addEventListener('submit', (e) => { e.preventDefault(); store('published', 'Published article'); });
    $('[data-act="post-draft"]').addEventListener('click', () => store('draft', 'Saved draft'));
    $('[data-act="post-submit"]')?.addEventListener('click', () => store('review', 'Sent for owner review:'));
  }

  // =====================================================================
  // 5. FAQs
  // =====================================================================
  function faqsTab() {
    return `${lockNote()}
      <section class="panel"><div class="panel-head"><h2>Homepage FAQs</h2><a href="../index.html#faq" target="_blank" rel="noopener">View ↗</a></div>
        <form class="panel-body" id="faq-form">
          <ol class="faq-admin">${c.faqs.map((q, i) => `
            <li class="${q.visible ? '' : 'off'}">
              <div class="faq-admin-fields">
                <input type="text" name="q-${i}" value="${esc(q.q)}" aria-label="Question ${i + 1}" placeholder="Question">
                <textarea name="a-${i}" rows="2" aria-label="Answer ${i + 1}" placeholder="Answer">${esc(q.a)}</textarea>
              </div>
              <div class="faq-admin-tools">
                <label class="inline-check"><input type="checkbox" name="v-${i}"${q.visible ? ' checked' : ''}> Show</label>
                <button type="button" class="icon-btn" data-act="faq-up" data-i="${i}"${i === 0 ? ' disabled' : ''} title="Move up">↑</button>
                <button type="button" class="icon-btn" data-act="faq-down" data-i="${i}"${i === c.faqs.length - 1 ? ' disabled' : ''} title="Move down">↓</button>
                <button type="button" class="icon-btn danger" data-act="faq-del" data-i="${i}" title="Delete">${icon('trash')}</button>
              </div>
            </li>`).join('')}</ol>
          <div class="editor-actions"><button type="button" class="btn btn-ghost" data-act="faq-add">${icon('plus')}Add question</button><button type="submit" class="btn btn-primary" data-act="faq-save">Save &amp; publish FAQs</button></div>
        </form></section>`;
  }
  function readFaqs() {
    const f = $('#faq-form');
    return c.faqs.map((q, i) => ({ q: f[`q-${i}`].value.trim(), a: f[`a-${i}`].value.trim(), visible: f[`v-${i}`].checked }));
  }
  function bindFaqs() {
    const f = $('#faq-form');
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const list = readFaqs().filter((q) => q.q);
      save('faqs', list, `Updated FAQs (${list.filter((q) => q.visible).length} shown)`);
    });
    f.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act^="faq-"]');
      if (!b || b.dataset.act === 'faq-save') return;
      const list = readFaqs();
      const i = Number(b.dataset.i);
      if (b.dataset.act === 'faq-add') { c = { ...c, faqs: [...list, { q: '', a: '', visible: true }] }; render(); return; }
      if (b.dataset.act === 'faq-del') { const [gone] = list.splice(i, 1); save('faqs', list, `Deleted FAQ "${gone.q}"`); return; }
      const j = b.dataset.act === 'faq-up' ? i - 1 : i + 1;
      [list[i], list[j]] = [list[j], list[i]];
      c = { ...c, faqs: list };
      render();
    });
  }

  // =====================================================================
  // 6. Homepage
  // =====================================================================
  function homeTab() {
    const h = c.home;
    return `${lockNote()}
      <section class="panel editor-grid">
        <form class="panel-body" id="home-form">
          <h2 class="editor-title">Top of the homepage</h2>
          <div class="fgrid">
            <div class="f"><label for="hm-h">Headline</label><input type="text" id="hm-h" name="headline" value="${esc(h.headline)}"></div>
            <div class="f"><label for="hm-hl">Highlighted words</label><input type="text" id="hm-hl" name="highlight" value="${esc(h.highlight)}"></div>
            <div class="f full"><label for="hm-lead">Intro text</label><textarea id="hm-lead" name="lead" rows="3">${esc(h.lead)}</textarea></div>
          </div>
          <h3 class="sub-title">Numbers strip</h3>
          <div class="stats-edit">${h.stats.map((s, i) => `<div><input type="text" name="sv-${i}" value="${esc(s.value)}" aria-label="Number ${i + 1}"><input type="text" name="sl-${i}" value="${esc(s.label)}" aria-label="Label ${i + 1}"></div>`).join('')}</div>
          <h3 class="sub-title">Announcement bar <small>(top of every page)</small></h3>
          <label class="inline-check"><input type="checkbox" name="aOn"${h.announcement.on ? ' checked' : ''}> Show the announcement</label>
          <div class="fgrid" style="margin-top:10px">
            <div class="f"><label for="hm-at">Message</label><input type="text" id="hm-at" name="aText" value="${esc(h.announcement.text)}"></div>
            <div class="f"><label for="hm-al">Link <small>(optional)</small></label><input type="text" id="hm-al" name="aLink" value="${esc(h.announcement.link)}"></div>
          </div>
          <div class="editor-actions"><button type="submit" class="btn btn-primary" data-act="home-save">Save &amp; publish</button></div>
        </form>
        <div class="panel-body preview-col"><p class="preview-label">Live preview</p><div id="home-preview"></div>
          <a class="hint-sm" href="../index.html" target="_blank" rel="noopener">Open the homepage ↗</a></div>
      </section>`;
  }
  function readHome() {
    const f = $('#home-form');
    return {
      headline: f.headline.value.trim(), highlight: f.highlight.value.trim(), lead: f.lead.value.trim(),
      stats: c.home.stats.map((s, i) => ({ value: f[`sv-${i}`].value.trim(), label: f[`sl-${i}`].value.trim() })),
      announcement: { on: f.aOn.checked, text: f.aText.value.trim(), link: f.aLink.value.trim() },
    };
  }
  function bindHome() {
    const f = $('#home-form');
    const prev = () => {
      const h = readHome();
      $('#home-preview').innerHTML = `${h.announcement.on && h.announcement.text ? `<div class="announce-bar">📣 ${esc(h.announcement.text)}</div>` : ''}
        <div class="home-prev"><h3>${esc(h.headline)} <span class="highlight">${esc(h.highlight)}</span></h3><p>${esc(h.lead)}</p>
        <div class="home-prev-stats">${h.stats.map((s) => `<div><strong>${esc(s.value)}</strong><span>${esc(s.label)}</span></div>`).join('')}</div></div>`;
    };
    f.addEventListener('input', prev);
    f.addEventListener('change', prev);
    prev();
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const h = readHome();
      const what = h.announcement.on !== c.home.announcement.on
        ? `${h.announcement.on ? 'Turned on' : 'Turned off'} the announcement bar`
        : 'Updated homepage text';
      save('home', h, what);
    });
  }

  // =====================================================================
  // 7. Business settings (owner only)
  // =====================================================================
  function settingsTab() {
    const s = c.settings;
    const inp = (name, label, val, attrs = '') => `<div class="f"><label for="st-${name}">${label}</label><input type="text" id="st-${name}" name="${name}" value="${esc(val)}" ${attrs}></div>`;
    return `${lockNote()}
      <form id="set-form" class="settings-grid">
        <section class="panel panel-body"><h2 class="editor-title">${icon('whatsapp')}Contact details</h2>
          <p class="hint-sm">Used on every WhatsApp button, phone link and the footer, across the whole website.</p>
          <div class="fgrid">${inp('whatsapp', 'WhatsApp number', s.whatsapp, 'inputmode="tel"')}${inp('email', 'Email', s.email)}
          <div class="f full"><label for="st-address">Office address</label><input type="text" id="st-address" name="address" value="${esc(s.address)}"></div></div>
        </section>
        <section class="panel panel-body"><h2 class="editor-title">${icon('globe')}Channel &amp; social links</h2>
          <div class="fgrid">
            <div class="f full"><label for="st-channelLink">WhatsApp job channel invite link</label><input type="url" id="st-channelLink" name="channelLink" value="${esc(s.channelLink)}" placeholder="https://whatsapp.com/channel/…"></div>
            ${inp('linkedin', 'LinkedIn', s.linkedin, 'placeholder="https://linkedin.com/…"')}${inp('facebook', 'Facebook', s.facebook)}${inp('instagram', 'Instagram', s.instagram)}${inp('x', 'X (Twitter)', s.x)}
          </div>
        </section>
        <section class="panel panel-body"><h2 class="editor-title">${icon('clock')}Order rules</h2>
          <p class="hint-sm">These drive the automatic steps in every order.</p>
          <div class="rules-grid">
            <label>Unpaid orders are abandoned after <span><input type="number" min="1" max="168" name="unpaidHours" value="${esc(s.unpaidHours)}"> hours</span></label>
            <label>Remind the client to review their draft after <span><input type="number" min="1" max="14" name="reminderDays" value="${esc(s.reminderDays)}"> days</span></label>
            <label>Complete the order automatically after <span><input type="number" min="1" max="30" name="autoCompleteDays" value="${esc(s.autoCompleteDays)}"> days</span> with no reply</label>
            <label>Revised drafts are due within <span><input type="number" min="1" max="96" name="revisionHours" value="${esc(s.revisionHours)}"> hours</span></label>
          </div>
        </section>
        <section class="panel panel-body"><h2 class="editor-title">${icon('shield')}Client files &amp; privacy</h2>
          <div class="f"><label for="st-ret">Delete client CVs and drafts</label>
            <select id="st-ret" name="retentionMonths">${[[3, '3 months after delivery'], [6, '6 months after delivery'], [12, '12 months after delivery'], [24, '24 months after delivery'], [0, 'Keep until I delete them']].map(([v, l]) => `<option value="${v}"${Number(s.retentionMonths) === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
          <p class="hint-sm">Kenya's Data Protection Act expects you to keep personal data only as long as needed. Clients are told this on the order page.</p>
        </section>
        <section class="panel panel-body"><h2 class="editor-title">${icon('sparkle')}AI tokens</h2>
          <div class="f"><label for="st-ai">Warn me when tokens left drop below</label>
            <select id="st-ai" name="aiWarnPct">${[10, 20, 30, 50].map((v) => `<option value="${v}"${Number(s.aiWarnPct || 20) === v ? ' selected' : ''}>${v}% of my tokens</option>`).join('')}</select></div>
          <p class="hint-sm">Your token balance is on the Dashboard. When it runs out, AI buttons pause and everything else keeps working. Ask your developer to add more tokens.</p>
        </section>
        <section class="panel panel-body"><h2 class="editor-title">${icon('lock')}Payments (M-Pesa)</h2>
          <div class="f"><label for="st-paybill">Paybill number</label><input id="st-paybill" name="paybill" inputmode="numeric" value="${esc(s.paybill || '4027127')}"></div>
          <div class="pay-mode">
            <label class="inline-check"><input type="radio" name="mpesaMode" value="test"${(s.mpesaMode || 'test') === 'test' ? ' checked' : ''}> Test mode <small>(Safaricom sandbox, no real money)</small></label>
            <label class="inline-check"><input type="radio" name="mpesaMode" value="live" disabled> Live mode <small>(after Safaricom approves "Go Live")</small></label>
          </div>
          <p class="hint-sm">Clients pay you directly: a prompt on their phone, or your Paybill with their order number as the account number. No middleman fees; Safaricom's normal charges appear on your M-Pesa statement.</p>
        </section>
        <div class="settings-save"><button type="submit" class="btn btn-primary btn-lg" data-act="set-save">Save &amp; publish settings</button></div>
      </form>`;
  }
  function bindSettings() {
    $('#set-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const old = c.settings;
      const phone = f.whatsapp.value.replace(/\s|-/g, '');
      if (!/^(?:\+?254|0)[17]\d{8}$/.test(phone)) return toast('Enter a valid Kenyan WhatsApp number, e.g. 0712 345 678', true);
      const next = {
        ...old,
        whatsapp: f.whatsapp.value.trim(), email: f.email.value.trim(), address: f.address.value.trim(),
        channelLink: f.channelLink.value.trim(), linkedin: f.linkedin.value.trim(), facebook: f.facebook.value.trim(), instagram: f.instagram.value.trim(), x: f.x.value.trim(),
        unpaidHours: Number(f.unpaidHours.value), reminderDays: Number(f.reminderDays.value), autoCompleteDays: Number(f.autoCompleteDays.value), revisionHours: Number(f.revisionHours.value),
        retentionMonths: Number(f.retentionMonths.value), aiWarnPct: Number(f.aiWarnPct.value), paybill: f.paybill.value.replace(/\D/g, ''), mpesaMode: f.mpesaMode.value,
      };
      const LABELS = { whatsapp: 'WhatsApp number', email: 'email', address: 'address', channelLink: 'channel link', linkedin: 'LinkedIn', facebook: 'Facebook', instagram: 'Instagram', x: 'X', unpaidHours: 'abandon after (h)', reminderDays: 'reminder (days)', autoCompleteDays: 'auto-complete (days)', revisionHours: 'revision time (h)', retentionMonths: 'file retention (months)', aiWarnPct: 'AI token warning (%)', paybill: 'Paybill', mpesaMode: 'M-Pesa mode' };
      const changes = Object.keys(LABELS).filter((k) => String(old[k]) !== String(next[k])).map((k) => `${LABELS[k]}: ${old[k] || '—'} → ${next[k] || '—'}`);
      if (!changes.length) return toast('Nothing changed');
      save('settings', next, `Settings: ${changes.join('; ')}`);
    });
  }

  // ---------- Render ----------
  const VIEWS = {
    packages: [packagesTab, bindPackages], reviews: [reviewsTab, bindReviews], samples: [samplesTab, bindSamples],
    posts: [postsTab, bindPosts], faqs: [faqsTab, bindFaqs], home: [homeTab, bindHome], settings: [settingsTab, bindSettings],
  };
  let reviewsBound = false;
  function render() {
    renderTabs();
    renderHistory();
    const [view, bind] = VIEWS[tab];
    root.innerHTML = view();
    if (tab === 'reviews') { if (!reviewsBound) { bind(); reviewsBound = true; } } else bind();
    lockIfNeeded();
    history.replaceState(null, '', `?tab=${tab}`);
  }

  $('#content-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    tab = b.dataset.tab;
    c = JC.get();
    render();
  });
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick]');
    if (b) { pkgIndex = Number(b.dataset.pick); render(); }
  });
  $('#content-history').addEventListener('click', (e) => {
    const b = e.target.closest('[data-undo]');
    if (!b) return;
    const h = c.history[Number(b.dataset.undo)];
    const res = JC.undo(Number(b.dataset.undo));
    if (res) { c = res; toast(`Undone: ${h.what}`); render(); }
  });
  JC.onChange(() => { c = JC.get(); renderTabs(); renderHistory(); }); // e.g. a new review arrived from a tracking page
  render();
})();
