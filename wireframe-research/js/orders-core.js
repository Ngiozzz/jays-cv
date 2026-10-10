// Jay CVS: order rules shared by the admin (team view) and the tracking page (client view).
// DESIGN PREVIEW: orders live in this browser's localStorage. In the real product these rules
// run on the server, and M-Pesa payments are confirmed by Safaricom (Daraja: STK Push callback / Paybill C2B) automatically.
window.JayOrders = (() => {
  const KEY = 'jaycvs-mock-orders';
  const HOUR = 3600000;
  const DAY = 24 * HOUR;

  // ---------- Business rules (change these in one place) ----------
  const RULES = {
    unpaidAbandonHours: 24, // unpaid orders are marked "Abandoned" after this
    revisionHours: 24, // time to send a revised draft after the client asks for changes
    remindAfterDays: 2, // remind the client to review their draft
    autoDeliverDays: 5, // no reply after the draft → delivered automatically
  };
  // The owner can change these in Admin → Website content → Business settings
  const CONTENT = window.JayContent ? window.JayContent.get() : null;
  if (CONTENT) {
    const st = CONTENT.settings;
    RULES.unpaidAbandonHours = Number(st.unpaidHours) || RULES.unpaidAbandonHours;
    RULES.revisionHours = Number(st.revisionHours) || RULES.revisionHours;
    RULES.remindAfterDays = Number(st.reminderDays) || RULES.remindAfterDays;
    RULES.autoDeliverDays = Number(st.autoCompleteDays) || RULES.autoDeliverDays;
  }
  const FIRST_DRAFT_HOURS = { Basic: 48, Professional: 24, Executive: 24, 'Cover letter': 24, 'LinkedIn revamp': 48 };
  // Revision rounds included in each package (Executive: unlimited for 14 days)
  const ROUNDS = { Basic: 1, Professional: 2, Executive: 99, 'Cover letter': 1, 'LinkedIn revamp': 1 };
  const PRICES = window.ORDER_PRICES || {};
  // Prices and revision rounds come from Website content when it's loaded (one source of truth)
  const priceOf = (pkg) => {
    const p = window.JayContent ? window.JayContent.priceOf(pkg) : null;
    return p !== null && p !== undefined ? p : PRICES[pkg] || 0;
  };
  if (CONTENT) CONTENT.packages.forEach((p) => { ROUNDS[p.short] = Number(p.rounds) || ROUNDS[p.short]; });

  // ---------- Status names: the team sees one wording, the client another ----------
  const STATUS = {
    new: { team: 'Awaiting payment', client: 'Waiting for payment', cls: 'st-new' },
    abandoned: { team: 'Abandoned (unpaid)', client: 'Waiting for payment', cls: 'st-abandoned' },
    paid: { team: '⚠ Not accepted', client: 'Payment confirmed', cls: 'st-open' },
    writing: { team: 'Writing', client: 'Your writer is working on it', cls: 'st-writing' },
    'draft-sent': { team: 'Draft with client', client: 'Your draft is ready', cls: 'st-draft' },
    revisions: { team: 'Revisions', client: 'Making your changes', cls: 'st-revisions' },
    delivered: { team: 'Delivered', client: 'Completed', cls: 'st-delivered' },
  };

  // ---------- Storage ----------
  const token = (id) => [...id].reduce((h, c) => (h * 33 + c.charCodeAt(0)) % 1679616, 5381).toString(36).padStart(4, 'x');
  function seed() {
    const now = Date.now();
    return (window.ORDERS || []).map((o) => {
      const created = now - o.hoursAgo * HOUR;
      const paid = o.payment.status === 'confirmed' ? created + 6 * 60000 : null;
      const order = {
        ...o,
        created: new Date(created).toISOString(),
        amount: priceOf(o.package),
        token: token(o.id),
        paidAt: paid ? new Date(paid).toISOString() : null,
        acceptedAt: ['writing', 'draft-sent', 'revisions', 'delivered'].includes(o.status) ? new Date(created + 50 * 60000).toISOString() : null,
        draftSentAt: null,
        deliveredAt: null,
        revisions: [],
        log: [],
      };
      const at = (h) => new Date(created + h * HOUR).toISOString();
      if (paid) {
        const channel = Number(o.id.slice(-1)) % 3 ? 'M-Pesa prompt' : 'Paybill';
        order.payment = { status: 'confirmed', method: 'M-Pesa', channel, reference: o.id, receipt: o.payment.code, fee: 0 };
        order.log.push({ at: order.paidAt, actor: 'M-Pesa', text: `Payment received: ${kes(order.amount)} by ${channel} (M-Pesa code ${o.payment.code})`, client: true });
      }
      if (order.acceptedAt) order.log.push({ at: order.acceptedAt, actor: o.writer.split(' (')[0], text: 'Accepted the order and started writing', client: true });
      if (['draft-sent', 'revisions', 'delivered'].includes(o.status)) {
        order.draftSentAt = at(Math.min(o.hoursAgo - 1, 20));
        order.log.push({ at: order.draftSentAt, actor: o.writer.split(' (')[0], text: 'Sent draft v1 to the client', client: true });
      }
      if (o.status === 'revisions') {
        const r = { at: at(Math.min(o.hoursAgo - 0.5, 30)), by: 'Client (WhatsApp call)', text: o.brief.notes || 'Minor changes' };
        order.revisions.push(r);
        order.log.push({ at: r.at, actor: 'Brian', text: `Logged change request (round 1): "${r.text}"`, client: true });
      }
      if (o.status === 'delivered') {
        order.deliveredAt = at(o.hoursAgo - 2);
        order.log.push({ at: order.deliveredAt, actor: 'Client', text: 'Approved the draft. Order completed', client: true });
      }
      return order;
    });
  }
  function load() {
    let list;
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) list = JSON.parse(saved);
    } catch (e) { /* fall back to sample data */ }
    list = list || seed();
    // Older preview data was paid through Paystack: M-Pesa is now paid directly
    list.forEach((o) => { if (o.payment && o.payment.method === 'Paystack') { o.payment.method = 'M-Pesa'; o.payment.fee = 0; o.payment.reference = o.id; if (/^(M-Pesa|Card)$/.test(o.payment.channel || '')) o.payment.channel = 'M-Pesa prompt'; } (o.log || []).forEach((l) => { if (l.actor === 'Paystack') l.actor = 'M-Pesa'; }); });
    // Older preview data called Grace "senior writer"; Jay is the senior writer now
    list.forEach((o) => { if (o.writer === 'Grace (senior writer)') o.writer = 'Grace'; (o.log || []).forEach((l) => { l.text = l.text.replace('Grace (senior writer)', 'Grace'); }); });
    const changed = list.map(applyRules).some(Boolean);
    if (changed) save(list);
    return list;
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
  // Re-render when the other view (team/client) changes the same order in another tab or frame
  function onChange(cb) { window.addEventListener('storage', (e) => { if (e.key === KEY) cb(); }); }

  // ---------- Helpers ----------
  const now = () => Date.now();
  const t = (iso) => new Date(iso).getTime();
  const log = (o, actor, text, client = false) => o.log.push({ at: new Date().toISOString(), actor, text, client });
  const roundsLimit = (o) => ROUNDS[o.package] ?? 1;
  const roundsUsed = (o) => o.revisions.length;
  const roundsLabel = (o) => (roundsLimit(o) >= 99 ? 'Unlimited rounds (14 days)' : `${roundsUsed(o)} of ${roundsLimit(o)} revision ${roundsLimit(o) === 1 ? 'round' : 'rounds'} used`);
  // extraHours: time the owner added to the current deadline
  const firstDraftDue = (o) => (o.paidAt ? t(o.paidAt) + ((FIRST_DRAFT_HOURS[o.package] || 48) + (o.revisions.length ? 0 : o.extraHours || 0)) * HOUR : null);
  const revisionDue = (o) => (o.revisions.length ? t(o.revisions[o.revisions.length - 1].at) + (RULES.revisionHours + (o.extraHours || 0)) * HOUR : null);
  const autoDeliverAt = (o) => (o.draftSentAt ? t(o.draftSentAt) + RULES.autoDeliverDays * DAY : null);
  const kes = (n) => `KES ${Number(n || 0).toLocaleString('en-KE')}`;
  const span = (ms) => {
    const h = Math.abs(ms) / HOUR;
    if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
    if (h < 24) return `${Math.floor(h)}h`;
    return `${Math.floor(h / 24)}d ${Math.floor(h % 24)}h`;
  };
  const ago = (iso) => {
    const ms = now() - t(iso);
    return ms < 60000 ? 'just now' : `${span(ms)} ago`;
  };
  const when = (ms) => new Date(ms).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  // Clock shown on the team side
  function due(o) {
    const n = now();
    const clock = (deadline) => {
      const left = deadline - n;
      if (left < 0) return { text: `Overdue ${span(left)}`, cls: 'late' };
      return { text: `Due in ${span(left)}`, cls: left < 6 * HOUR ? 'soon' : '' };
    };
    switch (o.status) {
      case 'new': return { text: `Unpaid · abandons in ${span(t(o.created) + RULES.unpaidAbandonHours * HOUR - n)}`, cls: '' };
      case 'abandoned': return { text: 'Unpaid 24h+', cls: 'muted' };
      case 'paid':
      case 'writing': return clock(firstDraftDue(o));
      case 'revisions': return clock(revisionDue(o));
      case 'draft-sent': return { text: `With client · auto-completes in ${span(autoDeliverAt(o) - n)}`, cls: '' };
      default: return { text: 'Delivered', cls: 'done' };
    }
  }

  // ---------- Automatic rules (run whenever orders are loaded) ----------
  function applyRules(o) {
    const n = now();
    let changed = false;
    if (o.status === 'new' && n - t(o.created) > RULES.unpaidAbandonHours * HOUR) {
      o.status = 'abandoned';
      o.log.push({ at: new Date(t(o.created) + RULES.unpaidAbandonHours * HOUR).toISOString(), actor: 'System', text: `No payment after ${RULES.unpaidAbandonHours}h: marked abandoned` });
      changed = true;
    }
    if (o.status === 'draft-sent' && o.draftSentAt) {
      const sent = t(o.draftSentAt);
      const reminded = o.log.some((l) => l.actor === 'System' && l.text.startsWith('Reminded') && t(l.at) >= sent);
      if (!reminded && n - sent > RULES.remindAfterDays * DAY) {
        o.log.push({ at: new Date(sent + RULES.remindAfterDays * DAY).toISOString(), actor: 'System', text: 'Reminded the client to review their draft (WhatsApp)', client: true });
        changed = true;
      }
      if (n - sent > RULES.autoDeliverDays * DAY) {
        o.status = 'delivered';
        o.deliveredAt = new Date(sent + RULES.autoDeliverDays * DAY).toISOString();
        o.log.push({ at: o.deliveredAt, actor: 'System', text: `No reply for ${RULES.autoDeliverDays} days: completed automatically`, client: true });
        changed = true;
      }
    }
    return changed;
  }

  // ---------- Actions (each is one trigger in the flow) ----------
  const ok = { ok: true };
  const fail = (error) => ({ ok: false, error });
  const paybill = () => (window.JayContent && window.JayContent.get().settings.paybill) || '4027127';
  const nextDraft = (o) => o.files.filter((f) => f.kind.startsWith('Draft')).length + 1;

  // M-Pesa account number = the order number, so every payment matches its order
  const payRef = (o) => o.id;
  // Which order (if any) already used this M-Pesa code: one code can never pay two orders
  const codeUsedBy = (list, code) => { const hit = list.find((x) => x.payment && x.payment.receipt === String(code || '').toUpperCase()); return hit ? hit.id : null; };
  // M-Pesa confirmed the payment (live: Safaricom's STK callback or Paybill C2B notification, checked on the server)
  function recordMpesa(o, res) {
    if (!['new', 'abandoned'].includes(o.status)) return fail('This order is already paid.');
    o.payment = { status: 'confirmed', method: 'M-Pesa', channel: res.channel, reference: o.id, receipt: res.receipt, phone: res.phone || '', fee: 0 };
    o.paidAt = res.paidAt || new Date().toISOString();
    o.status = 'paid';
    log(o, 'M-Pesa', `Payment received: ${kes(res.amount)} by ${res.channel} (M-Pesa code ${res.receipt})`, true);
    return ok;
  }
  // A payment recorded by the admin (an M-Pesa code that didn't match automatically, cash, bank…)
  function confirmPayment(o, ref, actor) {
    ref = String(ref || '').trim().toUpperCase();
    if (!['new', 'abandoned'].includes(o.status)) return fail('This order is already paid.');
    if (ref.length < 4) return fail('Enter the payment reference, e.g. the M-Pesa code.');
    o.payment = { status: 'confirmed', method: 'Manual', channel: 'Recorded by admin', reference: ref, receipt: ref, fee: 0 };
    o.paidAt = new Date().toISOString();
    o.status = 'paid';
    log(o, actor, `Payment recorded manually (ref ${ref})`, true);
    return ok;
  }
  const short = (name) => String(name || '').split(' (')[0];
  // A paid order is open to every writer; the FIRST to press "Accept" gets it, and the system records who and when.
  // (Live: the server does this in one database step, so two writers can never accept the same order.)
  function accept(o, who) {
    if (!who) return fail('Sign in as a team member first.');
    if (o.writer) return fail(`Already accepted by ${short(o.writer)}.`);
    if (o.status !== 'paid') return fail('Only paid orders can be accepted.');
    o.writer = who;
    o.status = 'writing';
    o.acceptedAt = new Date().toISOString();
    log(o, short(who), 'Accepted the order and started writing', true);
    return ok;
  }
  // The owner can move an accepted order to another writer (e.g. someone is sick); the system records it.
  function reassign(o, writer, actor) {
    if (!o.writer) return fail('Nobody has accepted this order yet.');
    if (!writer || writer === o.writer) return fail('Choose a different writer.');
    if (['delivered', 'abandoned'].includes(o.status)) return fail('This order is closed.');
    const from = short(o.writer);
    o.writer = writer;
    log(o, short(actor), `Reassigned the order from ${from} to ${short(writer)}`, true);
    return ok;
  }
  function sendDraft(o, fileName) {
    if (!['writing', 'revisions'].includes(o.status)) return fail('A draft can only be sent while writing or revising.');
    if (!fileName) return fail('Upload the draft file first.');
    const v = nextDraft(o);
    o.files.push({ name: fileName, kind: `Draft v${v}`, size: '48 KB' });
    o.status = 'draft-sent';
    o.draftSentAt = new Date().toISOString();
    log(o, (o.writer || 'Writer').split(' (')[0], `Sent draft v${v} to the client`, true);
    return ok;
  }
  function requestChanges(o, text, actor) {
    if (o.status !== 'draft-sent') return fail('Changes can be requested once a draft has been sent.');
    text = String(text || '').trim();
    if (!text) return fail('Describe the changes needed.');
    if (roundsUsed(o) >= roundsLimit(o)) return fail(`All ${roundsLimit(o)} revision round(s) in the ${o.package} package are used. Extra rounds can be offered as a paid add-on.`);
    o.revisions.push({ at: new Date().toISOString(), by: actor, text });
    o.status = 'revisions';
    log(o, actor, `Asked for changes (round ${roundsUsed(o)}${roundsLimit(o) < 99 ? ` of ${roundsLimit(o)}` : ''}): "${text}"`, true);
    return ok;
  }
  function deliver(o, actor, how) {
    if (o.status !== 'draft-sent') return fail('Send a draft before completing the order.');
    const latest = o.files.filter((f) => f.kind.startsWith('Draft')).pop();
    o.files.push({ name: latest ? latest.name.replace(/(_v\d+)?(\.\w+)$/, '_FINAL$2') : 'Final.docx', kind: 'Final (Word + PDF)', size: latest ? latest.size : '50 KB' });
    o.status = 'delivered';
    o.deliveredAt = new Date().toISOString();
    log(o, actor, how || 'Approved the draft. Order completed', true);
    return ok;
  }
  function note(o, text, actor) {
    text = String(text || '').trim();
    if (!text) return fail('Write a note first.');
    log(o, actor, `Note: ${text}`);
    return ok;
  }
  // A secret, unguessable code for each tracking link (the real version generates it on the server)
  function secretToken() {
    const bytes = new Uint8Array(8);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    return [...bytes].map((b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');
  }

  // Create an order: this is what the website's order card does when the client uploads their CV
  function createOrder(list, { pkg, client, brief = {}, cvFile = null, noCv = false, source = 'website' }) {
    const max = Math.max(1040, ...list.map((o) => Number(o.id.split('-')[1]) || 0));
    const id = `JC-${max + 1}`;
    const o = {
      id, package: pkg, status: 'new', writer: '',
      client,
      payment: { status: 'pending', method: 'M-Pesa', channel: '', reference: '', receipt: '', fee: 0 },
      brief: { targetRole: brief.targetRole || 'Not specified', industry: brief.industry || 'Not specified', experience: brief.experience || 'Not specified', notes: brief.notes || '' },
      files: cvFile ? [{ name: cvFile.name, kind: 'Current CV', size: cvFile.size }] : [],
      created: new Date().toISOString(), amount: priceOf(pkg), token: secretToken(),
      paidAt: null, acceptedAt: null, draftSentAt: null, deliveredAt: null, revisions: [], log: [],
    };
    o.log.push({ at: o.created, actor: 'Client', text: `Placed the order on the ${source} (${pkg})${cvFile ? ` and uploaded ${cvFile.name}` : ''}`, client: true });
    if (noCv) o.log.push({ at: o.created, actor: 'System', text: 'Client has no CV yet: send the CV questionnaire' });
    list.unshift(o);
    return o;
  }
  function createTestOrder(list) {
    return createOrder(list, {
      pkg: 'Professional',
      client: { name: 'Test Client', phone: '+254 7XX XXX 555', email: 'test.client@example.com' },
      brief: { targetRole: 'Marketing Officer', industry: 'FMCG', experience: '3 years', notes: 'Created from the flow demo.' },
      cvFile: { name: 'Test_Client_CV.docx', size: '88 KB' },
      source: 'flow demo',
    });
  }
  // Demo only: pretend time has passed for one order, then run the automatic rules
  function skipTime(o, hours) {
    const shift = (iso) => (iso ? new Date(t(iso) - hours * HOUR).toISOString() : iso);
    ['created', 'paidAt', 'acceptedAt', 'draftSentAt', 'deliveredAt'].forEach((k) => (o[k] = shift(o[k])));
    o.revisions.forEach((r) => (r.at = shift(r.at)));
    o.log.forEach((l) => (l.at = shift(l.at)));
    applyRules(o);
  }

  // "What happens next": who moves the order on, and how
  function nextStep(o) {
    const w = o.writer ? o.writer.split(' (')[0] : 'a writer';
    switch (o.status) {
      case 'new': return { who: 'Client → M-Pesa', what: `The client taps "Pay" and enters their M-Pesa PIN on the prompt, or pays Paybill ${paybill()} with account ${o.id}. Amount ${kes(o.amount)}.`, how: 'Automatic: M-Pesa confirms the payment to the system and the order becomes Paid. If they stall, send the payment reminder.', auto: 'yes' };
      case 'abandoned': return { who: 'Admin', what: 'Send a friendly payment reminder, or confirm the payment if the client paid late.', how: 'Automatic: marked abandoned after 24h without payment.', auto: 'yes' };
      case 'paid': return { who: 'Any writer', what: 'The order is open. The first writer to press "Accept" takes it, and the system records who accepted and when.', how: 'The first-draft clock is already running (it started when payment was confirmed).', auto: 'no' };
      case 'writing': return { who: w, what: `${w} writes the CV (calls the client if needed), then uploads the draft and presses "Send draft".`, how: 'Sending requires a file, so "sent" always means the client really has a draft.', auto: 'no' };
      case 'draft-sent': return { who: 'Client', what: 'The client reviews the draft on their tracking page: "I\'m happy" or "Request changes". Or they reply on WhatsApp and the team records it.', how: `Automatic: reminder after ${RULES.remindAfterDays} days, completed after ${RULES.autoDeliverDays} days with no reply.`, auto: 'partly' };
      case 'revisions': return { who: w, what: `${w} makes the requested changes, uploads the revised draft and presses "Send draft".`, how: `${roundsLabel(o)}. Revised draft due within ${RULES.revisionHours}h of the request.`, auto: 'no' };
      default: return { who: 'Nobody', what: 'Order complete. The client has their final CV.', how: 'Client gets 30 days of free minor updates and a review request.', auto: 'yes' };
    }
  }

  return {
    RULES, STATUS, HOUR, DAY, load, save, reset, onChange, applyRules,
    confirmPayment, recordMpesa, codeUsedBy, paybill, payRef, accept, reassign, sendDraft, requestChanges, deliver, note, createOrder, createTestOrder, skipTime,
    due, nextStep, roundsLabel, roundsUsed, roundsLimit, firstDraftDue, revisionDue, autoDeliverAt,
    kes, ago, when, span, trackUrl: (o) => `track.html?o=${encodeURIComponent(o.id)}&t=${o.token}`,
  };
})();
