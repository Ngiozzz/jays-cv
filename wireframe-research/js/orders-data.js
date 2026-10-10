// Jay CVS: CV orders. SAMPLE DATA for the admin design preview.
// Clients are fictional; phone numbers are masked. Times are relative to "now" so due-time
// countdowns always look realistic. The real version will create orders from the website's
// order card (package + CV upload + M-Pesa payment).

// EXAMPLE PRICES for the preview only: replace with the real package prices.
window.ORDER_PRICES = {
  Basic: 1500, Professional: 3000, Executive: 6000,
  'Cover letter': 800, 'LinkedIn revamp': 2000,
  // Single services, as named on the website's order card
  'Motivation letter / personal statement': 1000, 'LinkedIn profile revamp': 2000, 'Career coaching session': 2500,
  'Mock interview': 2000, 'Job application support': 1000,
};

window.WRITERS = ['Grace', 'Brian', 'Aisha'];

// Rates used to estimate AI cost in the preview (Claude Haiku 4.5: $1 in / $5 out per 1M tokens).
// Swap for whichever model you choose after testing.
window.AI_RATES = { model: 'Claude Haiku 4.5 (example)', inPerM: 1, outPerM: 5, kesPerUsd: 130, monthlyBudgetUsd: 10 };

// AI TOKENS: the developer runs the AI on their own account and gives Jay CVS a token balance.
// Jay starts with 1,000,000 starter tokens; when they run low he asks the developer for more.
// (Jay never sees what the AI costs in money: that's between the developer and the AI provider.)
window.AI_TOKENS = { starter: 1_000_000, warnPct: 20 };
// Demo usage since the starter tokens were added (poster reading uses most of them)
window.AI_USAGE_SEED = {
  'Poster reading': { runs: 260, inTokens: 420_000, outTokens: 108_000 },
  'CV analysis': { runs: 22, inTokens: 46_000, outTokens: 13_000 },
  'Summary drafts': { runs: 14, inTokens: 12_600, outTokens: 2_700 },
};

