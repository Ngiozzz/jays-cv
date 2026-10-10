// Jay CVS: client order tracking page (client view of the same order the team sees in the admin).
// DESIGN PREVIEW: reads/writes the demo orders in this browser (see orders-core.js).
(() => {
  const JO = window.JayOrders;
  const root = document.getElementById('track');
  if (!JO || !root) return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id) => `<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const params = new URLSearchParams(location.search);
  if (params.has('embed')) document.body.classList.add('embed');
  const WA = 'https://wa.me/254725912186';
  // Draft previews reuse the sample CV images for the preview
  const PREVIEW = { 'Site Engineer': 'civil-engineer', 'Sales Manager': 'finance-manager', 'Customer Service Lead': 'business-graduate', 'Country Director, health NGO': 'project-manager' };

  let orders = JO.load();
  let order = null;
  let unlocked = false;

  function find() {
    orders = JO.load();
    const id = (params.get('o') || '').toUpperCase();
    const o = orders.find((x) => x.id === id);
    return o && o.token === params.get('t') ? o : null;
  }

  // ---------- Lookup form (lost link) ----------
  function renderLookup(msg) {
    root.innerHTML = `
      <div class="track-card lookup">
        <span class="icon-box">${icon('search')}</span>
        <h1>Track your order</h1>
        <p>Enter your order number and the last 4 digits of the phone number you ordered with.</p>
        ${msg ? `<p class="track-error">${icon('info')}${esc(msg)}</p>` : ''}
        <form id="lookup" class="lookup-form">
          <div class="field"><label for="lk-id">Order number</label><input id="lk-id" placeholder="e.g. JC-1046" required></div>
          <div class="field"><label for="lk-ph">Last 4 digits of your phone</label><input id="lk-ph" inputmode="numeric" maxlength="4" placeholder="e.g. 0557" required></div>
          <button class="btn btn-primary btn-lg" type="submit">Find my order</button>
        </form>
        <p class="track-help">Lost your details? <a href="${WA}?text=${encodeURIComponent('Hi Jay CVS, I need help finding my order.')}" target="_blank" rel="noopener">Ask us on WhatsApp</a>.</p>
      </div>`;
    $('#lookup').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = $('#lk-id').value.trim().toUpperCase();
      const digits = $('#lk-ph').value.trim();
      const o = JO.load().find((x) => x.id === id);
      // Sample phones are masked (+254 7XX XXX 557): match on the digits that are shown
      const tail = o ? o.client.phone.replace(/\D/g, '').slice(-3) : '';
      if (!o || !digits.endsWith(tail)) return renderLookup("We couldn't find that order. Check the number and phone digits.");
      location.search = `?o=${o.id}&t=${o.token}`;
    });
  }

  // ---------- The order ----------
  const STEPS = [
    { key: 'placed', label: 'Order received' },
    { key: 'paid', label: 'Payment confirmed' },
    { key: 'writing', label: 'Writing' },
    { key: 'review', label: 'Your review' },
    { key: 'done', label: 'Completed' },
  ];
  const stepIndex = (o) => ({ new: 0, abandoned: 0, paid: 1, writing: 2, 'draft-sent': 3, revisions: 2, delivered: 4 }[o.status]);

  function stageCard(o) {
    const writer = o.writer ? o.writer.split(' (')[0] : 'your writer';
    const draftDue = JO.firstDraftDue(o);
    const latestDraft = o.files.filter((f) => f.kind.startsWith('Draft')).pop();
    const img = PREVIEW[o.brief.targetRole] ? `img/samples/${PREVIEW[o.brief.targetRole]}-after.jpeg` : 'img/samples/accountant-after.jpeg';
    switch (o.status) {
      case 'new':
      case 'abandoned':
        return `
          <div class="stage stage-pay">
            <h2>${icon('phone')}Complete your payment</h2>
            <p>Your writer starts as soon as your payment is confirmed.</p>
            <div class="pay-cta">
              <div><span>Amount</span><strong>${JO.kes(o.amount)}</strong></div>
              <button type="button" class="btn btn-primary btn-lg" data-act="pay">Pay with M-Pesa</button>
            </div>
            <div class="paybill-box"><span>Or use the M-Pesa menu: <b>Pay Bill ${esc(JO.paybill())}</b> · Account <b>${esc(o.id)}</b></span></div>
            <p class="secure-note">${icon('lock')}Paid directly to Jay CVS by M-Pesa: a prompt pops up on your phone, just enter your PIN. Confirmation is automatic.</p>
          </div>`;
      case 'paid':
        return `
          <div class="stage">
            <h2>${icon('check')}Payment received: thank you!</h2>
            <p>We're assigning your writer now. Your ${o.package === 'Cover letter' ? 'cover letter' : 'draft'} will be ready by <strong>${JO.when(draftDue)}</strong>.</p>
          </div>`;
      case 'writing':
        return `
          <div class="stage">
            <h2>${icon('edit')}${esc(writer)} is working on your ${o.package === 'Cover letter' ? 'cover letter' : 'CV'}</h2>
            <p>Your draft will be ready by <strong>${JO.when(draftDue)}</strong>. ${esc(writer)} may call or WhatsApp you to ask about your achievements. Please keep your phone close.</p>
          </div>`;
      case 'revisions': {
        const r = o.revisions[o.revisions.length - 1];
        return `
          <div class="stage">
            <h2>${icon('refresh')}We're making your changes</h2>
            <blockquote class="change-request">"${esc(r ? r.text : '')}"</blockquote>
            <p>Your revised draft will be ready by <strong>${JO.when(JO.revisionDue(o))}</strong>.</p>
          </div>`;
      }
      case 'draft-sent': {
        const limit = JO.roundsLimit(o);
        const left = limit >= 99 ? 'Unlimited changes for 14 days' : `${Math.max(0, limit - JO.roundsUsed(o))} of ${limit} revision ${limit === 1 ? 'round' : 'rounds'} left`;
        return `
          <div class="stage stage-review">
            <h2>${icon('doc')}Your draft is ready</h2>
            <div class="draft-preview">
              <button type="button" class="draft-thumb" data-act="preview" aria-label="Preview your draft"><img src="${img}" alt=""><span>Preview</span></button>
              <div>
                <strong>${esc(latestDraft ? latestDraft.name : 'Draft')}</strong>
                <small>${esc(latestDraft ? latestDraft.kind : '')} · read it right here, no download needed</small>
                <div class="draft-btns"><button type="button" class="btn btn-primary btn-sm" data-act="preview">${icon('doc')}Preview draft</button>
                <a class="btn btn-ghost btn-sm" href="${img}" download target="_blank" rel="noopener">${icon('download')}Download</a></div>
              </div>
            </div>
            <p>Please read it carefully. What would you like to do?</p>
            <div class="review-actions">
              <button type="button" class="btn btn-primary btn-lg" data-act="approve">${icon('check')}I'm happy with it</button>
              <button type="button" class="btn btn-ghost btn-lg" data-act="show-changes">${icon('edit')}Request changes</button>
            </div>
            <form id="changes-form" class="changes-form" hidden>
              <label for="changes">What would you like us to change?</label>
              <textarea id="changes" rows="4" placeholder="e.g. Add my 2022 award; make page 2 shorter"></textarea>
              <small>${left}</small>
              <button class="btn btn-primary" type="submit">Send my changes</button>
            </form>
            <p class="auto-note">${icon('clock')}If we don't hear from you, we'll send a reminder and complete your order automatically on ${JO.when(JO.autoDeliverAt(o))}.</p>
          </div>`;
      }
      default:
        return `
          <div class="stage stage-done">
            <h2>${icon('check')}Your order is complete 🎉</h2>
            <div class="final-files">
              ${o.files.filter((f) => /^(Final|Draft)/.test(f.kind)).slice(-1).map((f) => `
                <button type="button" class="final-file" data-act="view-final" data-ext="docx">${icon('doc')}<span><strong>${esc(f.name.replace(/\.\w+$/, '.docx'))}</strong><small>Word document, editable · tap to view</small></span></button>
                <button type="button" class="final-file" data-act="view-final" data-ext="pdf">${icon('doc')}<span><strong>${esc(f.name.replace(/\.\w+$/, '.pdf'))}</strong><small>PDF, ready to send · tap to view</small></span></button>`).join('')}
            </div>
            <p>You have <strong>30 days of free minor updates</strong>. Just message us on WhatsApp.</p>
            <div class="review-box" id="review-box">
              <strong>How did we do?</strong>
              <div class="stars" role="group" aria-label="Rate us">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" aria-label="${n} star${n > 1 ? 's' : ''}">★</button>`).join('')}</div>
            </div>
            <a class="btn btn-ghost" href="jobs.html">${icon('briefcase')}Find jobs to apply for</a>
          </div>`;
    }
  }

  function render() {
    order = find();
    if (!order) return renderLookup(params.has('o') ? 'This tracking link is not valid.' : '');
    const o = order;
    const idx = stepIndex(o);
    const history = o.log.filter((l) => l.client).sort((a, b) => new Date(b.at) - new Date(a.at));
    const actorLabel = (a) => (a === 'System' ? 'Jay CVS' : a.startsWith('Client') ? 'You' : a);
    root.innerHTML = `
      <div class="track-head">
        <div>
          <p class="track-meta">Order ${esc(o.id)} · ${esc(o.package)} · ${JO.kes(o.amount)}</p>
          <h1>Hi ${esc(o.client.name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/, '').split(' ')[0])} 👋</h1>
          <p class="track-status"><span class="ostatus ${JO.STATUS[o.status].cls}">${JO.STATUS[o.status].client}</span></p>
        </div>
      </div>
      <ol class="track-steps">${STEPS.map((s, i) => `<li class="${i < idx || o.status === 'delivered' ? 'done' : i === idx ? 'current' : ''}"><span>${i < idx || o.status === 'delivered' ? icon('check') : i + 1}</span>${s.label}</li>`).join('')}</ol>
      <div class="track-card">${stageCard(o)}</div>
      <div class="track-grid">
        <section class="track-card">
          <h3>Updates</h3>
          <ul class="timeline-mini">${history.map((h) => `<li><span class="dot ${actorLabel(h.actor) === 'You' ? 'client' : ''}"></span><div><p><b>${esc(actorLabel(h.actor))}:</b> ${esc(h.text.replace(/^Asked for changes/, 'Asked for changes'))}</p><small>${JO.ago(h.at)}</small></div></li>`).join('') || '<li class="empty-note">Your order has been received.</li>'}</ul>
        </section>
        <section class="track-card help-card">
          <h3>Need help?</h3>
          <p>Questions about your order? We usually reply within 5 minutes.</p>
          <a class="btn btn-wa btn-block" href="${WA}?text=${encodeURIComponent(`Hi Jay CVS, I have a question about my order ${o.id}.`)}" target="_blank" rel="noopener">${icon('whatsapp')}WhatsApp us</a>
          <p class="private-note">${icon('lock')}This page is private to you. Don't share the link publicly.</p>
        </section>
      </div>`;
  }

  // ---------- Client actions ----------
  function commit(res, msg) {
    const box = $('#track-toast');
    if (!res.ok) { box.textContent = res.error; box.className = 'track-toast error'; box.hidden = false; return; }
    JO.save(orders);
    box.textContent = msg;
    box.className = 'track-toast';
    box.hidden = false;
    setTimeout(() => (box.hidden = true), 3200);
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act], [data-star]');
    if (!b || !order) return;
    if (b.dataset.act === 'pay') {
      if (!window.MpesaMock) return;
      const masked = /X/i.test(order.client.phone);
      return window.MpesaMock.open({
        amount: order.amount,
        phone: masked ? '' : `0${order.client.phone.replace(/\D/g, '').slice(-9)}`,
        account: JO.payRef(order),
        isUsed: (code) => JO.codeUsedBy(JO.load(), code),
        onSuccess: (res) => {
          orders = JO.load();
          order = orders.find((x) => x.id === order.id);
          commit(JO.recordMpesa(order, res), 'Payment received! Your writer will start shortly.');
        },
      });
    }
    // Read the draft inside the page, then decide right there
    if (b.dataset.act === 'preview' && window.DocViewer) {
      const f = order.files.filter((x) => x.kind.startsWith('Draft')).pop() || { name: 'Draft', kind: 'Draft' };
      return window.DocViewer.openFile(order, f, {
        watermark: 'DRAFT · for your review',
        note: 'Only you can open this: it comes through your private tracking link. Take your time reading it.',
        actions: [{ act: 'show-changes', label: 'Request changes' }, { act: 'approve', label: "✓ I'm happy with it", primary: true }],
        onAction: (act) => { const t = root.querySelector(`[data-act="${act}"]`); if (t) t.click(); },
      });
    }
    if (b.dataset.act === 'view-final' && window.DocViewer) {
      const f = order.files.filter((x) => /^(Final|Draft)/.test(x.kind)).pop();
      return window.DocViewer.openFile(order, { ...f, name: f.name.replace(/\.\w+$/, `.${b.dataset.ext}`), kind: 'Final version' }, { note: 'Your final document. Download it from the top bar whenever you need it.' });
    }
    if (b.dataset.act === 'approve') return commit(JO.deliver(order, 'Client (tracking page)', 'Approved the draft. Order completed'), 'Thank you! Your final CV is ready to download.');
    if (b.dataset.act === 'show-changes') { $('#changes-form').hidden = false; $('#changes').focus(); return; }
    if (b.dataset.star) {
      const rating = Number(b.dataset.star);
      $('#review-box').innerHTML = `
        <form id="review-form" class="review-form" data-rating="${rating}">
          <strong>Thank you for rating us ${rating}/5! ${'★'.repeat(rating)}</strong>
          <label for="rv-text">Tell other job seekers about your experience</label>
          <textarea id="rv-text" rows="3" placeholder="e.g. I got three interview invitations within two weeks!"></textarea>
          <label class="od-check"><input type="checkbox" id="rv-consent" checked> Jay CVS may show my review (first name and job title only) on its website</label>
          <button class="btn btn-primary" type="submit">Send review</button>
        </form>`;
      $('#rv-text').focus();
    }
  });
  root.addEventListener('submit', (e) => {
    if (!order) return;
    if (e.target.id === 'review-form') {
      e.preventDefault();
      const text = $('#rv-text').value.trim();
      if (!text) { $('#rv-text').focus(); return; }
      const parts = order.client.name.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/, '').split(' ');
      if (window.JayContent) {
        window.JayContent.addReview({
          name: `${parts[0]}${parts[1] ? ` ${parts[1][0]}.` : ''}`, role: order.brief.targetRole === 'Not specified' ? '' : order.brief.targetRole,
          rating: Number(e.target.dataset.rating), text, consent: $('#rv-consent').checked, source: `Tracking page · ${order.id}`,
        });
      }
      $('#review-box').innerHTML = '<strong>Thank you! 🙏</strong><p>Your review has been sent. It helps other job seekers trust us.</p>';
      return;
    }
    if (e.target.id === 'changes-form') {
      e.preventDefault();
      return commit(JO.requestChanges(order, $('#changes').value, 'Client (tracking page)'), "Got it! We're making your changes.");
    }
  });

  JO.onChange(render); // the team updated the order in the admin → update instantly
  render();
})();
