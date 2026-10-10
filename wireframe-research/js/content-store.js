// Jay CVS: website content the owner edits in Admin → Website content.
// DESIGN PREVIEW: saved in this browser (localStorage). In the real Next.js build these are database
// tables, and saving refreshes only the affected pages.
window.JayContent = (() => {
  const KEY = 'jaycvs-mock-content';
  const clone = (o) => JSON.parse(JSON.stringify(o));

  const DEFAULTS = {
    // Example prices for the preview: the owner sets the real ones here
    packages: [
      { short: 'Basic', name: 'Basic CV', price: 1500, best: 'Graduates & entry-level roles', draft: '48 hours', rounds: 1, popular: false, visible: true,
        features: ['Professionally written CV', 'ATS-friendly format', 'Draft in 48 hours', '1 round of revisions', 'Word & PDF formats'] },
      { short: 'Professional', name: 'Professional', price: 3000, best: 'Mid-level professionals', draft: '24 hours', rounds: 2, popular: true, visible: true,
        features: ['Everything in Basic', 'Tailored cover letter', 'Achievement-focused rewrite', '2 rounds of revisions', 'Priority 24-hour delivery'] },
      { short: 'Executive', name: 'Executive Pack', price: 6000, best: 'Senior leaders & career changers', draft: '24 hours', rounds: 99, popular: false, visible: true,
        features: ['Everything in Professional', 'LinkedIn profile revamp', '1-hour career coaching call', 'Unlimited revisions for 14 days', 'Written personally by Jay'] },
    ],
    services: [
      { name: 'Cover letter', note: 'Written for one specific role', price: 800, visible: true },
      { name: 'Motivation letter / personal statement', note: 'Scholarships, universities, programmes', price: 1000, visible: true },
      { name: 'LinkedIn profile revamp', note: 'Headline, About, experience & skills', price: 2000, visible: true },
      { name: 'Career coaching session', note: '60 minutes, in person or online', price: 2500, visible: true },
      { name: 'Mock interview', note: 'With written feedback', price: 2000, visible: true },
      { name: 'Job application support', note: 'Per application / portal', price: 1000, visible: true },
      { name: 'CV update', note: 'For CVs we wrote in the last 12 months', price: 700, visible: true },
      { name: 'International CV format', note: 'UK, Canada, US, Europe, Gulf', price: 2500, visible: true },
    ],
    reviews: [
      { id: 'r1', name: '[Full Name]', role: '[Job Title, Company]', rating: 5, text: 'I had applied for months with no response. Two weeks after getting my new CV from Jay CVS I had three interview invitations.', status: 'approved', featured: true, consent: true, source: 'Placeholder' },
      { id: 'r2', name: '[Full Name]', role: '[Job Title, Company]', rating: 5, text: 'The LinkedIn revamp was worth every shilling. Recruiters started reaching out to me directly within a month.', status: 'approved', featured: true, consent: true, source: 'Placeholder' },
      { id: 'r3', name: '[Full Name]', role: '[Job Title, Company]', rating: 5, text: 'Professional, fast and very responsive on WhatsApp. They understood exactly what the international role needed.', status: 'approved', featured: true, consent: true, source: 'Placeholder' },
      { id: 'r4', name: 'Brenda A.', role: 'Data Analyst', rating: 5, text: 'My LinkedIn now actually shows what I do. Got two recruiter messages in the first week!', status: 'pending', featured: false, consent: true, source: 'Tracking page · JC-1042' },
      { id: 'r5', name: 'Joseph M.', role: 'Driver', rating: 4, text: 'Good work and fast. I only sent a photo of my old CV and they made it look very professional.', status: 'pending', featured: false, consent: true, source: 'Tracking page · JC-1041' },
      { id: 'r6', name: 'Anonymous', role: '', rating: 5, text: 'Very happy with the cover letter, thank you.', status: 'pending', featured: false, consent: false, source: 'Tracking page · JC-1039' },
    ],
    samples: [
      { slug: 'accountant', role: 'Accountant', tag: 'Finance', caption: 'Entry level → Shortlisted in 2 weeks', published: true },
      { slug: 'project-manager', role: 'Project Manager', tag: 'NGO & development', caption: 'Mid-level → NGO role', published: true },
      { slug: 'nurse', role: 'Registered Nurse', tag: 'International', caption: 'Kenya → UK NHS application', published: true },
      { slug: 'software-developer', role: 'Software Developer', tag: 'Tech & engineering', caption: 'Junior → Mid-level', published: true },
      { slug: 'business-graduate', role: 'Business Graduate', tag: 'Graduates', caption: 'First job → Graduate trainee', published: true },
      { slug: 'clinical-officer', role: 'Clinical Officer', tag: 'Healthcare', caption: 'County hospital → Private practice', published: true },
      { slug: 'finance-manager', role: 'Finance Manager', tag: 'Finance', caption: 'Senior → Head of Finance', published: true },
      { slug: 'civil-engineer', role: 'Civil Engineer', tag: 'Tech & engineering', caption: 'Contractor → Consultancy firm', published: true },
      { slug: 'hospitality-supervisor', role: 'Hospitality Supervisor', tag: 'International', caption: 'Nairobi → Dubai', published: false },
    ],
    posts: [
      { id: 'p1', title: '7 CV mistakes that get you rejected in Kenya', category: 'CV tips', status: 'published', author: 'Jay', updated: '2026-09-28', cover: 'img/photos/blog-cv-mistakes.jpg', excerpt: 'What recruiters notice in the first six seconds, and how to fix it.', body: '## 1. Listing duties instead of achievements\nRecruiters already know what the job involves. Show what you achieved.\n\n## 2. A format software can\'t read\nTables and text boxes confuse screening software (ATS).' },
      { id: 'p2', title: 'How to get recruiters to message you on LinkedIn', category: 'LinkedIn', status: 'published', author: 'Jay', updated: '2026-09-20', cover: 'img/photos/blog-linkedin.jpg', excerpt: 'Simple profile changes that make you easier to find.', body: '' },
      { id: 'p3', title: 'Answering "Tell me about yourself" with confidence', category: 'Interviews', status: 'published', author: 'Grace', updated: '2026-09-12', cover: 'img/photos/blog-tell-me-about-yourself.jpg', excerpt: 'A simple formula you can use in any interview.', body: '' },
      { id: 'p4', title: 'Where to find NGO and UN jobs in Kenya', category: 'Job search', status: 'published', author: 'Jay', updated: '2026-08-30', cover: 'img/photos/blog-ngo-jobs.jpg', excerpt: 'The job boards and application tips that actually work.', body: '' },
      { id: 'p5', title: 'How to negotiate your salary in Kenya', category: 'Career growth', status: 'draft', author: 'Brian', updated: '2026-09-29', cover: 'img/photos/blog-salary.jpg', excerpt: 'What to say, and when, to get the offer you deserve.', body: '' },
    ],
    faqs: [
      { q: 'How long does it take to get my CV?', a: "You'll receive your first draft within 48 hours of payment. Professional and Executive packages get priority delivery.", visible: true },
      { q: 'How do I pay?', a: "After uploading your CV you'll see a Pay button. Choose M-Pesa (a prompt pops up on your phone; enter your PIN) or pay by card. Payment is confirmed automatically and your writer starts right away.", visible: true },
      { q: "What if I don't like the draft?", a: "Every package includes revisions. Tell us what to change and your writer will update it until you're happy.", visible: true },
      { q: 'Do you write CVs for jobs abroad?', a: "Yes. We write CVs for international roles, including the UK, Canada, the Gulf and Europe, following each region's format.", visible: true },
      { q: "I don't have a CV at all. Can you still help?", a: "Absolutely. We'll send you a short questionnaire and build your CV from scratch.", visible: true },
    ],
    home: {
      headline: 'CVs that get you', highlight: 'shortlisted.',
      lead: 'Professionally written CVs, cover letters and LinkedIn profiles, crafted by HR experts who know what Kenyan and international recruiters look for.',
      stats: [
        { value: '2,000+', label: 'CVs written' }, { value: '8', label: 'Years in HR' },
        { value: '48 hrs', label: 'Average turnaround' }, { value: '4.9/5', label: 'Average client rating' },
      ],
      announcement: { on: false, text: 'December offer: 20% off LinkedIn revamps', link: 'pricing.html#individual' },
    },
    settings: {
      whatsapp: '0725 912 186', email: 'info@jaycvs.co.ke', address: '[Office address], Nairobi, Kenya',
      channelLink: '', linkedin: '', facebook: '', instagram: '', x: '',
      unpaidHours: 24, reminderDays: 2, autoCompleteDays: 5, revisionHours: 24,
      retentionMonths: 6, aiWarnPct: 20, paybill: '4027127', mpesaMode: 'test',
    },
    history: [],
  };

  function get() {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        const c = JSON.parse(saved);
        // Earlier preview wording: Jay is the senior writer, so Executive CVs are written by him
        (c.packages || []).forEach((p) => { p.features = (p.features || []).map((f) => (f === 'Dedicated senior writer' ? 'Written personally by Jay' : f)); });
        const d = clone(DEFAULTS);
        return { ...d, ...c, home: { ...d.home, ...(c.home || {}) }, settings: { ...d.settings, ...(c.settings || {}) } };
      }
    } catch (e) { /* use defaults */ }
    return clone(DEFAULTS);
  }
  function save(c) {
    try { localStorage.setItem(KEY, JSON.stringify(c)); return true; } catch (e) { return false; }
  }
  // Every change is recorded with who made it, so it can be undone
  function update(section, value, who, what) {
    const c = get();
    c.history = [{ at: new Date().toISOString(), who, what, section, before: clone(c[section]) }, ...(c.history || [])].slice(0, 40);
    c[section] = value;
    return save(c) ? c : null;
  }
  function undo(index) {
    const c = get();
    const h = c.history[index];
    if (!h) return null;
    c[h.section] = h.before;
    c.history.splice(index, 1);
    return save(c) ? c : null;
  }
  function addReview(r) {
    const c = get();
    c.reviews.unshift({ id: `r${Date.now()}`, status: 'pending', featured: false, ...r });
    return save(c);
  }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
  function onChange(cb) { window.addEventListener('storage', (e) => { if (e.key === KEY) cb(); }); }
  // "0725 912 186" → "254725912186" for wa.me links
  const waDigits = (num) => {
    const d = String(num || '').replace(/\D/g, '');
    return d.startsWith('254') ? d : d.startsWith('0') ? `254${d.slice(1)}` : d;
  };
  // Price of a package (by short name) or single service (by name)
  function priceOf(name) {
    const c = get();
    const p = c.packages.find((x) => x.short === name || x.name === name) || c.services.find((x) => x.name === name);
    return p ? Number(p.price) || 0 : null;
  }

  return { KEY, DEFAULTS, get, save, update, undo, addReview, reset, onChange, waDigits, priceOf };
})();