window.ORDERS = [
  {
    id: 'JC-1048', hoursAgo: 0.4, package: 'Professional',
    client: { name: 'Faith Njeri', phone: '+254 7XX XXX 214', email: 'faith.n@example.com' },
    payment: { status: 'pending', code: '', method: 'M-Pesa' },
    status: 'new', writer: '',
    brief: { targetRole: 'Procurement Officer', industry: 'Manufacturing', experience: '4 years', notes: 'Applying to 3 roles this week. Deadline Friday.' },
    files: [{ name: 'Faith_Njeri_CV_2023.docx', kind: 'Current CV', size: '96 KB' }],
  },
  {
    id: 'JC-1047', hoursAgo: 2, package: 'Basic',
    client: { name: 'Kevin Otieno', phone: '+254 7XX XXX 902', email: 'kevin.o@example.com' },
    payment: { status: 'confirmed', code: 'SJT7Q2KX4M', method: 'M-Pesa' },
    status: 'paid', writer: '',
    brief: { targetRole: 'Graduate Trainee (Finance)', industry: 'Banking', experience: 'Fresh graduate', notes: 'First CV. Has attachment experience at KRA.' },
    files: [{ name: 'Kevin CV.pdf', kind: 'Current CV', size: '211 KB' }, { name: 'Graduate trainee advert.jpg', kind: 'Target job advert', size: '340 KB' }],
  },
  {
    id: 'JC-1046', hoursAgo: 9, package: 'Executive',
    client: { name: 'Dr. Amina Hassan', phone: '+254 7XX XXX 557', email: 'amina.h@example.com' },
    payment: { status: 'confirmed', code: 'SJS3LM8PQ1', method: 'M-Pesa' },
    status: 'writing', writer: 'Grace',
    brief: { targetRole: 'Country Director, health NGO', industry: 'NGO & Development', experience: '15 years', notes: 'Wants a 3-page executive CV plus LinkedIn. International applications.' },
    files: [{ name: 'Amina_Hassan_CV.pdf', kind: 'Current CV', size: '388 KB' }, { name: 'LinkedIn profile.pdf', kind: 'LinkedIn export', size: '120 KB' }],
    aiSample: {
      score: 68,
      strengths: ['15 years of senior leadership clearly shown', 'Strong education and publications section'],
      issues: ['Profile summary is generic ("hardworking, results-oriented")', 'Achievements are buried inside long duty paragraphs', 'No budget sizes or team sizes mentioned', 'Personal details (ID number, marital status) should be removed'],
      keywords: ['Strategic leadership', 'Donor relations', 'Grant management (USAID, FCDO)', 'Health systems strengthening', 'Budget oversight'],
      summary: 'Public health leader with 15 years of experience directing donor-funded health programmes across East Africa. Has managed portfolios of up to USD 12M and multidisciplinary teams of 80+, building strong partnerships with ministries of health, USAID and FCDO. Known for turning around under-performing programmes and strengthening county health systems.',
    },
  },
  {
    id: 'JC-1045', hoursAgo: 30, package: 'Professional',
    client: { name: 'Peter Kamau', phone: '+254 7XX XXX 330', email: 'peter.k@example.com' },
    payment: { status: 'confirmed', code: 'SJR9DX2ZT7', method: 'M-Pesa' },
    status: 'writing', writer: 'Brian',
    brief: { targetRole: 'Site Engineer', industry: 'Construction', experience: '3 years', notes: 'Targeting roads projects (KeRRA/KURA contractors).' },
    files: [{ name: 'Peter Kamau CV.docx', kind: 'Current CV', size: '74 KB' }],
    aiSample: {
      score: 52,
      strengths: ['Relevant EBK registration listed', 'Clear project list'],
      issues: ['Lists duties, not results: no km of road, budgets or timelines', 'Uses a two-column table layout that screening software (ATS) may not read', 'Objective statement instead of a profile summary', 'Referees take up half a page'],
      keywords: ['Site supervision', 'Bill of Quantities (BoQ)', 'AutoCAD / Civil 3D', 'HSE compliance', 'Road rehabilitation'],
      summary: 'EBK-registered civil engineer with 3 years of experience supervising road and drainage works for public-sector contractors. Has overseen projects worth over KES 400M, preparing BoQs, managing subcontractors and enforcing HSE standards. Delivered a 12km road rehabilitation two weeks ahead of schedule.',
    },
  },
  {
    id: 'JC-1044', hoursAgo: 40, package: 'Cover letter',
    client: { name: 'Lucy Wambui', phone: '+254 7XX XXX 118', email: 'lucy.w@example.com' },
    payment: { status: 'confirmed', code: 'SJQ4HN6VB2', method: 'M-Pesa' },
    status: 'draft-sent', writer: 'Aisha',
    brief: { targetRole: 'Customer Service Lead', industry: 'Telecoms', experience: '5 years', notes: 'Letter for one specific advert.' },
    files: [{ name: 'Lucy CV.pdf', kind: 'Current CV', size: '156 KB' }, { name: 'Cover letter draft v1.docx', kind: 'Draft v1', size: '32 KB' }],
  },
  {
    id: 'JC-1043', hoursAgo: 52, package: 'Professional',
    client: { name: 'Samuel Kiprono', phone: '+254 7XX XXX 745', email: 'samuel.k@example.com' },
    payment: { status: 'confirmed', code: 'SJP2WC5RY8', method: 'M-Pesa' },
    status: 'revisions', writer: 'Brian',
    brief: { targetRole: 'Sales Manager', industry: 'FMCG', experience: '7 years', notes: 'Client asked to add his 2022 award and shorten page 2.' },
    files: [{ name: 'Samuel CV old.pdf', kind: 'Current CV', size: '190 KB' }, { name: 'Samuel_Kiprono_CV_v1.docx', kind: 'Draft v1', size: '41 KB' }],
  },
  {
    id: 'JC-1042', hoursAgo: 70, package: 'LinkedIn revamp',
    client: { name: 'Brenda Achieng', phone: '+254 7XX XXX 603', email: 'brenda.a@example.com' },
    payment: { status: 'confirmed', code: 'SJN8KT3GF5', method: 'M-Pesa' },
    status: 'delivered', writer: 'Aisha',
    brief: { targetRole: 'Data Analyst', industry: 'Tech', experience: '2 years', notes: '' },
    files: [{ name: 'LinkedIn profile.pdf', kind: 'LinkedIn export', size: '98 KB' }, { name: 'LinkedIn content final.docx', kind: 'Final', size: '28 KB' }],
  },
  {
    id: 'JC-1041', hoursAgo: 96, package: 'Basic',
    client: { name: 'Joseph Mwangi', phone: '+254 7XX XXX 871', email: 'joseph.m@example.com' },
    payment: { status: 'confirmed', code: 'SJM6PB9QX3', method: 'M-Pesa' },
    status: 'delivered', writer: 'Grace',
    brief: { targetRole: 'Driver', industry: 'Transport & Logistics', experience: '10 years', notes: '' },
    files: [{ name: 'Joseph CV.jpg', kind: 'Current CV (photo)', size: '1.2 MB' }, { name: 'Joseph_Mwangi_CV_final.pdf', kind: 'Final', size: '88 KB' }],
  },
];
