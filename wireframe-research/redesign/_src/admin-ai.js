
  // ═════════ AI tokens ═════════
  (() => {
    const fmt = (n) => Math.round(n).toLocaleString('en-KE');
    const GRANT = 1000000, PER_DAY = 33500;
    // Daily use, 1 to 18 November: busier on posting days
    const days = [21, 38, 29, 44, 35, 12, 9, 41, 36, 47, 30, 28, 11, 8, 39, 43, 52, 30].map((k) => k * 1000);
    const top = Math.max(...days);
    document.querySelector('[data-ai-bars]').innerHTML = days.map((v, i) =>
      `<span ${i === days.length - 1 ? 'class="today"' : ''} style="height:${(v / top) * 100}%" data-t="${i + 1} Nov · ${fmt(v)}"></span>`).join('');

    // Team allowances. "Shared pool" covers client CV checks, automatic checks, and anyone past their allowance
    const PEOPLE = [
      { av: 'JA', dark: true, name: 'Jay', role: 'Owner', allow: null, used: 210000, color: '#1c1b19' },
      { av: 'GW', name: 'Grace', role: 'Writes CVs, posts jobs', allow: 250000, used: 231600, color: '#b8913f' },
      { av: 'BO', name: 'Brian', role: 'Writes CVs', allow: 40000, used: 14200, color: '#78716c' },
      { av: 'AM', name: 'Aisha', role: 'Writes CVs', allow: 40000, used: 13100, color: '#a8a29e' },
    ];
    const POOL_USED = 123000 + 7200 + 5400; // client CV checks + automatic checks
    const tbody = document.querySelector('[data-ai-allow]');
    const row = (p, i) => {
      const pct = p.allow ? Math.min(100, (p.used / p.allow) * 100) : null;
      const hot = pct !== null && pct >= 85;
      return `<tr>
        <td><div class="who-cell"><span class="av${p.dark ? ' dark' : ''}">${p.av}</span><div><div class="cell-main">${p.name}</div><div class="cell-sub">${p.role}</div></div></div></td>
        <td>${p.allow === null ? '<span class="muted">No limit</span>' : `<input class="inp num" value="${fmt(p.allow)}" data-i="${i}" aria-label="${p.name}'s monthly allowance">`}</td>
        <td><div class="ai-use${hot ? ' hot' : ''}"><div class="meter"><span style="width:${pct === null ? Math.min(100, p.used / GRANT * 100 * 2) : pct}%"></span></div><small>${fmt(p.used)}${p.allow ? ` of ${fmt(p.allow)}${hot ? ' · almost used up' : ''}` : ' used'}</small></div></td>
        <td>${i === 0 ? '<span class="muted" style="font-size:13px">Always</span>' : '<input type="checkbox" class="toggle" checked aria-label="AI on for ' + p.name + '">'}</td></tr>`;
    };
    const render = () => {
      tbody.innerHTML = PEOPLE.map(row).join('') + `<tr class="pool"><td><div class="who-cell"><span class="av">··</span><div><div class="cell-main">Shared pool</div><div class="cell-sub">Client CV checks, automatic checks</div></div></div></td><td><span class="muted">What's left over</span></td><td><div class="ai-use"><div class="meter"><span style="width:${POOL_USED / GRANT * 100 * 2}%"></span></div><small>${fmt(POOL_USED)} used</small></div></td><td><span class="muted" style="font-size:13px">Always</span></td></tr>`;
      sum();
      tbody.querySelectorAll('input.inp').forEach((el) => el.addEventListener('input', () => {
        PEOPLE[+el.dataset.i].allow = +el.value.replace(/\D/g, '') || 0; sum();
      }));
    };
    const sum = () => {
      const given = PEOPLE.reduce((a, p) => a + (p.allow || 0), 0);
      const left = GRANT - given;
      const box = document.querySelector('[data-ai-sum]');
      box.classList.toggle('over', left < 0);
      box.innerHTML = `<span>Given to writers <b class="num">${fmt(given)}</b> · Shared pool and Jay <b class="num ${left < 0 ? 'over' : ''}">${left < 0 ? 'Over by ' + fmt(-left) : fmt(left)}</b></span><button class="btn btn-primary btn-sm" type="button" data-ai-save>Save allowances</button>`;
      const parts = PEOPLE.filter((p) => p.allow).map((p) => [p.name, p.allow, p.color]).concat([['Jay and shared pool', Math.max(0, left), '#e7e5e4']]);
      document.querySelector('[data-ai-split]').innerHTML = parts.map(([, v, c]) => `<span style="flex:${v} 0 0;background:${c}"></span>`).join('');
      document.querySelector('[data-ai-split-k]').innerHTML = parts.map(([n, v, c]) => `<span><i style="background:${c}"></i>${n} ${fmt(v)}</span>`).join('');
      box.querySelector('[data-ai-save]').addEventListener('click', () => (typeof toast === 'function' ? toast('Allowances saved. They reset on the 1st of each month') : null));
    };
    render();

    // Request more tokens
    let pick = 1000000;
    const lasts = document.querySelector('[data-ai-lasts]');
    const other = document.querySelector('[data-ai-other]');
    const updateLasts = () => {
      const n = pick === 'other' ? (+other.querySelector('input').value.replace(/\D/g, '') || 0) : pick;
      if (pick === 'other' && (n < 100000 || n > 50000000)) { lasts.innerHTML = n ? 'Ask for between <b>100,000</b> and <b>50,000,000</b> tokens.' : 'Type how many tokens you need.'; return; }
      lasts.innerHTML = `At November's pace, <b>${fmt(n)}</b> tokens last about <b>${Math.max(1, Math.round(n / PER_DAY))} days</b>.`;
    };
    document.querySelector('[data-ai-chips]').addEventListener('click', (e) => {
      const b = e.target.closest('[data-n]'); if (!b) return;
      document.querySelectorAll('[data-ai-chips] button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      pick = b.dataset.n === 'other' ? 'other' : +b.dataset.n;
      other.hidden = pick !== 'other'; updateLasts();
    });
    other.querySelector('input').addEventListener('input', updateLasts);
    const form = document.querySelector('[data-ai-form]'), pend = document.querySelector('[data-ai-pending]');
    document.querySelector('[data-ai-send]').addEventListener('click', () => {
      const n = pick === 'other' ? (+other.querySelector('input').value.replace(/\D/g, '') || 0) : pick;
      if (n < 100000 || n > 50000000) { updateLasts(); return; }
      document.querySelector('[data-ai-pend-t]').textContent = `${fmt(n)} tokens requested`;
      form.hidden = true; pend.hidden = false;
      typeof toast === 'function' && toast('Request sent to the developer');
    });
    document.querySelector('[data-ai-cancel]').addEventListener('click', () => { form.hidden = false; pend.hidden = true; });
    document.querySelector('[data-ai-grant]').addEventListener('click', () => {
      const t = document.querySelector('[data-ai-pend-t]').textContent.replace(' tokens requested', '');
      document.querySelector('[data-ai-ledger]').insertAdjacentHTML('afterbegin', `<li><div><b>Top-up you requested</b><br><span>Today · added by the developer</span></div><span class="amt">+${t}</span></li>`);
      form.hidden = false; pend.hidden = true;
      typeof toast === 'function' && toast(`${t} tokens added`);
    });
    document.querySelector('[data-jump-req]').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('ai-request').scrollIntoView({ behavior: 'smooth' }); });
  })();
