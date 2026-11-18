
  // ═════════ Added screens ═════════
  const toast = (() => { const t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); let h; return (m) => { t.textContent = m; t.classList.add('on'); clearTimeout(h); h = setTimeout(() => t.classList.remove('on'), 2200); }; })();

  // Team: dialogs
  const dlg = (n) => document.querySelector(`[data-dlg="${n}"]`);
  document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => {
    const d = dlg(b.dataset.open);
    if (b.dataset.who) d.querySelector('[data-edit-title]').textContent = 'Edit ' + b.dataset.who;
    if (b.dataset.open === 'invite') { d.querySelector('[data-inv-form]').hidden = false; d.querySelector('[data-inv-done]').hidden = true; d.querySelector('[data-inv-create]').textContent = 'Create invite'; }
    d.showModal();
  }));
  document.querySelectorAll('dialog.dlg').forEach((d) => {
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-close]')) { d.close(); const t = e.target.closest('[data-toast]'); if (t) toast(t.dataset.toast); } });
  });
  document.querySelector('[data-inv-create]').addEventListener('click', (e) => {
    const d = dlg('invite');
    if (!d.querySelector('[data-inv-done]').hidden) { navigator.clipboard && navigator.clipboard.writeText(d.querySelector('[data-inv-msg]').textContent); d.close(); toast('Message copied. Paste it in WhatsApp'); return; }
    const name = (d.querySelector('[data-inv-name]').value.trim() || 'there').split(' ')[0];
    d.querySelector('[data-inv-msg]').textContent = `Hi ${name}, Jay here. I've added you to the Jay CVS team.\n\nSign in with your Google account here: jaycvs.co.ke/admin/join/8hx2k\n\nThe link works for 14 days.`;
    d.querySelector('[data-inv-form]').hidden = true; d.querySelector('[data-inv-done]').hidden = false;
    e.target.textContent = 'Copy message';
  });
  document.querySelectorAll('[data-copy-invite]').forEach((b) => b.addEventListener('click', () => toast('Invite message copied')));

  // Website content: tabs, unsaved changes, publish
  const ctabs = document.querySelectorAll('[data-ct]');
  const pub = document.querySelector('[data-publish]'), pubBtn = document.querySelector('[data-pub]'), discard = document.querySelector('[data-discard]');
  let dirty = 0;
  const setDirty = (n) => {
    dirty = n; pubBtn.disabled = !n; discard.hidden = !n; pub.classList.toggle('dirty', !!n);
    document.querySelector('[data-pub-text]').textContent = n ? `${n} unsaved ${n === 1 ? 'change' : 'changes'}` : 'All changes are live';
  };
  ctabs.forEach((b) => b.addEventListener('click', () => {
    ctabs.forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    document.querySelectorAll('[data-cp]').forEach((p) => (p.hidden = p.dataset.cp !== b.dataset.ct));
    document.querySelector('[data-ctab-crumb]').textContent = b.firstChild.textContent;
    pub.hidden = b.dataset.ct === 'reviews';
  }));
  document.querySelectorAll('#s-content .inp, #s-content .toggle').forEach((el) => el.addEventListener('input', () => setDirty(dirty + (el.dataset.touched ? 0 : 1), (el.dataset.touched = 1))));
  pubBtn.addEventListener('click', () => {
    document.querySelector('[data-changes]').insertAdjacentHTML('afterbegin', `<li><span class="av dark">JA</span><div><b>Jay</b> published ${dirty} ${dirty === 1 ? 'change' : 'changes'}<span> · just now</span><button type="button">Undo</button></div></li>`);
    document.querySelectorAll('#s-content [data-touched]').forEach((el) => delete el.dataset.touched);
    setDirty(0); toast('Published. The website is up to date');
  });
  discard.addEventListener('click', () => { document.querySelectorAll('#s-content [data-touched]').forEach((el) => delete el.dataset.touched); setDirty(0); toast('Changes discarded'); });
  document.querySelector('[data-changes]').addEventListener('click', (e) => { if (e.target.matches('button')) { e.target.closest('li').style.opacity = 0.5; e.target.textContent = 'Undone'; e.target.disabled = true; toast('Change undone'); } });
  document.querySelectorAll('[data-rv]').forEach((b) => b.addEventListener('click', () => {
    const r = b.closest('.rv'); r.classList.add('done');
    r.querySelector('.acts').innerHTML = `<span class="tag ${b.dataset.rv === 'ok' ? 'live' : 'off'}">${b.dataset.rv === 'ok' ? 'Approved' : 'Hidden'}</span>`;
    toast(b.dataset.rv === 'ok' ? 'Review approved. It shows on the website now' : 'Review hidden');
  }));
  document.querySelectorAll('[data-live]').forEach((el) => el.addEventListener('input', () => (document.querySelector(`[data-pv="${el.dataset.live}"]`).textContent = el.value)));
  const SMP = [['nurse', 'Registered nurse', 'Kenya to UK'], ['accountant', 'Accountant', 'Entry level'], ['project-manager', 'Project manager', 'Into NGO work'], ['software-developer', 'Software developer', 'Junior to mid-level'], ['business-graduate', 'Business graduate', 'First job'], ['clinical-officer', 'Clinical officer', 'To private practice'], ['finance-manager', 'Finance manager', 'Senior'], ['civil-engineer', 'Civil engineer', 'To consultancy'], ['hospitality-supervisor', 'Hospitality supervisor', 'Nairobi to Dubai']];
  document.querySelector('[data-smp-grid]').innerHTML = SMP.map(([s, r, n], i) => `<div class="smp-c"><div class="pair"><img src="../img/samples/${s}-before.jpeg" alt=""><img src="../img/samples/${s}-after.jpeg" alt=""></div><div class="row"><div><b>${r}</b><small>${n}</small></div><input type="checkbox" class="toggle" ${i < 8 ? 'checked' : ''} aria-label="Show on website"></div></div>`).join('');
  document.querySelectorAll('[data-smp-grid] .toggle').forEach((el) => el.addEventListener('input', () => setDirty(dirty + 1)));

  // Order flow demo
  const FLOW = [
    { team: 'admin-unslop.html#orders', client: 'order.html?pkg=professional', note: '<b>The client places the order</b> and uploads their CV. The team sees it as Awaiting payment. Nobody is asked to work yet.' },
    { team: 'admin-unslop.html#dashboard', client: 'track.html?ref=JC-1052', note: '<b>The client pays by M-Pesa prompt.</b> Payment is matched automatically, the order moves to Paid, not accepted, and every writer gets a WhatsApp alert.' },
    { team: 'admin-unslop.html#order', client: 'track.html?ref=JC-1052', note: '<b>A writer accepts it.</b> The 24-hour clock starts. The client sees Writing and the writer\'s name on their tracking page.' },
    { team: 'admin-unslop.html#order', client: 'track.html?ref=JC-1052', note: '<b>The writer uploads draft 1</b> with a note. The client gets a WhatsApp message and reviews it on their tracking page.' },
    { team: 'admin-unslop.html#order', client: 'track.html?ref=JC-1052', note: '<b>The client asks for a change.</b> It lands on the writer\'s order page with their note. One revision round is used.' },
    { team: 'admin-unslop.html#finance', client: 'track.html?ref=JC-1052', note: '<b>The client says they\'re happy.</b> Their final files unlock, they\'re asked for a review, and the order counts as delivered on the dashboard.' },
  ];
  let fstep = 2, fmode = 'client';
  const fl = document.querySelector('[data-fl]'), frr = document.querySelector('[data-frr]');
  // Admin views render at desktop width and scale down to fit their frame
  const fit = () => document.querySelectorAll('.fr .scaler').forEach((sc) => {
    const f = sc.querySelector('iframe'), k = sc.clientWidth / 1360;
    f.style.transform = `scale(${k})`; f.style.height = (720 / k) + 'px';
  });
  addEventListener('resize', fit);
  const renderFlow = () => {
    document.querySelectorAll('[data-fsteps] li').forEach((li, i) => (li.className = i < fstep ? 'done' : i === fstep ? 'now' : ''));
    document.querySelector('[data-fnote]').innerHTML = FLOW[fstep].note;
    requestAnimationFrame(fit);
    if (location.hash !== '#flow') return;
    if (fmode === 'client') {
      if (!fl.src.endsWith(FLOW[fstep].team)) fl.src = FLOW[fstep].team;
      if (!frr.src.endsWith(FLOW[fstep].client)) frr.src = FLOW[fstep].client;
    } else {
      if (!fl.src.endsWith('admin-unslop.html#dashboard')) fl.src = 'admin-unslop.html#dashboard';
      if (!frr.src.endsWith('admin-unslop.html#orders')) frr.src = 'admin-unslop.html#orders';
    }
  };
  document.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { fstep = +b.dataset.f; renderFlow(); }));
  document.querySelector('[data-fnext]').addEventListener('click', () => { fstep = Math.min(5, fstep + 1); renderFlow(); });
  document.querySelector('[data-freset]').addEventListener('click', () => { fstep = 0; renderFlow(); toast('Test order reset'); });
  document.querySelector('[data-fskip]').addEventListener('click', () => toast('24 hours skipped. Late orders now show as overdue'));
  document.querySelector('[data-fmode]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    fmode = b.dataset.m;
    document.querySelectorAll('[data-m]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const roles = fmode === 'roles';
    document.querySelector('[data-frames]').classList.toggle('roles', roles);
    document.querySelector('[data-fr-right]').classList.toggle('phone', !roles);
    document.querySelector('[data-fl-title]').textContent = roles ? 'Jay · owner' : 'Team · the writer';
    document.querySelector('[data-fl-sub]').textContent = roles ? 'Sees money, team and website' : 'Admin, the order page';
    document.querySelector('[data-fr-title]').textContent = roles ? 'A writer' : 'Client · their phone';
    document.querySelector('[data-fr-sub]').textContent = roles ? 'Only orders, no prices or takings' : 'Tracking link';
    const bez = document.querySelector('[data-fr-right] .bezel');
    bez.classList.toggle('scaler', roles);
    renderFlow();
  });
  addEventListener('hashchange', renderFlow);
  renderFlow();
