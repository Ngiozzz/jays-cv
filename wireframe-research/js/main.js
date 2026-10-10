// Jay CVS: small enhancements. Every page still works without this file.
document.documentElement.classList.add('js');
// Shown inside the admin flow demo: hide the site header/footer
if (new URLSearchParams(location.search).has('embed')) document.body.classList.add('embed');

// Mobile menu
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('main-nav');

if (toggle && nav) {
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
}

// Header shadow once the page scrolls
const header = document.querySelector('.site-header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Fade cards in as they scroll into view
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('visible'));
}

// Category filters (Samples and Career tips pages)
// <div data-filter-group="grid-id"> holds the .filter-btn buttons;
// items inside #grid-id carry data-category.
document.querySelectorAll('[data-filter-group]').forEach((group) => {
  const grid = document.getElementById(group.dataset.filterGroup);
  const buttons = group.querySelectorAll('.filter-btn');
  if (!grid) return;

  buttons.forEach((btn) =>
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      grid.querySelectorAll('[data-category]').forEach((item) => {
        item.hidden = filter !== 'all' && item.dataset.category !== filter;
      });
    })
  );
});

// Placeholder forms (newsletter) until an email service is connected
document.querySelectorAll('form[data-placeholder-form]').forEach((form) =>
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const status = form.parentElement.querySelector('.form-status');
    if (status) status.hidden = false;
    form.reset();
  })
);

