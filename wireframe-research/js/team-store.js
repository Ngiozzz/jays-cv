// Jay CVS admin: the TEAM (DESIGN PREVIEW: kept in this browser's localStorage).
// Jay is the owner and senior writer. He invites writers, sets what each can do and what they are paid,
// pauses or removes them, and records payouts. The real build keeps this in the database with staff logins.
window.JayTeam = (() => {
  const KEY = 'jaycvs-mock-team';
  const DAY = 86400000;
  const ago = (d) => new Date(Date.now() - d * DAY).toISOString();
  const SEED = {
    members: [
      { name: 'Grace', phone: '07XX XXX 101', email: 'grace@example.com', status: 'active', canWrite: true, canJobs: true, rate: 40, joined: ago(410), lastSeen: ago(0.05) },
      { name: 'Brian', phone: '07XX XXX 202', email: 'brian@example.com', status: 'active', canWrite: true, canJobs: false, rate: 35, joined: ago(190), lastSeen: ago(0.4) },
      { name: 'Aisha', phone: '07XX XXX 303', email: 'aisha@example.com', status: 'active', canWrite: true, canJobs: true, rate: 35, joined: ago(75), lastSeen: ago(1.2) },
    ],
    // Writer payouts Jay has already made (M-Pesa, bank)
    payouts: [
      { writer: 'Aisha', amount: 700, at: ago(20), ref: 'SIP4K2N1RT' },
    ],
  };
  const clone = (x) => JSON.parse(JSON.stringify(x));
  function load() {
    try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) { /* seed */ }
    return clone(SEED);
  }
  function save(t) {
    try { localStorage.setItem(KEY, JSON.stringify(t)); return true; } catch (e) { return false; }
  }
  const find = (t, name) => t.members.find((m) => m.name === name);
  const code = () => Math.random().toString(36).slice(2, 8).toUpperCase();
  return {
    load, save,
    reset() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } },
    member(name) { return find(load(), String(name || '').split(' (')[0]) || null; },
    // People who can sign in as writers (paused writers keep their account but can't accept new orders)
    writers() { return load().members.filter((m) => m.canWrite && (m.status === 'active' || m.status === 'paused')).map((m) => m.name); },
    invite({ name, phone, email, canWrite, canJobs, rate }) {
      const t = load();
      name = String(name || '').trim();
      if (!name) return { ok: false, error: 'Enter their name.' };
      if (!String(phone || '').trim()) return { ok: false, error: 'Enter their WhatsApp number: the invite is sent there.' };
      if (name.toLowerCase().startsWith('jay') || find(t, name)) return { ok: false, error: `There is already someone called ${name}.` };
      const m = { name, phone, email, status: 'invited', canWrite: !!canWrite, canJobs: !!canJobs, rate: Number(rate) || 0, invitedAt: new Date().toISOString(), invite: code() };
      t.members.push(m);
      save(t);
      return { ok: true, member: m };
    },
    update(name, patch) { const t = load(); const m = find(t, name); if (!m) return null; Object.assign(m, patch); save(t); return m; },
    remove(name) { const t = load(); t.members = t.members.filter((m) => m.name !== name); save(t); },
    payouts() { return load().payouts; },
    pay(writer, amount, ref) { const t = load(); t.payouts.push({ writer, amount: Math.round(amount), at: new Date().toISOString(), ref: String(ref || '').toUpperCase() }); save(t); },
  };
})();
// Everyone else in the admin reads the writer list from the team
window.WRITERS = window.JayTeam.writers();
