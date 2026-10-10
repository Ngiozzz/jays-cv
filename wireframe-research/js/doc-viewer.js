// Jay CVS: in-page document viewer for CVs, drafts and attachments (used by the admin order page and the client tracking page).
// The real build streams each file through a PRIVATE link that expires after a few minutes, shows PDFs with the
// browser's own viewer (or PDF.js), and converts Word files to PDF on the server. Files never go to a public viewer
// (Google Docs / Office Online), because CVs hold personal details.
// DESIGN PREVIEW: sample files open the matching sample CV image; a PDF or image you upload in this session opens for real.
window.DocViewer = (() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id) => `<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const live = {}; // files uploaded in this session: name → { url, type }

  // Sample CV images per target role (the "before" image is the client's own CV, "after" is our draft)
  const ROLE = {
    'Procurement Officer': 'accountant', 'Graduate Trainee (Finance)': 'business-graduate', 'Country Director, health NGO': 'project-manager',
    'Site Engineer': 'civil-engineer', 'Customer Service Lead': 'hospitality-supervisor', 'Sales Manager': 'finance-manager',
    'Data Analyst': 'software-developer', Driver: 'business-graduate',
  };
  const typeOf = (name) => (/\.pdf$/i.test(name) ? 'PDF' : /\.docx?$/i.test(name) ? 'Word' : /\.(jpe?g|png|webp)$/i.test(name) ? 'Image' : 'File');
  const isOurs = (f) => /^(Draft|Final)/.test(f.kind);

  // A simple letter page for cover-letter files (there's no sample image for those)
  const letter = (o) => `<div class="dv-letter"><p class="dv-l-from"><b>${esc(o.client.name)}</b><br>Nairobi · ${esc(o.client.email)}</p>
    <p>The Hiring Manager<br>${esc(o.brief.industry)} company</p>
    <p><b>Re: Application for ${esc(o.brief.targetRole)}</b></p>
    <p>Dear Hiring Manager,</p>
    <p>I am writing to apply for the ${esc(o.brief.targetRole)} role. With ${esc(o.brief.experience)} of experience in ${esc(o.brief.industry)}, I have built a record of delivering results under pressure and working well with customers and colleagues.</p>
    <p>In my current role I have consistently exceeded targets, improved how my team works and taken on new responsibilities. I would bring the same commitment to your organisation.</p>
    <p>Thank you for considering my application. I would welcome the chance to discuss how I can contribute.</p>
    <p>Yours faithfully,<br><b>${esc(o.client.name)}</b></p></div>`;

  // What to show for one file of an order. base = path to the site root ('' on the website, '../' in the admin)
  function pagesFor(o, f, base) {
    const l = live[f.name];
    if (l) return l.type === 'pdf' ? [{ pdf: l.url }] : l.type === 'image' ? [{ img: l.url }] : [{ msg: 'Word files open here in the real version: the server turns them into a PDF first. In this preview, PDFs and images you upload open straight away.' }];
    if (/advert/i.test(f.kind)) return [{ img: `${base}img/jobs/inbox/bahari-customer-service-interns.png` }];
    if (/cover letter/i.test(f.name) || o.package === 'Cover letter' && isOurs(f)) return [{ html: letter(o) }];
    const slug = ROLE[o.brief.targetRole] || 'accountant';
    return [{ img: `${base}img/samples/${slug}-${isOurs(f) ? 'after' : 'before'}.jpeg` }];
  }

  let dlg;
  let zoom = 1;
  function open({ title, sub, pages, watermark, note, actions = [], onAction, download }) {
    close();
    zoom = 1;
    dlg = document.createElement('dialog');
    dlg.className = 'doc-viewer';
    dlg.setAttribute('aria-label', `Viewing ${title}`);
    const page = (p, i) => (p.pdf ? `<iframe class="dv-pdf" src="${esc(p.pdf)}" title="${esc(title)}"></iframe>`
      : `<div class="dv-page"${watermark ? ` data-wm="${esc(watermark)}"` : ''}>${p.img ? `<img src="${esc(p.img)}" alt="${esc(title)}, page ${i + 1}">` : p.html ? p.html : `<div class="dv-msg">${icon('info')}<p>${esc(p.msg)}</p></div>`}</div>`);
    dlg.innerHTML = `
      <div class="dv-bar">
        <span class="dv-file">${icon('doc')}<span><strong>${esc(title)}</strong><small>${esc(sub || '')}</small></span></span>
        <span class="dv-tools">
          ${pages.some((p) => p.pdf) ? '' : `<button type="button" class="dv-btn" data-z="-1" aria-label="Zoom out">−</button><span class="dv-zoom" aria-live="polite">100%</span><button type="button" class="dv-btn" data-z="1" aria-label="Zoom in">+</button>`}
          <span class="dv-pages">${pages.length} page${pages.length === 1 ? '' : 's'}</span>
          ${download ? `<a class="dv-btn dv-dl" href="${esc(download)}" download target="_blank" rel="noopener">${icon('download')}<span>Download</span></a>` : ''}
          <button type="button" class="dv-btn dv-close" aria-label="Close">✕</button>
        </span>
      </div>
      <div class="dv-body"><div class="dv-pages-wrap">${pages.map(page).join('')}</div></div>
      <div class="dv-foot">
        <small>${icon('lock')}${esc(note || 'Private view: opened through a link that expires in 10 minutes. The file is never sent to a public viewer.')}</small>
        ${actions.length ? `<span class="dv-acts">${actions.map((a) => `<button type="button" class="btn ${a.primary ? 'btn-primary' : 'btn-ghost'}" data-act="${esc(a.act)}">${a.label}</button>`).join('')}</span>` : ''}
      </div>`;
    document.body.append(dlg);
    const wrap = dlg.querySelector('.dv-pages-wrap');
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.closest('.dv-close')) return close();
      const z = e.target.closest('[data-z]');
      if (z) {
        zoom = Math.min(2, Math.max(0.5, Math.round((zoom + Number(z.dataset.z) * 0.25) * 100) / 100));
        wrap.style.setProperty('--zoom', zoom);
        dlg.querySelector('.dv-zoom').textContent = `${Math.round(zoom * 100)}%`;
      }
      const a = e.target.closest('[data-act]');
      if (a && onAction) { close(); onAction(a.dataset.act); }
    });
    dlg.addEventListener('close', () => { if (dlg) { dlg.remove(); dlg = null; } });
    dlg.showModal();
    dlg.querySelector('.dv-close').focus();
  }
  function close() { if (dlg && dlg.open) dlg.close(); }

  return {
    // Remember a file uploaded in this session so it can be viewed for real
    remember(file) {
      const t = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name) ? 'pdf' : /^image\//.test(file.type) ? 'image' : 'other';
      live[file.name] = { url: URL.createObjectURL(file), type: t };
    },
    // Open one of an order's files
    openFile(o, f, { base = '', watermark, actions, onAction, note } = {}) {
      const pages = pagesFor(o, f, base);
      const first = pages[0];
      open({ title: f.name, sub: `${f.kind} · ${typeOf(f.name)}${f.size ? ` · ${f.size}` : ''}`, pages, watermark, actions, onAction, note, download: first.img || first.pdf || null });
    },
    typeOf,
    open,
    close,
  };
})();