// Order card: three steps that swap in place instead of loading new pages
document.querySelectorAll('.order-card').forEach((card) => {
  const panels = card.querySelectorAll('.order-panel');
  const tabs = card.querySelectorAll('.order-steps li');
  const packages = card.querySelector('[data-group="packages"]');
  const singles = card.querySelector('[data-group="singles"]');

  const show = (step, focus) => {
    panels.forEach((p) => p.classList.toggle('active', Number(p.dataset.step) === step));
    tabs.forEach((li, i) => {
      li.classList.toggle('current', i + 1 === step);
      li.classList.toggle('done', i + 1 < step);
      const btn = li.querySelector('button');
      if (i + 1 === step) btn.setAttribute('aria-current', 'step');
      else btn.removeAttribute('aria-current');
    });
    if (step === 3) updateSummary();
    if (focus) card.querySelector(`#order-t${step}`).focus({ preventScroll: true });
  };

  // Step 1 → decide which options step 2 shows, and pre-select the recommended one
  const applyNeed = () => {
    const need = card.querySelector('input[name="need"]:checked');
    const single = need.dataset.pkg === 'single';
    packages.hidden = single;
    singles.hidden = !single;
    packages.querySelectorAll('.opt').forEach((opt, i) => {
      const recommended = !single && String(i) === need.dataset.pkg;
      opt.classList.toggle('recommended', recommended);
      if (recommended) opt.querySelector('input').checked = true;
    });
    if (single && !singles.querySelector('input:checked')) singles.querySelector('input').checked = true;
  };

  // Step 3 → show what they're ordering
  const chosen = () => {
    const group = packages.hidden ? singles : packages;
    return group.querySelector('input:checked') || group.querySelector('input');
  };
  const updateSummary = () => {
    const { name, price } = chosen().dataset;
    card.querySelectorAll('[data-out="name"]').forEach((el) => (el.textContent = name));
    card.querySelectorAll('[data-out="price"]').forEach((el) => (el.textContent = price));
  };

  // Step 3 → uploading the CV creates the order and the client's private tracking link.
  // Preview: the order is saved in this browser (orders-core.js). Live: the server creates it and stores the CV securely.
  const form = card.querySelector('[data-order-form]');
  const formState = card.querySelector('[data-state="form"]');
  const doneState = card.querySelector('[data-state="done"]');
  const cvInput = form.elements.cv;
  const showError = (msg) => {
    const box = form.querySelector('[data-od-error]');
    box.textContent = msg;
    box.hidden = !msg;
  };
  cvInput.addEventListener('change', () => {
    const f = cvInput.files[0];
    card.querySelector('[data-cv-drop]').classList.toggle('has-file', !!f);
    card.querySelector('[data-cv-label]').innerHTML = f
      ? `<strong>${f.name.replace(/[<>&"]/g, '')}</strong><small>${Math.max(1, Math.round(f.size / 1024))} KB · tap to change</small>`
      : '<strong>Upload your current CV</strong><small>PDF, Word, or a clear photo of it</small>';
    if (f) form.elements.nocv.checked = false;
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    const phoneRaw = form.elements.phone.value.replace(/\s|-/g, '');
    const f = cvInput.files[0];
    const noCv = form.elements.nocv.checked;
    // Kenyan mobile: 07XXXXXXXX / 01XXXXXXXX / +2547XXXXXXXX / 2541XXXXXXXX
    const m = phoneRaw.match(/^(?:\+?254|0)([17]\d{8})$/);
    if (name.length < 3) { showError('Please enter your full name.'); form.elements.name.focus(); return; }
    if (!m) { showError('Please enter a valid Kenyan WhatsApp number, e.g. 0712 345 678.'); form.elements.phone.focus(); return; }
    if (!f && !noCv) { showError('Please upload your CV, or tick "I don\'t have a CV yet".'); return; }
    if (f && f.size > 10 * 1024 * 1024) { showError('That file is over 10 MB. Please upload a smaller file or a photo.'); return; }
    showError('');

    const JO = window.JayOrders;
    const { name: itemName, pkg } = chosen().dataset;
    let order;
    let link;
    if (JO) {
      const list = JO.load();
      const need = card.querySelector('input[name="need"]:checked');
      order = JO.createOrder(list, {
        pkg,
        client: { name, phone: `+254 ${m[1].slice(0, 3)} ${m[1].slice(3, 6)} ${m[1].slice(6)}`, email: form.elements.email.value.trim() },
        brief: { targetRole: form.elements.role.value.trim(), notes: need ? `Chose "${need.closest('.opt').querySelector('strong').textContent}" on the website.` : '' },
        cvFile: f ? { name: f.name, size: `${Math.max(1, Math.round(f.size / 1024))} KB` } : null,
        noCv,
      });
      JO.save(list);
      link = new URL(JO.trackUrl(order), location.href).href;
    }
    const id = order ? order.id : 'JC-0000';
    const amount = order ? JO.kes(order.amount) : `KES ${chosen().dataset.price}`;
    const first = name.split(' ')[0];

    card.querySelector('[data-done-title]').textContent = `Order ${id} created, ${first}!`;
    card.querySelector('[data-done-sub]').textContent = `${itemName}${f ? ` · CV received (${f.name})` : ' · we\'ll send you a short questionnaire'}`;
    card.querySelector('[data-done-link]').textContent = link || '';
    card.querySelector('[data-done-open]').href = link || 'track.html';
    card.querySelector('[data-done-amount]').textContent = amount;
    card.querySelector('[data-pay-now]').textContent = `Pay ${amount}`;
    card.querySelector('[data-pay-box]').hidden = false;
    card.querySelector('[data-paid]').hidden = true;
    payNow = () => window.MpesaMock && JO && window.MpesaMock.open({
      amount: order.amount,
      phone: form.elements.phone.value,
      account: JO.payRef(order),
      isUsed: (code) => JO.codeUsedBy(JO.load(), code),
      onSuccess: (res) => {
        const list = JO.load();
        const o = list.find((x) => x.id === id);
        if (!o || !JO.recordMpesa(o, res).ok) return;
        JO.save(list);
        card.querySelector('[data-pay-box]').hidden = true;
        card.querySelector('[data-paid]').hidden = false;
        card.querySelector('[data-paid-text]').textContent = `${JO.kes(res.amount)} paid by M-Pesa (code ${res.receipt}). Your writer will start shortly. Follow every step on your tracking page.`;
      },
    });
    // The client sends this to Jay CVS, so the link stays in their own WhatsApp chat
    const waText = `Hi Jay CVS, I've placed order ${id} (${itemName}). My private tracking link: ${link}`;
    card.querySelector('[data-done-wa]').href = `https://wa.me/254725912186?text=${encodeURIComponent(waText)}`;
    formState.hidden = true;
    doneState.hidden = false;
    // If this page is running inside the admin flow demo, tell it which order was just created
    if (order && window.parent !== window) window.parent.postMessage({ type: 'jaycvs:order-created', id: order.id }, '*');
    card.querySelector('[data-done-title]').focus({ preventScroll: true });
    // Scroll only this page (scrollIntoView would also scroll the admin flow demo around it)
    window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
  });
  let payNow = null;
  card.querySelector('[data-pay-now]').addEventListener('click', () => payNow && payNow());
  card.querySelector('[data-copy-link]').addEventListener('click', async (e) => {
    const label = e.currentTarget.querySelector('span');
    try {
      await navigator.clipboard.writeText(card.querySelector('[data-done-link]').textContent);
      label.textContent = 'Copied!';
    } catch (err) {
      label.textContent = 'Select & copy';
    }
  });
  card.querySelector('[data-new-order]').addEventListener('click', () => {
    form.reset();
    cvInput.dispatchEvent(new Event('change'));
    doneState.hidden = true;
    formState.hidden = false;
    show(1, true);
  });

  card.querySelectorAll('input[name="need"]').forEach((input) => input.addEventListener('change', applyNeed));
  card.querySelectorAll('[data-go]').forEach((btn) =>
    btn.addEventListener('click', () => show(Number(btn.dataset.go), true))
  );

  applyNeed();
  show(Number(card.dataset.start) || 1, false);
});

// Click a sample CV to see it full size
const sampleImages = document.querySelectorAll('.sample-pair img');
if (sampleImages.length && typeof HTMLDialogElement === 'function') {
  const box = document.createElement('dialog');
  box.className = 'lightbox';
  box.innerHTML = '<button class="lightbox-close" aria-label="Close">&times;</button><img alt="">';
  document.body.append(box);
  const big = box.querySelector('img');
  box.querySelector('.lightbox-close').addEventListener('click', () => box.close());
  box.addEventListener('click', (e) => { if (e.target === box) box.close(); });
  sampleImages.forEach((img) =>
    img.addEventListener('click', () => {
      big.src = img.src;
      big.alt = img.alt;
      box.showModal();
    })
  );
}

// Keep the copyright year current
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
